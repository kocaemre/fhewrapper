"use client";

import { useCallback, useState } from "react";
import { type Address, type Hex, rateContract, useShield } from "@zama-fhe/react-sdk";
import { parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { type WrapPreview, previewWrap } from "~~/lib/previewWrap";

/**
 * Wrap engine (WRP-01 / WRP-02).
 *
 * Wraps the installed EXACT 3.0.0 `@zama-fhe/react-sdk` `useShield` — which
 * orchestrates ERC-20 approval + wrap in ONE mutation and fires
 * `onApprovalSubmitted` / `onShieldSubmitted` — into the design's 4-stage
 * indicator machine. Do NOT hand-roll approve+wrap (04-RESEARCH Don't-Hand-Roll).
 *
 *   useShield({ tokenAddress, wrapperAddress })  — installed 3.0.0 config is
 *     `{ tokenAddress, wrapperAddress }`, NOT the docs' `{ address }` (Pitfall 4,
 *     verified on disk). For these registry pairs the ERC-7984 confidential token
 *     IS the ERC7984ERC20Wrapper, so both addresses are the confidential address
 *     (04-RESEARCH A5).
 *   rateContract(addr)  — SDK-verified read-config `{ address, abi, functionName:
 *     "rate", args: [] }`; spreads into `useReadContract` (pinned to Sepolia so
 *     the preview resolves regardless of the wallet's active chain).
 *   previewWrap(underlyingRaw, rate, wrapperDecimals)  — the pure WRP-02 math.
 *
 * NOTE (04-RESEARCH Open Q1/A2): `amount` is assumed UNDERLYING-raw base units;
 * the live decrypt==preview assertion in 04-UAT confirms the scale. The tx path
 * is SDK-owned and proven live (04-UAT), not unit-tested by design.
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

  // WRP-01: one mutation does ERC-20 approval + wrap. For these pairs the
  // confidential token IS the wrapper, so tokenAddress === wrapperAddress.
  const { mutateAsync: shield, isPending } = useShield({
    tokenAddress: confidentialAddr,
    wrapperAddress: confidentialAddr,
  });

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: shieldHash });

  const wrap = useCallback(
    async (underlyingRaw: bigint, approvalStrategy: ApprovalStrategy = "max"): Promise<Hex> => {
      try {
        // "skip" means the allowance is already set — start at the wrap stage.
        setStage(approvalStrategy === "skip" ? "wrapping" : "approving");
        const { txHash } = await shield({
          amount: underlyingRaw,
          approvalStrategy,
          onApprovalSubmitted: () => setStage("wrapping"), // approval tx sent → move to wrap
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
    [shield],
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
