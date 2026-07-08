"use client";

import { parseEther } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useBalance } from "wagmi";
import { FaucetRow } from "~~/components/faucet/FaucetRow";
import { useRegistryPairs } from "~~/hooks/useRegistryPairs";

const SERIF = "var(--font-gelasio), Georgia, serif";

/** Below this native balance, claims can't pay gas — show the low-ETH banner. */
const LOW_ETH_THRESHOLD = parseEther("0.001");

/** Where a judge tops up Sepolia ETH when the wallet is dry (FCT-02). */
const SEPOLIA_ETH_FAUCET = "https://sepoliafaucet.com/";

/**
 * The test-token cask (FCT-01/FCT-02) — the faucet screen.
 *
 * Lists a claim row for the UNDERLYING ERC-20 of every VALID registry pair,
 * sourced from the Phase-2 `useRegistryPairs` engine (NEVER a hardcoded token
 * list). Revoked pairs are skipped.
 *
 * Native-gas pre-check (Pitfall 5, a real FCT-02 case): `useBalance` reads the
 * connected wallet's Sepolia ETH; when it's below `LOW_ETH_THRESHOLD` the
 * design's low-ETH alert banner renders and every row is disabled via `ethLow`
 * so a judge never fires a doomed, gas-less claim.
 *
 * Rendered under ChainGuard (app/faucet/page.tsx) — only mounts connected on
 * Sepolia. There is NO cooldown state; that would be fiction (04-RESEARCH).
 */
export function FaucetPanel() {
  const { address } = useAccount();
  const { pairs, isLoading, isError } = useRegistryPairs();

  const { data: balance } = useBalance({
    address,
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  });

  const ethLow = balance !== undefined && balance.value < LOW_ETH_THRESHOLD;
  const ethFormatted = balance ? Number(balance.formatted).toFixed(4) : "0.0000";

  const validPairs = pairs.filter(p => p.isValid);

  return (
    <section style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 36, margin: "0 0 10px", color: "var(--ink)" }}>
          The test-token cask
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 15.5, textWrap: "pretty" }}>
          Draw official cTokenMock underlyings on Sepolia. Claim a batch of test tokens, then wrap them into their
          confidential pair.
        </p>
      </div>

      <div
        role="note"
        aria-label='What "(Mock)" means'
        style={{
          display: "flex",
          gap: 11,
          alignItems: "flex-start",
          border: "1px solid var(--line)",
          borderLeftWidth: 3,
          background: "var(--panel2)",
          padding: "12px 16px",
          marginBottom: 18,
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "var(--muted)",
        }}
      >
        <span
          aria-hidden="true"
          style={{ color: "var(--faint)", fontWeight: 700, fontSize: 15, fontFamily: SERIF, lineHeight: 1.3 }}
        >
          ⓘ
        </span>
        <span style={{ textWrap: "pretty" }}>
          <strong style={{ color: "var(--ink)" }}>“Mock” = official Zama test tokens on Sepolia</strong> — freely
          mintable, zero real value. These buttons fire real onchain transactions, so you can try the wrap → decrypt →
          unwrap flow risk-free.
        </span>
      </div>

      {ethLow && (
        <div
          role="alert"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            border: "2px solid var(--red)",
            background: "var(--red-dim)",
            padding: "13px 18px",
            marginBottom: 18,
            fontSize: 14,
          }}
        >
          <span aria-hidden="true" style={{ color: "var(--red)", fontWeight: 800, fontSize: 15 }}>
            ⚠
          </span>
          <span>
            <strong>Low Sepolia ETH</strong> ({ethFormatted} ETH). Claims cost gas — top up from a{" "}
            <a href={SEPOLIA_ETH_FAUCET} target="_blank" rel="noopener noreferrer" style={{ color: "var(--red)" }}>
              Sepolia ETH faucet
            </a>{" "}
            first.
          </span>
        </div>
      )}

      {isLoading && (
        <p style={{ color: "var(--faint)", fontStyle: "italic", fontSize: 14, textAlign: "center" }}>
          Reading the registry…
        </p>
      )}

      {isError && (
        <p style={{ color: "var(--red)", fontSize: 14, textAlign: "center" }}>
          Could not read the registry — retry in a moment.
        </p>
      )}

      {!isLoading && !isError && validPairs.length === 0 && (
        <p style={{ color: "var(--faint)", fontStyle: "italic", fontSize: 14, textAlign: "center" }}>
          No valid registry pairs to claim.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {validPairs.map(pair => (
          <FaucetRow key={pair.underlying.address} pair={pair} ethLow={ethLow} />
        ))}
      </div>
    </section>
  );
}
