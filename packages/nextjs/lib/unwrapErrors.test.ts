import { toUnwrapError } from "./unwrapErrors";
import {
  InsufficientConfidentialBalanceError,
  RelayerRequestFailedError,
  SigningRejectedError,
  TransactionRevertedError,
  ZamaError,
  ZamaErrorCode,
} from "@zama-fhe/react-sdk";
import { describe, expect, it } from "vitest";

/**
 * UNW-01 messaging lock: every unwrap/finalize-flow `ZamaError` subclass maps to
 * readable copy via `instanceof` (never string-matching raw revert text). Real
 * error instances are constructed from the re-exported exact-3.0.0 classes — the
 * SDK is never mocked. Specific subclasses are caught BEFORE the generic
 * `ZamaError` fallthrough; unknowns last.
 */
describe("toUnwrapError", () => {
  it("SigningRejectedError → declined-prompt copy", () => {
    expect(toUnwrapError(new SigningRejectedError("user rejected"))).toBe("You declined the wallet prompt.");
  });

  it("InsufficientConfidentialBalanceError → not-enough-confidential copy", () => {
    const e = new InsufficientConfidentialBalanceError("not enough", {
      requested: 10n,
      available: 1n,
      token: "0x0000000000000000000000000000000000000001",
    });
    const copy = toUnwrapError(e);
    expect(copy).not.toBe("");
    expect(copy.toLowerCase()).toContain("balance");
  });

  it("RelayerRequestFailedError → decryption-service copy", () => {
    const copy = toUnwrapError(new RelayerRequestFailedError("relayer down"));
    expect(copy).not.toBe("");
  });

  it("TransactionRevertedError → unwrap/finalize-reverted copy", () => {
    expect(toUnwrapError(new TransactionRevertedError("execution reverted"))).toBe("The unwrap transaction reverted.");
  });

  it("generic ZamaError → generic SDK-error copy (fallthrough after specific subclasses)", () => {
    expect(toUnwrapError(new ZamaError(ZamaErrorCode.KeypairExpired, "boom"))).toBe(
      "The unwrap could not be completed.",
    );
  });

  it("unknown / non-SDK error → unexpected copy", () => {
    expect(toUnwrapError(new Error("???"))).toBe("Unexpected error while unwrapping.");
    expect(toUnwrapError("just a string")).toBe("Unexpected error while unwrapping.");
  });

  it("maps each subclass to a DISTINCT non-empty string", () => {
    const copies = new Set([
      toUnwrapError(new SigningRejectedError("x")),
      toUnwrapError(
        new InsufficientConfidentialBalanceError("x", {
          requested: 10n,
          available: 1n,
          token: "0x0000000000000000000000000000000000000001",
        }),
      ),
      toUnwrapError(new RelayerRequestFailedError("x")),
      toUnwrapError(new TransactionRevertedError("x")),
      toUnwrapError(new ZamaError(ZamaErrorCode.KeypairExpired, "x")),
      toUnwrapError(new Error("x")),
    ]);
    expect(copies.size).toBe(6);
    for (const c of copies) expect(c).not.toBe("");
  });
});
