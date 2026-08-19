import { describe, it, expect } from "vitest";
import { calculateDistribution } from "../calculators/distribution";
import { calculateFreeBet } from "../calculators/freeBet";

describe("calculateDistribution", () => {
  it("calculates a valid 2-way surebet (equivalent to the old surebet calculator)", () => {
    const result = calculateDistribution({
      legs: [{ odds: 2.0 }, { odds: 2.2 }],
      anchorStake: 100,
    });

    expect(result.isValid).toBe(true);
    expect(result.minProfit.toFixed(2)).toBe("9.09");
    expect(result.roi?.toDecimalPlaces(2).toString()).toBe("4.76");
  });

  it("calculates a 3-way distribution (equivalent to the old duplo green calculator)", () => {
    const result = calculateDistribution({
      legs: [{ odds: 1.8 }, { odds: 3.5 }, { odds: 2.1 }],
      anchorStake: 100,
    });

    expect(result.legs[0].stake.toFixed(2)).toBe("100.00");
    expect(result.legs[1].stake.toFixed(2)).toBe("51.43");
    expect(result.legs[2].stake.toFixed(2)).toBe("85.71");
    expect(result.legs[0].payout.toFixed(2)).toBe("180.00");
    expect(result.minProfit.isNegative()).toBe(true);
  });

  it("supports N legs beyond 3 (fully general distribution)", () => {
    const result = calculateDistribution({
      legs: [{ odds: 4.0 }, { odds: 4.0 }, { odds: 4.0 }, { odds: 4.0 }],
      anchorStake: 25,
    });

    expect(result.isValid).toBe(true);
    expect(result.totalInvested.toFixed(2)).toBe("100.00");
    expect(result.minProfit.toFixed(2)).toBe("0.00");
  });

  it("treats freebet legs as zero-cost, boosting guaranteed profit", () => {
    const result = calculateDistribution({
      legs: [{ odds: 2.0 }, { odds: 2.2, isFreebet: true }],
      anchorStake: 100,
    });

    expect(result.legs[1].cost.toFixed(2)).toBe("0.00");
    expect(result.totalInvested.toFixed(2)).toBe("100.00");
    expect(result.minProfit.toFixed(2)).toBe("100.00");
  });

  it("rejects fewer than 2 legs", () => {
    const result = calculateDistribution({ legs: [{ odds: 2.0 }], anchorStake: 100 });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("2 pernas");
  });

  it("rejects anchorStake <= 0", () => {
    const result = calculateDistribution({
      legs: [{ odds: 2.0 }, { odds: 2.2 }],
      anchorStake: -10,
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("maior que 0");
  });

  it("rejects odds <= 1", () => {
    const result = calculateDistribution({
      legs: [{ odds: 1.0 }, { odds: 2.2 }],
      anchorStake: 100,
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("maiores que 1.0");
  });
});

describe("calculateFreeBet", () => {
  it("calculates simple free bet", () => {
    const result = calculateFreeBet({ type: "simple", freeBetValue: 50, odd: 3.0 });

    expect(result.type).toBe("simple");
    expect(result.gainIfWin.toFixed(2)).toBe("100.00");
    expect(result.gainIfLose.toFixed(2)).toBe("0.00");
  });

  it("validates odd > 1.0 for simple", () => {
    const result = calculateFreeBet({ type: "simple", freeBetValue: 50, odd: 1.0 });

    expect(result.error).toContain("Odd deve ser > 1.0");
  });

  it("calculates green box with lay and no commission", () => {
    const result = calculateFreeBet({
      type: "with-lay",
      freeBetValue: 50,
      oddBack: 3.0,
      oddLay: 2.8,
    });

    expect(result.type).toBe("with-lay");
    expect(result.greenBox).toBeDefined();
    expect(result.greenBox!.isPositive()).toBe(true);
    expect(result.layStake!.toFixed(2)).toBe("35.71");
  });

  it("reduces green box when exchange commission increases", () => {
    const noCommission = calculateFreeBet({
      type: "with-lay",
      freeBetValue: 50,
      oddBack: 3.0,
      oddLay: 2.8,
    });
    const withCommission = calculateFreeBet({
      type: "with-lay",
      freeBetValue: 50,
      oddBack: 3.0,
      oddLay: 2.8,
      exchangeCommission: 5,
    });

    expect(withCommission.greenBox!.lessThan(noCommission.greenBox!)).toBe(true);
  });

  it("validates odds > 1.0 for with-lay", () => {
    const result = calculateFreeBet({
      type: "with-lay",
      freeBetValue: 50,
      oddBack: 1.0,
      oddLay: 2.8,
    });

    expect(result.error).toContain("Ambas odds devem ser > 1.0");
  });

  it("validates commission range", () => {
    const result = calculateFreeBet({
      type: "with-lay",
      freeBetValue: 50,
      oddBack: 3.0,
      oddLay: 2.8,
      exchangeCommission: 150,
    });

    expect(result.error).toContain("Comissão");
  });
});
