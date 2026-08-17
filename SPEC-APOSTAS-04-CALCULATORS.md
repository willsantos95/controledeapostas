# SPEC-APOSTAS-04-CALCULATORS
## Calculadora Surebet, Duplo Green & Aposta Grátis

**Data**: Agosto 2026  
**Versão**: 1.0  
**Status**: Critical Path (Sem Erros!)  
**Depende de**: SPEC-APOSTAS-01-CORE.md

---

## 1. PRINCÍPIO GERAL: PRECISÃO

**OBRIGATÓRIO**: Usar `Decimal.js` em TODAS as operações matemáticas.

```typescript
import Decimal from 'decimal.js';

// ❌ NUNCA - floating point errors
const profit = (100 * 2.5) - 100; // 150.00000000000003

// ✅ SEMPRE
const profit = new Decimal(100)
  .times(2.5)
  .minus(100); // 150.00 exato
```

---

## 2. CALCULADORA SUREBET (2-WAY)

### 2.1 Conceito

Aproveitar diferença de odds em duas casas de apostas pra ganho garantido.

```
Exemplo Real:
─────────────
Casa A: Resultado "SIM" com odd 2.0
Casa B: Resultado "NÃO" com odd 2.2

Se apostar 100 em A e 90,9 em B:
  → Se SIM vence: Ganho = (100 * 2.0) - 100 - 90.9 = 9.1
  → Se NÃO vence: Ganho = (90.9 * 2.2) - 100 - 90.9 = 9.1

Ganho GARANTIDO de R$9.1 independente do resultado!
```

### 2.2 Fórmula Matemática

```
ENTRADA:
  odd_1 = Odd na casa A
  odd_2 = Odd na casa B
  stake_1 = Valor apostado na casa A

CÁLCULO:
  1. Verificar se é surebet:
     margin = (1/odd_1) + (1/odd_2)
     profit% = (1 - margin) * 100
     
     Se profit% <= 0 → NÃO é surebet
     
  2. Calcular stake_2:
     stake_2 = stake_1 * (odd_1 / odd_2)
     
  3. Ganho garantido:
     ganho = (stake_1 * odd_1) - stake_1 - stake_2
     
  4. ROI:
     total_apostado = stake_1 + stake_2
     roi% = (ganho / total_apostado) * 100
```

### 2.3 Implementação Backend

```typescript
// calculators/surebet.ts
import Decimal from 'decimal.js';

interface SurebetInput {
  odd1: number;
  odd2: number;
  stake1: number;
}

interface SurebetResult {
  isSurebet: boolean;
  profitMargin: Decimal; // em %
  stake1: Decimal;
  stake2: Decimal;
  totalStake: Decimal;
  guaranteedProfit: Decimal; // em R$
  roi: Decimal; // em %
  error?: string;
}

export const calculateSurebet = (input: SurebetInput): SurebetResult => {
  try {
    const odd1 = new Decimal(input.odd1);
    const odd2 = new Decimal(input.odd2);
    const stake1 = new Decimal(input.stake1);

    // Validações
    if (odd1.lessThanOrEqualTo(0) || odd2.lessThanOrEqualTo(0)) {
      return {
        isSurebet: false,
        profitMargin: new Decimal(0),
        stake1: new Decimal(0),
        stake2: new Decimal(0),
        totalStake: new Decimal(0),
        guaranteedProfit: new Decimal(0),
        roi: new Decimal(0),
        error: 'Odds devem ser maiores que 0'
      };
    }

    if (stake1.lessThanOrEqualTo(0)) {
      return {
        isSurebet: false,
        profitMargin: new Decimal(0),
        stake1: new Decimal(0),
        stake2: new Decimal(0),
        totalStake: new Decimal(0),
        guaranteedProfit: new Decimal(0),
        roi: new Decimal(0),
        error: 'Stake deve ser maior que 0'
      };
    }

    // 1. Calcular margin
    const invOdd1 = new Decimal(1).dividedBy(odd1);
    const invOdd2 = new Decimal(1).dividedBy(odd2);
    const margin = invOdd1.plus(invOdd2);
    const profitMargin = new Decimal(1)
      .minus(margin)
      .times(100);

    // Não é surebet se margin >= 1 (profit <= 0)
    if (margin.greaterThanOrEqualTo(1)) {
      return {
        isSurebet: false,
        profitMargin: profitMargin,
        stake1: stake1,
        stake2: new Decimal(0),
        totalStake: stake1,
        guaranteedProfit: new Decimal(0),
        roi: new Decimal(0),
        error: `Não é uma surebet. Margin: ${margin.toFixed(4)} (deve ser < 1.0)`
      };
    }

    // 2. Calcular stake_2
    const stake2 = stake1.times(odd1.dividedBy(odd2));

    // 3. Ganho garantido
    const winIfOdd1 = stake1.times(odd1);
    const totalStake = stake1.plus(stake2);
    const guaranteedProfit = winIfOdd1
      .minus(stake1)
      .minus(stake2);

    // 4. ROI
    const roi = guaranteedProfit
      .dividedBy(totalStake)
      .times(100);

    return {
      isSurebet: true,
      profitMargin: profitMargin,
      stake1: stake1,
      stake2: stake2,
      totalStake: totalStake,
      guaranteedProfit: guaranteedProfit,
      roi: roi
    };
  } catch (error) {
    return {
      isSurebet: false,
      profitMargin: new Decimal(0),
      stake1: new Decimal(0),
      stake2: new Decimal(0),
      totalStake: new Decimal(0),
      guaranteedProfit: new Decimal(0),
      roi: new Decimal(0),
      error: `Erro no cálculo: ${error instanceof Error ? error.message : 'Desconhecido'}`
    };
  }
};
```

### 2.4 Teste Unitário

```typescript
// calculators/__tests__/surebet.test.ts
import { calculateSurebet } from '../surebet';
import Decimal from 'decimal.js';

describe('Calculadora Surebet', () => {
  it('deve calcular corretamente uma surebet válida', () => {
    const result = calculateSurebet({
      odd1: 2.0,
      odd2: 2.2,
      stake1: 100
    });

    expect(result.isSurebet).toBe(true);
    expect(result.guaranteedProfit.toFixed(2)).toBe('9.09');
    expect(result.roi.toDecimalPlaces(2).toString()).toBe('9.09');
  });

  it('deve rejeitar quando não é surebet', () => {
    const result = calculateSurebet({
      odd1: 1.5,
      odd2: 1.5,
      stake1: 100
    });

    expect(result.isSurebet).toBe(false);
    expect(result.guaranteedProfit.toString()).toBe('0');
  });

  it('deve validar stake > 0', () => {
    const result = calculateSurebet({
      odd1: 2.0,
      odd2: 2.0,
      stake1: -100
    });

    expect(result.isSurebet).toBe(false);
    expect(result.error).toContain('Stake deve ser maior que 0');
  });
});
```

### 2.5 Endpoint: POST /calculators/surebet

```
POST /calculators/surebet
├─ Headers: Authorization (JWT)
├─ Body:
│  ├─ odd1 (number, required)
│  ├─ odd2 (number, required)
│  ├─ stake1 (number, required)
│  └─ saveAsBet (boolean, optional) - criar aposta automaticamente
├─ Response: 200 OK
   └─ SurebetResult (ver acima)
```

```typescript
router.post('/calculators/surebet', authMiddleware, (req, res) => {
  const { odd1, odd2, stake1 } = req.body;

  const result = calculateSurebet({ odd1, odd2, stake1 });

  // Logging pra auditoria
  await db.query(
    `INSERT INTO calculator_logs (user_id, calculator_type, input_data, output_data)
     VALUES ($1, $2, $3, $4)`,
    [
      req.user!.id,
      'surebet_2way',
      JSON.stringify({ odd1, odd2, stake1 }),
      JSON.stringify(result)
    ]
  );

  res.json(result);
});
```

---

## 3. CALCULADORA DUPLO GREEN (3-WAY)

### 3.1 Conceito

Apostar nos 3 resultados possíveis de um jogo (1, X, 2) com proporcionalidades de stake pra garantir ganho.

```
Exemplo Real:
─────────────
Jogo: Barcelona vs Real Madrid
Odd 1 (Barcelona): 1.8
Odd X (Empate): 3.5
Odd 2 (Real): 2.1

Stake inicial pra Barcelona: 100

Apostas proporcionais:
  stake_1 = 100
  stake_x = 100 * (1.8 / 3.5) = 51.43
  stake_2 = 100 * (1.8 / 2.1) = 85.71

Resultados:
  → Barcelona vence: 100 * 1.8 = 180 | Gasto: 100 + 51.43 + 85.71 = 237.14 | GREEN = -57.14
  → Empate: 51.43 * 3.5 = 180 | Gasto: 237.14 | GREEN = -57.14
  → Real vence: 85.71 * 2.1 = 180 | Gasto: 237.14 | GREEN = -57.14

Obs: Verde NEGATIVO neste caso (odds altas). Ajustar odds pra verde positivo.
```

### 3.2 Fórmula Matemática

```
ENTRADA:
  odd_1 = Odd vitória casa
  odd_x = Odd empate
  odd_2 = Odd vitória fora
  stake_inicial = Valor apostado em 1

CÁLCULO:
  1. Calcular stakes proporcionais:
     stake_1 = stake_inicial
     stake_x = stake_inicial * (odd_1 / odd_x)
     stake_2 = stake_inicial * (odd_1 / odd_2)
     
  2. Calcular ganho em cada cenário (sempre = odd_1 * stake_inicial):
     ganho = stake_inicial * odd_1
     
  3. Total apostado:
     total_apostado = stake_1 + stake_x + stake_2
     
  4. Ganho garantido (green):
     green = ganho - total_apostado
     
  5. ROI:
     roi% = (green / total_apostado) * 100
```

### 3.3 Implementação Backend

```typescript
// calculators/duploGreen.ts
import Decimal from 'decimal.js';

interface DuploGreenInput {
  odd1: number; // Vitória casa
  oddX: number; // Empate
  odd2: number; // Vitória fora
  stakeInitial: number;
}

interface DuploGreenResult {
  stake1: Decimal;
  stakeX: Decimal;
  stake2: Decimal;
  totalStake: Decimal;
  garanteedWin: Decimal; // Ganho em qualquer cenário
  green: Decimal; // Ganho líquido (garanteedWin - totalStake)
  roi: Decimal; // em %
  error?: string;
}

export const calculateDuploGreen = (
  input: DuploGreenInput
): DuploGreenResult => {
  try {
    const odd1 = new Decimal(input.odd1);
    const oddX = new Decimal(input.oddX);
    const odd2 = new Decimal(input.odd2);
    const stakeInitial = new Decimal(input.stakeInitial);

    // Validações
    if (
      odd1.lessThanOrEqualTo(0) ||
      oddX.lessThanOrEqualTo(0) ||
      odd2.lessThanOrEqualTo(0)
    ) {
      return {
        stake1: new Decimal(0),
        stakeX: new Decimal(0),
        stake2: new Decimal(0),
        totalStake: new Decimal(0),
        garanteedWin: new Decimal(0),
        green: new Decimal(0),
        roi: new Decimal(0),
        error: 'Todas as odds devem ser maiores que 0'
      };
    }

    if (stakeInitial.lessThanOrEqualTo(0)) {
      return {
        stake1: new Decimal(0),
        stakeX: new Decimal(0),
        stake2: new Decimal(0),
        totalStake: new Decimal(0),
        garanteedWin: new Decimal(0),
        green: new Decimal(0),
        roi: new Decimal(0),
        error: 'Stake inicial deve ser maior que 0'
      };
    }

    // 1. Calcular stakes proporcionais
    const stake1 = stakeInitial;
    const stakeX = stakeInitial.times(odd1.dividedBy(oddX));
    const stake2 = stakeInitial.times(odd1.dividedBy(odd2));

    // 2. Ganho em qualquer cenário
    const garanteedWin = stakeInitial.times(odd1);

    // 3. Total apostado
    const totalStake = stake1.plus(stakeX).plus(stake2);

    // 4. Green (ganho líquido)
    const green = garanteedWin.minus(totalStake);

    // 5. ROI
    const roi = green.dividedBy(totalStake).times(100);

    return {
      stake1: stake1,
      stakeX: stakeX,
      stake2: stake2,
      totalStake: totalStake,
      garanteedWin: garanteedWin,
      green: green,
      roi: roi
    };
  } catch (error) {
    return {
      stake1: new Decimal(0),
      stakeX: new Decimal(0),
      stake2: new Decimal(0),
      totalStake: new Decimal(0),
      garanteedWin: new Decimal(0),
      green: new Decimal(0),
      roi: new Decimal(0),
      error: `Erro no cálculo: ${error instanceof Error ? error.message : 'Desconhecido'}`
    };
  }
};
```

### 3.4 Teste Unitário

```typescript
describe('Calculadora Duplo Green', () => {
  it('deve calcular stakes proporcionais corretamente', () => {
    const result = calculateDuploGreen({
      odd1: 1.8,
      oddX: 3.5,
      odd2: 2.1,
      stakeInitial: 100
    });

    expect(result.stake1.toFixed(2)).toBe('100.00');
    expect(result.stakeX.toFixed(2)).toBe('51.43');
    expect(result.stake2.toFixed(2)).toBe('85.71');
    
    // Ganho em qualquer cenário = 180
    expect(result.garanteedWin.toFixed(2)).toBe('180.00');
  });

  it('deve calcular green corretamente', () => {
    const result = calculateDuploGreen({
      odd1: 2.0,
      oddX: 3.0,
      odd2: 4.0,
      stakeInitial: 100
    });

    // green = 200 - (100 + 66.67 + 50) = -16.67 (não é boa)
    expect(result.green.isNegative()).toBe(true);
  });
});
```

### 3.5 Endpoint: POST /calculators/duplo-green

```
POST /calculators/duplo-green
├─ Body:
│  ├─ odd1 (number) - Vitória casa
│  ├─ oddX (number) - Empate
│  ├─ odd2 (number) - Vitória fora
│  └─ stakeInitial (number)
└─ Response: DuploGreenResult
```

---

## 4. CALCULADORA APOSTA GRÁTIS (FREE BET)

### 4.1 Conceito

Maximizar ganho ao usar "aposta grátis" oferecida pela casa.

**Dois Cenários**:

#### 4.1.1 Sem Lay (Aposta Simples)

```
Exemplo:
Casa oferece R$50 de aposta grátis.
Você encontra odd de 3.0 pra um evento.

Cenário 1 - Aposta comum:
  Stake: R$50 | Odd: 3.0 | Win: R$150
  Ganho líquido: 150 - 50 = R$100

Cenário 2 - Aposta grátis:
  Stake: R$50 (GRÁTIS!) | Odd: 3.0 | Win: R$150
  Ganho líquido: 150 (não perde o R$50) = R$150

Valor recomendado a apostar: R$50 (use tudo)
Ganho se vencer: R$150
Perda se perder: R$0
```

#### 4.1.2 Com Lay (Proteção via Betfair/Exchange)

```
Você tem R$50 de aposta grátis em Betano.
Aposta "Barcelona vence" a odd 3.0 em Betano (grátis).
Faz lay (contra-aposta) em Betfair a odd 2.8.

Cenário 1 - Barcelona vence:
  Back wins: 50 * 3.0 = R$150
  Lay loses: paga lay_stake
  Net: 150 - lay_stake

Cenário 2 - Barcelona não vence:
  Back loses: R$0 (era grátis!)
  Lay wins: ganha lay_stake - 50
  Net: lay_stake - 50

Objetivo: Fazer net_gain ser IGUAL em ambos cenários = "green box"
```

### 4.2 Fórmula: Sem Lay (Simples)

```
ENTRADA:
  free_bet_value = Valor da aposta grátis
  odd = Odd do evento
  
CÁLCULO:
  1. Valor ótimo a apostar:
     optimal_stake = free_bet_value // Usar tudo
     
  2. Ganho se vencer:
     ganho_win = (optimal_stake * odd) - free_bet_value
     
  3. Ganho se perder:
     ganho_loss = 0 - free_bet_value = -free_bet_value
     
  4. Recomendação:
     Apontar que há risco de perder free_bet_value
```

### 4.3 Fórmula: Com Lay (Proteção)

```
ENTRADA:
  free_bet_value = Valor da aposta grátis
  odd_back = Odd do back (aposta)
  odd_lay = Odd do lay (contra-aposta)
  
CÁLCULO:
  1. Calcular lay_stake pra igualar ganhos:
     // Cenário back wins:
     back_win = (free_bet_value * odd_back) - lay_stake
     
     // Cenário lay wins:
     lay_win = (lay_stake * (odd_lay - 1)) - free_bet_value
     
     // Igualar:
     back_win = lay_win
     (free_bet_value * odd_back) - lay_stake = 
       (lay_stake * (odd_lay - 1)) - free_bet_value
     
     // Resolver para lay_stake:
     lay_stake = (free_bet_value * (odd_back + 1)) / odd_lay
     
  2. Green box (ganho garantido):
     green = (free_bet_value * odd_back) - lay_stake
```

### 4.4 Implementação Backend

```typescript
// calculators/freeBet.ts
import Decimal from 'decimal.js';

interface FreeBetInputSimple {
  freeBetValue: number;
  odd: number;
  type: 'simple';
}

interface FreeBetInputWithLay {
  freeBetValue: number;
  oddBack: number;
  oddLay: number;
  type: 'with-lay';
}

type FreeBetInput = FreeBetInputSimple | FreeBetInputWithLay;

interface FreeBetResult {
  type: 'simple' | 'with-lay';
  recommendedStake: Decimal;
  gainIfWin: Decimal;
  gainIfLose: Decimal;
  greenBox?: Decimal; // Apenas se with-lay
  layStake?: Decimal; // Apenas se with-lay
  notes: string;
  error?: string;
}

export const calculateFreeBet = (input: FreeBetInput): FreeBetResult => {
  try {
    if (input.type === 'simple') {
      return calculateFreeBetSimple(
        input as FreeBetInputSimple
      );
    } else {
      return calculateFreeBetWithLay(input as FreeBetInputWithLay);
    }
  } catch (error) {
    return {
      type: input.type,
      recommendedStake: new Decimal(0),
      gainIfWin: new Decimal(0),
      gainIfLose: new Decimal(0),
      notes: '',
      error: `Erro no cálculo: ${error instanceof Error ? error.message : 'Desconhecido'}`
    };
  }
};

const calculateFreeBetSimple = (
  input: FreeBetInputSimple
): FreeBetResult => {
  const freeBetValue = new Decimal(input.freeBetValue);
  const odd = new Decimal(input.odd);

  if (freeBetValue.lessThanOrEqualTo(0)) {
    return {
      type: 'simple',
      recommendedStake: new Decimal(0),
      gainIfWin: new Decimal(0),
      gainIfLose: new Decimal(0),
      notes: '',
      error: 'Free bet value deve ser > 0'
    };
  }

  if (odd.lessThanOrEqualTo(1.0)) {
    return {
      type: 'simple',
      recommendedStake: new Decimal(0),
      gainIfWin: new Decimal(0),
      gainIfLose: new Decimal(0),
      notes: '',
      error: 'Odd deve ser > 1.0'
    };
  }

  const recommendedStake = freeBetValue;
  const gainIfWin = freeBetValue.times(odd).minus(freeBetValue);
  const gainIfLose = new Decimal(0); // Não perde porque é grátis

  return {
    type: 'simple',
    recommendedStake: recommendedStake,
    gainIfWin: gainIfWin,
    gainIfLose: gainIfLose,
    notes: `Aposte R$${freeBetValue.toFixed(2)} (todo o valor da aposta grátis). Se vencer, ganho de R$${gainIfWin.toFixed(2)}. Se perder, perde R$0 (era grátis).`
  };
};

const calculateFreeBetWithLay = (
  input: FreeBetInputWithLay
): FreeBetResult => {
  const freeBetValue = new Decimal(input.freeBetValue);
  const oddBack = new Decimal(input.oddBack);
  const oddLay = new Decimal(input.oddLay);

  // Validações
  if (freeBetValue.lessThanOrEqualTo(0)) {
    return {
      type: 'with-lay',
      recommendedStake: new Decimal(0),
      gainIfWin: new Decimal(0),
      gainIfLose: new Decimal(0),
      notes: '',
      error: 'Free bet value deve ser > 0'
    };
  }

  if (oddBack.lessThanOrEqualTo(1.0) || oddLay.lessThanOrEqualTo(1.0)) {
    return {
      type: 'with-lay',
      recommendedStake: new Decimal(0),
      gainIfWin: new Decimal(0),
      gainIfLose: new Decimal(0),
      notes: '',
      error: 'Ambas odds devem ser > 1.0'
    };
  }

  // Calcular lay_stake
  // lay_stake = (free_bet_value * (odd_back + 1)) / odd_lay
  const layStake = freeBetValue
    .times(oddBack.plus(1))
    .dividedBy(oddLay);

  // Green box: ganho em qualquer cenário
  const greenBox = freeBetValue.times(oddBack).minus(layStake);

  return {
    type: 'with-lay',
    recommendedStake: freeBetValue,
    gainIfWin: greenBox,
    gainIfLose: greenBox,
    layStake: layStake,
    greenBox: greenBox,
    notes: `Faça back de R$${freeBetValue.toFixed(2)} (grátis) a odd ${oddBack.toFixed(2)}. Faça lay de R$${layStake.toFixed(2)} a odd ${oddLay.toFixed(2)}. Ganho GARANTIDO: R$${greenBox.toFixed(2)} independente do resultado.`
  };
};
```

### 4.5 Teste Unitário

```typescript
describe('Calculadora Free Bet', () => {
  it('deve calcular aposta grátis simples', () => {
    const result = calculateFreeBet({
      type: 'simple',
      freeBetValue: 50,
      odd: 3.0
    });

    expect(result.type).toBe('simple');
    expect(result.gainIfWin.toFixed(2)).toBe('100.00');
    expect(result.gainIfLose.toFixed(2)).toBe('0.00');
  });

  it('deve calcular green box com lay', () => {
    const result = calculateFreeBet({
      type: 'with-lay',
      freeBetValue: 50,
      oddBack: 3.0,
      oddLay: 2.8
    });

    expect(result.type).toBe('with-lay');
    expect(result.greenBox).toBeDefined();
    // Green deve ser positivo
    expect(result.greenBox!.isPositive()).toBe(true);
  });
});
```

### 4.6 Endpoint: POST /calculators/free-bet

```
POST /calculators/free-bet
├─ Body:
│  ├─ type ("simple" | "with-lay")
│  ├─ freeBetValue (number)
│  ├─ odd (number) - se simple
│  ├─ oddBack (number) - se with-lay
│  └─ oddLay (number) - se with-lay
└─ Response: FreeBetResult
```

---

## 5. SALVANDO CÁLCULOS COMO APOSTAS

Após calcular, user pode converter em aposta real:

```
POST /bets/from-calculator
├─ Body:
│  ├─ calculator_type ("surebet_2way" | "duplo_green_3way" | "free_bet")
│  ├─ calculator_data (result completo)
│  ├─ platform (ex: "Bet365")
│  ├─ event_description (ex: "Barcelona vs Real")
│  └─ notes
├─ Ações:
│  ├─ Criar aposta(s) baseada no cálculo
│  ├─ Associar ao log da calculadora
│  └─ Retornar bet(s) criado(s)
└─ Response: Bet | Bet[]
```

---

## 6. CHECKLIST

- [ ] Decimal.js setup em todas as operações
- [ ] Surebet: fórmula + implementação + testes
- [ ] Duplo Green: fórmula + implementação + testes
- [ ] Free Bet (simples): fórmula + implementação + testes
- [ ] Free Bet (com lay): fórmula + implementação + testes
- [ ] POST /calculators/surebet endpoint
- [ ] POST /calculators/duplo-green endpoint
- [ ] POST /calculators/free-bet endpoint
- [ ] POST /bets/from-calculator endpoint
- [ ] Frontend: 3 calculator interfaces
- [ ] Testes: todos os edge cases
- [ ] Documentação: exemplos reais em cada calculator

---

**Próxima Spec**: SPEC-APOSTAS-05-ANALYTICS.md (Dashboard & KPIs)
