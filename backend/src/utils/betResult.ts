import Decimal from "decimal.js";

export type BetResultStatus = "won" | "lost" | "void" | "canceled";

export interface BetResultInput {
  status: BetResultStatus;
  stake: string | number;
  resultOdd?: string | number | null;
  winAmount?: string | number | null;
}

export interface BetResultCalculation {
  netGain: Decimal;
  winAmount: Decimal;
  resultOdd: Decimal | null;
}

export function calculateBetResult(input: BetResultInput): BetResultCalculation {
  const stake = new Decimal(input.stake);

  if (input.status === "won") {
    if (input.resultOdd === undefined || input.resultOdd === null || input.winAmount === undefined || input.winAmount === null) {
      throw new Error("result_odd e win_amount são necessários para apostas ganhas");
    }

    const resultOdd = new Decimal(input.resultOdd);
    const winAmount = new Decimal(input.winAmount);

    if (resultOdd.lessThan(1)) {
      throw new Error("result_odd deve ser >= 1.0");
    }
    if (winAmount.lessThan(0)) {
      throw new Error("win_amount deve ser >= 0");
    }

    return {
      netGain: winAmount.minus(stake),
      winAmount,
      resultOdd,
    };
  }

  if (input.status === "lost") {
    return {
      netGain: new Decimal(0).minus(stake),
      winAmount: new Decimal(0),
      resultOdd: null,
    };
  }

  return {
    netGain: new Decimal(0),
    winAmount: stake,
    resultOdd: null,
  };
}
