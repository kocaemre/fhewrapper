import { formatConfidentialAmount } from "./formatConfidential";
import { describe, expect, it } from "vitest";

/**
 * Pitfall 5 lock: the decrypted cleartext is a raw base-unit bigint. It MUST be
 * formatted by the confidential token's OWN decimals — never a hardcoded 18.
 * The non-18 case (decimals 6, 2) proves 18 is not baked in.
 */
describe("formatConfidentialAmount", () => {
  it.each<[bigint, number, string]>([
    [1000000n, 6, "1"],
    [1500000n, 6, "1.5"],
    [0n, 6, "0"],
    [1000000000000000000n, 18, "1"],
    [250n, 2, "2.5"],
  ])("formats (%s, %i) -> %s", (value, decimals, expected) => {
    expect(formatConfidentialAmount(value, decimals)).toBe(expected);
  });

  it("does not hardcode 18 decimals (same raw value differs by decimals)", () => {
    const raw = 1000000n;
    expect(formatConfidentialAmount(raw, 6)).toBe("1");
    expect(formatConfidentialAmount(raw, 18)).not.toBe("1");
  });
});
