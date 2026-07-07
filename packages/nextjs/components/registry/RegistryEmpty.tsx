/**
 * RegistryEmpty (02-UI-SPEC) — centered italic no-results message.
 *
 * Two variants from the Copywriting Contract:
 *   - active search  → the no-match copy, echoing the typed query
 *   - otherwise      → the rare "registry returned zero pairs" fallback
 *
 * The echoed query is rendered as a React string child (default escaping) —
 * never as HTML — so a crafted search value cannot inject markup (T-02-01).
 */
export function RegistryEmpty({ search }: { search?: string }) {
  const query = (search ?? "").trim();

  return (
    <div
      style={{
        textAlign: "center",
        color: "var(--muted)",
        padding: "60px 0",
        fontStyle: "italic",
        fontSize: 15,
        fontFamily: "var(--font-gelasio), Georgia, serif",
      }}
    >
      {query
        ? `No pairs match "${query}." Only registry-listed wrappers appear here — unsupported tokens cannot be wrapped.`
        : "No wrapper pairs are listed on the registry yet."}
    </div>
  );
}
