import { defineConfig } from "vitest/config";

/**
 * Vitest config — Phase 2 (registry browse).
 *
 * Scope this plan: the three correctness-critical PURE functions
 * (mergePairs, tokenSymbol, regroupMeta). No jsdom / React harness is needed —
 * these are node-environment unit tests over plain data. React component and
 * onchain-integration tests are deliberately out of scope for 02-01.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    globals: false,
  },
});
