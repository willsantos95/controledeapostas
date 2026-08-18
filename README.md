# Controle de Apostas

Sistema pessoal de controle de apostas esportivas com calculadoras de surebet.

Este repositório contém a **Fase 1 (Core & Auth)**, **Fase 2 (CRUD de Apostas & Upload de Screenshots)**, **Fase 3 (Calculadoras)** e **Fase 4 (Analytics & Dashboard)** do roadmap: estrutura de monorepo, autenticação JWT completa, CRUD de apostas com upload de screenshots via MinIO/S3, calculadoras de Surebet/Duplo Green/Aposta Grátis com precisão decimal, dashboard com KPIs e gráficos, e frontend com login/signup/dashboard/apostas/calculadoras.

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

## Próximas fases

- Fase 5: Polish & Deploy

Ver `SPEC-APOSTAS-INDEX.md` para o roadmap completo.
