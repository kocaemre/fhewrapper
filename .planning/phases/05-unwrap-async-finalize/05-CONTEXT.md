# Phase 5: Unwrap (async finalize) - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Mode:** MVP (discuss skipped via workflow.skip_discuss — floor-it; user asleep; decisions orchestrator-set from ROADMAP + design + verified SDK)

<domain>
## Phase Boundary

A judge can unwrap an ERC-7984 confidential token back to its underlying ERC-20, with the TWO-STEP ASYNC FINALIZE modeled HONESTLY — success is shown ONLY when the ERC-20 actually arrives (finalizeUnwrap completion / the ERC-20 Transfer), never at the unwrap-submit step. This CLOSES the headline wrap → decrypt → unwrap loop. Covers UNW-01, UNW-02. Uses the verified 3.0.0 unwrap hooks.
</domain>

<decisions>
## Implementation Decisions

### A. Unwrap flow (verified 3.0.0 hooks)
- Use the installed 3.0.0 hooks confirmed on-disk: `useUnwrap` / `useUnwrapAll`, `useUnshield` / `useUnshieldAll`, `useFinalizeUnwrap`, `useResumeUnshield`. RESEARCH must determine the EXACT two-step orchestration + signatures against `node_modules/@zama-fhe/react-sdk/dist/index.d.ts` (repo ROOT), and resolve the CLAUDE.md GAP: **is `finalizeUnwrap` oracle-driven (auto, the app just polls) or app-driven (the user/app must call finalize after the decryption oracle resolves)?** The hooks (`useFinalizeUnwrap`, `useResumeUnshield`, `onUnwrapSubmitted`/`onFinalizing`/`onFinalizeSubmitted` callbacks per CLAUDE.md) suggest an app-orchestrated finalize — confirm.
- ACL/allowance: unwrap must grant the wrapper the correct ACL / operator allowance (via the `inputProof` variant or an operator approval) so it does NOT revert (SC3). Verify the exact mechanism.

### B. Honest async modeling (the correctness/UX heart — UNW-02)
- The UI shows an EXPLICIT pending → finalizing → finalized progression. "Success" (the done state) must NOT appear at the unwrap-submit step — only after `finalizeUnwrap` completes / the underlying ERC-20 `Transfer` is observed (watch the ERC-20 balance increase, or the Transfer event / receipt). Model the wait honestly — a spinner/pending that resolves to real success, never optimistic.
- Reuse Phase-3 decrypt to SHOW the confidential balance decreasing and the underlying ERC-20 (Phase-2 metadata / wagmi useBalance) increasing — the honest end-state proof.

### C. Full loop (SC4)
- The full wrap → decrypt → unwrap loop must complete end-to-end on the live URL for a token the judge just wrapped (Phase 4). Wire unwrap onto the same pair surfaces (PairCard / a /unwrap route) so the loop is continuous.

### D. UI + gating
- Follow the Cellar Registry design's unwrap treatment (the design's Wrap/Unwrap panel 4-stage indicator + async pending-decryption). Functional-first; visual polish is Phase 7. Write flow → require connection + Sepolia (ChainGuard/self-gate). Reuse Phase 3 (decrypt), Phase 4 (wrap/preview patterns, the 4-stage indicator component).

### Claude's Discretion
- Exact unwrap surface (per-card vs /unwrap route), amount input (uses the decrypted balance), how the pending state is polled (event watch vs balance poll vs hook callback) — follow the design + the SDK's finalize model + wagmi conventions.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (Phases 1-4)
- Phase 4: `useWrap` (useShield 4-stage machine), the 4-stage indicator component, WrapPanel/​/wrap route, `previewWrap`, `wrapErrors` — the unwrap mirrors this shape (a 4-stage machine + a preview/amount input + error map).
- Phase 3: `useUserDecrypt`/`useConfidentialBalance`/`PairCardDecrypt` — to SHOW the confidential balance drop + confirm the honest end state.
- Phase 2: `useRegistryPairs`, `PairCard`, metadata (decimals), `formatConfidential`.
- Provider wired (ZamaProvider + RelayerWeb(SepoliaConfig)); relayer testnet.zama.org/v2; crossOriginIsolated live; ChainGuard for write gating; wagmi/viem for ERC-20 balance/Transfer watching. vitest 4.1.10 (75 tests). @zama-fhe EXACT 3.0.0 — verify hook signatures on disk.

### Established Patterns
- Verified addresses in CLAUDE.md. Anti-hallucination: verify unwrap/finalize specifics via context7 + on-disk types + live eth_call. Cellar engraving theme.

### Integration Points
- Unwrap write flow under connection+Sepolia; honest pending→finalized via event/balance watch; closes the loop with Phase 4 wrap + Phase 3 decrypt.
</code_context>

<specifics>
## Specific Ideas
- The HONESTY of the async finalize (no optimistic success) is the explicit judged behavior (UNW-02) — this is the phase's central correctness point.
- finalize oracle-vs-app-driven is the main research unknown (CLAUDE.md GAP).
- Confirmed on-disk 3.0.0 unwrap hooks: useUnwrap/useUnwrapAll/useUnshield/useUnshieldAll/useFinalizeUnwrap/useResumeUnshield.
</specifics>

<deferred>
## Deferred Ideas
- Full production error/status system (Phase 6 — this phase covers unwrap's honest states; Phase 6 systematizes). Animation/polish + submission (Phase 7). Live-URL full-loop manual UAT deferred to the end-of-project session.
</deferred>
