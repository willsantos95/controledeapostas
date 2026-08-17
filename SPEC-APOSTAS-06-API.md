# SPEC-APOSTAS-06-API
## API Reference Completa

**Data**: Agosto 2026  
**Versão**: 1.0  
**Base URL**: `http://localhost:3000/api` (dev) | `https://apostas.com/api` (prod)

---

## 1. AUTENTICAÇÃO

### 1.1 Signup

```
POST /auth/signup
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "João Silva"
}

Response: 201 Created
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "João Silva"
  }
}

Errors:
- 400: Email já existe | Senha inválida
- 500: Erro interno
```

### 1.2 Login

```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "João Silva"
  }
}

Errors:
- 401: Email ou senha incorretos
```

### 1.3 Refresh Token

```
POST /auth/refresh
Content-Type: application/json

Request:
{}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}

Errors:
- 401: Token inválido ou expirado
```

### 1.4 Logout

```
POST /auth/logout
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true
}
```

### 1.5 Get Current User

```
GET /auth/me
Authorization: Bearer {access_token}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "João Silva",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001"
}

Errors:
- 401: Não autenticado
```

---

## 2. APOSTAS (BETS)

### 2.1 Criar Aposta

```
POST /bets
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "bet_id": "BETANO-12345",
  "platform": "Betano",
  "stake": 100.00,
  "initial_odds": 2.5,
  "bet_type": "single",
  "sport": "Futebol",
  "event_description": "Barcelona vs Real Madrid",
  "bet_description": "Barcelona Vence",
  "screenshot_urls": [
    "https://s3.local/apostas/user-123/screenshots/abc123.webp"
  ],
  "notes": "Confiante nessa"
}

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "bet_id": "BETANO-12345",
  "platform": "Betano",
  "stake": 100.00,
  "initial_odds": 2.5,
  "bet_type": "single",
  "sport": "Futebol",
  "event_description": "Barcelona vs Real Madrid",
  "bet_description": "Barcelona Vence",
  "status": "pending",
  "screenshot_urls": [...],
  "created_at": "2026-08-17T10:30:00Z",
  "updated_at": "2026-08-17T10:30:00Z"
}

Errors:
- 400: Dados inválidos
- 401: Não autenticado
```

### 2.2 Listar Apostas

```
GET /bets?status=pending&sport=Futebol&limit=20&offset=0&sort=-created_at
Authorization: Bearer {access_token}

Query Parameters:
- status (optional): "pending" | "won" | "lost" | "void" | "canceled"
- sport (optional): filtro por esporte
- limit (default: 20): resultados por página
- offset (default: 0): paginação
- sort (default: "-created_at"): ordenação (prefixo "-" = desc)

Response: 200 OK
{
  "bets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "bet_id": "BETANO-12345",
      "platform": "Betano",
      "stake": 100.00,
      "initial_odds": 2.5,
      "status": "pending",
      "sport": "Futebol",
      ...
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### 2.3 Obter Aposta Específica

```
GET /bets/{betId}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "bet_id": "BETANO-12345",
  "platform": "Betano",
  "stake": 100.00,
  "initial_odds": 2.5,
  "status": "pending",
  "screenshot_urls": [...],
  "created_at": "2026-08-17T10:30:00Z",
  ...
}

Errors:
- 404: Aposta não encontrada
- 401: Não autenticado
```

### 2.4 Atualizar Aposta

```
PUT /bets/{betId}
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "stake": 150.00,
  "initial_odds": 2.8,
  "bet_description": "Barcelona ou Empate",
  "notes": "Novo prognóstico",
  "screenshot_urls": [...]
}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "stake": 150.00,
  "initial_odds": 2.8,
  "updated_at": "2026-08-17T11:00:00Z",
  ...
}

Errors:
- 400: Aposta já tem resultado | Dados inválidos
- 404: Aposta não encontrada
- 401: Não autenticado
```

### 2.5 Registrar Resultado

```
POST /bets/{betId}/result
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "status": "won",
  "result_odd": 2.5,
  "win_amount": 250.00,
  "notes": "Ganhou como esperado"
}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "won",
  "result_odd": 2.5,
  "win_amount": 250.00,
  "net_gain": 150.00,
  "result_date": "2026-08-17T15:30:00Z",
  ...
}

Errors:
- 400: Status inválido | Dados necessários faltando
- 404: Aposta não encontrada
- 401: Não autenticado
```

### 2.6 Deletar Aposta

```
DELETE /bets/{betId}
Authorization: Bearer {access_token}

Response: 204 No Content

Errors:
- 404: Aposta não encontrada
- 401: Não autenticado
```

### 2.7 Upload Screenshot

```
POST /bets/upload-screenshot
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Request (Form):
- file: <image file> (max 10MB)
- temporary: "true" | "false"

Response: 201 Created
{
  "url": "https://s3.local/apostas/user-123/screenshots/abc123.webp",
  "tempId": "550e8400-e29b-41d4-a716-446655440003",
  "size": 45230,
  "uploadedAt": "2026-08-17T10:30:00Z"
}

Errors:
- 400: Arquivo inválido | Muito grande
- 401: Não autenticado
```

---

## 3. CALCULADORAS

### 3.1 Surebet (2-Way)

```
POST /calculators/surebet
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "odd1": 2.0,
  "odd2": 2.2,
  "stake1": 100
}

Response: 200 OK
{
  "isSurebet": true,
  "profitMargin": 2.30,
  "stake1": 100.00,
  "stake2": 90.91,
  "totalStake": 190.91,
  "guaranteedProfit": 9.09,
  "roi": 4.76,
  "error": null
}

Errors:
- 400: Dados inválidos
- 401: Não autenticado
```

### 3.2 Duplo Green (3-Way)

```
POST /calculators/duplo-green
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "odd1": 1.8,
  "oddX": 3.5,
  "odd2": 2.1,
  "stakeInitial": 100
}

Response: 200 OK
{
  "stake1": 100.00,
  "stakeX": 51.43,
  "stake2": 85.71,
  "totalStake": 237.14,
  "garanteedWin": 180.00,
  "green": -57.14,
  "roi": -24.10,
  "error": null
}

Errors:
- 400: Dados inválidos
- 401: Não autenticado
```

### 3.3 Aposta Grátis (Simples)

```
POST /calculators/free-bet
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "type": "simple",
  "freeBetValue": 50,
  "odd": 3.0
}

Response: 200 OK
{
  "type": "simple",
  "recommendedStake": 50.00,
  "gainIfWin": 100.00,
  "gainIfLose": 0.00,
  "notes": "Aposte R$50 (todo o valor da aposta grátis)...",
  "error": null
}

Errors:
- 400: Dados inválidos
- 401: Não autenticado
```

### 3.4 Aposta Grátis (Com Lay)

```
POST /calculators/free-bet
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "type": "with-lay",
  "freeBetValue": 50,
  "oddBack": 3.0,
  "oddLay": 2.8
}

Response: 200 OK
{
  "type": "with-lay",
  "recommendedStake": 50.00,
  "gainIfWin": 53.57,
  "gainIfLose": 53.57,
  "layStake": 53.57,
  "greenBox": 53.57,
  "notes": "Faça back de R$50 (grátis)...",
  "error": null
}

Errors:
- 400: Dados inválidos
- 401: Não autenticado
```

---

## 4. ANALYTICS

### 4.1 Summary (Resumo de Métricas)

```
GET /analytics/summary?period=month&sport=Futebol
Authorization: Bearer {access_token}

Query Parameters:
- period: "today" | "week" | "month" | "all-time"
- sport (optional): filtro por esporte

Response: 200 OK
{
  "period": "month",
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-31"
  },
  "metrics": {
    "totalBets": 45,
    "betsWon": 28,
    "betsLost": 15,
    "betsVoid": 2,
    "winRate": 62.22,
    "totalStake": 4500.00,
    "totalWinAmount": 6250.00,
    "netGain": 1750.00,
    "roi": 38.89,
    "avgBetSize": 100.00,
    "avgGainPerBet": 38.89,
    "bestBet": { id: "...", netGain: 450.00 },
    "worstBet": { id: "...", netGain: -200.00 }
  },
  "breakdown": {
    "bySport": {
      "Futebol": { bets: 30, netGain: 1200.00 },
      "Tênis": { bets: 10, netGain: 350.00 }
    },
    "byPlatform": {
      "Bet365": { bets: 25, netGain: 900.00 }
    },
    "byBetType": {
      "single": { bets: 35, netGain: 1500.00 }
    }
  }
}

Errors:
- 400: Período inválido
- 401: Não autenticado
```

### 4.2 Cumulative Gain (Ganho Acumulado)

```
GET /analytics/cumulative?period=month
Authorization: Bearer {access_token}

Query Parameters:
- period: "today" | "week" | "month" | "all-time"

Response: 200 OK
[
  {
    "date": "2026-08-01",
    "ganho": 0,
    "balance": 0
  },
  {
    "date": "2026-08-02",
    "ganho": 150.00,
    "balance": 150.00
  },
  {
    "date": "2026-08-03",
    "ganho": -100.00,
    "balance": 50.00
  },
  ...
]

Errors:
- 400: Período inválido
- 401: Não autenticado
```

---

## 5. HEADERS OBRIGATÓRIOS

### Autenticado

```
Authorization: Bearer {access_token}
```

### Uploads

```
Content-Type: multipart/form-data
Authorization: Bearer {access_token}
```

---

## 6. CÓDIGOS DE ERRO PADRÃO

| Código | Descrição |
|--------|-----------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido/ausente |
| 404 | Not Found - Recurso não existe |
| 409 | Conflict - Duplicata (ex: email) |
| 500 | Internal Server Error |

### Resposta de Erro

```json
{
  "error": "Email já está registrado",
  "timestamp": "2026-08-17T10:30:00Z",
  "path": "/auth/signup"
}
```

---

## 7. PAGINAÇÃO

Padrão para endpoints com listas:

```
Query Parameters:
- limit (default: 20, max: 100)
- offset (default: 0)

Response:
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

---

## 8. RATE LIMITING

- Login: 5 tentativas a cada 15 minutos por IP
- API Geral: 100 requests por minuto por token

---

## 9. CORS

```
Allow-Origin: http://localhost:3000 (dev)
             https://apostas.com (prod)
Allow-Methods: GET, POST, PUT, DELETE
Allow-Headers: Authorization, Content-Type
Allow-Credentials: true
```

---

## 10. EXEMPLO DE FLUXO COMPLETO

### Novo User - Do Signup ao Primeiro Bet

```
1. POST /auth/signup
   ├─ Resposta: { access_token, user }
   └─ Guardar token em localStorage

2. POST /bets/upload-screenshot
   ├─ Upload print com access_token
   └─ Resposta: { url, tempId }

3. POST /bets
   ├─ Criar aposta com screenshot_urls do passo 2
   └─ Resposta: { id, status: "pending", ... }

4. GET /bets?status=pending
   ├─ Listar apostas pendentes
   └─ Resposta: { bets: [...], total: 1 }

5. POST /calculators/duplo-green
   ├─ Calcular duplo green
   └─ Resposta: { stake1, stakeX, stake2, green, ... }

6. GET /analytics/summary?period=today
   ├─ Ver resumo do dia
   └─ Resposta: { metrics: { netGain: 0, roi: 0, ... } }

7. POST /bets/{betId}/result
   ├─ Registrar resultado da aposta
   └─ Resposta: { status: "won", net_gain: 150, ... }

8. GET /analytics/summary?period=today
   ├─ Ver novo resumo (com ganho)
   └─ Resposta: { metrics: { netGain: 150, roi: 150, ... } }
```

---

## 11. WEBHOOKS (Futuro)

Opcional para v2:

```
POST /webhooks/bet-result
├─ Trigger quando aposta tem resultado registrado
└─ Payload: { betId, status, netGain, ... }
```

---

**Status**: Pronto para implementação com Claude Code

**Referências**:
- SPEC-APOSTAS-01-CORE.md
- SPEC-APOSTAS-02-AUTH.md
- SPEC-APOSTAS-03-BETS.md
- SPEC-APOSTAS-04-CALCULATORS.md
- SPEC-APOSTAS-05-ANALYTICS.md
