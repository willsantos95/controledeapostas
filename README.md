# Controle de Apostas

Sistema pessoal de controle de apostas esportivas com calculadoras de surebet.

Este repositório contém a **Fase 1 (Core & Auth)** do roadmap: estrutura de monorepo, autenticação JWT completa e frontend com login/signup/dashboard protegido.

## Estrutura

```
backend/    Node.js 20 + Express + TypeScript + PostgreSQL
frontend/   React 18 + TypeScript + Vite + Tailwind CSS
docker-compose.yml   Postgres para desenvolvimento local
```

## Como rodar localmente

### 1. Subir o PostgreSQL

```bash
docker-compose up -d
```

Isso sobe um Postgres em `localhost:5432` (user/senha/db: `apostas`).

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate   # aplica as migrations em migrations/
npm run dev       # inicia em http://localhost:4000
```

Edite `.env` e defina um `JWT_SECRET` forte antes de qualquer uso real.

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

Os testes cobrem hashing de senha, validação de força de senha/email, geração/verificação de JWT e validação de payload das rotas de auth (sem exigir banco real rodando). Testes de integração completos (signup → login → refresh com banco) podem ser adicionados rodando `docker-compose up -d` antes de `npm test`.

## Endpoints implementados (Fase 1)

| Método | Rota | Auth |
|---|---|---|
| POST | `/auth/signup` | não |
| POST | `/auth/login` | não |
| POST | `/auth/logout` | sim |
| GET | `/auth/refresh` | cookie |
| GET | `/auth/me` | sim |

## Próximas fases

- Fase 2: CRUD de apostas + upload de screenshots (MinIO)
- Fase 3: Calculadoras (Surebet, Duplo Green, Aposta Grátis)
- Fase 4: Analytics & Dashboard
- Fase 5: Polish & Deploy

Ver `SPEC-APOSTAS-INDEX.md` para o roadmap completo.
