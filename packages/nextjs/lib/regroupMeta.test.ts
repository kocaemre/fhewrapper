import type { MulticallEntry, OnchainPairRaw } from "./regroupMeta";
import { regroupMeta } from "./regroupMeta";
import { describe, expect, it } from "vitest";

const ok = (v: unknown): MulticallEntry => ({ status: "success", result: v });
const fail = (): MulticallEntry => ({ status: "failure", error: new Error("revert") });

// Live-verified addresses (Sepolia, 02-RESEARCH.md).
const USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF" as const;
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639" as const;
const USDT = "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0" as const;
const cUSDT = "0x4E7B06D78965594eB5EF5414c357ca21E1554491" as const;

describe("regroupMeta", () => {
  it("regroups a flat 6-per-pair multicall result onto each pair (REG-03)", () => {
    const pairs: OnchainPairRaw[] = [{ tokenAddress: USDC, confidentialTokenAddress: cUSDC, isValid: true }];
    const results: MulticallEntry[] = [
      ok("USDCMock"),
      ok("USD Coin (Mock)"),
      ok(6),
      ok("cUSDCMock"),
      ok("Confidential USDC (Mock)"),
      ok(6),
    ];

    const [p] = regroupMeta(results, pairs);

    expect(p.underlying.address).toBe(USDC);
    expect(p.underlying.symbol).toBe("USDCMock");
    expect(p.underlying.name).toBe("USD Coin (Mock)");
    expect(p.underlying.decimals).toBe(6);
    expect(p.underlying.decimalsKnown).toBe(true);
    expect(p.confidential.symbol).toBe("cUSDCMock");
    expect(p.confidential.decimals).toBe(6);
    expect(p.isValid).toBe(true);
    expect(p.source).toBe("onchain");
  });

  it("falls back to a truncated address on failed symbol/name and flags missing decimals (Pitfall 5)", () => {
    const pairs: OnchainPairRaw[] = [{ tokenAddress: USDC, confidentialTokenAddress: cUSDC, isValid: true }];
    const results: MulticallEntry[] = [fail(), fail(), fail(), ok("cUSDCMock"), ok("Confidential USDC (Mock)"), ok(6)];

    const [p] = regroupMeta(results, pairs);

    expect(p.underlying.symbol).toBe("0x9b5C…DFfF");
    expect(p.underlying.name).toBe("0x9b5C…DFfF");
    expect(p.underlying.decimalsKnown).toBe(false);
    expect(p.confidential.symbol).toBe("cUSDCMock");
    expect(p.confidential.decimalsKnown).toBe(true);
  });

  it("chunks in groups of 6 across multiple pairs, preserving per-pair isValid", () => {
    const pairs: OnchainPairRaw[] = [
      { tokenAddress: USDC, confidentialTokenAddress: cUSDC, isValid: true },
      { tokenAddress: USDT, confidentialTokenAddress: cUSDT, isValid: false },
    ];
    const results: MulticallEntry[] = [
      ok("USDCMock"),
      ok("USD Coin"),
      ok(6),
      ok("cUSDCMock"),
      ok("Conf USDC"),
      ok(6),
      ok("USDTMock"),
      ok("USD Tether"),
      ok(6),
      ok("cUSDTMock"),
      ok("Conf USDT"),
      ok(6),
    ];

    const out = regroupMeta(results, pairs);

    expect(out).toHaveLength(2);
    expect(out[1].underlying.symbol).toBe("USDTMock");
    expect(out[1].confidential.symbol).toBe("cUSDTMock");
    expect(out[1].isValid).toBe(false);
  });
});
