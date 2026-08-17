# SPEC-APOSTAS-01-CORE
## Controle de Apostas & Calculadoras de Surebet

**Data**: Agosto 2026  
**Versão**: 1.0  
**Status**: Design Phase  

---

## 1. VISÃO GERAL

Sistema pessoal de controle de apostas esportivas com foco em **ganho real** e ferramentas de cálculo preditivo (surebets, duplo green, aposta grátis).

### 1.1 Objetivos Principais
1. **Rastrear ganho real** com precisão (entradas, saídas, conversão de apostas grátis)
2. **Calcular oportunidades sem erro** (surebet 2-way, duplo green 3-way, valor ótimo aposta grátis)
3. **Dashboard agregado** mostrando ROI%, lucro acumulado, tendências de desempenho
4. **Comprovação visual** via upload de prints das entradas

### 1.2 Escopo MVP
- ✅ Registro manual de apostas (criação, resultado, ganho/perda)
- ✅ Upload de prints (comprovação)
- ✅ Calculadora Surebet (2 entradas)
- ✅ Calculadora Duplo Green (3 apostas: casa, empate, fora)
- ✅ Calculadora Aposta Grátis (com recomendação de valor)
- ✅ Dashboard: ganho real, ROI%, histórico de apostas
- ✅ Auth pessoal (email/senha)
- ✅ Infraestrutura self-hosting (Docker/EasyPanel) com opção Vercel

### 1.3 Fora do Escopo MVP
- ❌ Integração com plataformas de bet (Bet365, Betano)
- ❌ Scraping de odds em tempo real
- ❌ Multitenant (pronto na arquitetura, ativa em v2)
- ❌ Chat/suporte integrado

---

## 2. STACK TÉCNICO

```
Frontend:     React 18+ com TypeScript
UI/Styling:   Tailwind CSS
Backend:      Node.js 20+ + Express
Banco:        PostgreSQL 14+
Auth:         JWT (email/password) + opcional OAuth
Uploads:      AWS S3 (ou self-hosted S3 compat) para prints
Cálculos:     Precisão decimal (Decimal.js pra evitar float errors)
Hosting MVP:  Docker + EasyPanel (self-hosted)
Hosting v1.1: Vercel (frontend) + Render/Railway (backend)
```

---

## 3. MODELS & ESTRUTURA DE DADOS

### 3.1 User (MVP: Pessoal)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Multitenant (v2)
  role ENUM('owner', 'admin', 'user') DEFAULT 'user',
  last_login TIMESTAMP
);
```

### 3.2 Tenant (Estrutura pra v2)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subscription_tier ENUM('free', 'pro', 'premium') DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Limites (para v2)
  max_bets_per_month INT DEFAULT 50,
  max_calculators_per_day INT DEFAULT 100,
  
  metadata JSONB DEFAULT '{}'
);
```

### 3.3 Bet (Aposta Registrada)

```sql
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identificação
  bet_id VARCHAR(100) NOT NULL, -- Referência do bilhete (ex: "BET-001", "Betano-12345")
  platform VARCHAR(100), -- Bet365, Betano, Pragmatic, etc
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Entrada
  stake DECIMAL(12,2) NOT NULL, -- Valor apostado (R$)
  initial_odds DECIMAL(8,4) NOT NULL, -- Odd inicial na criação
  bet_type ENUM('single', 'parlay', 'multiple', 'system', 'free') DEFAULT 'single',
  
  -- Metadata
  sport VARCHAR(100), -- Futebol, Tênis, etc
  event_description TEXT, -- "Barcelona vs Real Madrid", "Federer vs Djokovic"
  bet_description TEXT, -- Descrição adicional
  
  -- Status & Resultado
  status ENUM('pending', 'won', 'lost', 'void', 'canceled') DEFAULT 'pending',
  result_odd DECIMAL(8,4), -- Odd final (se won/lost/void)
  win_amount DECIMAL(12,2), -- Ganho bruto (stake * result_odd)
  net_gain DECIMAL(12,2), -- Ganho líquido (win_amount - stake)
  result_date TIMESTAMP, -- Data do resultado
  
  -- Capturas
  screenshot_urls TEXT[], -- URLs dos prints (S3/self-hosted)
  
  -- Rastreamento
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);
```

### 3.4 Calculator Log (Histórico de Cálculos)

```sql
CREATE TABLE calculator_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  calculator_type ENUM('surebet_2way', 'duplo_green_3way', 'free_bet_converter'),
  input_data JSONB NOT NULL, -- Dados de entrada (odds, stakes)
  output_data JSONB NOT NULL, -- Resultado do cálculo
  
  is_saved BOOLEAN DEFAULT false, -- Se foi convertido em aposta real
  bet_id UUID REFERENCES bets(id), -- Link pra aposta if saved
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. LÓGICA CENTRAL: CÁLCULO DE GANHO REAL

### 4.1 Definição: Ganho Real

**Ganho Real = Soma de todas as saídas - Soma de todas as entradas**

```
Entrada: R$ 100 apostado
Saída 1: Aposta ganha → +R$ 250 (stake + ganho)
Saída 2: Aposta perdida → -R$ 50
Saída 3: Aposta grátis convertida → +R$ 75

Ganho Real = (250 - 100) + (-50) + 75 = R$ 175
```

### 4.2 Tipos de Transação

1. **Aposta Comum (Single/Parlay)**
   - Entrada: `stake`
   - Saída: Se win → `win_amount`, Se lost → 0

2. **Aposta Grátis**
   - Entrada: 0 (Grátis)
   - Saída: Se win → `win_amount - free_bet_value`, Se lost → 0

3. **Duplo Green / Surebet Ativo**
   - Múltiplas apostas simultâneas
   - Entrada: Soma de todos os stakes
   - Saída: Ganho garantido (calculado previamente)

### 4.3 Dashboard Metrics

```
Total Entradas: SUM(stake) onde status != 'canceled'
Total Saídas: SUM(win_amount - stake) onde status = 'won'
Ganho Real: Total Saídas - Total Entradas
ROI%: (Ganho Real / Total Entradas) * 100

Apostas: Total | Ganhas | Perdidas | Void
Média por aposta: Ganho Real / Total de apostas
Win Rate: (Apostas Ganhas / Total) * 100
```

---

## 5. CALCULADORAS: ESPECIFICAÇÃO TÉCNICA

### 5.1 Calculadora Surebet (2-way)

**Uso**: Duas plataformas com odds diferentes pra mesmo evento.

**Entrada**:
- Odd 1 (casa A)
- Odd 2 (casa B)
- Stake 1 (valor apostado em A)

**Cálculo**:
```
profit% = (1 / odd_1 + 1 / odd_2 - 1) * 100
Se profit% < 0 → não é surebet
Se profit% > 0:
  stake_2 = stake_1 * (odd_1 / odd_2)
  ganho_garantido = (stake_1 * odd_1) - stake_1 - stake_2
  roi% = (ganho_garantido / (stake_1 + stake_2)) * 100
```

**Validação**:
- Ambas as odds > 1.0
- Profit% sempre >= 0
- Resultado com 4 casas decimais (ex: 2.3456%)

### 5.2 Calculadora Duplo Green (3-way)

**Uso**: Três apostas em vitória casa (1), empate (X), vitória fora (2) do mesmo jogo.

**Entrada**:
- Odd para Casa (1)
- Odd para Empate (X)
- Odd para Fora (2)
- Stake para Casa

**Cálculo**:
```
// Green garantido
min_odd = MIN(odd_1, odd_x, odd_2)

// Calcular stakes proporcionais
stake_1 = stake_inicial
stake_x = stake_inicial * (odd_1 / odd_x)
stake_2 = stake_inicial * (odd_1 / odd_2)

// Ganho se qualquer outcome vencer
ganho = stake_inicial * odd_1
stake_total = stake_1 + stake_x + stake_2

green_garantido = ganho - stake_total
roi% = (green_garantido / stake_total) * 100
```

**Validação**:
- Todas as odds > 1.0
- Green garantido >= 0 (aviso se negativo)

### 5.3 Calculadora Aposta Grátis (Free Bet Converter)

**Uso**: Maximizar ganho quando casa oferece aposta grátis (ex: "Ganhe R$50 em apostas grátis").

**Entrada**:
- Odd do evento
- Valor da aposta grátis (ex: R$50)
- (Opcional) Odd complementar pra lay/contra-aposta

**Cálculo (Simples - sem lay)**:
```
free_bet_value = R$50
odd = 2.5

// Valor ótimo a apostar (maximiza ganho)
optimal_stake = free_bet_value // Usar todo valor da aposta grátis

ganho_se_ganhar = (optimal_stake * odd) - free_bet_value
ganho_se_perder = 0

// Resultado esperado
ev = (ganho_se_ganhar * 0.5) + (ganho_se_perder * 0.5) // Simplificado
```

**Cálculo (Com Lay - pra exchanges tipo Betfair)**:
```
// Recomendação de lay value
free_bet_value = R$50
odd_back = 3.0
odd_lay = 2.8 (odd complementar)

// Calcular stake de lay pra neutralizar risco
lay_stake = (free_bet_value * odd_back) / (odd_lay - 1)

// Ganho/perda em ambos cenários
cenario_back_win = (free_bet_value * odd_back) - lay_stake - free_bet_value
cenario_lay_win = lay_stake - (free_bet_value * odd_back)

// Ganho liquido = MIN dos dois cenários (valor garantido)
ganho_garantido = MIN(cenario_back_win, cenario_lay_win)
```

**Output**:
- Valor recomendado a apostar
- Ganho esperado se vencer
- Perda esperada se perder
- "Green box" se oferecer both-ways protection

---

## 6. RASTREAMENTO DE PRECISÃO

### 6.1 Validações Críticas

```typescript
// Usar Decimal.js pra evitar floating point errors
import Decimal from 'decimal.js';

// ❌ NUNCA
let ganho = 100 * 2.5 - 100; // Pode dar 149.99999... ou 150.00001

// ✅ SEMPRE
let ganho = new Decimal(100)
  .times(2.5)
  .minus(100); // Preciso: 150.00
```

### 6.2 Auditoria de Cálculos

```sql
CREATE TABLE calculation_audits (
  id UUID PRIMARY KEY,
  bet_id UUID REFERENCES bets(id),
  
  field_name VARCHAR(100), -- 'stake', 'win_amount', 'net_gain'
  calculated_value DECIMAL(12,2),
  entered_value DECIMAL(12,2),
  
  matches BOOLEAN,
  discrepancy DECIMAL(12,2),
  
  checked_at TIMESTAMP DEFAULT NOW(),
  checked_by VARCHAR(100)
);
```

---

## 7. FLUXO DE DESENVOLVIMENTO

### Fase 1: Core (Semana 1-2)
- [x] Database setup + migrations
- [x] Auth (JWT + email/password)
- [x] CRUD Bets
- [x] Upload de prints (S3)

### Fase 2: Calculadoras (Semana 3)
- [x] Surebet 2-way
- [x] Duplo Green 3-way
- [x] Aposta Grátis

### Fase 3: Dashboard (Semana 4)
- [x] KPIs principais (ganho real, ROI%, win rate)
- [x] Histórico de apostas
- [x] Gráficos de tendência

### Fase 4: Polish & Deploy (Semana 5)
- [x] Testes unitários (calculadoras)
- [x] Docker + EasyPanel
- [x] Go-live pessoal

---

## 8. PRÓXIMOS PASSOS

1. **SPEC-APOSTAS-02-AUTH.md** → Setup de autenticação
2. **SPEC-APOSTAS-03-BETS.md** → CRUD de apostas + uploads
3. **SPEC-APOSTAS-04-CALCULATORS.md** → Implementação das 3 calculadoras
4. **SPEC-APOSTAS-05-ANALYTICS.md** → Dashboard e KPIs
5. **SPEC-APOSTAS-06-API.md** → Endpoints da API

---

**Referências Anteriores**:
- Padrão SDD: SPEC-OFERTA-RELAY-* (seu projeto anterior)
- Tech Stack: Node.js + Express + React + PostgreSQL + Docker
- Precisão: Sempre usar Decimal.js
