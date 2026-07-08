"use client";

import type { UnwrapStage } from "~~/lib/unwrapStages";

const MONO = "var(--font-jetbrains-mono), monospace";

/**
 * The 4 honest unwrap stages in order (mirror of `WrapStageIndicator`'s
 * `WRAP_STAGES`): [key, label, sub]. The `Decrypting` step is an EXPLICIT
 * oracle-wait — never a bare spinner (Pitfall 2) — and the `Done` step is only
 * reachable at `finalized`, so the async wait is honest end-to-end (UNW-02).
 */
const UNWRAP_STAGES: ReadonlyArray<readonly [Exclude<UnwrapStage, "idle" | "error">, string, string]> = [
  ["requesting", "Request", "burn + request decrypt"],
  ["decrypting", "Decrypting", "oracle publicly decrypts"],
  ["finalizing", "Finalize", "release ERC-20"],
  ["finalized", "Done", "ERC-20 arrived"],
] as const;

/**
 * Honest 4-stage Request → Decrypting → Finalize → Done indicator (UNW-02).
 *
 * Visually identical treatment to `WrapStageIndicator` (same `--green`/`--red`/
 * `--line` vars, same `inkPulse` active animation, no new CSS): a completed step
 * shows ✓ (green), the active step pulses (red), pending steps are muted. The
 * current index derives from the `useUnwrap` stage; `idle`/`error` show all steps
 * pending.
 *
 * The critical honesty point: the "Done" step is reached ONLY when
 * `stage === "finalized"` — the reducer reaches `finalized` exclusively on the
 * finalize-tx resolve, so this indicator can never show completion at the
 * request / decrypt / finalize steps (no optimistic success).
 */
export function UnwrapStageIndicator({ stage }: { stage: UnwrapStage }) {
  const order = UNWRAP_STAGES.map(s => s[0]);
  const curIdx = order.indexOf(stage as Exclude<UnwrapStage, "idle" | "error">);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        margin: "26px 0 18px",
        border: "2px solid var(--line)",
        background: "var(--panel)",
        padding: "16px 20px",
        boxShadow: "var(--shadow)",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {UNWRAP_STAGES.map(([key, label, sub], i) => {
        const doneStage = (curIdx > i && curIdx !== -1) || (stage === "finalized" && key === "finalized");
        const active = curIdx === i && !doneStage;
        const isLast = i === UNWRAP_STAGES.length - 1;

        const line = doneStage ? "var(--green)" : active ? "var(--red)" : "var(--line-faint)";
        const bg = doneStage ? "var(--green-dim)" : active ? "var(--red-dim)" : "transparent";
        const fg = doneStage ? "var(--green)" : active ? "var(--red)" : "var(--faint)";
        const labelColor = doneStage || active ? "var(--ink)" : "var(--faint)";
        const railColor = isLast ? "transparent" : doneStage ? "var(--green)" : "var(--line-soft)";

        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 150 }}>
            <span
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                flex: "none",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: MONO,
                border: `2px solid ${line}`,
                background: bg,
                color: fg,
                animation: active ? "inkPulse 1.6s ease-in-out infinite" : "none",
              }}
            >
              {doneStage ? "✓" : String(i + 1)}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: labelColor }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: MONO }}>{sub}</div>
            </div>
            <div style={{ flex: 1, borderTop: `1px dashed ${railColor}`, margin: "0 10px", minWidth: 12 }} />
          </div>
        );
      })}
    </div>
  );
}
