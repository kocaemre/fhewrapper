"use client";

import type { RegistryFilter } from "~~/lib/filterPairs";

/**
 * RegistryToolbar (02-UI-SPEC) — client-side search + valid/revoked filter.
 *
 * Fully controlled: `search`/`filter` state is lifted to `app/page.tsx`, which
 * owns the `useMemo` that runs `filterPairs`. The active chip uses the `--block`
 * inverse fill; inactive chips sit on `--panel`. Toolbar margin-bottom is 24px
 * per the spacing scale. Search focus outline is the global `--red` focus ring.
 */

const FILTERS: { value: RegistryFilter; label: string }[] = [
  { value: "all", label: "ALL" },
  { value: "valid", label: "VALID" },
  { value: "revoked", label: "REVOKED" },
];

export function RegistryToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filter: RegistryFilter;
  onFilterChange: (filter: RegistryFilter) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        marginBottom: 24,
      }}
    >
      <input
        type="text"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="Search by symbol, name or address…"
        aria-label="Search registry pairs by symbol, name or address"
        style={{
          flex: 1,
          minWidth: 260,
          border: "1.5px solid var(--line-soft)",
          background: "var(--panel)",
          color: "var(--ink)",
          padding: "10px 14px",
          fontFamily: "var(--font-gelasio), Georgia, serif",
          fontSize: 15,
        }}
      />

      <div role="group" aria-label="Filter by validity" style={{ display: "flex", gap: 6 }}>
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(value)}
              style={{
                border: "1.5px solid var(--line-soft)",
                background: active ? "var(--block)" : "var(--panel)",
                color: active ? "var(--block-fg)" : "var(--muted)",
                padding: "9px 16px",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
