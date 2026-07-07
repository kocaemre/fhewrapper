"use client";

import { useState } from "react";
import { iconFor, normalizeSymbol } from "~~/lib/tokenSymbol";

/**
 * Self-hosted PNG token icon (02-UI-SPEC Component Inventory / Icon Mapping).
 *
 * 46×46, 2px `--line` border, fully rounded, object-fit cover, decorative
 * (`alt=""`). Resolves `iconFor(confidentialSymbol)` -> `/icons/c{key}.png`.
 * On img load error (e.g. the 2 non-branded onchain pairs with no icon file),
 * falls back to a monogram tile in the same frame — never a broken <img>.
 *
 * Media is same-origin (public/) — required under COEP `require-corp` (T-02-05).
 */
export function TokenIcon({ confidentialSymbol }: { confidentialSymbol: string }) {
  const [errored, setErrored] = useState(false);
  const frame: React.CSSProperties = {
    width: 46,
    height: 46,
    flex: "none",
    borderRadius: 99,
    border: "2px solid var(--line)",
    boxSizing: "border-box",
  };

  if (errored) {
    // Monogram fallback: first letter of the (normalized) confidential symbol.
    const monogram = (normalizeSymbol(confidentialSymbol).replace(/^c/i, "")[0] ?? "?").toUpperCase();
    return (
      <div
        aria-hidden="true"
        style={{
          ...frame,
          display: "grid",
          placeItems: "center",
          background: "var(--panel2)",
          color: "var(--muted)",
          fontFamily: "var(--font-gelasio), Georgia, serif",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        {monogram}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconFor(confidentialSymbol)}
      alt=""
      onError={() => setErrored(true)}
      style={{ ...frame, objectFit: "cover", display: "block" }}
    />
  );
}
