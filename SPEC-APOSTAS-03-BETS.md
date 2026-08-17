# SPEC-APOSTAS-03-BETS
## CRUD de Apostas & Upload de Screenshots

**Data**: Agosto 2026  
**Versão**: 1.0  
**Depende de**: SPEC-APOSTAS-01-CORE.md, SPEC-APOSTAS-02-AUTH.md

---

## 1. VISÃO GERAL

- **Entrada**: Criação manual de apostas + uploads de prints (comprovação)
- **Edição**: Atualizar odds, stake, descrição até registrar resultado
- **Resultado**: Marcar como ganha/perdida/void com dados finais
- **Rastreamento**: Histórico completo de cada aposta

---

## 2. STORAGE: CONFIGURAÇÃO

### 2.1 S3 / S3-Compatible (MinIO)

**MVP Self-Hosted**: MinIO (S3 compatible)
**v1.1+ Cloud**: AWS S3 ou Backblaze B2

```bash
# Docker Compose: MinIO local
services:
  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    command: minio server /data --console-address ":9001"
    volumes:
      - minio_data:/data
```

### 2.2 Configuração Backend

```typescript
// config/s3.ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  endpoint: process.env.S3_ENDPOINT, // MinIO: http://localhost:9000
  s3ForcePathStyle: true,
  region: process.env.S3_REGION || 'us-east-1'
});

export default s3;
```

### 2.3 Estrutura de Pastas

```
s3://apostas-bucket/
├── user-{userId}/
│   ├── bet-{betId}/
│   │   ├── screenshot-01.jpg
│   │   ├── screenshot-02.jpg
│   │   └── result-screenshot.jpg
│   └── temp/
│       └── {tempId}-upload.jpg
```

---

## 3. CRIAR APOSTA

### 3.1 Fluxo: POST /bets

```
POST /bets
├─ Headers: Authorization (JWT)
├─ Body:
│  ├─ bet_id (ex: "BET-001") - referência do bilhete
│  ├─ platform (ex: "Bet365") - optional
│  ├─ stake (number, required) - valor apostado em R$
│  ├─ initial_odds (number, required) - odd inicial
│  ├─ bet_type ("single" | "parlay" | "multiple" | "system" | "free")
│  ├─ sport (ex: "Futebol") - optional
│  ├─ event_description (ex: "Barcelona vs Real Madrid") - optional
│  ├─ bet_description (ex: "Barcelona Vence") - optional
│  ├─ notes (text) - optional
│  └─ screenshot_urls (string[]) - URLs dos prints já uploadados
├─ Validações:
│  ├─ stake > 0
│  ├─ initial_odds > 1.0 (ou = 1.0 para free bets)
│  ├─ bet_id not empty
│  └─ User autenticado
├─ Ações:
│  ├─ Gerar UUID para bet_id (sistema interno)
│  ├─ Status = "pending"
│  ├─ Criar registro em DB
│  └─ Retornar bet completo
└─ Response: 201 Created
   └─ Bet { id, bet_id, platform, stake, initial_odds, ... }
```

### 3.2 Exemplo Request

```bash
curl -X POST http://localhost:3000/bets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "bet_id": "BETANO-12345",
    "platform": "Betano",
    "stake": 100,
    "initial_odds": 2.5,
    "bet_type": "single",
    "sport": "Futebol",
    "event_description": "Barcelona vs Real Madrid",
    "bet_description": "Barcelona Vence",
    "screenshot_urls": [
      "https://s3.local/apostas/user-123/bet-abc/screenshot-01.jpg"
    ]
  }'
```

### 3.3 Database Insert

```typescript
// services/bets.ts
export const createBet = async (
  userId: string,
  tenantId: string,
  data: CreateBetDTO
) => {
  const result = await db.query(
    `INSERT INTO bets (
       user_id, tenant_id, bet_id, platform, stake, initial_odds,
       bet_type, sport, event_description, bet_description,
       screenshot_urls, notes, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      userId,
      tenantId,
      data.bet_id,
      data.platform || null,
      new Decimal(data.stake),
      new Decimal(data.initial_odds),
      data.bet_type || 'single',
      data.sport || null,
      data.event_description || null,
      data.bet_description || null,
      data.screenshot_urls || [],
      data.notes || null,
      'pending'
    ]
  );

  return result.rows[0];
};
```

---

## 4. UPLOAD DE SCREENSHOTS

### 4.1 Fluxo: POST /bets/upload-screenshot

```
POST /bets/upload-screenshot
├─ Headers: Authorization (JWT)
├─ Body: FormData
│  ├─ file (File, required) - imagem da aposta
│  └─ temporary (boolean) - se é upload temporário (antes de criar aposta)
├─ Validações:
│  ├─ File size < 10MB
│  ├─ File type: image/* (jpeg, png, webp)
│  └─ User autenticado
├─ Ações:
│  ├─ Redimensionar imagem (max 2000x2000)
│  ├─ Converter p/ WebP (otimização)
│  ├─ Upload p/ S3 com UUID único
│  ├─ Retornar URL + metadata
│  └─ Se temporary: adicionar à fila de limpeza (24h)
└─ Response: 201 Created
   └─ { url, size, width, height, uploadedAt }
```

### 4.2 Implementação Backend

```typescript
// routes/bets.ts
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});

router.post(
  '/upload-screenshot',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const tempId = uuidv4();

      // Otimizar imagem
      const optimized = await sharp(req.file!.buffer)
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toBuffer();

      // Upload pro S3
      const key = `user-${userId}/screenshots/${tempId}.webp`;
      const s3Params = {
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: optimized,
        ContentType: 'image/webp',
        ACL: 'public-read'
      };

      await s3.upload(s3Params).promise();

      const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;

      // Se temporário, adicionar à fila de limpeza
      if (req.body.temporary === 'true') {
        await redisClient.setex(
          `temp_upload:${tempId}`,
          24 * 60 * 60, // 24 horas
          url
        );
      }

      res.status(201).json({
        url,
        tempId,
        size: optimized.length,
        uploadedAt: new Date()
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);
```

### 4.3 Frontend: Upload com Preview

```typescript
// components/ScreenshotUploader.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface UploadedScreenshot {
  url: string;
  tempId: string;
}

export const ScreenshotUploader = ({
  onScreenshotsChange
}: {
  onScreenshotsChange: (urls: UploadedScreenshot[]) => void;
}) => {
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.currentTarget.files;
    if (!files) return;

    setLoading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('temporary', 'true');

        const { data } = await axios.post(
          `/api/bets/upload-screenshot`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );

        const newScreenshot: UploadedScreenshot = {
          url: data.url,
          tempId: data.tempId
        };

        setScreenshots((prev) => [...prev, newScreenshot]);
        onScreenshotsChange([...screenshots, newScreenshot]);
      } catch (error) {
        console.error('Upload falhou:', error);
      }
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Screenshots da aposta
        </span>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
          className="mt-2 block w-full"
        />
      </label>

      {/* Preview Grid */}
      <div className="grid grid-cols-3 gap-2">
        {screenshots.map((ss) => (
          <div key={ss.tempId} className="relative">
            <img
              src={ss.url}
              alt="Screenshot"
              className="w-full h-24 object-cover rounded"
            />
            <button
              onClick={() => {
                setScreenshots((prev) =>
                  prev.filter((s) => s.tempId !== ss.tempId)
                );
                onScreenshotsChange(
                  screenshots.filter((s) => s.tempId !== ss.tempId)
                );
              }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded p-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Enviando...</p>}
    </div>
  );
};
```

---

## 5. LISTAR APOSTAS

### 5.1 Fluxo: GET /bets

```
GET /bets?status=pending&sport=Futebol&limit=20&offset=0
├─ Headers: Authorization (JWT)
├─ Query Params:
│  ├─ status (optional): "pending" | "won" | "lost" | "void" | "canceled"
│  ├─ sport (optional): filtro por esporte
│  ├─ limit (default: 20)
│  ├─ offset (default: 0)
│  └─ sort (default: "-created_at") - "-" = descending
├─ Ações:
│  ├─ Filtrar por user_id + tenant_id
│  ├─ Aplicar filtros
│  ├─ Paginação
│  └─ Ordenar
└─ Response: 200 OK
   └─ { bets: [...], total, limit, offset }
```

### 5.2 Implementação

```typescript
// routes/bets.ts
router.get('/bets', authMiddleware, tenantIsolation, async (req, res) => {
  const userId = req.user!.id;
  const tenantId = req.tenantId;

  const { status, sport, limit = 20, offset = 0, sort = '-created_at' } = req.query;

  let query = `
    SELECT * FROM bets
    WHERE user_id = $1 AND tenant_id = $2
  `;
  let params = [userId, tenantId];
  let paramCount = 2;

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status as string);
  }

  if (sport) {
    paramCount++;
    query += ` AND sport = $${paramCount}`;
    params.push(sport as string);
  }

  // Ordenação
  const sortField = (sort as string).startsWith('-')
    ? (sort as string).substring(1)
    : sort;
  const sortOrder = (sort as string).startsWith('-') ? 'DESC' : 'ASC';
  query += ` ORDER BY ${sortField} ${sortOrder}`;

  // Paginação
  query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit as any, offset as any);

  const result = await db.query(query, params);
  const totalResult = await db.query(
    `SELECT COUNT(*) FROM bets WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );

  res.json({
    bets: result.rows,
    total: parseInt(totalResult.rows[0].count),
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
});
```

---

## 6. ATUALIZAR APOSTA (Antes do Resultado)

### 6.1 Fluxo: PUT /bets/:betId

```
PUT /bets/{betId}
├─ Headers: Authorization (JWT)
├─ Body (qualquer campo):
│  ├─ stake (number)
│  ├─ initial_odds (number)
│  ├─ bet_description (string)
│  ├─ notes (string)
│  └─ screenshot_urls (string[])
├─ Validações:
│  ├─ Aposta existe + user owner
│  ├─ Status = "pending" (não pode editar após resultado)
│  ├─ Valores válidos (stake > 0, odds > 1.0)
│  └─ No recálculo de ganho (feito só ao marcar resultado)
├─ Ações:
│  ├─ Update campos
│  ├─ Manter updated_at
│  └─ Retornar bet atualizado
└─ Response: 200 OK
```

### 6.2 Implementação

```typescript
router.put('/bets/:betId', authMiddleware, async (req, res) => {
  const userId = req.user!.id;
  const { betId } = req.params;

  // Verificar ownership + status
  const checkResult = await db.query(
    `SELECT * FROM bets WHERE id = $1 AND user_id = $2`,
    [betId, userId]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: 'Aposta não encontrada' });
  }

  const bet = checkResult.rows[0];

  if (bet.status !== 'pending') {
    return res.status(400).json({
      error: 'Não pode editar aposta após resultado ser registrado'
    });
  }

  // Whitelist de campos editáveis
  const allowedFields = [
    'stake',
    'initial_odds',
    'bet_description',
    'notes',
    'screenshot_urls'
  ];

  const updates: { [key: string]: any } = {};
  for (const field of allowedFields) {
    if (field in req.body) {
      if (field === 'stake' || field === 'initial_odds') {
        const value = new Decimal(req.body[field]);
        if (value.lessThanOrEqualTo(0)) {
          return res.status(400).json({ error: `${field} deve ser > 0` });
        }
        updates[field] = value;
      } else {
        updates[field] = req.body[field];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  const setClause = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 1}`)
    .join(', ');

  const result = await db.query(
    `UPDATE bets
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${Object.keys(updates).length + 1}
     RETURNING *`,
    [...Object.values(updates), betId]
  );

  res.json(result.rows[0]);
});
```

---

## 7. REGISTRAR RESULTADO

### 7.1 Fluxo: POST /bets/:betId/result

```
POST /bets/{betId}/result
├─ Headers: Authorization (JWT)
├─ Body:
│  ├─ status ("won" | "lost" | "void" | "canceled")
│  ├─ result_odd (number, required se status="won")
│  ├─ win_amount (number, required se status="won")
│  ├─ screenshot_urls (optional) - print do resultado
│  └─ notes (optional)
├─ Validações:
│  ├─ Aposta existe + user owner
│  ├─ Status = "pending" (não pode regredir)
│  ├─ Se won: result_odd >= 1.0, win_amount >= 0
│  └─ Cálculo automático de net_gain
├─ Ações:
│  ├─ Calcular net_gain = win_amount - stake
│  ├─ Marcar result_date = NOW()
│  ├─ Update status + resultado
│  └─ Retornar aposta finalizada
└─ Response: 200 OK
   └─ Aposta com resultado registrado
```

### 7.2 Implementação (Crítica - Sem Erros!)

```typescript
router.post('/bets/:betId/result', authMiddleware, async (req, res) => {
  const userId = req.user!.id;
  const { betId } = req.params;
  const { status, result_odd, win_amount, notes } = req.body;

  // 1. Verificar aposta
  const checkResult = await db.query(
    `SELECT * FROM bets WHERE id = $1 AND user_id = $2`,
    [betId, userId]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: 'Aposta não encontrada' });
  }

  const bet = checkResult.rows[0];

  if (bet.status !== 'pending') {
    return res.status(400).json({
      error: 'Esta aposta já tem resultado registrado'
    });
  }

  // 2. Validação de status
  const validStatuses = ['won', 'lost', 'void', 'canceled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  // 3. Calcular ganho com precisão decimal
  let netGain: Decimal;
  let finalWinAmount: Decimal | null = null;
  let finalResultOdd: Decimal | null = null;

  if (status === 'won') {
    if (!result_odd || !win_amount) {
      return res.status(400).json({
        error: 'result_odd e win_amount são necessários para apostas ganhas'
      });
    }

    finalResultOdd = new Decimal(result_odd);
    finalWinAmount = new Decimal(win_amount);
    const betStake = new Decimal(bet.stake);

    // Validação
    if (finalResultOdd.lessThan(1.0)) {
      return res.status(400).json({ error: 'result_odd deve ser >= 1.0' });
    }
    if (finalWinAmount.lessThan(0)) {
      return res.status(400).json({ error: 'win_amount deve ser >= 0' });
    }

    // net_gain = win_amount - stake
    netGain = finalWinAmount.minus(betStake);
  } else if (status === 'lost') {
    // Aposta perdida: perde o stake todo
    const betStake = new Decimal(bet.stake);
    netGain = new Decimal(0).minus(betStake);
    finalWinAmount = new Decimal(0);
  } else {
    // Void ou Canceled: devolve o stake (net_gain = 0)
    netGain = new Decimal(0);
    finalWinAmount = new Decimal(bet.stake);
  }

  // 4. Update no DB
  const updateResult = await db.query(
    `UPDATE bets
     SET status = $1,
         result_odd = $2,
         win_amount = $3,
         net_gain = $4,
         result_date = NOW(),
         notes = COALESCE($5, notes),
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      status,
      finalResultOdd?.toString() || null,
      finalWinAmount?.toString() || null,
      netGain.toString(),
      notes || null,
      betId
    ]
  );

  res.json(updateResult.rows[0]);
});
```

---

## 8. DELETAR APOSTA

### 8.1 Fluxo: DELETE /bets/:betId

```
DELETE /bets/{betId}
├─ Headers: Authorization (JWT)
├─ Validações:
│  ├─ Aposta existe + user owner
│  └─ Status = "pending" (não deletar dados históricos)
├─ Ações:
│  ├─ (Opcional) Mover pra "canceled" ao invés de deletar
│  ├─ Limpar screenshots do S3
│  └─ Retornar 204 No Content
└─ Response: 204 No Content
```

### 8.2 Implementação

```typescript
router.delete('/bets/:betId', authMiddleware, async (req, res) => {
  const userId = req.user!.id;
  const { betId } = req.params;

  const checkResult = await db.query(
    `SELECT screenshot_urls FROM bets WHERE id = $1 AND user_id = $2`,
    [betId, userId]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: 'Aposta não encontrada' });
  }

  const bet = checkResult.rows[0];

  // Deletar screenshots do S3
  if (bet.screenshot_urls && Array.isArray(bet.screenshot_urls)) {
    for (const url of bet.screenshot_urls) {
      try {
        const key = url.split(`${process.env.S3_BUCKET}/`)[1];
        await s3
          .deleteObject({
            Bucket: process.env.S3_BUCKET!,
            Key: key
          })
          .promise();
      } catch (error) {
        console.error(`Falha ao deletar ${url}:`, error);
      }
    }
  }

  // Deletar aposta
  await db.query(`DELETE FROM bets WHERE id = $1`, [betId]);

  res.status(204).send();
});
```

---

## 9. GET SINGLE BET

### 9.1 Fluxo: GET /bets/:betId

```
GET /bets/{betId}
├─ Headers: Authorization (JWT)
├─ Ações:
│  ├─ Verificar ownership
│  └─ Retornar bet completo com screenshots
└─ Response: 200 OK
   └─ Bet com todos os campos
```

---

## 10. CHECKLIST

- [ ] Database: bets table + indices
- [ ] S3/MinIO setup + bucket creation
- [ ] Upload middleware (multer + sharp)
- [ ] POST /bets (criar aposta)
- [ ] POST /bets/upload-screenshot
- [ ] GET /bets (listar com filtros)
- [ ] GET /bets/:betId (detalhe)
- [ ] PUT /bets/:betId (editar antes resultado)
- [ ] POST /bets/:betId/result (registrar resultado)
- [ ] DELETE /bets/:betId
- [ ] Decimal.js em todos os cálculos
- [ ] Frontend: bet form + upload + list
- [ ] Testes: CRUD e cálculo de ganho

---

**Próxima Spec**: SPEC-APOSTAS-04-CALCULATORS.md (Implementação das 3 calculadoras)
