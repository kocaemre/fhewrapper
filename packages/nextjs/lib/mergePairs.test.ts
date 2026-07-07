import type { PairSource, RegistryPair } from "../registry/types";
import { mergePairs } from "./mergePairs";
import { describe, expect, it } from "vitest";

// Live-verified addresses (Sepolia, 02-RESEARCH.md "Live-verified pair set").
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const LOCAL_UNDERLYING = "0x1111111111111111111111111111111111111111";
const LOCAL_ONLY_CONF = "0x000000000000000000000000000000000000dEaD";
const LOCAL_ONLY_UNDER = "0x2222222222222222222222222222222222222222";

const meta = (address: string, symbol: string) => ({
  address: address as `0x${string}`,
  symbol,
  name: symbol,
  decimals: 6,
  decimalsKnown: true,
});

const pair = (conf: string, under: string, isValid: boolean, source: PairSource): RegistryPair => ({
  underlying: meta(under, "U"),
  confidential: meta(conf, "C"),
  isValid,
  source,
});

describe("mergePairs", () => {
  it("dedups by lowercased confidential address; onchain wins on conflict (REG-05)", () => {
    // Same confidential token declared locally (lowercased) and onchain (checksummed).
    const local = [pair(cUSDC.toLowerCase(), LOCAL_UNDERLYING, true, "local")];
    const onchain = [pair(cUSDC, USDC, true, "onchain")];

    const merged = mergePairs(onchain, local);

    const hits = merged.filter(p => p.confidential.address.toLowerCase() === cUSDC.toLowerCase());
    expect(hits).toHaveLength(1);
    expect(hits[0].source).toBe("onchain");
    expect(hits[0].underlying.address).toBe(USDC);
  });

  it("retains revoked pairs flagged isValid=false (REG-02)", () => {
    const onchain = [pair(cUSDC, USDC, false, "onchain")];
    const merged = mergePairs(onchain, []);
    expect(merged).toHaveLength(1);
    expect(merged[0].isValid).toBe(false);
  });

  it("includes a local-only confidential address not present onchain", () => {
    const local = [pair(LOCAL_ONLY_CONF, LOCAL_ONLY_UNDER, true, "local")];
    const onchain = [pair(cUSDC, USDC, true, "onchain")];

    const merged = mergePairs(onchain, local);

    expect(merged).toHaveLength(2);
    const localOnly = merged.find(p => p.confidential.address === LOCAL_ONLY_CONF);
    expect(localOnly).toBeDefined();
    expect(localOnly?.source).toBe("local");
  });
});
