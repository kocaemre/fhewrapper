import { isZeroBalance, toDecryptError } from "./decryptErrors";
import {
  ConfigurationError,
  DecryptionFailedError,
  NoCiphertextError,
  RelayerRequestFailedError,
  SigningRejectedError,
  ZERO_HANDLE,
  ZamaError,
  ZamaErrorCode,
} from "@zama-fhe/react-sdk";
import { describe, expect, it } from "vitest";

/**
 * DEC-04 lock: every ZamaError subclass (and unknown) maps to the exact
 * 03-UI-SPEC chip/body/recoverable triplet. Real error instances are
 * constructed from the re-exported 3.0.0 classes — the SDK is never mocked.
 *
 * Ordering matters: SigningRejectedError and the no-ACL group must be caught
 * before the generic ZamaError fallthrough.
 */
describe("toDecryptError", () => {
  it("maps SigningRejectedError -> empty chip, declined body, recoverable (returns to idle)", () => {
    const out = toDecryptError(new SigningRejectedError("user rejected"));
    expect(out).toEqual({ chip: "", body: "Signature declined.", recoverable: true });
  });

  it("maps DecryptionFailedError -> NO DECRYPTION ACCESS (no-ACL), recoverable", () => {
    const out = toDecryptError(new DecryptionFailedError("relayer said no"));
    expect(out.chip).toBe("NO DECRYPTION ACCESS");
    expect(out.recoverable).toBe(true);
    expect(out.body).toMatch(/viewing key/i);
  });

  it("maps RelayerRequestFailedError -> NO DECRYPTION ACCESS (relayer no-ACL path)", () => {
    const out = toDecryptError(new RelayerRequestFailedError("HTTP 403", 403));
    expect(out.chip).toBe("NO DECRYPTION ACCESS");
    expect(out.recoverable).toBe(true);
  });

  it("maps an on-chain ACL revert (matchAclRevert non-null) -> NO DECRYPTION ACCESS", () => {
    // matchAclRevert string-matches ACL error names in the message (e.g. EnforcedPause).
    const out = toDecryptError(new Error("execution reverted: EnforcedPause()"));
    expect(out.chip).toBe("NO DECRYPTION ACCESS");
  });

  it("maps NoCiphertextError -> DECRYPTED BALANCE / 0, not an error (never-shielded = zero)", () => {
    const out = toDecryptError(new NoCiphertextError("never shielded"));
    expect(out).toEqual({ chip: "DECRYPTED BALANCE", body: "0", recoverable: false });
  });

  it("maps ConfigurationError -> DECRYPTION FAILED, non-recoverable config message", () => {
    const out = toDecryptError(new ConfigurationError("forbidden chain id"));
    expect(out.chip).toBe("DECRYPTION FAILED");
    expect(out.recoverable).toBe(false);
    expect(out.body).toMatch(/network|configuration/i);
  });

  it("maps a generic ZamaError -> DECRYPTION FAILED, gateway body, recoverable", () => {
    const out = toDecryptError(new ZamaError(ZamaErrorCode.KeypairExpired, "boom"));
    expect(out).toEqual({
      chip: "DECRYPTION FAILED",
      body: "The FHE gateway didn't respond.",
      recoverable: true,
    });
  });

  it("maps a plain Error / unknown -> DECRYPTION FAILED, unexpected body, recoverable", () => {
    expect(toDecryptError(new Error("???"))).toEqual({
      chip: "DECRYPTION FAILED",
      body: "Unexpected error.",
      recoverable: true,
    });
    expect(toDecryptError("just a string")).toEqual({
      chip: "DECRYPTION FAILED",
      body: "Unexpected error.",
      recoverable: true,
    });
  });
});

describe("isZeroBalance", () => {
  it("returns true for the SDK ZERO_HANDLE (never-initialized balance)", () => {
    expect(isZeroBalance(ZERO_HANDLE)).toBe(true);
  });

  it("returns false for a non-zero handle", () => {
    expect(isZeroBalance("0x" + "9f3ce8a41b7d".padEnd(64, "0"))).toBe(false);
  });
});
