# Phase 6: Error Handling + Status System - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Mode:** MVP (discuss skipped, floor-it; user asleep; orchestrator-set from ROADMAP + design + existing code)

<domain>
## Phase Boundary

Every WRITE flow (faucet, wrap, unwrap, and the decrypt authorize/permit) communicates its state and failures in production-grade, human-readable terms — turning raw revert strings and the async unwrap wait into polished, reassuring UX that the bounty explicitly judges. This is a SYSTEMATIZATION phase: it unifies + completes the per-flow error maps and status indicators already built in Phases 3-5 into ONE consistent typed system, adds toasts + block-explorer links, and makes the async "pending decryption" wait visibly reassuring. Covers UX-01, UX-02, UX-03. NO new SDK/@zama-fhe surface.
</domain>

<decisions>
## Implementation Decisions

### A. Unified typed error system (UX-01)
- Consolidate the existing per-flow error maps (`lib/faucetErrors.ts`, `lib/wrapErrors.ts`, `lib/decryptErrors.ts`, and the unwrap error map from Phase 5) into ONE consistent typed error model — every failure mode → a typed, human-readable message, NEVER a raw revert string. Ensure ALL SC1 modes are covered across the flows: missing approval, insufficient balance, network mismatch, unsupported token, ACL denial, faucet edge (no cooldown — it's fiction; the real ones are gas/cap/network/tGBP). Reuse the existing maps; refactor into a shared shape (chip + body + recoverable) if not already uniform. Keep it test-locked (extend the existing vitest suites).

### B. Toasts + tx-stage + explorer links (UX-02)
- Every write flow shows: a TOAST (success/error/pending) — use the installed toast lib (react-hot-toast, present since Phase 2) themed to Cellar; a transaction-STAGE indicator (the 4-stage indicators already exist for wrap/unwrap — ensure faucet + every write path has a consistent stage/status view); and a WORKING block-explorer link to the tx (Sepolia — `https://sepolia.etherscan.io/tx/<hash>`), via a small shared helper. Consistent across faucet/wrap/unwrap.

### C. Honest async wait (UX-03)
- The unwrap "pending decryption" (the oracle/finalize wait, Phase 5) is presented as a VISIBLE, reassuring state — a clear "decrypting / finalizing, this can take a moment" affordance, never a silent hang or a spinner with no context. Confirm the Phase-5 honest 4-stage already does this and polish/label it for reassurance.

### D. UI + consistency
- Follow the Cellar Registry design's toast + status treatments (`.dc.html` toasts, wrong-network banner). Reuse across all flows for a consistent system, not one-off handling. Functional-first; final visual polish is Phase 7.

### Claude's Discretion
- Exact toast placement/duration, the shared error-model shape, the explorer-link component, whether to add a global tx-watcher — follow the design + the existing per-flow patterns.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (Phases 2-5)
- Error maps: `lib/faucetErrors.ts`, `lib/wrapErrors.ts`, `lib/decryptErrors.ts`, unwrap error map (Phase 5) — the raw material to unify.
- 4-stage indicators: wrap (`useWrap`/WrapPanel), unwrap (`UnwrapStageIndicator`) — the status-view pattern to generalize to faucet + all write flows.
- Toast: react-hot-toast installed (Phase-2 research listed it) + existing copy toasts (AddressCopyButton). ChainGuard + wrong-network handling from Phases 1/2.
- Phase 3 permit/decrypt states. All write flows already gate on connection+Sepolia.
- vitest 4.1.10 (98 tests) — extend for the unified error model. @zama-fhe EXACT 3.0.0 (no new SDK this phase).

### Established Patterns
- Cellar engraving theme (parchment/cellar). Verified addresses in CLAUDE.md. Sepolia (chainId 11155111) → sepolia.etherscan.io.

### Integration Points
- A shared status/toast/explorer system consumed by faucet/wrap/unwrap; the unified error model consumed by every flow's error row.
</code_context>

<specifics>
## Specific Ideas
- The bounty EXPLICITLY judges this polish (async wait honesty + no raw reverts) — it's a scored axis, not cosmetic.
- No new SDK — pure consolidation + toasts + explorer links over existing flows.
</specifics>

<deferred>
## Deferred Ideas
- Final animation/visual polish + the wrap cinematic + submission (Phase 7). Live-URL manual UAT (does each error mode surface correctly on the deployed URL) deferred to the end-of-project session.
</deferred>
