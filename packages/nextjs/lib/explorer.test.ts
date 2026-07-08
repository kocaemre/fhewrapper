import { SEPOLIA_EXPLORER, sepoliaAddressUrl, sepoliaTxUrl } from "./explorer";
import { describe, expect, it } from "vitest";

/**
 * T-06-03 / T-06-04 lock: the pure Sepolia explorer-URL helpers.
 *
 * `sepoliaTxUrl` pins the host to `sepolia.etherscan.io` (Sepolia chainId
 * 11155111) and returns `undefined` for any malformed hash so no link is ever
 * rendered for junk input. `sepoliaAddressUrl` mirrors it for addresses.
 */

const HASH = "0x" + "a".repeat(64);
const ADDR = "0x" + "b".repeat(40);

describe("sepoliaTxUrl", () => {
  it("builds the Sepolia etherscan tx URL for a well-formed 32-byte hash", () => {
    expect(sepoliaTxUrl(HASH)).toBe(`https://sepolia.etherscan.io/tx/${HASH}`);
  });

  it("pins the host to sepolia.etherscan.io", () => {
    const url = new URL(sepoliaTxUrl(HASH)!);
    expect(url.host).toBe("sepolia.etherscan.io");
    expect(SEPOLIA_EXPLORER).toBe("https://sepolia.etherscan.io");
  });

  it("returns undefined for a malformed / empty / non-hex hash", () => {
    expect(sepoliaTxUrl(undefined)).toBeUndefined();
    expect(sepoliaTxUrl("")).toBeUndefined();
    expect(sepoliaTxUrl("0x123")).toBeUndefined();
    expect(sepoliaTxUrl("not-a-hash")).toBeUndefined();
    expect(sepoliaTxUrl("0x" + "z".repeat(64))).toBeUndefined();
    expect(sepoliaTxUrl("a".repeat(64))).toBeUndefined();
  });
});

describe("sepoliaAddressUrl", () => {
  it("builds the Sepolia etherscan address URL for a well-formed 20-byte address", () => {
    expect(sepoliaAddressUrl(ADDR)).toBe(`https://sepolia.etherscan.io/address/${ADDR}`);
  });

  it("returns undefined for a malformed address", () => {
    expect(sepoliaAddressUrl(undefined)).toBeUndefined();
    expect(sepoliaAddressUrl("0x123")).toBeUndefined();
    expect(sepoliaAddressUrl(HASH)).toBeUndefined();
  });
});
