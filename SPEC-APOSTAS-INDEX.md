# SPEC-APOSTAS: Índice e Roadmap

**Projeto**: Sistema de Controle de Apostas com Calculadoras de Surebet  
**Data**: Agosto 2026  
**Stack**: Node.js + Express + React/TypeScript + PostgreSQL + Docker  
**Status**: Design Phase → Ready for Claude Code Implementation

---

## 📋 Arquivos de Especificação

| Arquivo | Título | Descrição | Status |
|---------|--------|-----------|--------|
| **SPEC-APOSTAS-01-CORE.md** | Visão Geral & Arquitetura | Models, stack, cálculo de ganho real | ✅ Completo |
| **SPEC-APOSTAS-02-AUTH.md** | Autenticação & Autorização | JWT, signup, login, multitenant | ✅ Completo |
| **SPEC-APOSTAS-03-BETS.md** | CRUD de Apostas | Entrada manual, uploads, status | ✅ Completo |
| **SPEC-APOSTAS-04-CALCULATORS.md** | Calculadoras (Críticas!) | Surebet, Duplo Green, Aposta Grátis | ✅ Completo |
| **SPEC-APOSTAS-05-ANALYTICS.md** | Dashboard & KPIs | Ganho real, ROI%, Win Rate, gráficos | ✅ Completo |
| **SPEC-APOSTAS-06-API.md** | API Reference | Todos os 30+ endpoints | ✅ Completo |

---

## 🎯 Objetivos Principais

✅ **Ganho Real**: Rastreamento preciso do lucro/prejuízo  
✅ **Calculadoras Sem Erro**: Surebet, Duplo Green, Aposta Grátis com precisão decimal  
✅ **Dashboard Agregado**: Visualizar KPIs, tendências, histórico  
✅ **Pronto pra Subscription**: Multitenant arquitetura (ativado em v2)  

---

## 📅 Roadmap de Implementação

### Fase 1: Core & Auth (Semana 1-2)
**Objetivo**: Base funcional com autenticação

- [ ] Database setup + migrations (PostgreSQL)
  - [ ] users table + tenants table
  - [ ] bets table
  - [ ] calculator_logs table
  - [ ] Indices e constraints

- [ ] Backend Setup
  - [ ] Express + TypeScript setup
  - [ ] JWT middleware + token generation
  - [ ] Error handling middleware
  - [ ] CORS + Rate limiting

- [ ] Autenticação
  - [ ] POST /auth/signup com validação
  - [ ] POST /auth/login com bcrypt
  - [ ] POST /auth/refresh com token rotation
  - [ ] Testes: signup, login, refresh flow

- [ ] Frontend Setup
  - [ ] React + TypeScript + Tailwind
  - [ ] Router setup (React Router v6)
  - [ ] Axios interceptor pra tokens
  - [ ] Auth context + hooks
  - [ ] Login/Signup pages
  - [ ] Protected routes

**Entregável**: App funcional com login

---

### Fase 2: CRUD Apostas (Semana 3)
**Objetivo**: Sistema completo de entrada/rastreamento de apostas

- [ ] S3/MinIO Setup
  - [ ] Docker compose com MinIO
  - [ ] AWS SDK configurado
  - [ ] Bucket structure

- [ ] Upload de Screenshots
  - [ ] POST /bets/upload-screenshot
  - [ ] Sharp (otimização de imagem)
  - [ ] Multer (handling de upload)
  - [ ] Testes: upload, validação, cleanup

- [ ] CRUD Apostas
  - [ ] POST /bets (criar aposta)
  - [ ] GET /bets (listar com filtros)
  - [ ] GET /bets/:betId (detalhe)
  - [ ] PUT /bets/:betId (editar antes resultado)
  - [ ] DELETE /bets/:betId
  - [ ] Testes: CRUD operations

- [ ] Registrar Resultado
  - [ ] POST /bets/:betId/result
  - [ ] Cálculo com Decimal.js: net_gain, ROI
  - [ ] Validações (status, valores)
  - [ ] Testes: resultado em todos cenários

- [ ] Frontend: Bet Management
  - [ ] Form criar aposta
  - [ ] Upload visual com preview
  - [ ] Lista de apostas (paginação, filtros)
  - [ ] Detalhe de aposta
  - [ ] Marcar resultado
  - [ ] Editar aposta

**Entregável**: Entrada manual de apostas + rastreamento de resultados

---

### Fase 3: Calculadoras (Semana 4)
**Objetivo**: 3 calculadoras sem erro com testes 100%

- [ ] Decimal.js Global Setup
  - [ ] Validar em TODAS operações Math
  - [ ] Testes de precisão vs floating point

- [ ] Calculadora Surebet (2-way)
  - [ ] Fórmula implementada (Spec 4.2-4.3)
  - [ ] POST /calculators/surebet
  - [ ] Edge cases: odds inválidas, não-surebet
  - [ ] Testes: 10+ casos
  - [ ] Frontend: input form + resultado visual

- [ ] Calculadora Duplo Green (3-way)
  - [ ] Fórmula implementada (Spec 4.2-4.3)
  - [ ] POST /calculators/duplo-green
  - [ ] Stakes proporcionais calculados
  - [ ] Testes: 10+ casos incluindo green negativo
  - [ ] Frontend: form 3 odds + resultado

- [ ] Calculadora Aposta Grátis
  - [ ] Modo simples (recomendação de stake)
  - [ ] Modo com lay (green box)
  - [ ] POST /calculators/free-bet
  - [ ] Testes: ambos modos, edge cases
  - [ ] Frontend: selector simples/com-lay

- [ ] Converter Cálculo → Aposta
  - [ ] POST /bets/from-calculator
  - [ ] Criar aposta(s) baseada em cálculo
  - [ ] Associar calculator_logs

**Entregável**: Calculadoras funcionais e confiáveis

---

### Fase 4: Analytics & Dashboard (Semana 5)
**Objetivo**: Visualização completa de ganho real e KPIs

- [ ] Endpoints Analytics
  - [ ] GET /analytics/summary (todas métricas)
  - [ ] GET /analytics/cumulative (ganho ao longo do tempo)
  - [ ] Breakdown: sport, platform, bet_type
  - [ ] Testes: cálculos de métricas

- [ ] Dashboard Backend
  - [ ] Caching diário (optional)
  - [ ] Queries otimizadas
  - [ ] Indices no DB

- [ ] Frontend Dashboard
  - [ ] KPI Cards (Ganho Real, ROI%, Win Rate, Total)
  - [ ] Period Selector (today | week | month | all-time)
  - [ ] Sport Filter
  - [ ] Cumulative Gain Chart (Recharts)
  - [ ] Sport Distribution Pie
  - [ ] Platform Performance Bar
  - [ ] Best/Worst Bets table
  - [ ] Responsive design

- [ ] Frontend: Calculator Pages
  - [ ] /calculators/surebet
  - [ ] /calculators/duplo-green
  - [ ] /calculators/free-bet
  - [ ] Com resultados visuais

**Entregável**: Dashboard completo com todas métricas

---

### Fase 5: Polish & Deploy (Semana 6)
**Objetivo**: Production-ready

- [ ] Testes
  - [ ] Unit tests: calculadoras (100% coverage)
  - [ ] Integration tests: auth flow, bet CRUD
  - [ ] E2E tests: signup → aposta → resultado → analytics
  - [ ] Coverage: >80%

- [ ] Performance
  - [ ] Query optimization
  - [ ] Índices no PostgreSQL
  - [ ] Caching estratégico
  - [ ] Bundle size (webpack)

- [ ] Segurança
  - [ ] HTTPS (produção)
  - [ ] SQL Injection protection (parameterized queries)
  - [ ] XSS protection (React sanitize)
  - [ ] CORS config
  - [ ] Rate limiting produção

- [ ] Deploy: Self-Hosted (EasyPanel)
  - [ ] Docker Compose (backend + DB + MinIO)
  - [ ] EasyPanel setup
  - [ ] Health checks
  - [ ] Backup strategy
  - [ ] .env secrets

- [ ] Deploy: Cloud-Ready (Vercel/Railway)
  - [ ] Frontend → Vercel
  - [ ] Backend → Railway/Render
  - [ ] Database → Managed service
  - [ ] S3 → AWS/Backblaze

- [ ] Documentação
  - [ ] README.md (setup local)
  - [ ] API docs (Swagger/OpenAPI - optional)
  - [ ] Deployment guide

**Entregável**: App em produção pessoal

---

## 💼 Fase 6: Multitenant & Monetização (v2+)
**Não faz parte do MVP**, mas arquitetura já está pronta:

- [ ] Implementar subscription tiers (free, pro, premium)
- [ ] Email verification
- [ ] Onboarding flow
- [ ] Team management (outros users no tenant)
- [ ] Payment integration (Stripe, Mercado Pago)
- [ ] Landing page + marketing

---

## 🛠 Stack Detalhado

### Backend
```
Node.js 20+
├── Express 4
├── TypeScript
├── PostgreSQL 14+
├── Decimal.js (precisão matemática)
├── JWT (jsonwebtoken)
├── bcrypt (password hashing)
├── AWS SDK (S3)
├── Multer (upload)
├── Sharp (image optimization)
└── Dotenv (.env)
```

### Frontend
```
React 18+
├── TypeScript
├── React Router v6
├── Tailwind CSS
├── Recharts (gráficos)
├── Axios (HTTP client)
├── Lucide Icons
└── react-hook-form (forms)
```

### Database
```
PostgreSQL 14+
├── UUID primary keys
├── DECIMAL(12,2) para valores
├── JSONB pra metadata
├── Indices estratégicos
└── Migrations (node-migrate ou similar)
```

### Infraestrutura
```
Docker & Docker Compose
├── backend service
├── postgres service
├── minio service (self-hosted)
└── nginx (reverse proxy)

Deploy:
├── EasyPanel (self-hosted)
├── Vercel (frontend - v1.1+)
└── Railway/Render (backend - v1.1+)
```

---

## 📊 Checklist de Implementação

### Pré-Implementação
- [ ] Ler SPEC-APOSTAS-01-CORE.md completamente
- [ ] Ler SPEC-APOSTAS-04-CALCULATORS.md (crítico!)
- [ ] Setup initial: Node.js, TypeScript, PostgreSQL local
- [ ] Git repo setup

### Implementação
- [ ] Fase 1: Core & Auth (✅ Specs pronto)
- [ ] Fase 2: CRUD Apostas (✅ Specs pronto)
- [ ] Fase 3: Calculadoras (✅ Specs pronto)
- [ ] Fase 4: Analytics (✅ Specs pronto)
- [ ] Fase 5: Polish & Deploy (✅ Specs pronto)

### Pós-Implementação
- [ ] Testes end-to-end
- [ ] Deploy pessoal
- [ ] Go-live
- [ ] Planejar v2 (multitenant)

---

## 🔍 Pontos Críticos

### Calculadoras (Sem Erro!)
- ✅ **Sempre usar Decimal.js** - floating point é inimigo
- ✅ **Testes abrangentes** - 10+ casos por calculadora
- ✅ **Validação de entrada** - rejeitar odds inválidas
- ✅ **Auditoria** - logar todos os cálculos

### Ganho Real
- ✅ **net_gain = win_amount - stake** (simples, mas crítico)
- ✅ **Apostar grátis = entrada 0** (não perde o stake)
- ✅ **ROI% = (ganho / total_apostado) * 100**
- ✅ **Win Rate = (apostas_ganhas / total)**

### Autenticação
- ✅ **JWT com refresh token** (15min + 7dias)
- ✅ **HTTPOnly cookies** (refresh_token)
- ✅ **Rate limiting** no login
- ✅ **Validação de senha** (min 8 chars, 1 upper, 1 lower, 1 number)

### Upload de Screenshots
- ✅ **Validar MIME type** (image/* only)
- ✅ **Limitar tamanho** (10MB max)
- ✅ **Otimizar imagem** (Sharp → WebP)
- ✅ **Limpeza de temporários** (24h TTL)

---

## 🧪 Testes Esperados

```
Cobertura Alvo: >80%

Surebet:
├── Válida com profit
├── Inválida (não-surebet)
├── Odds inválidas
└── Stakes proporcionais corretos

Duplo Green:
├── Stakes 3-way proporcionais
├── Green positivo e negativo
├── Cenários de odds altas
└── ROI calculation

Free Bet:
├── Modo simples
├── Modo com lay (green box)
├── Lay stake calculation
└── Both-ways protection

Ganho Real:
├── Aposta ganha
├── Aposta perdida
├── Aposta void
├── Múltiplas apostas
└── ROI calculation

Analytics:
├── Period filtering (today/week/month/all-time)
├── Sport breakdown
├── Platform breakdown
├── Cumulative gain
└── Best/worst bets
```

---

## 📞 Próximos Passos

### Se usar Claude Code:
1. Abrir Claude Code
2. Carregar este arquivo + todas as 6 specs
3. Pedir: *"Implemente a Fase 1 (Core & Auth) seguindo SPEC-APOSTAS-01-CORE.md e SPEC-APOSTAS-02-AUTH.md"*
4. Depois: *"Implemente a Fase 2 (CRUD Apostas) seguindo SPEC-APOSTAS-03-BETS.md"*
5. Depois: *"Implemente a Fase 3 (Calculadoras) seguindo SPEC-APOSTAS-04-CALCULATORS.md com testes abrangentes"*
6. E assim por diante...

### Se implementar manualmente:
1. Começar com Fase 1 (Auth + Database)
2. Testar cada endpoint antes de prosseguir
3. Implementar Fase 2 (CRUD)
4. **CUIDADO EXTRA** em Fase 3 (Calculadoras) - testes são críticos
5. Fase 4 (Analytics)
6. Fase 5 (Polish)

---

## 📝 Notas Adicionais

- **Decimal.js**: Não negocie. 2.5 * 100 = 250.00 sempre.
- **Testes**: Calculadoras precisam de testes unitários robustos.
- **Ganho Real**: Métrica #1. Tudo deve convergir pra isso.
- **Multitenant**: Arquitetura já está pronta, ativa em v2.
- **Screenshots**: Importante pra comprovação = confiança.

---

**Status Final**: ✅ Pronto para implementação  
**Gerado em**: Agosto 2026  
**Próximo Passo**: Implementar Fase 1 com Claude Code ou manualmente

---

## 📚 Referência Rápida

| Quando preciso de... | Ver arquivo |
|---------------------|-----------|
| Estrutura geral do projeto | SPEC-01-CORE.md |
| Setup de autenticação | SPEC-02-AUTH.md |
| CRUD de apostas | SPEC-03-BETS.md |
| Implementar calculadoras | SPEC-04-CALCULATORS.md |
| Dashboard e KPIs | SPEC-05-ANALYTICS.md |
| Endpoints API | SPEC-06-API.md |

**Bora codar! 🚀**
