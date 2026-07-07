import type { PairSource, RegistryPair } from "../registry/types";
import { filterPairs } from "./filterPairs";
import { describe, expect, it } from "vitest";

// Live-verified addresses (Sepolia, 02-RESEARCH.md "Live-verified pair set").
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const USDC = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const cWETH = "0x46208622DA27d91db4f0393733C8BA082ed83158";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

const meta = (address: string, symbol: string, name: string) => ({
  address: address as `0x${string}`,
  symbol,
  name,
  decimals: 6,
  decimalsKnown: true,
});

const usdcPair = (isValid: boolean, source: PairSource = "onchain"): RegistryPair => ({
  underlying: meta(USDC, "USDCMock", "USD Coin"),
  confidential: meta(cUSDC, "cUSDCMock", "Confidential USD Coin"),
  isValid,
  source,
});

const wethPair = (isValid: boolean, source: PairSource = "onchain"): RegistryPair => ({
  underlying: meta(WETH, "WETHMock", "Wrapped Ether"),
  confidential: meta(cWETH, "cWETHMock", "Confidential Wrapped Ether"),
  isValid,
  source,
});

describe("filterPairs", () => {
  const pairs = [usdcPair(true), wethPair(false)];

  it("returns everything with empty search and the ALL chip", () => {
    expect(filterPairs(pairs, "", "all")).toHaveLength(2);
  });

  it("matches the raw *Mock symbol case-insensitively", () => {
    const hits = filterPairs(pairs, "usdc", "all");
    expect(hits).toHaveLength(1);
    expect(hits[0].confidential.symbol).toBe("cUSDCMock");
  });

  it("matches the normalized display symbol (cUSDC), not just the raw *Mock form", () => {
    expect(filterPairs(pairs, "cUSDC", "all")).toHaveLength(1);
  });

  it("matches on token name", () => {
    const hits = filterPairs(pairs, "wrapped ether", "all");
    expect(hits).toHaveLength(1);
    expect(hits[0].underlying.symbol).toBe("WETHMock");
  });

  it("matches on either address (case-insensitive)", () => {
    expect(filterPairs(pairs, USDC.toLowerCase(), "all")).toHaveLength(1);
    expect(filterPairs(pairs, cWETH.toUpperCase(), "all")).toHaveLength(1);
  });

  it("VALID chip keeps only isValid pairs (REG-02)", () => {
    const hits = filterPairs(pairs, "", "valid");
    expect(hits).toHaveLength(1);
    expect(hits[0].isValid).toBe(true);
  });

  it("REVOKED chip keeps only revoked pairs (REG-02)", () => {
    const hits = filterPairs(pairs, "", "revoked");
    expect(hits).toHaveLength(1);
    expect(hits[0].isValid).toBe(false);
  });

  it("combines search AND filter chip", () => {
    // WETH pair is revoked; searching "usdc" under REVOKED yields nothing.
    expect(filterPairs(pairs, "usdc", "revoked")).toHaveLength(0);
    // WETH pair is revoked; searching "weth" under REVOKED yields it.
    expect(filterPairs(pairs, "weth", "revoked")).toHaveLength(1);
  });

  it("returns an empty array on no match (drives the empty state)", () => {
    expect(filterPairs(pairs, "nonsense-token", "all")).toHaveLength(0);
  });

  it("trims surrounding whitespace in the search query", () => {
    expect(filterPairs(pairs, "   usdc   ", "all")).toHaveLength(1);
  });
});
