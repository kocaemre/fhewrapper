import { toWrapError } from "./wrapErrors";
import {
  ApprovalFailedError,
  InsufficientERC20BalanceError,
  SigningRejectedError,
  TransactionRevertedError,
  ZamaError,
  ZamaErrorCode,
} from "@zama-fhe/react-sdk";
import { describe, expect, it } from "vitest";

/**
 * WRP-01 messaging lock: every wrap-flow `ZamaError` subclass maps to readable
 * copy via `instanceof` (never string-matching revert text; 04-RESEARCH
 * "Don't Hand-Roll"). Real error instances are constructed from the re-exported
 * exact-3.0.0 classes — the SDK is never mocked.
 *
 * Ordering matters: the specific subclasses must be caught BEFORE the generic
 * `ZamaError` fallthrough, and unknowns last.
 */
describe("toWrapError", () => {
  it("SigningRejectedError → declined-prompt copy", () => {
    expect(toWrapError(new SigningRejectedError("user rejected"))).toBe("You declined the wallet prompt.");
  });

  it("InsufficientERC20BalanceError → use-the-faucet copy", () => {
    const e = new InsufficientERC20BalanceError("not enough", {
      requested: 10n,
      available: 1n,
      token: "0x0000000000000000000000000000000000000001",
    });
    expect(toWrapError(e)).toBe("Not enough underlying tokens — use the faucet first.");
  });

  it("ApprovalFailedError → approval-failed copy", () => {
    expect(toWrapError(new ApprovalFailedError("approve reverted"))).toBe(
      "The ERC-20 approval failed — please try again.",
    );
  });

  it("TransactionRevertedError → wrap-reverted copy", () => {
    expect(toWrapError(new TransactionRevertedError("execution reverted"))).toBe("The wrap transaction reverted.");
  });

  it("generic ZamaError → could-not-complete copy (fallthrough after specific subclasses)", () => {
    expect(toWrapError(new ZamaError(ZamaErrorCode.KeypairExpired, "boom"))).toBe("The wrap could not be completed.");
  });

  it("unknown / non-SDK error → unexpected copy", () => {
    expect(toWrapError(new Error("???"))).toBe("Unexpected error while wrapping.");
    expect(toWrapError("just a string")).toBe("Unexpected error while wrapping.");
  });
});
