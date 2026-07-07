import { iconFor, iconKey, normalizeSymbol, truncateAddress } from "./tokenSymbol";
import { describe, expect, it } from "vitest";

/**
 * Pitfall 2 lock: onchain symbols are `*Mock` (USDCMock / cUSDCMock), NOT the
 * clean design/icon keys. iconKey must strip the `Mock` suffix and a single
 * leading confidential `c`, then lowercase, so both sides of a pair resolve to
 * the same icon key.
 */
describe("iconKey", () => {
  it.each([
    ["USDCMock", "usdc"],
    ["cUSDCMock", "usdc"],
    ["cWETHMock", "weth"],
    ["ctGBPMock", "tgbp"],
    ["cXAUtMock", "xaut"],
    ["cBRONMock", "bron"],
    ["cZAMAMock", "zama"],
    ["cUSDTMock", "usdt"],
  ])("normalizes %s -> %s", (input, expected) => {
    expect(iconKey(input)).toBe(expected);
  });
});

describe("iconFor", () => {
  it("maps a confidential symbol to /icons/c{key}.png", () => {
    expect(iconFor("cUSDCMock")).toBe("/icons/cusdc.png");
    expect(iconFor("cWETHMock")).toBe("/icons/cweth.png");
    expect(iconFor("cXAUtMock")).toBe("/icons/cxaut.png");
  });
});

describe("normalizeSymbol", () => {
  it("strips a trailing Mock suffix while preserving the confidential c prefix", () => {
    expect(normalizeSymbol("USDCMock")).toBe("USDC");
    expect(normalizeSymbol("cUSDCMock")).toBe("cUSDC");
  });
});

describe("truncateAddress", () => {
  it("keeps first-6 + ellipsis + last-4 of a 42-char address", () => {
    const addr = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
    const out = truncateAddress(addr);
    expect(out).toBe("0x9b5C…DFfF");
    expect(out.startsWith("0x9b5C")).toBe(true);
    expect(out.endsWith("DFfF")).toBe(true);
  });
});
