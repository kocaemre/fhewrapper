"use client";

import { ChainGuard } from "~~/components/ChainGuard";
import { FaucetPanel } from "~~/components/faucet/FaucetPanel";

/**
 * /faucet — the test-token cask (FCT-01/FCT-02).
 *
 * A write flow (public `mint` on the underlying ERC-20), so — like /decrypt —
 * the panel is wrapped in the Phase-1 `ChainGuard`: a wallet must be connected
 * on Sepolia before it renders. Registry browse stays ungated; only this claim
 * screen requires a connection. Mounts inside the existing FHE provider tree
 * (app/layout.tsx) — no provider change.
 *
 * Shell mirrors app/decrypt/page.tsx (max-width 1180, centered).
 */
export default function FaucetPage() {
  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "40px 30px 120px",
        width: "100%",
      }}
    >
      <ChainGuard>
        <FaucetPanel />
      </ChainGuard>
    </main>
  );
}
