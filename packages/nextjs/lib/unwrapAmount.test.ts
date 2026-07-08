import { parseUnwrapAmount } from "./unwrapAmount";
import { describe, expect, it } from "vitest";

/**
 * UNW-01 amount-validation lock.
 *
 * The untrusted decimal string is parsed into a confidential-unit bigint in the
 * token's OWN decimals (never hardcode 18; Pitfall 4) and validated `≤` the
 * decrypted confidential balance. Parsing never throws — invalid/mid-typing
 * input returns `valid: false` flags so the panel can disable the CTA.
 */
describe("parseUnwrapAmount", () => {
  it("parses a 6-dp whole amount into base units and passes validation", () => {
    // 1 whole → 10^6 base units; decryptedBalance = 1_000_000n (exactly enough)
    expect(parseUnwrapAmount("1", 6, 1_000_000n)).toEqual({
      raw: 1_000_000n,
      valid: true,
      exceedsBalance: false,
      belowMinimum: false,
    });
  });

  it("flags an amount greater than the decrypted balance", () => {
    const r = parseUnwrapAmount("2", 6, 1_000_000n); // 2_000_000n > 1_000_000n
    expect(r.raw).toBe(2_000_000n);
    expect(r.exceedsBalance).toBe(true);
    expect(r.valid).toBe(false);
  });

  it("rejects zero, empty, negative, and non-numeric input without throwing", () => {
    for (const bad of ["0", "", "-1", "abc", "."]) {
      const r = parseUnwrapAmount(bad, 6, 1_000_000n);
      expect(r.valid).toBe(false);
    }
    // "0" and empty parse to 0n → belowMinimum, not exceedsBalance
    expect(parseUnwrapAmount("0", 6, 1_000_000n).belowMinimum).toBe(true);
  });

  it("is decimals-driven for an 18-dp pair (never hardcodes 18)", () => {
    const r = parseUnwrapAmount("1", 18, 5n * 10n ** 18n);
    expect(r.raw).toBe(10n ** 18n);
    expect(r.valid).toBe(true);
    expect(r.exceedsBalance).toBe(false);
  });

  it("does not flag exceedsBalance when the decrypted balance is undefined (unwrap-all path)", () => {
    const r = parseUnwrapAmount("1", 6, undefined);
    expect(r.raw).toBe(1_000_000n);
    expect(r.exceedsBalance).toBe(false);
    expect(r.valid).toBe(true);
  });
});
