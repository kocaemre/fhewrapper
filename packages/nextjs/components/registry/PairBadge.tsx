/**
 * Valid / Revoked status pill (02-UI-SPEC Component Inventory + Copywriting).
 *
 * 1.5px border in `--green` (valid) / `--red` (revoked), matching text color,
 * JetBrains Mono uppercase 10.5px/700, letter-spacing 0.1em. Copy: `✓ Valid`
 * / `✕ Revoked` (glyphs are static literals, not user data — T-02-01 safe).
 */
export function PairBadge({ isValid }: { isValid: boolean }) {
  const color = isValid ? "var(--green)" : "var(--red)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1.5px solid ${color}`,
        color,
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "4px 9px",
        flex: "none",
        whiteSpace: "nowrap",
      }}
    >
      {isValid ? "✓ Valid" : "✕ Revoked"}
    </span>
  );
}
