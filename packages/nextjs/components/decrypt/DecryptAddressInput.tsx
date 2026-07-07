"use client";

const MONO = "var(--font-jetbrains-mono), monospace";

/**
 * Pasted ERC-7984 address entry (DEC-02). Purely presentational: the parent
 * (`DecryptPanel`) owns validation via `validateDecryptTarget` and passes any
 * `reason` string (empty / NOT A VALID ADDRESS / NOT A CONFIDENTIAL … TOKEN)
 * for display. This atom just renders the controlled value + reason and reports
 * raw changes — it never validates.
 */
export function DecryptAddressInput({
  value,
  onChange,
  reason,
}: {
  value: string;
  onChange: (v: string) => void;
  reason?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        htmlFor="decrypt-address"
        style={{
          fontFamily: MONO,
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "var(--muted)",
        }}
      >
        ERC-7984 TOKEN ADDRESS
      </label>

      <input
        id="decrypt-address"
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0x…"
        aria-invalid={reason ? true : undefined}
        style={{
          fontFamily: MONO,
          fontSize: 13.5,
          fontWeight: 400,
          color: "var(--ink)",
          background: "var(--bg2)",
          border: "1.5px solid var(--line-soft)",
          padding: "13px 16px",
          width: "100%",
          outline: "none",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "var(--blue)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "var(--line-soft)";
        }}
      />

      {reason && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--red)",
          }}
        >
          {reason}
        </span>
      )}
    </div>
  );
}
