"use client";

import { sepoliaTxUrl } from "~~/lib/explorer";

const MONO = "var(--font-jetbrains-mono), monospace";

/**
 * "View on Etherscan ↗" link to a tx on Sepolia (UX-02, T-06-04).
 *
 * The href is built by the host-pinned `sepoliaTxUrl` helper — when it returns
 * `undefined` (missing / malformed hash) this renders NOTHING rather than a junk
 * or spoofable link. The anchor opens in a new tab with `rel="noopener
 * noreferrer"` so the destination can't reach back into the app (T-06-04).
 */
export function ExplorerTxLink({ hash }: { hash?: string }) {
  const url = sepoliaTxUrl(hash);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-block",
        marginTop: 6,
        fontFamily: MONO,
        fontSize: 12,
        color: "var(--blue, #3b82f6)",
        textDecoration: "underline",
      }}
    >
      View on Etherscan ↗
    </a>
  );
}
