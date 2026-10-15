import { describe, expect, it } from "vitest";
import { formatMoney } from "../src/ui/formatMoney";

describe("UI money presentation", () => {
  it("uses the requested euro prefix, grouping and two decimals", () => {
    expect(formatMoney(71000)).toBe("€ 710,00");
    expect(formatMoney(215000)).toBe("€ 2.150,00");
    expect(formatMoney(141800)).toBe("€ 1.418,00");
  });
  it("puts the income sign before the euro symbol", () => {
    expect(formatMoney(35000, true)).toBe("+ € 350,00");
  });
  it("preserves zero, cents and negative amounts", () => {
    expect(formatMoney(0)).toBe("€ 0,00");
    expect(formatMoney(7)).toBe("€ 0,07");
    expect(formatMoney(-125)).toBe("− € 1,25");
  });
  it("formats safe integer cents without floating point conversion", () => {
    expect(formatMoney(Number.MAX_SAFE_INTEGER)).toBe(
      "€ 90.071.992.547.409,91",
    );
  });
});
