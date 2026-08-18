# Controle de Apostas

Sistema pessoal de controle de apostas esportivas com calculadoras de surebet.

Este repositório contém o roadmap completo do MVP — **Fase 1 (Core & Auth)**, **Fase 2 (CRUD de Apostas & Upload de Screenshots)**, **Fase 3 (Calculadoras)**, **Fase 4 (Analytics & Dashboard)** e **Fase 5 (Polish & Deploy)**: estrutura de monorepo, autenticação JWT completa, CRUD de apostas com upload de screenshots via MinIO/S3, calculadoras de Surebet/Duplo Green/Aposta Grátis com precisão decimal, dashboard com KPIs e gráficos, hardening de segurança (Helmet, rate limiting) e Dockerfiles de produção prontos para deploy self-hosted.

## Estrutura

```
backend/    Node.js 20 + Express + TypeScript + PostgreSQL + MinIO (S3)
frontend/   React 18 + TypeScript + Vite + Tailwind CSS
docker-compose.yml   Postgres + MinIO para desenvolvimento local
```

## Como rodar localmente

### 1. Subir o PostgreSQL e o MinIO

```bash
docker-compose up -d
```

Isso sobe:
- Postgres em `localhost:5432` (user/senha/db: `apostas`)
- MinIO (S3 compatível) em `localhost:9000` (API) e `localhost:9001` (console web), usuário/senha `minioadmin`/`minioadmin`

O bucket configurado em `S3_BUCKET` (padrão `apostas-bucket`) é criado automaticamente pelo backend na inicialização, se ainda não existir.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate   # aplica as migrations em migrations/
npm run dev       # inicia em http://localhost:4000
```

Edite `.env` e defina um `JWT_SECRET` forte antes de qualquer uso real. As variáveis `S3_*` já vêm configuradas para o MinIO local do `docker-compose.yml`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # inicia em http://localhost:5173
```

### 4. Testes do backend

```bash
cd backend
npm test
```

Os testes cobrem hashing de senha, validação de força de senha/email, geração/verificação de JWT, validação de payload das rotas de auth, apostas, calculadoras e analytics, o cálculo de `net_gain` com Decimal.js para os 4 cenários de resultado (won/lost/void/canceled), as fórmulas das 3 calculadoras (surebet, duplo green, aposta grátis), e as funções de métricas/breakdown/série acumulada do dashboard — tudo sem exigir banco ou MinIO reais rodando. Testes de integração completos (com banco e S3) podem ser adicionados rodando `docker-compose up -d` antes de `npm test`.

## Endpoints implementados

### Fase 1 — Auth

| Método | Rota | Auth |
|---|---|---|
| POST | `/auth/signup` | não |
| POST | `/auth/login` | não |
| POST | `/auth/logout` | sim |
| GET | `/auth/refresh` | cookie |
| GET | `/auth/me` | sim |

### Fase 2 — Apostas

| Método | Rota | Auth |
|---|---|---|
| POST | `/bets/upload-screenshot` | sim |
| POST | `/bets` | sim |
| GET | `/bets` | sim |
| GET | `/bets/:betId` | sim |
| PUT | `/bets/:betId` | sim |
| POST | `/bets/:betId/result` | sim |
| DELETE | `/bets/:betId` | sim |
| POST | `/bets/from-calculator` | sim |

### Fase 3 — Calculadoras

| Método | Rota | Auth |
|---|---|---|
| POST | `/calculators/surebet` | sim |
| POST | `/calculators/duplo-green` | sim |
| POST | `/calculators/free-bet` | sim |

Todo cálculo é registrado em `calculator_logs` para auditoria. Um cálculo pode ser convertido em aposta(s) real(is) via `POST /bets/from-calculator`, informando `calculator_type`, `calculator_data` (o resultado retornado pela calculadora) e, opcionalmente, `calculator_log_id` para marcar o log como salvo.

### Fase 4 — Analytics

| Método | Rota | Auth |
|---|---|---|
| GET | `/analytics/summary?period=&sport=` | sim |
| GET | `/analytics/cumulative?period=` | sim |

`period` aceita `today`, `week`, `month` (padrão) ou `all-time`. `summary` retorna métricas agregadas (ganho real, ROI%, win rate, melhor/pior aposta) e breakdown por esporte/plataforma/tipo de aposta, sempre baseado em apostas com resultado (`result_date` preenchido). `cumulative` retorna a série diária de ganho e saldo acumulado usada no gráfico do dashboard.

## Páginas do frontend

- `/bets` — lista de apostas com filtros (status, esporte) e paginação
- `/bets/new` — formulário de criação de aposta com upload de screenshots
- `/bets/:id` — detalhe da aposta, com botão de editar (se pendente) e marcar resultado
- `/bets/:id/edit` — edição de aposta pendente
- `/calculators/surebet` — calculadora de surebet 2-way
- `/calculators/duplo-green` — calculadora de duplo green 3-way
- `/calculators/free-bet` — calculadora de aposta grátis (modo simples e com lay)
- `/dashboard` — KPIs (ganho real, ROI%, win rate, total de apostas), seletor de período, filtro de esporte, gráfico de ganho acumulado, distribuição por esporte e por plataforma, e melhor/pior aposta do período

## Segurança (Fase 5)

- Todas as rotas de dados exigem JWT via `authMiddleware`; senhas com bcrypt (12 rounds); queries sempre parametrizadas (proteção contra SQL injection).
- `helmet()` define cabeçalhos HTTP de segurança padrão em todas as respostas.
- Rate limiting em duas camadas: `loginLimiter` (5 tentativas / 15min) no `/auth/login`, e `apiLimiter` (300 requisições / 15min por IP) em toda a API.
- CORS restrito à origem definida em `FRONTEND_URL`, com `credentials: true` apenas para essa origem.
- Refresh token em cookie `httpOnly` + `sameSite: strict`, nunca acessível via JavaScript no frontend.
- React escapa strings por padrão (sem `dangerouslySetInnerHTML` em nenhuma página), o que cobre a proteção contra XSS no MVP.
- HTTPS é responsabilidade da camada de proxy/reverse proxy em produção (EasyPanel, Nginx, Vercel, Railway) — os serviços aqui rodam em HTTP puro dentro da rede interna.

## Deploy

### Opção A — Self-hosted com Docker Compose (EasyPanel ou VPS própria)

1. Copie `.env.example` (raiz) para `.env` e defina um `JWT_SECRET` forte (mín. 32 caracteres aleatórios) e ajuste `FRONTEND_URL`/`VITE_API_URL` para o domínio público real.
2. Suba a stack completa (Postgres + MinIO + backend + frontend) com o profile `full`:

   ```bash
   docker compose --profile full up -d --build
   ```

   O backend aplica as migrations automaticamente antes de iniciar (`node dist/db/migrate.js && node dist/server.js`), e cria o bucket do MinIO no startup se não existir.
3. Exponha `frontend` (porta 80 do container, mapeada para `8080` no host) atrás do proxy HTTPS do EasyPanel/Nginx, e `backend` (porta `4000`) na mesma rede interna — não é necessário expor a porta do backend publicamente se o proxy fizer o roteamento `/api` → backend.
4. Configure backup periódico do volume `apostas_pgdata` (Postgres) e `apostas_miniodata` (screenshots).
5. Health checks já configurados: `GET /health` no backend, `pg_isready` no Postgres, `mc ready` no MinIO, e `HEALTHCHECK` nos dois Dockerfiles.

Em desenvolvimento local, continue usando apenas `docker-compose up -d` (sem `--profile full`) para subir só Postgres + MinIO, e rode backend/frontend via `npm run dev` como descrito acima — os serviços `backend`/`frontend` do compose só sobem quando o profile `full` é explicitamente selecionado.

### Opção B — Cloud-ready (Vercel + Railway/Render)

- **Frontend → Vercel**: aponte o projeto para `frontend/`, build command `npm run build`, output `dist/`, e defina `VITE_API_URL` apontando para o backend publicado.
- **Backend → Railway/Render**: aponte para `backend/`, build command `npm run build`, start command `node dist/db/migrate.js && node dist/server.js` (ou rode a migration como job separado), e defina as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `S3_*`).
- **Database → serviço gerenciado** (ex: Railway Postgres, Neon, RDS).
- **S3 → AWS S3 ou Backblaze B2** no lugar do MinIO — basta apontar `S3_ENDPOINT`/`S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_BUCKET` para o provedor escolhido; o backend usa `@aws-sdk/client-s3` com `forcePathStyle: true`, compatível com qualquer storage S3-compatible.

Ver `SPEC-APOSTAS-INDEX.md` para o roadmap completo. O roadmap do MVP (Fases 1–5) está concluído; a Fase 6 (multitenant e monetização) é um trabalho futuro fora do escopo atual.
