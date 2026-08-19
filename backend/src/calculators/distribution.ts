import Decimal from "decimal.js";

export interface DistributionLegInput {
  odds: number | string;
  isFreebet?: boolean;
}

export interface DistributionInput {
  legs: DistributionLegInput[];
  anchorStake: number | string;
  anchorIndex?: number;
}

export interface DistributionLegResult {
  odds: Decimal;
  stake: Decimal;
  cost: Decimal;
  isFreebet: boolean;
  payout: Decimal;
  profit: Decimal;
}

export interface DistributionResult {
  isValid: boolean;
  legs: DistributionLegResult[];
  totalInvested: Decimal;
  minProfit: Decimal;
  roi: Decimal | null;
  error?: string;
}

const invalidResult = (error: string): DistributionResult => ({
  isValid: false,
  legs: [],
  totalInvested: new Decimal(0),
  minProfit: new Decimal(0),
  roi: null,
  error,
});

export const calculateDistribution = (input: DistributionInput): DistributionResult => {
  try {
    const { legs } = input;
    const anchorIndex = input.anchorIndex ?? 0;

    if (!Array.isArray(legs) || legs.length < 2) {
      return invalidResult("Informe pelo menos 2 pernas (resultados possíveis)");
    }
    if (anchorIndex < 0 || anchorIndex >= legs.length) {
      return invalidResult("anchorIndex inválido");
    }

    const odds = legs.map((leg) => new Decimal(leg.odds));
    if (odds.some((odd) => odd.lessThanOrEqualTo(1))) {
      return invalidResult("Todas as odds devem ser maiores que 1.0");
    }

    const anchorStake = new Decimal(input.anchorStake);
    if (anchorStake.lessThanOrEqualTo(0)) {
      return invalidResult("O stake da perna âncora deve ser maior que 0");
    }

    const target = anchorStake.times(odds[anchorIndex]);

    const legResults: DistributionLegResult[] = legs.map((leg, i) => {
      const isFreebet = Boolean(leg.isFreebet);
      const stake = target.dividedBy(odds[i]);
      const cost = isFreebet ? new Decimal(0) : stake;
      const payout = stake.times(odds[i]);
      return { odds: odds[i], stake, cost, isFreebet, payout, profit: new Decimal(0) };
    });

    const totalInvested = legResults.reduce(
      (sum, leg) => sum.plus(leg.cost),
      new Decimal(0)
    );

    for (const leg of legResults) {
      leg.profit = leg.payout.minus(totalInvested);
    }

    const minProfit = legResults.reduce(
      (min, leg) => (leg.profit.lessThan(min) ? leg.profit : min),
      legResults[0].profit
    );

    const roi = totalInvested.isZero()
      ? null
      : minProfit.dividedBy(totalInvested).times(100);

    return {
      isValid: true,
      legs: legResults,
      totalInvested,
      minProfit,
      roi,
    };
  } catch (error) {
    return invalidResult(
      `Erro no cálculo: ${error instanceof Error ? error.message : "Desconhecido"}`
    );
  }
};
