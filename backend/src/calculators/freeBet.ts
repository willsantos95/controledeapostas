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
}

export type FreeBetInput = FreeBetInputSimple | FreeBetInputWithLay;

export interface FreeBetResult {
  type: "simple" | "with-lay";
  recommendedStake: Decimal;
  gainIfWin: Decimal;
  gainIfLose: Decimal;
  greenBox?: Decimal;
  layStake?: Decimal;
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

  if (freeBetValue.lessThanOrEqualTo(0)) {
    return zeroResult("with-lay", "Free bet value deve ser > 0");
  }
  if (oddBack.lessThanOrEqualTo(1.0) || oddLay.lessThanOrEqualTo(1.0)) {
    return zeroResult("with-lay", "Ambas odds devem ser > 1.0");
  }

  const layStake = freeBetValue.times(oddBack.plus(1)).dividedBy(oddLay);
  const greenBox = freeBetValue.times(oddBack).minus(layStake);

  return {
    type: "with-lay",
    recommendedStake: freeBetValue,
    gainIfWin: greenBox,
    gainIfLose: greenBox,
    layStake,
    greenBox,
    notes: `Faça back de R$${freeBetValue.toFixed(2)} (grátis) a odd ${oddBack.toFixed(2)}. Faça lay de R$${layStake.toFixed(2)} a odd ${oddLay.toFixed(2)}. Ganho GARANTIDO: R$${greenBox.toFixed(2)} independente do resultado.`,
  };
};
