"use client";

import { useCallback, useState } from "react";
import {
  type Address,
  type Hex,
  rateContract,
  useApproveUnderlying,
  useShield,
  useUnderlyingAllowance,
} from "@zama-fhe/react-sdk";
import { parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { type WrapPreview, previewWrap } from "~~/lib/previewWrap";

/**
 * Wrap engine (WRP-01 / WRP-02).
 *
 * Orchestrates ERC-20 approval + wrap over the installed EXACT 3.0.0
 * `@zama-fhe/react-sdk`, mapped to the design's 4-stage indicator machine. Do
 * NOT hand-roll the underlying transferFrom/wrap calldata — the approval and
 * wrap themselves stay SDK-owned (04-RESEARCH Don't-Hand-Roll); this hook only
 * SEQUENCES two SDK mutations so the second one estimates gas against confirmed
 * state.
 *
 * ── WHY NOT the single `useShield` internal approve? (root cause of the live
 *    "gas limit too high" wrap revert) ──────────────────────────────────────
 *   `Token.shield`'s internal approve helper SUBMITS the ERC-20 approve tx but
 *   returns as soon as it is in the mempool — it does NOT await the approve
 *   RECEIPT (verified in the installed 3.0.0 bundle: the approve path emits
 *   `ApproveUnderlyingSubmitted` and returns, whereas `approveUnderlying()` and
 *   the wrap both `await waitForTransactionReceipt`). `shield` then immediately
 *   builds the wrap tx, so the wallet's `eth_estimateGas` runs while allowance
 *   is still 0 → the wrap's `transferFrom` reverts with
 *   `ERC20InsufficientAllowance` (0xfb8f41b2, confirmed via a live Sepolia
 *   `eth_call`) → MetaMask falls back to a max gas limit → Infura rejects with
 *   "gas limit too high". Fix: run a CONFIRMED approve first (`useApproveUnderlying`
 *   awaits the receipt), then `shield({ approvalStrategy: "skip" })` so the wrap
 *   estimates against a mined, non-zero allowance.
 *
 *   useShield / useApproveUnderlying / useUnderlyingAllowance({ tokenAddress,
 *     wrapperAddress })  — installed 3.0.0 config is `{ tokenAddress,
 *     wrapperAddress }` where `tokenAddress` is the confidential ERC-7984 token
 *     and `wrapperAddress` the ERC7984ERC20Wrapper. For these registry pairs the
 *     confidential token IS the wrapper, so both are the confidential address
 *     (verified against UseZamaConfig JSDoc — 04-RESEARCH A5). The SDK derives
 *     the UNDERLYING ERC-20 itself via `wrapper.underlying()` and approves the
 *     wrapper as spender, so the underlying address is never passed here.
 *   rateContract(addr)  — SDK-verified read-config `{ address, abi, functionName:
 *     "rate", args: [] }`; spreads into `useReadContract` (pinned to Sepolia so
 *     the preview resolves regardless of the wallet's active chain).
 *   previewWrap(underlyingRaw, rate, wrapperDecimals)  — the pure WRP-02 math.
 *
 * NOTE (04-RESEARCH Open Q1/A2): `amount` is UNDERLYING-raw base units; the SDK
 * wrap pulls `amount` underlying and mints `amount / rate` confidential. The live
 * decrypt==preview assertion in 04-UAT confirms the scale.
 */
export type WrapStage = "idle" | "approving" | "wrapping" | "confirming" | "done" | "error";

/** Approval handling passed through to `useShield` (04-RESEARCH Open Q2 default "max"). */
export type ApprovalStrategy = "max" | "exact" | "skip";

export interface UseWrapResult {
  /** Current stage of the approve → wrap → confirm → done machine. */
  stage: WrapStage;
  /**
   * Run the single approve→wrap flow for `underlyingRaw` base units. Resolves
   * with the wrap tx hash after it is mined; sets `stage` to `error` and rethrows
   * on failure (classify with `toWrapError` at the UI layer).
   */
  wrap: (underlyingRaw: bigint, approvalStrategy?: ApprovalStrategy) => Promise<Hex>;
  /** Whether the shield mutation is in flight. */
  isPending: boolean;
  /** The onchain wrap/unwrap conversion rate `10^(underlyingDec − wrapperDec)`, or undefined until read. */
  rate: bigint | undefined;
  /**
   * Pure preview for a `whole` underlying amount string. Returns undefined until
   * the onchain `rate()` resolves or when the input is not a parseable amount.
   */
  preview: (whole: string, underlyingDecimals: number, wrapperDecimals: number) => WrapPreview | undefined;
  /** Whether the wrap receipt has been mined (belt-and-suspenders over the mutation resolve; Pitfall 6). */
  confirmed: boolean;
  /**
   * The submitted wrap tx hash (set on `onShieldSubmitted`), so the UI can render
   * a live explorer link and carry the real tx into the success toast. Additive
   * over the existing `shieldHash` state — no change to the machine or SDK config.
   */
  txHash: Hex | undefined;
}

export function useWrap(confidentialAddr: Address): UseWrapResult {
  const [stage, setStage] = useState<WrapStage>("idle");
  const [shieldHash, setShieldHash] = useState<Hex | undefined>();

  // WRP-02: read rate() per pair — never hardcode 18. Pinned to Sepolia (registry chain).
  const { data: rate } = useReadContract({
    ...rateContract(confidentialAddr),
    chainId: sepolia.id,
  });

  // WRP-01: the wrap mutation. For these pairs the confidential token IS the
  // wrapper, so tokenAddress === wrapperAddress. We always drive it with
  // `approvalStrategy: "skip"` and do the approve as a separate CONFIRMED step
  // below, so the wrap estimates gas against a mined (non-zero) allowance.
  const { mutateAsync: shield, isPending: shieldPending } = useShield({
    tokenAddress: confidentialAddr,
    wrapperAddress: confidentialAddr,
  });

  // Confirmed ERC-20 approval: `approveUnderlying` awaits its receipt (unlike
  // shield's internal approve), so its promise resolves only once the allowance
  // is mined — the wrap that follows then passes eth_estimateGas.
  const { mutateAsync: approveUnderlying, isPending: approvePending } = useApproveUnderlying({
    tokenAddress: confidentialAddr,
    wrapperAddress: confidentialAddr,
  });

  // Current underlying→wrapper allowance, so we can skip a redundant approve tx
  // when the wallet already has enough allowance for this wrap.
  const { data: allowance, refetch: refetchAllowance } = useUnderlyingAllowance({
    tokenAddress: confidentialAddr,
    wrapperAddress: confidentialAddr,
  });

  const isPending = shieldPending || approvePending;

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: shieldHash });

  const wrap = useCallback(
    async (underlyingRaw: bigint, approvalStrategy: ApprovalStrategy = "max"): Promise<Hex> => {
      try {
        if (approvalStrategy !== "skip") {
          // Read fresh allowance; only approve when it is actually insufficient
          // (a prior wrap or a "max" grant may already cover this amount).
          let current = allowance;
          try {
            const { data } = await refetchAllowance();
            if (typeof data === "bigint") current = data;
          } catch {
            // Non-fatal: fall back to the last cached allowance value.
          }
          if (current === undefined || current < underlyingRaw) {
            setStage("approving");
            // "max" → undefined amount (SDK approves max uint256); "exact" → this wrap's amount.
            // This RESOLVES ONLY after the approve tx is mined → allowance is live on-chain.
            await approveUnderlying(approvalStrategy === "exact" ? { amount: underlyingRaw } : {});
          }
        }

        // Allowance is now confirmed on-chain, so the wrap's gas estimation
        // succeeds. "skip" makes shield go straight to the wrap tx.
        setStage("wrapping");
        const { txHash } = await shield({
          amount: underlyingRaw,
          approvalStrategy: "skip",
          onShieldSubmitted: (h: Hex) => {
            setShieldHash(h);
            setStage("confirming");
          },
        });
        // The mutation resolves only after the wrap tx is mined ({ txHash, receipt }).
        setStage("done");
        return txHash;
      } catch (e) {
        setStage("error");
        throw e; // classify via toWrapError at the UI layer
      }
    },
    [shield, approveUnderlying, refetchAllowance, allowance],
  );

  const preview = useCallback(
    (whole: string, underlyingDecimals: number, wrapperDecimals: number): WrapPreview | undefined => {
      if (rate === undefined) return undefined;
      const trimmed = whole.trim();
      let underlyingRaw: bigint;
      try {
        underlyingRaw = trimmed === "" ? 0n : parseUnits(trimmed, underlyingDecimals);
      } catch {
        // Not a parseable decimal (mid-typing, stray char) — no preview yet.
        return undefined;
      }
      return previewWrap(underlyingRaw, rate as bigint, wrapperDecimals);
    },
    [rate],
  );

  return { stage, wrap, isPending, rate: rate as bigint | undefined, preview, confirmed, txHash: shieldHash };
}
