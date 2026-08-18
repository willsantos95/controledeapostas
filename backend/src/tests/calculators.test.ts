import { describe, it, expect } from "vitest";
import { calculateSurebet } from "../calculators/surebet";
import { calculateDuploGreen } from "../calculators/duploGreen";
import { calculateFreeBet } from "../calculators/freeBet";

describe("calculateSurebet", () => {
  it("calculates a valid surebet correctly", () => {
    const result = calculateSurebet({ odd1: 2.0, odd2: 2.2, stake1: 100 });

    expect(result.isSurebet).toBe(true);
    expect(result.guaranteedProfit.toFixed(2)).toBe("9.09");
    expect(result.roi.toDecimalPlaces(2).toString()).toBe("4.76");
  });

  it("rejects when it is not a surebet", () => {
    const result = calculateSurebet({ odd1: 1.5, odd2: 1.5, stake1: 100 });

    expect(result.isSurebet).toBe(false);
    expect(result.guaranteedProfit.toString()).toBe("0");
  });

  it("validates stake > 0", () => {
    const result = calculateSurebet({ odd1: 2.0, odd2: 2.0, stake1: -100 });

    expect(result.isSurebet).toBe(false);
    expect(result.error).toContain("Stake deve ser maior que 0");
  });

  it("validates odds > 0", () => {
    const result = calculateSurebet({ odd1: 0, odd2: 2.0, stake1: 100 });

    expect(result.isSurebet).toBe(false);
    expect(result.error).toContain("Odds devem ser maiores que 0");
  });
});

describe("calculateDuploGreen", () => {
  it("calculates proportional stakes correctly", () => {
    const result = calculateDuploGreen({
      odd1: 1.8,
      oddX: 3.5,
      odd2: 2.1,
      stakeInitial: 100,
    });

    expect(result.stake1.toFixed(2)).toBe("100.00");
    expect(result.stakeX.toFixed(2)).toBe("51.43");
    expect(result.stake2.toFixed(2)).toBe("85.71");
    expect(result.garanteedWin.toFixed(2)).toBe("180.00");
  });

  it("calculates negative green for unfavorable odds", () => {
    const result = calculateDuploGreen({
      odd1: 2.0,
      oddX: 3.0,
      odd2: 4.0,
      stakeInitial: 100,
    });

    expect(result.green.isNegative()).toBe(true);
  });

  it("validates odds > 0", () => {
    const result = calculateDuploGreen({
      odd1: 0,
      oddX: 3.0,
      odd2: 4.0,
      stakeInitial: 100,
    });

    expect(result.error).toContain("Todas as odds devem ser maiores que 0");
  });

  it("validates stakeInitial > 0", () => {
    const result = calculateDuploGreen({
      odd1: 2,
      oddX: 3,
      odd2: 4,
      stakeInitial: -10,
    });

    expect(result.error).toContain("Stake inicial deve ser maior que 0");
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

  it("calculates green box with lay", () => {
    const result = calculateFreeBet({
      type: "with-lay",
      freeBetValue: 50,
      oddBack: 3.0,
      oddLay: 2.8,
    });

    expect(result.type).toBe("with-lay");
    expect(result.greenBox).toBeDefined();
    expect(result.greenBox!.isPositive()).toBe(true);
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
});
