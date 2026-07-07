"use client";

import { useState } from "react";

/**
 * Registry hero banner (02-UI-SPEC Component Inventory + Copywriting).
 *
 * Self-hosted `/01-hero.png` engraving (same-origin — COEP `require-corp`,
 * T-02-05) with the overlay copy transcribed verbatim from the .dc.html. 2px
 * `--line` border + hard `--shadow` on hover. `pairCount` is bound by the caller
 * to the live valid-pair count.
 *
 * The overlay text colors are FIXED to the engraving palette (dark ink over the
 * always-light hero art) per the source — they intentionally do not follow the
 * cellar theme. Because the engraving's left half is dark, a cream `.hero-scrim`
 * (matching the #EFE6CC hero ground) is laid behind the copy to restore contrast
 * without re-tinting the type or hiding the art (see globals.css).
 *
 * ANTI-CLIP: the image, scrim and copy are stacked in a single CSS-grid cell
 * (`gridArea:1/1`). The grid row height is `max(imageHeight, copyHeight)`, so on
 * narrow screens where the copy is taller than the art the row grows to fit and
 * the image (`object-fit:cover`, stretched) fills it — the heading's top line is
 * never clipped, unlike the previous `overflow:hidden` + centered-absolute copy.
 */
export function RegistryHero({ pairCount }: { pairCount: number }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "grid",
        border: "2px solid var(--line)",
        marginBottom: 34,
        boxShadow: hover ? "var(--shadow)" : "none",
        transform: hover ? "translate(-2px,-2px)" : "none",
        transition: "transform 0.12s, box-shadow 0.12s",
        overflow: "hidden",
        background: "#EFE6CC",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/01-hero.png"
        alt="Engraved illustration of a stone cellar with bottles aging on wooden racks"
        style={{
          gridArea: "1 / 1",
          display: "block",
          width: "100%",
          height: "auto",
          minHeight: 340,
          objectFit: "cover",
        }}
      />
      {/* Cream legibility scrim (see .hero-scrim) — decorative, above the art, below the copy. */}
      <div aria-hidden="true" className="hero-scrim" style={{ gridArea: "1 / 1", pointerEvents: "none" }} />
      <div
        className="hero-overlay"
        style={{
          gridArea: "1 / 1",
          position: "relative",
          alignSelf: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          // Cream halo keeps the dark ink crisp where the scrim thins out over the art.
          textShadow: "0 0 6px rgba(244, 238, 220, 0.85), 0 1px 2px rgba(244, 238, 220, 0.7)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: "clamp(9px, 0.9vw, 11px)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#2F62B0",
            marginBottom: 12,
          }}
        >
          ■ Zama FHEVM · Sepolia Testnet
        </div>
        <h1
          style={{
            fontWeight: 700,
            fontSize: "clamp(20px, 3.4vw, 46px)",
            lineHeight: 1.1,
            margin: "0 0 12px",
            letterSpacing: "-0.005em",
            color: "#2B2416",
          }}
        >
          Seal your tokens.
          <br />
          <em style={{ fontWeight: 500, color: "#8A2A1B" }}>Let them age in private.</em>
        </h1>
        <p
          style={{
            color: "#463C24",
            margin: "0 0 18px",
            fontSize: "clamp(11px, 1.2vw, 16px)",
            maxWidth: 430,
            textWrap: "pretty",
          }}
        >
          A ledger of official ERC-20 ⇄ ERC-7984 wrapper pairs. Wrap a public token and its balance vanishes from the
          chain&apos;s open books — fully encrypted, fully yours.
        </p>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "baseline",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: "#2B2416",
          }}
        >
          <span style={{ fontSize: "clamp(10px, 1vw, 13px)" }}>
            <strong style={{ fontSize: "clamp(15px, 1.8vw, 24px)", color: "#8A2A1B" }}>{pairCount}</strong> pairs listed
          </span>
          <span style={{ fontSize: "clamp(10px, 1vw, 13px)" }}>
            <span style={{ color: "#4A6B33" }}>●</span> registry live
          </span>
        </div>
      </div>
    </div>
  );
}
