import { validateDecryptTarget } from "./decryptValidate";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";

/**
 * Pasted-address validation lock (DEC-02 input handling, T-03-04 tampering).
 *
 * `validateDecryptTarget` covers ONLY address FORMAT — trim, empty, malformed,
 * and checksum-normalization. The ERC-165 confidential-token check is a hook
 * (`useIsConfidential`) exercised in the DecryptPanel, not pure-testable here.
 *
 * Reason strings are the EXACT 03-UI-SPEC copy the UI renders (error rows), so
 * a malformed or empty input never reaches the shared decrypt engine.
 */

// A real Sepolia address (the Wrappers Registry) in lowercase + its EIP-55 form.
const LOWER = "0x2f0750bbb0a246059d80e94c454586a7f27a128e";
const CHECKSUMMED = getAddress(LOWER); // "0x2f0750Bbb0A246059d80e94c454586a7F27a128e"

describe("validateDecryptTarget", () => {
  it.each(["", "   ", "\t", "\n  "])("rejects empty/whitespace %j with the empty-address reason", raw => {
    const result = validateDecryptTarget(raw);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Enter an ERC-7984 address");
    expect(result.address).toBeUndefined();
  });

  it.each(["0x1234", "not-an-address", "0xZZZ", "0x2f0750bbb0a246059d80e94c454586a7f27a128", "12345"])(
    "rejects malformed %j as NOT A VALID ADDRESS",
    raw => {
      const result = validateDecryptTarget(raw);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("NOT A VALID ADDRESS");
      expect(result.address).toBeUndefined();
    },
  );

  it("accepts a lowercase 40-hex address and returns the checksummed form", () => {
    const result = validateDecryptTarget(LOWER);
    expect(result.ok).toBe(true);
    expect(result.address).toBe(CHECKSUMMED);
    expect(result.reason).toBeUndefined();
  });

  it("accepts an already-checksummed address unchanged", () => {
    const result = validateDecryptTarget(CHECKSUMMED);
    expect(result.ok).toBe(true);
    expect(result.address).toBe(CHECKSUMMED);
  });

  it("trims leading/trailing whitespace around a valid address then accepts", () => {
    const result = validateDecryptTarget(`   ${LOWER}   `);
    expect(result.ok).toBe(true);
    expect(result.address).toBe(CHECKSUMMED);
  });
});
