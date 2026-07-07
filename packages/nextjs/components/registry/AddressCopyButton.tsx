"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { truncateAddress } from "~~/lib/tokenSymbol";

type Standard = "ERC-20" | "ERC-7984";

/**
 * Truncated, copyable address chip (02-UI-SPEC Component Inventory + Copywriting).
 *
 * Shows `0x1c7D…7238` (truncateAddress) + a trailing `⧉` glyph. Click writes the
 * FULL address to the clipboard and fires a success toast naming the side +
 * standard. The `ERC-7984` (confidential) variant uses the blue border/fill
 * (`--blue-line` / `--blue-dim`); on hover the border tightens to `--line`
 * (or `--blue` for the confidential variant).
 *
 * `symbol` is an untrusted onchain string but is rendered only through React/
 * react-hot-toast JSX escaping — never dangerouslySetInnerHTML (T-02-01).
 */
export function AddressCopyButton({
  address,
  standard,
  symbol,
}: {
  address: string;
  standard: Standard;
  symbol: string;
}) {
  const [hover, setHover] = useState(false);
  const confidential = standard === "ERC-7984";

  const baseBorder = confidential ? "var(--blue-line)" : "var(--line-faint)";
  const hoverBorder = confidential ? "var(--blue)" : "var(--line)";

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(
        <span style={{ lineHeight: 1.45 }}>
          <strong>Copied</strong>
          <br />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {symbol} {standard} address copied to clipboard.
          </span>
        </span>,
        { style: { border: "2px solid var(--red)", background: "var(--panel)", color: "var(--ink)" } },
      );
    } catch {
      toast.error("Could not copy — clipboard is unavailable.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Copy address"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        border: `1px solid ${hover ? hoverBorder : baseBorder}`,
        background: confidential ? "var(--blue-dim)" : hover ? "var(--bg2)" : "transparent",
        color: "var(--ink)",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 12,
        padding: "5px 10px",
        cursor: "pointer",
      }}
    >
      {truncateAddress(address)}{" "}
      <span aria-hidden="true" style={{ color: "var(--faint)" }}>
        ⧉
      </span>
    </button>
  );
}
