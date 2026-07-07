import { clampFaucetAmount, toFaucetError } from "./faucetErrors";
import { describe, expect, it } from "vitest";

/**
 * FCT-02 / T-04-01 / T-04-03 lock: the two PURE faucet functions.
 *
 * `clampFaucetAmount` enforces the verified per-call cap (1,000,000 whole
 * tokens, 04-RESEARCH Pattern 1) and rejects non-positive / non-numeric input
 * (the caller disables the claim on 0). `toFaucetError` maps every real FCT-02
 * failure (low Sepolia ETH, tGBP restricted mint, over-cap revert, wallet
 * rejection) to readable copy — never a raw revert string (T-04-03). No chain,
 * no wagmi import: plain functions over primitives.
 */

const FAUCET_CAP = 1_000_000;

describe("clampFaucetAmount", () => {
  it("passes a normal amount through (number and string forms)", () => {
    expect(clampFaucetAmount(1000)).toBe(1000);
    expect(clampFaucetAmount("1000")).toBe(1000);
  });

  it("clamps an over-cap amount to the 1,000,000-per-call limit", () => {
    expect(clampFaucetAmount(2_000_000)).toBe(FAUCET_CAP);
    expect(clampFaucetAmount("5000000")).toBe(FAUCET_CAP);
    expect(clampFaucetAmount(FAUCET_CAP)).toBe(FAUCET_CAP);
  });

  it("rejects non-positive / non-numeric input to 0 (caller disables the claim)", () => {
    expect(clampFaucetAmount(0)).toBe(0);
    expect(clampFaucetAmount(-5)).toBe(0);
    expect(clampFaucetAmount(NaN)).toBe(0);
    expect(clampFaucetAmount("")).toBe(0);
    expect(clampFaucetAmount("abc")).toBe(0);
    expect(clampFaucetAmount(Infinity)).toBe(0);
  });

  it("allows a fractional whole-token amount below the cap", () => {
    expect(clampFaucetAmount(0.5)).toBe(0.5);
    expect(clampFaucetAmount("0.25")).toBe(0.25);
  });
});

describe("toFaucetError", () => {
  it("maps the tGBP restricted flag -> restricted-faucet copy (highest priority)", () => {
    const out = toFaucetError(new Error("execution reverted"), { restricted: true });
    expect(out).toBe("This token's faucet is restricted — claim it from the official testnet faucet.");
  });

  it("maps insufficient-funds / gas errors -> top-up-Sepolia-ETH copy", () => {
    expect(toFaucetError(new Error("insufficient funds for intrinsic transaction cost"))).toBe(
      "You need Sepolia ETH for gas — top up from a Sepolia ETH faucet first.",
    );
    expect(toFaucetError({ name: "InsufficientFundsError", message: "x" })).toBe(
      "You need Sepolia ETH for gas — top up from a Sepolia ETH faucet first.",
    );
    expect(toFaucetError(new Error("intrinsic gas too low"))).toBe(
      "You need Sepolia ETH for gas — top up from a Sepolia ETH faucet first.",
    );
  });

  it("maps a revert / over-cap 'exceeds' error -> cap/restricted copy (no raw revert)", () => {
    const out = toFaucetError(new Error("execution reverted: amount exceeds cap"));
    expect(out).toBe(
      "Claim failed — amount may exceed the 1,000,000-per-call limit, or this token's mint is restricted.",
    );
    expect(out).not.toMatch(/reverted/i);
  });

  it("maps a wallet rejection -> declined copy", () => {
    expect(toFaucetError(new Error("User rejected the request."))).toBe("You declined the wallet prompt.");
    expect(toFaucetError({ name: "UserRejectedRequestError", message: "denied" })).toBe(
      "You declined the wallet prompt.",
    );
  });

  it("maps anything unknown -> a generic readable fallback (no raw revert leaked)", () => {
    expect(toFaucetError(new Error("???"))).toBe("Could not claim test tokens — please try again.");
    expect(toFaucetError("just a string")).toBe("Could not claim test tokens — please try again.");
    expect(toFaucetError(undefined)).toBe("Could not claim test tokens — please try again.");
  });
});
