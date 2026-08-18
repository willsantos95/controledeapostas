import Decimal from "decimal.js";

export interface DuploGreenInput {
  odd1: number | string;
  oddX: number | string;
  odd2: number | string;
  stakeInitial: number | string;
}

export interface DuploGreenResult {
  stake1: Decimal;
  stakeX: Decimal;
  stake2: Decimal;
  totalStake: Decimal;
  garanteedWin: Decimal;
  green: Decimal;
  roi: Decimal;
  error?: string;
}

const zeroResult = (error: string): DuploGreenResult => ({
  stake1: new Decimal(0),
  stakeX: new Decimal(0),
  stake2: new Decimal(0),
  totalStake: new Decimal(0),
  garanteedWin: new Decimal(0),
  green: new Decimal(0),
  roi: new Decimal(0),
  error,
});

export const calculateDuploGreen = (
  input: DuploGreenInput
): DuploGreenResult => {
  try {
    const odd1 = new Decimal(input.odd1);
    const oddX = new Decimal(input.oddX);
    const odd2 = new Decimal(input.odd2);
    const stakeInitial = new Decimal(input.stakeInitial);

    if (
      odd1.lessThanOrEqualTo(0) ||
      oddX.lessThanOrEqualTo(0) ||
      odd2.lessThanOrEqualTo(0)
    ) {
      return zeroResult("Todas as odds devem ser maiores que 0");
    }
    if (stakeInitial.lessThanOrEqualTo(0)) {
      return zeroResult("Stake inicial deve ser maior que 0");
    }

    const stake1 = stakeInitial;
    const stakeX = stakeInitial.times(odd1.dividedBy(oddX));
    const stake2 = stakeInitial.times(odd1.dividedBy(odd2));

    const garanteedWin = stakeInitial.times(odd1);
    const totalStake = stake1.plus(stakeX).plus(stake2);
    const green = garanteedWin.minus(totalStake);
    const roi = green.dividedBy(totalStake).times(100);

    return {
      stake1,
      stakeX,
      stake2,
      totalStake,
      garanteedWin,
      green,
      roi,
    };
  } catch (error) {
    return zeroResult(
      `Erro no cálculo: ${error instanceof Error ? error.message : "Desconhecido"}`
    );
  }
};
