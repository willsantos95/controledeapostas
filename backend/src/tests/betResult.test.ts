import { describe, it, expect } from "vitest";
import { calculateBetResult } from "../utils/betResult";

describe("calculateBetResult", () => {
  it("calculates net_gain for won bets", () => {
    const result = calculateBetResult({ status: "won", stake: "100", resultOdd: "2.5", winAmount: "250" });
    expect(result.netGain.toString()).toBe("150");
    expect(result.winAmount.toString()).toBe("250");
    expect(result.resultOdd?.toString()).toBe("2.5");
  });

  it("calculates net_gain for lost bets", () => {
    const result = calculateBetResult({ status: "lost", stake: "100" });
    expect(result.netGain.toString()).toBe("-100");
    expect(result.winAmount.toString()).toBe("0");
  });

  it("calculates net_gain for void bets", () => {
    const result = calculateBetResult({ status: "void", stake: "100" });
    expect(result.netGain.toString()).toBe("0");
    expect(result.winAmount.toString()).toBe("100");
  });

  it("calculates net_gain for canceled bets", () => {
    const result = calculateBetResult({ status: "canceled", stake: "75.5" });
    expect(result.netGain.toString()).toBe("0");
    expect(result.winAmount.toString()).toBe("75.5");
  });

  it("throws when won bet is missing result_odd or win_amount", () => {
    expect(() => calculateBetResult({ status: "won", stake: "100" })).toThrow();
  });

  it("throws when result_odd is below 1.0", () => {
    expect(() =>
      calculateBetResult({ status: "won", stake: "100", resultOdd: "0.5", winAmount: "50" })
    ).toThrow();
  });

  it("throws when win_amount is negative", () => {
    expect(() =>
      calculateBetResult({ status: "won", stake: "100", resultOdd: "2", winAmount: "-10" })
    ).toThrow();
  });
});
