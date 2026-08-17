# Controle de Apostas

Sistema pessoal de controle de apostas esportivas com calculadoras de surebet.

Este repositório contém a **Fase 1 (Core & Auth)** e a **Fase 2 (CRUD de Apostas & Upload de Screenshots)** do roadmap: estrutura de monorepo, autenticação JWT completa, CRUD de apostas com upload de screenshots via MinIO/S3, e frontend com login/signup/dashboard/apostas.

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

Os testes cobrem hashing de senha, validação de força de senha/email, geração/verificação de JWT, validação de payload das rotas de auth e de apostas, e o cálculo de `net_gain` com Decimal.js para os 4 cenários de resultado (won/lost/void/canceled) — tudo sem exigir banco ou MinIO reais rodando. Testes de integração completos (com banco e S3) podem ser adicionados rodando `docker-compose up -d` antes de `npm test`.

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

## Páginas do frontend (Fase 2)

- `/bets` — lista de apostas com filtros (status, esporte) e paginação
- `/bets/new` — formulário de criação de aposta com upload de screenshots
- `/bets/:id` — detalhe da aposta, com botão de editar (se pendente) e marcar resultado
- `/bets/:id/edit` — edição de aposta pendente

## Próximas fases

- Fase 3: Calculadoras (Surebet, Duplo Green, Aposta Grátis)
- Fase 4: Analytics & Dashboard
- Fase 5: Polish & Deploy

Ver `SPEC-APOSTAS-INDEX.md` para o roadmap completo.
