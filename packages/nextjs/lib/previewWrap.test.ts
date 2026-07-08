import { previewWrap } from "./previewWrap";
import { describe, expect, it } from "vitest";

/**
 * WRP-02 lock: the wrap preview is PURE `bigint` math —
 * `confRaw = floor(underlyingRaw / rate)`, remainder refunded, `belowOneUnit`
 * when the entered amount is under one confidential base unit.
 *
 * `rate = 10^(underlyingDecimals − wrapperDecimals)`. Wrappers are 6-dp, so a
 * 6-dp underlying (cUSDC) has rate=1 and an 18-dp underlying (cWETH) has
 * rate=1e12. The "1 whole underlying → 1.0 confidential" invariant MUST hold
 * for BOTH — proving why hardcoding 18 anywhere is fatal (04-RESEARCH Pattern 3).
 */
describe("previewWrap", () => {
  it("cUSDC (rate=1, 6-dp): 1 whole underlying → 1.0 confidential, no refund", () => {
    // 1_000_000 base units @ 6-dp = 1.0 USDC
    const out = previewWrap(1_000_000n, 1n, 6);
    expect(out).toEqual({
      confRaw: 1_000_000n,
      consumedRaw: 1_000_000n,
      refundRaw: 0n,
      belowOneUnit: false,
    });
  });

  it("cWETH (rate=1e12, 18-dp underlying → 6-dp wrapper): 1 whole underlying → 1.0 confidential", () => {
    // 1e18 base units @ 18-dp = 1.0 WETH → 1_000_000 base units @ 6-dp = 1.0 cWETH.
    // This is the case that breaks if you hardcode 18 (04-RESEARCH Pitfall 1).
    const out = previewWrap(1_000_000_000_000_000_000n, 1_000_000_000_000n, 6);
    expect(out).toEqual({
      confRaw: 1_000_000n,
      consumedRaw: 1_000_000_000_000_000_000n,
      refundRaw: 0n,
      belowOneUnit: false,
    });
  });

  it("below one unit (rate=1e12): 0.0000001 WETH → 0 confidential, belowOneUnit=true", () => {
    // 1e11 wei < rate (1e12) → mints 0; WRP-02 must warn + disable Wrap (Pitfall 2).
    const out = previewWrap(100_000_000_000n, 1_000_000_000_000n, 6);
    expect(out.confRaw).toBe(0n);
    expect(out.consumedRaw).toBe(0n);
    expect(out.refundRaw).toBe(100_000_000_000n);
    expect(out.belowOneUnit).toBe(true);
  });

  it("non-divisible remainder is refunded (rate=1e12): 1e12+1 → 1 conf, 1 wei refunded", () => {
    const out = previewWrap(1_000_000_000_001n, 1_000_000_000_000n, 6);
    expect(out).toEqual({
      confRaw: 1n,
      consumedRaw: 1_000_000_000_000n,
      refundRaw: 1n,
      belowOneUnit: false,
    });
  });

  it("zero input → 0 confidential, belowOneUnit=true", () => {
    const out = previewWrap(0n, 1_000_000_000_000n, 6);
    expect(out).toEqual({
      confRaw: 0n,
      consumedRaw: 0n,
      refundRaw: 0n,
      belowOneUnit: true,
    });
  });
});
