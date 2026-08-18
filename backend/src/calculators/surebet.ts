import Decimal from "decimal.js";

export interface SurebetInput {
  odd1: number | string;
  odd2: number | string;
  stake1: number | string;
}

export interface SurebetResult {
  isSurebet: boolean;
  profitMargin: Decimal;
  stake1: Decimal;
  stake2: Decimal;
  totalStake: Decimal;
  guaranteedProfit: Decimal;
  roi: Decimal;
  error?: string;
}

const zeroResult = (error: string): SurebetResult => ({
  isSurebet: false,
  profitMargin: new Decimal(0),
  stake1: new Decimal(0),
  stake2: new Decimal(0),
  totalStake: new Decimal(0),
  guaranteedProfit: new Decimal(0),
  roi: new Decimal(0),
  error,
});

export const calculateSurebet = (input: SurebetInput): SurebetResult => {
  try {
    const odd1 = new Decimal(input.odd1);
    const odd2 = new Decimal(input.odd2);
    const stake1 = new Decimal(input.stake1);

    if (odd1.lessThanOrEqualTo(0) || odd2.lessThanOrEqualTo(0)) {
      return zeroResult("Odds devem ser maiores que 0");
    }
    if (stake1.lessThanOrEqualTo(0)) {
      return zeroResult("Stake deve ser maior que 0");
    }

    const invOdd1 = new Decimal(1).dividedBy(odd1);
    const invOdd2 = new Decimal(1).dividedBy(odd2);
    const margin = invOdd1.plus(invOdd2);
    const profitMargin = new Decimal(1).minus(margin).times(100);

    if (margin.greaterThanOrEqualTo(1)) {
      return {
        isSurebet: false,
        profitMargin,
        stake1,
        stake2: new Decimal(0),
        totalStake: stake1,
        guaranteedProfit: new Decimal(0),
        roi: new Decimal(0),
        error: `Não é uma surebet. Margin: ${margin.toFixed(4)} (deve ser < 1.0)`,
      };
    }

    const stake2 = stake1.times(odd1.dividedBy(odd2));
    const winIfOdd1 = stake1.times(odd1);
    const totalStake = stake1.plus(stake2);
    const guaranteedProfit = winIfOdd1.minus(stake1).minus(stake2);
    const roi = guaranteedProfit.dividedBy(totalStake).times(100);

    return {
      isSurebet: true,
      profitMargin,
      stake1,
      stake2,
      totalStake,
      guaranteedProfit,
      roi,
    };
  } catch (error) {
    return zeroResult(
      `Erro no cálculo: ${error instanceof Error ? error.message : "Desconhecido"}`
    );
  }
};
