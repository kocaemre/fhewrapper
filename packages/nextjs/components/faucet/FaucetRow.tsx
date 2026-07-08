"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { type FaucetStage, FaucetStageIndicator } from "~~/components/faucet/FaucetStageIndicator";
import { TokenIcon } from "~~/components/registry/TokenIcon";
import { notifyError, notifyPending, notifySuccess } from "~~/components/status/txToast";
import { useFaucet } from "~~/hooks/useFaucet";
import { toAppError } from "~~/lib/appError";
import { normalizeSymbol } from "~~/lib/tokenSymbol";
import type { RegistryPair } from "~~/registry/types";

const SERIF = "var(--font-gelasio), Georgia, serif";
const MONO = "'JetBrains Mono', monospace";

/** Fixed per-claim amount (whole tokens) — well under the 1,000,000 cap. */
export const CLAIM_AMOUNT = 1000;

/**
 * True when a pair's underlying is the restricted tGBP mock — its `mint`
 * reverts (04-RESEARCH: the one restricted exception). Detected by symbol on
 * either side so we surface the restricted copy WITHOUT sending a doomed tx.
 */
function isRestricted(pair: RegistryPair): boolean {
  return /gbp/i.test(pair.underlying.symbol) || /gbp/i.test(pair.confidential.symbol);
}

/**
 * One faucet claim row for a valid registry pair's UNDERLYING ERC-20 (FCT-01).
 *
 * Mints `CLAIM_AMOUNT` of `pair.underlying` to the connected wallet via
 * `useFaucet`, now fully treated (UX-02): a Submit → Confirm → Done stage view
 * drives from the claim state, a themed toast runs pending → success (with a
 * working Sepolia explorer link) / error, and every failure renders as the
 * unified `toAppError` body — never a raw revert (T-06-01). tGBP is disabled
 * up-front with the restricted copy; the button is also disabled when the wallet
 * is low on Sepolia ETH for gas (`ethLow`). The untrusted on-chain symbol is
 * interpolated into toast/row text as JSX-escaped children only (T-02-01).
 */
export function FaucetRow({ pair, ethLow }: { pair: RegistryPair; ethLow: boolean }) {
  const { address } = useAccount();
  const { claim, txHash, isPending, confirming, isSuccess, error } = useFaucet();

  const restricted = isRestricted(pair);
  const inFlight = isPending || confirming;
  const disabled = restricted || ethLow || !address || inFlight || isSuccess;

  const symbol = normalizeSymbol(pair.underlying.symbol);

  const btnLabel = isSuccess ? "Claimed ✓" : inFlight ? "Claiming…" : "Claim";

  const stage: FaucetStage = isSuccess ? "done" : confirming ? "confirm" : isPending ? "submit" : "idle";

  // Sub-label priority: restricted copy > live typed error > low-ETH hint > idle.
  let subLabel = "";
  if (restricted) subLabel = toAppError(null, { flow: "faucet", restricted: true }).body;
  else if (error) subLabel = toAppError(error, { flow: "faucet" }).body;
  else if (ethLow) subLabel = "Top up Sepolia ETH first";

  // The id of the pending toast so success/error REPLACE it in place (no stacking).
  const pendingIdRef = useRef<string | undefined>(undefined);

  // On receipt: swap the pending toast for a success toast carrying the tx link.
  useEffect(() => {
    if (isSuccess && pendingIdRef.current) {
      notifySuccess({
        title: `Claimed ${symbol}`,
        desc: "Minted to your wallet on Sepolia.",
        hash: txHash,
        id: pendingIdRef.current,
      });
      pendingIdRef.current = undefined;
    }
  }, [isSuccess, txHash, symbol]);

  // On failure: swap the pending toast for the typed error body.
  useEffect(() => {
    if (error && pendingIdRef.current) {
      notifyError({
        title: `Couldn't claim ${symbol}`,
        desc: toAppError(error, { flow: "faucet", restricted }).body,
        id: pendingIdRef.current,
      });
      pendingIdRef.current = undefined;
    }
  }, [error, symbol, restricted]);

  const onClaim = () => {
    if (!address) return;
    pendingIdRef.current = notifyPending(`Claiming ${symbol}`, "Minting test tokens on Sepolia…");
    // Fire-and-classify: rejection/revert surface via `error` -> toAppError + toast.
    claim(pair.underlying.address, address, CLAIM_AMOUNT, pair.underlying.decimals).catch(() => {});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          border: "2px solid var(--line)",
          background: "var(--panel)",
          padding: "16px 20px",
        }}
      >
        <TokenIcon confidentialSymbol={pair.confidential.symbol} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>
            {symbol}{" "}
            <span style={{ color: "var(--faint)", fontWeight: 400, fontSize: 13, fontStyle: "italic" }}>
              {pair.underlying.name}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--red)", fontFamily: MONO, fontWeight: 600 }}>
            {CLAIM_AMOUNT.toLocaleString()} per claim
          </div>
        </div>

        <div style={{ textAlign: "right", flex: "none" }}>
          <button
            type="button"
            onClick={onClaim}
            disabled={disabled}
            aria-label={`Claim ${CLAIM_AMOUNT.toLocaleString()} ${symbol}`}
            style={{
              border: `2px solid ${disabled ? "var(--line)" : "var(--block)"}`,
              background: isSuccess ? "var(--panel2)" : disabled ? "var(--panel2)" : "var(--block)",
              color: isSuccess ? "var(--muted)" : disabled ? "var(--faint)" : "var(--block-fg)",
              padding: "9px 20px",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: SERIF,
              minWidth: 116,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {btnLabel}
          </button>
          <div
            style={{
              fontSize: 11.5,
              color: restricted ? "var(--red)" : "var(--faint)",
              marginTop: 5,
              minHeight: 14,
              maxWidth: 220,
              fontFamily: MONO,
              textWrap: "pretty",
            }}
          >
            {subLabel}
          </div>
        </div>
      </div>

      {stage !== "idle" && <FaucetStageIndicator stage={stage} />}
    </div>
  );
}
