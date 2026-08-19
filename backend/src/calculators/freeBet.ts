import Decimal from "decimal.js";

export interface FreeBetInputSimple {
  type: "simple";
  freeBetValue: number | string;
  odd: number | string;
}

export interface FreeBetInputWithLay {
  type: "with-lay";
  freeBetValue: number | string;
  oddBack: number | string;
  oddLay: number | string;
  exchangeCommission?: number | string;
}

export type FreeBetInput = FreeBetInputSimple | FreeBetInputWithLay;

export interface FreeBetResult {
  type: "simple" | "with-lay";
  recommendedStake: Decimal;
  gainIfWin: Decimal;
  gainIfLose: Decimal;
  greenBox?: Decimal;
  layStake?: Decimal;
  liability?: Decimal;
  notes: string;
  error?: string;
}

const zeroResult = (type: "simple" | "with-lay", error: string): FreeBetResult => ({
  type,
  recommendedStake: new Decimal(0),
  gainIfWin: new Decimal(0),
  gainIfLose: new Decimal(0),
  notes: "",
  error,
});

export const calculateFreeBet = (input: FreeBetInput): FreeBetResult => {
  try {
    if (input.type === "simple") {
      return calculateFreeBetSimple(input);
    }
    return calculateFreeBetWithLay(input);
  } catch (error) {
    return zeroResult(
      input.type,
      `Erro no cálculo: ${error instanceof Error ? error.message : "Desconhecido"}`
    );
  }
};

const calculateFreeBetSimple = (input: FreeBetInputSimple): FreeBetResult => {
  const freeBetValue = new Decimal(input.freeBetValue);
  const odd = new Decimal(input.odd);

  if (freeBetValue.lessThanOrEqualTo(0)) {
    return zeroResult("simple", "Free bet value deve ser > 0");
  }
  if (odd.lessThanOrEqualTo(1.0)) {
    return zeroResult("simple", "Odd deve ser > 1.0");
  }

  const recommendedStake = freeBetValue;
  const gainIfWin = freeBetValue.times(odd).minus(freeBetValue);
  const gainIfLose = new Decimal(0);

  return {
    type: "simple",
    recommendedStake,
    gainIfWin,
    gainIfLose,
    notes: `Aposte R$${freeBetValue.toFixed(2)} (todo o valor da aposta grátis). Se vencer, ganho de R$${gainIfWin.toFixed(2)}. Se perder, perde R$0 (era grátis).`,
  };
};

const calculateFreeBetWithLay = (input: FreeBetInputWithLay): FreeBetResult => {
  const freeBetValue = new Decimal(input.freeBetValue);
  const oddBack = new Decimal(input.oddBack);
  const oddLay = new Decimal(input.oddLay);
  const commission = new Decimal(input.exchangeCommission ?? 0).dividedBy(100);

  if (freeBetValue.lessThanOrEqualTo(0)) {
    return zeroResult("with-lay", "Free bet value deve ser > 0");
  }
  if (oddBack.lessThanOrEqualTo(1.0) || oddLay.lessThanOrEqualTo(1.0)) {
    return zeroResult("with-lay", "Ambas odds devem ser > 1.0");
  }
  if (commission.lessThan(0) || commission.greaterThanOrEqualTo(1)) {
    return zeroResult("with-lay", "Comissão da exchange deve estar entre 0 e 100%");
  }
  if (oddLay.lessThanOrEqualTo(commission)) {
    return zeroResult("with-lay", "Odd lay deve ser maior que a comissão da exchange");
  }

  // Fórmula padrão de matched betting: layStake = backStake*(backOdds-1) / (layOdds - comissão)
  const layStake = freeBetValue
    .times(oddBack.minus(1))
    .dividedBy(oddLay.minus(commission));

  const liability = layStake.times(oddLay.minus(1));
  const profitIfBackWins = freeBetValue.times(oddBack.minus(1)).minus(liability);
  const profitIfLayWins = layStake.times(new Decimal(1).minus(commission));
  const greenBox = Decimal.min(profitIfBackWins, profitIfLayWins);

  return {
    type: "with-lay",
    recommendedStake: freeBetValue,
    gainIfWin: profitIfBackWins,
    gainIfLose: profitIfLayWins,
    layStake,
    liability,
    greenBox,
    notes: `Faça back de R$${freeBetValue.toFixed(2)} (grátis) a odd ${oddBack.toFixed(2)}. Faça lay de R$${layStake.toFixed(2)} a odd ${oddLay.toFixed(2)} (comissão ${commission.times(100).toFixed(2)}%, saldo necessário na exchange: R$${liability.toFixed(2)}). Ganho GARANTIDO: R$${greenBox.toFixed(2)} independente do resultado.`,
  };
};
