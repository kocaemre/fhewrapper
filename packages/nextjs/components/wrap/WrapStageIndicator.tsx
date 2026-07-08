"use client";

import type { WrapStage } from "~~/hooks/useWrap";

const MONO = "var(--font-jetbrains-mono), monospace";

/** The 4 wrap stages in order (design `wrapDefs`): [key, label, sub]. */
const WRAP_STAGES: ReadonlyArray<readonly [Exclude<WrapStage, "idle" | "error">, string, string]> = [
  ["approving", "Approve", "ERC-20 allowance"],
  ["wrapping", "Wrap", "wrap() on ERC-7984"],
  ["confirming", "Confirm", "block confirmation"],
  ["done", "Done", "balance encrypted"],
] as const;

/**
 * 4-stage approve → wrap → confirm → done indicator (WRP-01), per the design's
 * stage-indicator markup. A completed stage shows ✓ (green), the active stage
 * pulses (red, `inkPulse`), pending stages are muted. The current index derives
 * from the `useWrap` stage; `idle`/`error` show all stages pending.
 *
 * When `skipApprove` is set (`approvalStrategy: "skip"` — allowance already
 * granted), the Approve stage renders pre-completed.
 */
export function WrapStageIndicator({ stage, skipApprove = false }: { stage: WrapStage; skipApprove?: boolean }) {
  const order = WRAP_STAGES.map(s => s[0]);
  const curIdx = order.indexOf(stage as Exclude<WrapStage, "idle" | "error">);

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
      {WRAP_STAGES.map(([key, label, sub], i) => {
        const doneStage =
          (curIdx > i && curIdx !== -1) || (stage === "done" && key === "done") || (skipApprove && key === "approving");
        const active = curIdx === i && !doneStage;
        const isLast = i === WRAP_STAGES.length - 1;

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
