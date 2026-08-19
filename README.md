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

**S3/MinIO é opcional.** Ele só é usado pelo upload de prints/comprovação das apostas (`POST /bets/upload-screenshot`). Se `S3_ENDPOINT` não estiver definido, o backend sobe normalmente e todo o resto funciona (login, CRUD de apostas sem print, calculadoras, dashboard) — só a rota de upload retorna `503` com uma mensagem explicando que o storage não está configurado.

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
| POST | `/calculators/distribution` | sim |
| POST | `/calculators/free-bet` | sim |

`/calculators/distribution` é uma calculadora genérica de N pernas (`legs: [{ odds, isFreebet? }]` + `anchorStake`) que substitui as antigas calculadoras fixas de Surebet (2-way) e Duplo Green (3-way) — ambas são apenas casos particulares (2 ou 3 pernas) do mesmo cálculo. Cada perna pode ser marcada como `isFreebet` (custo zero, útil para combinar apostas grátis com hedges pagos). Retorna o stake/custo/lucro de cada perna, o total investido e o lucro mínimo garantido (ROI%).

`/calculators/free-bet` no modo `with-lay` aceita `exchangeCommission` (%) e usa a fórmula padrão de matched betting (`layStake = freeBetValue * (oddBack - 1) / (oddLay - comissão)`), retornando também o saldo (`liability`) necessário na exchange para cobrir o lay.

Todo cálculo é registrado em `calculator_logs` para auditoria. Um cálculo pode ser convertido em aposta(s) real(is) via `POST /bets/from-calculator`, informando `calculator_type` (`distribution` ou `free_bet_converter`), `calculator_data` (o resultado retornado pela calculadora) e, opcionalmente, `calculator_log_id` para marcar o log como salvo.

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
- `/calculators/distribution` — calculadora genérica de distribuição de apostas (N pernas, cobre surebet, duplo green e combinações com freebet)
- `/calculators/free-bet` — calculadora de aposta grátis (modo simples e com lay, com comissão de exchange)
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

### Opção A — EasyPanel (via Docker Compose)

Repositório: [github.com/willsantos95/controledeapostas](https://github.com/willsantos95/controledeapostas) (privado).

1. No EasyPanel, crie um novo projeto do tipo **App from Docker Compose** (ou similar, "Compose" no menu de criação) e aponte para este repositório GitHub, branch `main`, arquivo `docker-compose.yml` na raiz.
2. Defina as variáveis de ambiente do projeto no EasyPanel (elas alimentam o `docker-compose.yml` via interpolação `${VAR}`):
   - `JWT_SECRET` — string aleatória forte, mínimo 32 caracteres (gere com `openssl rand -base64 32`)
   - `POSTGRES_PASSWORD` — senha forte para o Postgres
   - `S3_ACCESS_KEY` / `S3_SECRET_KEY` — credenciais do MinIO (não use `minioadmin` em produção)
   - `S3_BUCKET` — nome do bucket (padrão `apostas-bucket`)
   - `FRONTEND_URL` — URL pública do frontend, ex: `https://apostas.seudominio.com`
   - `VITE_API_URL` — URL pública do backend, ex: `https://api-apostas.seudominio.com`
3. Ao publicar, o EasyPanel deve subir os 4 serviços do compose com o profile `full` ativo (`docker compose --profile full up -d --build`) — se a UI não expuser o profile diretamente, configure o comando de start do projeto para incluir `--profile full`.
4. No EasyPanel, associe domínios/HTTPS ao serviço `frontend` (porta interna `80`) e, se quiser expor a API em subdomínio próprio, ao serviço `backend` (porta interna `4000`). Não é necessário expor `postgres` (`5432`) nem `minio` (`9000`/`9001`) publicamente — mantenha-os só na rede interna do projeto.
5. O backend aplica as migrations automaticamente no boot (`node dist/db/migrate.js && node dist/server.js`) e cria o bucket do MinIO se não existir.
6. Configure backup periódico dos volumes `apostas_pgdata` (Postgres) e `apostas_miniodata` (screenshots) nas configurações de volume do EasyPanel.
7. Health checks já configurados: `GET /health` no backend, `pg_isready` no Postgres, `mc ready` no MinIO, e `HEALTHCHECK` nos dois Dockerfiles — o EasyPanel deve refletir o status "healthy" de cada serviço automaticamente.

### Opção B — Self-hosted manual com Docker Compose (VPS própria)

1. `git clone` este repositório na VPS, copie `.env.example` (raiz) para `.env` e preencha as mesmas variáveis do passo 2 acima.
2. Suba a stack completa:

   ```bash
   docker compose --profile full up -d --build
   ```
3. Coloque um reverse proxy (Nginx, Traefik, Caddy) na frente de `frontend` (porta `8080` do host) e `backend` (porta `4000` do host) para TLS/HTTPS.

Em desenvolvimento local, continue usando apenas `docker-compose up -d` (sem `--profile full`) para subir só Postgres + MinIO, e rode backend/frontend via `npm run dev` como descrito acima — os serviços `backend`/`frontend` do compose só sobem quando o profile `full` é explicitamente selecionado. Mesmo nesse modo, um `.env` na raiz (copiado de `.env.example`) é necessário, pois o Docker Compose valida `JWT_SECRET` na interpolação do arquivo antes de aplicar o filtro de profile.

### Opção B — Cloud-ready (Vercel + Railway/Render)

- **Frontend → Vercel**: aponte o projeto para `frontend/`, build command `npm run build`, output `dist/`, e defina `VITE_API_URL` apontando para o backend publicado.
- **Backend → Railway/Render**: aponte para `backend/`, build command `npm run build`, start command `node dist/db/migrate.js && node dist/server.js` (ou rode a migration como job separado), e defina as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `S3_*`).
- **Database → serviço gerenciado** (ex: Railway Postgres, Neon, RDS).
- **S3 → AWS S3 ou Backblaze B2** no lugar do MinIO — basta apontar `S3_ENDPOINT`/`S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_BUCKET` para o provedor escolhido; o backend usa `@aws-sdk/client-s3` com `forcePathStyle: true`, compatível com qualquer storage S3-compatible.

Ver `SPEC-APOSTAS-INDEX.md` para o roadmap completo. O roadmap do MVP (Fases 1–5) está concluído; a Fase 6 (multitenant e monetização) é um trabalho futuro fora do escopo atual.
