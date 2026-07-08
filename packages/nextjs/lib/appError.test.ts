import { type AppError, toAppError } from "./appError";
import { toDecryptError } from "./decryptErrors";
import { toFaucetError } from "./faucetErrors";
import { toUnwrapError } from "./unwrapErrors";
import { toWrapError } from "./wrapErrors";
import {
  ApprovalFailedError,
  ConfigurationError,
  DecryptionFailedError,
  InsufficientConfidentialBalanceError,
  InsufficientERC20BalanceError,
  RelayerRequestFailedError,
  SigningRejectedError,
  ZamaError,
  ZamaErrorCode,
} from "@zama-fhe/react-sdk";
import { describe, expect, it } from "vitest";

/**
 * UX-01 / T-06-01 lock: the ONE unified `toAppError` classifier.
 *
 * Every failure mode across faucet/wrap/unwrap/decrypt resolves through this
 * single function to the same `{chip, body, recoverable}` shape — never a raw
 * revert string. The four per-flow maps delegate to it; this suite proves the
 * union of SC1 modes classifies correctly and that delegation preserves copy.
 */

const erc20Meta = { requested: 10n, available: 1n, token: "0x0000000000000000000000000000000000000001" as const };

function assertShape(out: AppError) {
  expect(typeof out.chip).toBe("string");
  expect(typeof out.body).toBe("string");
  expect(out.body).not.toBe("");
  expect(typeof out.recoverable).toBe("boolean");
  expect(out.body).not.toMatch(/reverted/i);
}

describe("toAppError — unified shape", () => {
  // Test A — missing approval (wrap).
  it("A: ApprovalFailedError under wrap -> recoverable approval body", () => {
    const out = toAppError(new ApprovalFailedError("approve reverted"), { flow: "wrap" });
    assertShape(out);
    expect(out.recoverable).toBe(true);
    expect(out.body.toLowerCase()).toContain("approval");
  });

  // Test B — insufficient balance (wrap + unwrap).
  it("B: insufficient balance points at the faucet (wrap) / confidential (unwrap)", () => {
    const wrap = toAppError(new InsufficientERC20BalanceError("no", erc20Meta), { flow: "wrap" });
    assertShape(wrap);
    expect(wrap.body.toLowerCase()).toContain("faucet");
    const unwrap = toAppError(new InsufficientConfidentialBalanceError("no", erc20Meta), { flow: "unwrap" });
    assertShape(unwrap);
    expect(unwrap.body.toLowerCase()).toContain("confidential balance");
  });

  // Test C — network mismatch (any flow, text-based).
  it("C: a chain-mismatch text error -> switch-to-Sepolia body for any flow", () => {
    const msg = new Error("The current chain does not match the target chain for the transaction.");
    for (const flow of ["faucet", "wrap", "unwrap", "decrypt"] as const) {
      const out = toAppError(msg, { flow });
      assertShape(out);
      expect(out.body.toLowerCase()).toContain("sepolia");
    }
    const named = toAppError({ name: "ChainMismatchError", message: "x" }, { flow: "wrap" });
    expect(named.body.toLowerCase()).toContain("sepolia");
  });

  // Test D — unsupported token / restricted / config.
  it("D: faucet restricted -> tGBP copy; decrypt ConfigurationError -> config body", () => {
    const restricted = toAppError(new Error("execution reverted"), { flow: "faucet", restricted: true });
    assertShape(restricted);
    expect(restricted.body).toBe("This token's faucet is restricted — claim it from the official testnet faucet.");
    const cfg = toAppError(new ConfigurationError("forbidden chain id"), { flow: "decrypt" });
    expect(cfg.chip).toBe("DECRYPTION FAILED");
    expect(cfg.recoverable).toBe(false);
    expect(cfg.body).toMatch(/network|configuration/i);
  });

  // Test E — ACL denial (decrypt).
  it("E: ACL revert / DecryptionFailed / RelayerRequestFailed (decrypt) -> NO DECRYPTION ACCESS", () => {
    const acl = toAppError(new Error("execution reverted: EnforcedPause()"), { flow: "decrypt" });
    expect(acl.chip).toBe("NO DECRYPTION ACCESS");
    const dec = toAppError(new DecryptionFailedError("relayer said no"), { flow: "decrypt" });
    expect(dec).toEqual({
      chip: "NO DECRYPTION ACCESS",
      body: "This token hasn't granted your address a viewing key — some confidential tokens are undecryptable by design.",
      recoverable: true,
    });
    const relayer = toAppError(new RelayerRequestFailedError("HTTP 403", 403), { flow: "decrypt" });
    expect(relayer.chip).toBe("NO DECRYPTION ACCESS");
  });

  // Test F — faucet edges (no raw revert leaks).
  it("F: faucet gas / over-cap / declined edges -> curated copy, never a raw revert", () => {
    const gas = toAppError(new Error("insufficient funds for intrinsic transaction cost"), { flow: "faucet" });
    assertShape(gas);
    expect(gas.body.toLowerCase()).toContain("sepolia eth");
    const cap = toAppError(new Error("execution reverted: amount exceeds cap"), { flow: "faucet" });
    assertShape(cap);
    expect(cap.body).toContain("1,000,000");
    const declined = toAppError(new Error("User rejected the request."), { flow: "faucet" });
    assertShape(declined);
    expect(declined.body.toLowerCase()).toContain("declined");
  });

  // Test G — unknown fallback.
  it("G: an unknown non-SDK error -> safe generic body, recoverable true", () => {
    const out = toAppError(new Error("totally unexpected"), { flow: "wrap" });
    assertShape(out);
    expect(out.recoverable).toBe(true);
  });

  // Test H — delegation parity (one model, four consumers).
  it("H: the four per-flow maps delegate to toAppError", () => {
    const wrapE = new ApprovalFailedError("approve reverted");
    expect(toWrapError(wrapE)).toBe(toAppError(wrapE, { flow: "wrap" }).body);

    const unwrapE = new SigningRejectedError("user rejected");
    expect(toUnwrapError(unwrapE)).toBe(toAppError(unwrapE, { flow: "unwrap" }).body);

    const faucetE = new Error("insufficient funds for intrinsic transaction cost");
    expect(toFaucetError(faucetE)).toBe(toAppError(faucetE, { flow: "faucet" }).body);

    const decryptE = new DecryptionFailedError("relayer said no");
    expect(toDecryptError(decryptE)).toEqual(toAppError(decryptE, { flow: "decrypt" }));
  });

  it("classifies a generic ZamaError per flow", () => {
    const z = new ZamaError(ZamaErrorCode.KeypairExpired, "boom");
    expect(toAppError(z, { flow: "wrap" }).body).toBe("The wrap could not be completed.");
    expect(toAppError(z, { flow: "unwrap" }).body).toBe("The unwrap could not be completed.");
    expect(toAppError(z, { flow: "decrypt" })).toEqual({
      chip: "DECRYPTION FAILED",
      body: "The FHE gateway didn't respond.",
      recoverable: true,
    });
  });
});
