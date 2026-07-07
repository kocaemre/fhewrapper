/**
 * RegistryError (02-UI-SPEC) — inline RPC-failure retry banner.
 *
 * Red-bordered banner (`--red` / `--red-dim`) with the fixed human-readable copy
 * from the Copywriting Contract and a `Retry` button that re-runs the registry
 * reads (react-query `refetch`, passed as `onRetry`). Raw revert/error strings
 * are deliberately NOT rendered (T-02-03) — only the fixed message.
 */
export function RegistryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        border: "2px solid var(--red)",
        background: "var(--red-dim)",
        padding: "14px 18px",
        fontSize: 14.5,
      }}
    >
      <span>
        <strong>The ledger could not be read.</strong> The Sepolia registry didn&apos;t respond — usually a public-RPC
        hiccup.
      </span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginLeft: "auto",
          border: "2px solid var(--red)",
          background: "transparent",
          color: "var(--red)",
          padding: "7px 16px",
          fontWeight: 700,
          fontSize: 13,
          fontFamily: "var(--font-gelasio), Georgia, serif",
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}
