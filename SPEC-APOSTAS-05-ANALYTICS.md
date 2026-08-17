# SPEC-APOSTAS-05-ANALYTICS
## Dashboard & KPIs (Ganho Real)

**Data**: Agosto 2026  
**Versão**: 1.0  
**Depende de**: SPEC-APOSTAS-01-CORE.md, SPEC-APOSTAS-03-BETS.md

---

## 1. VISÃO GERAL

Dashboard centralizado mostrando:
- **Ganho Real** (métrica principal)
- **ROI %** (retorno sobre investimento)
- **Win Rate** (% de apostas ganhas)
- **Histórico** (timeline de apostas)
- **Gráficos** (tendência de ganho, por sport, por plataforma)

---

## 2. MODELO DE DADOS: AGREGAÇÃO

### 2.1 Cache de Métricas (Opcional)

Para grandes volumes, cachear métricas diárias:

```sql
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  
  total_bets INT DEFAULT 0,
  bets_won INT DEFAULT 0,
  bets_lost INT DEFAULT 0,
  bets_void INT DEFAULT 0,
  
  total_stake DECIMAL(12,2) DEFAULT 0,
  total_win_amount DECIMAL(12,2) DEFAULT 0,
  total_net_gain DECIMAL(12,2) DEFAULT 0,
  
  roi_percent DECIMAL(8,4) DEFAULT 0,
  win_rate DECIMAL(8,4) DEFAULT 0,
  
  computed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

---

## 3. KPI: GANHO REAL

### 3.1 Fórmula Definida

```
GANHO REAL = Soma de todos os net_gain

Exemplo:
├─ Aposta 1 (ganha): +R$150
├─ Aposta 2 (perdida): -R$100
├─ Aposta 3 (ganha): +R$50
└─ GANHO REAL = R$100
```

### 3.2 Cálculo: Endpoint GET /analytics/summary

```
GET /analytics/summary?period=month
├─ Query Params:
│  ├─ period ("today" | "week" | "month" | "all-time")
│  └─ sport (optional) - filtrar por esporte
├─ Ações:
│  ├─ Filtrar apostas por período
│  ├─ Calcular métricas agregadas
│  └─ Retornar summary
└─ Response: 200 OK
```

### 3.3 Response Structure

```json
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
    
    "bestBet": {
      "id": "bet-001",
      "description": "Barcelona vs Real",
      "netGain": 450.00
    },
    "worstBet": {
      "id": "bet-015",
      "description": "Federer vs Djokovic",
      "netGain": -200.00
    }
  },
  "breakdown": {
    "bySport": {
      "Futebol": { bets: 30, netGain: 1200.00 },
      "Tênis": { bets: 10, netGain: 350.00 },
      "Basquete": { bets: 5, netGain: 200.00 }
    },
    "byPlatform": {
      "Bet365": { bets: 25, netGain: 900.00 },
      "Betano": { bets: 20, netGain: 850.00 }
    },
    "byBetType": {
      "single": { bets: 35, netGain: 1500.00 },
      "parlay": { bets: 10, netGain: 250.00 }
    }
  }
}
```

### 3.4 Implementação Backend

```typescript
// services/analytics.ts
import Decimal from 'decimal.js';

type Period = 'today' | 'week' | 'month' | 'all-time';

interface AnalyticsParams {
  userId: string;
  tenantId: string;
  period: Period;
  sport?: string;
}

export const calculateSummary = async (
  params: AnalyticsParams
): Promise<any> => {
  const { userId, tenantId, period, sport } = params;

  // 1. Definir range de datas
  const dateRange = getDateRange(period);

  // 2. Query base
  let query = `
    SELECT 
      id, stake, win_amount, net_gain, status, 
      sport, platform, bet_type, created_at, result_date
    FROM bets
    WHERE user_id = $1 
      AND tenant_id = $2
      AND result_date IS NOT NULL
      AND result_date >= $3
      AND result_date <= $4
  `;

  let params_arr = [userId, tenantId, dateRange.from, dateRange.to];

  if (sport) {
    params_arr.push(sport);
    query += ` AND sport = $${params_arr.length}`;
  }

  const bets = await db.query(query, params_arr);

  // 3. Calcular métricas
  const metrics = calculateMetrics(bets.rows);

  // 4. Breakdown
  const breakdown = {
    bySport: calculateBreakdown(bets.rows, 'sport'),
    byPlatform: calculateBreakdown(bets.rows, 'platform'),
    byBetType: calculateBreakdown(bets.rows, 'bet_type')
  };

  return {
    period,
    dateRange,
    metrics,
    breakdown
  };
};

const getDateRange = (period: Period) => {
  const now = new Date();
  let from: Date;

  switch (period) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all-time':
      from = new Date('1970-01-01');
      break;
  }

  return { from, to: now };
};

const calculateMetrics = (bets: any[]) => {
  if (bets.length === 0) {
    return {
      totalBets: 0,
      betsWon: 0,
      betsLost: 0,
      betsVoid: 0,
      winRate: 0,
      totalStake: new Decimal(0),
      totalWinAmount: new Decimal(0),
      netGain: new Decimal(0),
      roi: 0,
      avgBetSize: 0,
      avgGainPerBet: 0,
      bestBet: null,
      worstBet: null
    };
  }

  const totalBets = bets.length;
  const betsWon = bets.filter((b) => b.status === 'won').length;
  const betsLost = bets.filter((b) => b.status === 'lost').length;
  const betsVoid = bets.filter((b) => b.status === 'void').length;

  const winRate = (betsWon / totalBets) * 100;

  const totalStake = bets.reduce(
    (sum, b) => sum.plus(new Decimal(b.stake)),
    new Decimal(0)
  );

  const totalWinAmount = bets.reduce(
    (sum, b) => sum.plus(new Decimal(b.win_amount || 0)),
    new Decimal(0)
  );

  const netGain = bets.reduce(
    (sum, b) => sum.plus(new Decimal(b.net_gain || 0)),
    new Decimal(0)
  );

  const roi = totalStake.isZero()
    ? 0
    : netGain.dividedBy(totalStake).times(100).toNumber();

  const avgBetSize = totalStake.dividedBy(totalBets).toNumber();
  const avgGainPerBet = netGain.dividedBy(totalBets).toNumber();

  // Find best/worst
  const sorted = [...bets].sort(
    (a, b) =>
      new Decimal(b.net_gain || 0)
        .minus(new Decimal(a.net_gain || 0))
        .toNumber()
  );

  return {
    totalBets,
    betsWon,
    betsLost,
    betsVoid,
    winRate: parseFloat(winRate.toFixed(2)),
    totalStake,
    totalWinAmount,
    netGain,
    roi: parseFloat(roi.toFixed(2)),
    avgBetSize: parseFloat(avgBetSize.toFixed(2)),
    avgGainPerBet: parseFloat(avgGainPerBet.toFixed(2)),
    bestBet: sorted[0] || null,
    worstBet: sorted[sorted.length - 1] || null
  };
};

const calculateBreakdown = (bets: any[], field: string) => {
  const grouped: { [key: string]: any } = {};

  for (const bet of bets) {
    const key = bet[field] || 'Unknown';

    if (!grouped[key]) {
      grouped[key] = {
        bets: 0,
        netGain: new Decimal(0)
      };
    }

    grouped[key].bets++;
    grouped[key].netGain = grouped[key].netGain.plus(
      new Decimal(bet.net_gain || 0)
    );
  }

  // Converter para formato de saída
  return Object.entries(grouped).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: {
        bets: value.bets,
        netGain: parseFloat(value.netGain.toFixed(2))
      }
    }),
    {}
  );
};
```

### 3.5 Endpoint: GET /analytics/summary

```typescript
router.get('/analytics/summary', authMiddleware, async (req, res) => {
  const userId = req.user!.id;
  const tenantId = req.tenantId;
  const { period = 'month', sport } = req.query;

  const summary = await calculateSummary({
    userId,
    tenantId,
    period: period as Period,
    sport: sport as string | undefined
  });

  res.json(summary);
});
```

---

## 4. GRÁFICOS: DADOS PARA FRONTEND

### 4.1 Ganho Acumulado ao Longo do Tempo

```
GET /analytics/cumulative?period=month
└─ Response:
   └─ [
       { date: "2026-08-01", ganho: 0, balance: 0 },
       { date: "2026-08-02", ganho: 150, balance: 150 },
       { date: "2026-08-03", ganho: -100, balance: 50 },
       ...
     ]
```

```typescript
export const getCumulativeData = async (params: AnalyticsParams) => {
  const { userId, tenantId, period } = params;
  const dateRange = getDateRange(period);

  const bets = await db.query(
    `SELECT DATE(result_date) as date, net_gain
     FROM bets
     WHERE user_id = $1 AND tenant_id = $2
       AND result_date >= $3 AND result_date <= $4
     ORDER BY result_date`,
    [userId, tenantId, dateRange.from, dateRange.to]
  );

  let balance = new Decimal(0);
  const grouped: { [key: string]: Decimal } = {};

  for (const bet of bets.rows) {
    const date = bet.date.toISOString().split('T')[0];
    const netGain = new Decimal(bet.net_gain || 0);
    balance = balance.plus(netGain);

    if (!grouped[date]) {
      grouped[date] = new Decimal(0);
    }
    grouped[date] = grouped[date].plus(netGain);
  }

  // Retornar série completa de datas
  const result = [];
  let currentBalance = new Decimal(0);

  for (
    let d = new Date(dateRange.from);
    d <= dateRange.to;
    d.setDate(d.getDate() + 1)
  ) {
    const dateStr = d.toISOString().split('T')[0];
    const dailyGain = grouped[dateStr] || new Decimal(0);
    currentBalance = currentBalance.plus(dailyGain);

    result.push({
      date: dateStr,
      ganho: parseFloat(dailyGain.toFixed(2)),
      balance: parseFloat(currentBalance.toFixed(2))
    });
  }

  return result;
};
```

### 4.2 Distribuição por Sport (Pie Chart)

```typescript
export const getSportDistribution = async (params: AnalyticsParams) => {
  const breakdown = await calculateSummary(params);
  return Object.entries(breakdown.breakdown.bySport).map(([sport, data]) => ({
    name: sport,
    value: (data as any).netGain
  }));
};
```

---

## 5. FRONTEND: DASHBOARD COMPONENTS

### 5.1 Estrutura de Componentes

```
Dashboard/
├── Header
│   ├── Period Selector (today | week | month | all-time)
│   └── Sport Filter
├── KPI Cards
│   ├── Net Gain Card
│   ├── ROI Card
│   ├── Win Rate Card
│   └── Total Bets Card
├── Gráficos
│   ├── Cumulative Gain Line Chart
│   ├── Sport Distribution Pie Chart
│   ├── Platform Performance Bar Chart
│   └── Bet Type Breakdown
├── Tabela
│   ├── Recent Bets
│   └── Best/Worst Bets
└── Sidebar
    └── Quick Stats
```

### 5.2 KPI Cards Component (React)

```typescript
// components/Dashboard/KPICards.tsx
import React from 'react';
import { AnalyticsSummary } from '../../types/analytics';

interface KPICardsProps {
  summary: AnalyticsSummary;
  isLoading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({
  summary,
  isLoading
}) => {
  const cards = [
    {
      title: 'Ganho Real',
      value: summary.metrics.netGain.toFixed(2),
      currency: 'R$',
      color: summary.metrics.netGain >= 0 ? 'green' : 'red',
      icon: '💰'
    },
    {
      title: 'ROI',
      value: summary.metrics.roi.toFixed(2),
      unit: '%',
      color: summary.metrics.roi >= 0 ? 'green' : 'red',
      icon: '📈'
    },
    {
      title: 'Win Rate',
      value: summary.metrics.winRate.toFixed(1),
      unit: '%',
      color: summary.metrics.winRate >= 50 ? 'green' : 'orange',
      icon: '🎯'
    },
    {
      title: 'Total de Apostas',
      value: summary.metrics.totalBets.toString(),
      color: 'blue',
      icon: '📊'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`
            p-4 rounded-lg border
            ${card.color === 'green' ? 'border-green-300 bg-green-50' : ''}
            ${card.color === 'red' ? 'border-red-300 bg-red-50' : ''}
            ${card.color === 'blue' ? 'border-blue-300 bg-blue-50' : ''}
            ${card.color === 'orange' ? 'border-orange-300 bg-orange-50' : ''}
          `}
        >
          <div className="text-3xl mb-2">{card.icon}</div>
          <p className="text-sm text-gray-600 font-medium">{card.title}</p>
          <p className="text-2xl font-bold">
            {card.currency || ''}
            {card.value}
            {card.unit || ''}
          </p>
        </div>
      ))}
    </div>
  );
};
```

### 5.3 Cumulative Gain Chart (Recharts)

```typescript
// components/Dashboard/CumulativeChart.tsx
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

export const CumulativeChart: React.FC<{ period: string }> = ({
  period
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/analytics/cumulative', {
          params: { period }
        });
        setData(response.data);
      } catch (error) {
        console.error('Erro ao carregar gráfico:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (loading) return <div>Carregando...</div>;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip
          formatter={(value) => `R$ ${value.toFixed(2)}`}
          labelFormatter={(label) => `Data: ${label}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#10b981"
          strokeWidth={2}
          name="Saldo Acumulado"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

## 6. EXPORTAR DADOS

### 6.1 Endpoint: GET /analytics/export?format=json|csv

```
GET /analytics/export?format=json&period=month
├─ Ações:
│  ├─ Gerar arquivo com todos os dados (bets + métricas)
│  └─ Compactar (ZIP opcional)
└─ Response:
   ├─ Content-Disposition: attachment
   └─ File (JSON ou CSV)
```

---

## 7. CHECKLIST

- [ ] Endpoint GET /analytics/summary
- [ ] Endpoint GET /analytics/cumulative
- [ ] Cálculo de todas as métricas (ROI, Win Rate, etc)
- [ ] Breakdown por sport, platform, bet_type
- [ ] KPI Cards component
- [ ] Cumulative Gain chart
- [ ] Period selector (today | week | month | all-time)
- [ ] Sport filter
- [ ] Best/Worst bets display
- [ ] Responsive design
- [ ] Testes: cálculos de métricas

---

**Próxima Spec**: SPEC-APOSTAS-06-API.md (Resumo de endpoints)
