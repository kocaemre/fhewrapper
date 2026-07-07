import { PairCard } from "./PairCard";
import type { RegistryPair } from "~~/registry/types";

/**
 * Minimal presentational grid (02-01) — maps the full registry pair array to
 * PairCards. Keyed by confidential (ERC-7984) address, which is the merge dedup
 * key and therefore unique. Layout/theme is deliberately plain here; the Cellar
 * Registry look is 02-02.
 */
export function PairGrid({ pairs }: { pairs: RegistryPair[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: 18,
        width: "100%",
      }}
    >
      {pairs.map(pair => (
        <PairCard key={pair.confidential.address} pair={pair} />
      ))}
    </div>
  );
}
