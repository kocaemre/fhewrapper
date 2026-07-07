"use client";

import { useAccount } from "wagmi";
import { TokenIcon } from "~~/components/registry/TokenIcon";
import { useFaucet } from "~~/hooks/useFaucet";
import { toFaucetError } from "~~/lib/faucetErrors";
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
 * `useFaucet`. Button states: idle "Claim" → in-flight "Claiming…" → confirmed
 * "Claimed ✓". Every failure renders as `toFaucetError` sub-label copy — never a
 * raw revert (T-04-03). tGBP is disabled up-front with the restricted copy; the
 * button is also disabled when the wallet is low on Sepolia ETH for gas
 * (`ethLow`, a real FCT-02 case). Untrusted on-chain name/symbol stay
 * JSX-escaped (T-02-01 carried).
 */
export function FaucetRow({ pair, ethLow }: { pair: RegistryPair; ethLow: boolean }) {
  const { address } = useAccount();
  const { claim, isPending, confirming, isSuccess, error } = useFaucet();

  const restricted = isRestricted(pair);
  const inFlight = isPending || confirming;
  const disabled = restricted || ethLow || !address || inFlight || isSuccess;

  const symbol = normalizeSymbol(pair.underlying.symbol);

  const btnLabel = isSuccess ? "Claimed ✓" : inFlight ? "Claiming…" : "Claim";

  // Sub-label priority: restricted copy > live error copy > low-ETH hint > idle.
  let subLabel = "";
  if (restricted) subLabel = toFaucetError(null, { restricted: true });
  else if (error) subLabel = toFaucetError(error);
  else if (ethLow) subLabel = "Top up Sepolia ETH first";

  const onClaim = () => {
    if (!address) return;
    // Fire-and-classify: rejection/revert surface via `error` -> toFaucetError.
    claim(pair.underlying.address, address, CLAIM_AMOUNT, pair.underlying.decimals).catch(() => {});
  };

  return (
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
  );
}
