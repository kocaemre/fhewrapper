import type { CSSProperties } from "react";

/**
 * PairCardSkeleton (02-UI-SPEC) — loading placeholder that mirrors PairCard's
 * layout: icon circle + two text bars (identity) → two address bars → a CTA bar.
 *
 * Bars use `--line-faint` fills and the gentle `inkPulse` opacity animation via
 * the `.skel-pulse` class, which is disabled under `prefers-reduced-motion`
 * (globals.css). Decorative only — `aria-hidden` so screen readers skip it.
 * The page renders a grid of 6 while the registry reads resolve.
 */

const bar = (width: CSSProperties["width"], height: number): CSSProperties => ({
  width,
  height,
  background: "var(--line-faint)",
  borderRadius: 2,
});

export function PairCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        border: "2px solid var(--line-faint)",
        background: "var(--panel)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Section 1 — identity (icon circle + two text bars) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          className="skel-pulse"
          style={{ width: 46, height: 46, borderRadius: 99, background: "var(--line-faint)", flex: "none" }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skel-pulse" style={bar("55%", 14)} />
          <div className="skel-pulse" style={bar("78%", 11)} />
        </div>
      </div>

      {/* Section 2 — two address bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          borderTop: "1px dashed var(--line-faint)",
          paddingTop: 12,
        }}
      >
        <div className="skel-pulse" style={bar("100%", 20)} />
        <div className="skel-pulse" style={bar("100%", 20)} />
      </div>

      {/* Section 3 — decimals + CTA button bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderTop: "1px dashed var(--line-faint)",
          paddingTop: 13,
        }}
      >
        <div className="skel-pulse" style={bar("32%", 12)} />
        <div style={{ flex: 1 }} />
        <div className="skel-pulse" style={{ width: 92, height: 34, background: "var(--line-faint)" }} />
      </div>
    </div>
  );
}
