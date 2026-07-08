"use client";

const MONO = "var(--font-jetbrains-mono), monospace";

/** The faucet's single-tx lifecycle stages. */
export type FaucetStage = "idle" | "submit" | "confirm" | "done";

/** The 3 honest faucet stages in order: [key, label, sub]. */
const FAUCET_STAGES: ReadonlyArray<readonly [Exclude<FaucetStage, "idle">, string, string]> = [
  ["submit", "Submit", "mint sent"],
  ["confirm", "Confirm", "block confirmation"],
  ["done", "Done", "tokens minted"],
] as const;

/**
 * Compact Submit → Confirm → Done indicator for a faucet claim (UX-02), using
 * the SAME visual language as `WrapStageIndicator`/`UnwrapStageIndicator` — the
 * shared `--green`/`--red`/`--line` vars, the `inkPulse` active animation, and
 * the ✓ / pulse / muted treatment (NO new CSS). A completed stage shows ✓
 * (green), the active stage pulses (red), pending stages are muted.
 *
 * The current index derives from the `useFaucet`-driven `stage`; `idle` shows
 * all stages pending (the caller hides it entirely until a claim is in flight).
 */
export function FaucetStageIndicator({ stage }: { stage: FaucetStage }) {
  const order = FAUCET_STAGES.map(s => s[0]);
  const curIdx = order.indexOf(stage as Exclude<FaucetStage, "idle">);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: 12,
        border: "2px solid var(--line)",
        background: "var(--panel)",
        padding: "10px 14px",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      {FAUCET_STAGES.map(([key, label, sub], i) => {
        const doneStage = (curIdx > i && curIdx !== -1) || (stage === "done" && key === "done");
        const active = curIdx === i && !doneStage;
        const isLast = i === FAUCET_STAGES.length - 1;

        const line = doneStage ? "var(--green)" : active ? "var(--red)" : "var(--line-faint)";
        const bg = doneStage ? "var(--green-dim)" : active ? "var(--red-dim)" : "transparent";
        const fg = doneStage ? "var(--green)" : active ? "var(--red)" : "var(--faint)";
        const labelColor = doneStage || active ? "var(--ink)" : "var(--faint)";
        const railColor = isLast ? "transparent" : doneStage ? "var(--green)" : "var(--line-soft)";

        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 120 }}>
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                flex: "none",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
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
              <div style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>{label}</div>
              <div style={{ fontSize: 10, color: "var(--faint)", fontFamily: MONO }}>{sub}</div>
            </div>
            <div style={{ flex: 1, borderTop: `1px dashed ${railColor}`, margin: "0 8px", minWidth: 10 }} />
          </div>
        );
      })}
    </div>
  );
}
