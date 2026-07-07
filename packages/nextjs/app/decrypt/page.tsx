"use client";

import { ChainGuard } from "~~/components/ChainGuard";
import { DecryptPanel } from "~~/components/decrypt/DecryptPanel";

/**
 * /decrypt — the dedicated paste-an-address user-decryption screen (DEC-02).
 *
 * Unlike the ungated Phase-2 registry browse, this is a connection-required
 * (write-ish) flow: the panel is wrapped in the Phase-1 `ChainGuard` so a wallet
 * must be connected on Sepolia before it renders (CONTEXT decision C). The page
 * mounts inside the existing client-only FHE provider tree (app/layout.tsx →
 * DappWrapperWithProviders) — no provider change.
 *
 * Shell mirrors app/page.tsx (max-width 1180, centered).
 */
export default function DecryptPage() {
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
        <DecryptPanel />
      </ChainGuard>
    </main>
  );
}
