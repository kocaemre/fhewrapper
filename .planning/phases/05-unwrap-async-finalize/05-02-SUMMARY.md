---
phase: 05-unwrap-async-finalize
plan: 02
subsystem: unwrap-ui
tags: [unwrap, ui, next-app-router, chainguard, honest-async, resume, loop-closure, erc7984, zama-sdk]

# Dependency graph
requires:
  - phase: 05-unwrap-async-finalize
    plan: 01
    provides: "useUnwrap(confidentialAddr) honest engine + parseUnwrapAmount + toUnwrapError + readPendingUnwrap"
  - phase: 04-faucet-wrap
    provides: "WrapPanel/WrapStageIndicator/wrap page — the mirror-the-shape source"
  - phase: 03-user-decryption-eip-712
    provides: "useUserDecrypt + PairCardDecrypt — amount ceiling + honest end-state proof"
  - phase: 02-registry-browse
    provides: "useRegistryPairs + PairCard + normalizeSymbol + formatConfidentialAmount"
  - phase: 01-foundation-deploy-spike
    provides: "ChainGuard (connection + Sepolia write gate)"
provides:
  - "UnwrapStageIndicator — honest 4-stage Request → Decrypting → Finalize → Done presentational indicator (Done only at finalized)"
  - "UnwrapPanel — amount-from-decrypted-balance + Unwrap-all + finalized-only ERC-20-arrived proof + resume banner"
  - "/unwrap route — ChainGuard + Suspense, pair resolved from trusted registry by ?token="
  - "Wrap/Unwrap toggle + PairCard Unwrap → link (wrap → decrypt → unwrap loop closure, SC4)"
affects: [05-UAT, 07-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mirror-the-shape: /unwrap reuses the /wrap panel/indicator/route structure reversed (Confidential ERC-7984 → Public ERC-20)"
    - "Honest end-state gated on stage === 'finalized' ONLY — success copy + ERC-20 balanceOf refetch + confidential-drop decrypt render nowhere earlier (UNW-02)"
    - "Untrusted ?token= resolved against trusted useRegistryPairs (never a raw contract target) — same guard as /wrap"
    - "Resume affordance reuses useUnwrap.resumePending() (single stage machine) rather than a second useResumeUnshield instance"

key-files:
  created:
    - packages/nextjs/components/unwrap/UnwrapStageIndicator.tsx
    - packages/nextjs/components/unwrap/UnwrapPanel.tsx
    - packages/nextjs/app/unwrap/page.tsx
  modified:
    - packages/nextjs/components/wrap/WrapPanel.tsx
    - packages/nextjs/components/registry/PairCard.tsx
    - .planning/phases/05-unwrap-async-finalize/05-UAT.md

key-decisions:
  - "Resume banner drives useUnwrap.resumePending() (which wraps useResumeUnshield internally) instead of instantiating a separate useResumeUnshield in the panel — keeps ONE honest stage machine driving the indicator, no divergent state."
  - "Right-side ERC-20 'preview' shows the typed amount + the live balanceOf rather than a computed conversion — unwrap has no client-side rate preview (the onchain finalize determines the exact release); the honest proof is the post-finalize balance refetch, not a pre-tx estimate."
  - "Inactive tab in both toggles rendered as an ink-colored next/link (not the old faint disabled span) so Wrap⇄Unwrap actually switches surfaces symmetrically."

requirements-completed: [UNW-01, UNW-02]

coverage:
  - id: E1
    description: "UnwrapStageIndicator renders Request→Decrypting→Finalize→Done; Done glyph reachable ONLY at stage==='finalized' (mirror of WrapStageIndicator, no new CSS)"
    requirement: "UNW-02"
    verification:
      - kind: type-check
        ref: "npm run check-types (tsc --noEmit) exit 0"
        status: pass
    human_judgment: true
    rationale: "Pure presentational component off the unit-locked UnwrapStage; live honest progression proven in 05-UAT."
  - id: E2
    description: "UnwrapPanel: amount capped at decrypted balance (parseUnwrapAmount), Unwrap-all path, typed error row, finalized-only ERC-20-refetch + PairCardDecrypt proof, resume banner"
    requirement: "UNW-01, UNW-02"
    verification:
      - kind: build
        ref: "next build emits /unwrap (static, Suspense under ChainGuard); full vitest 98/98"
        status: pass
    human_judgment: true
    rationale: "The two-tx unwrap→finalize→ERC-20-arrives path is SDK/wallet/relayer-owned (deferred to 05-UAT); the panel wiring is type- + build-gated."
  - id: E3
    description: "Loop closure: WrapPanel Unwrap tab + PairCard Unwrap → link navigate to /unwrap?token= (SC4)"
    requirement: "UNW-01"
    verification:
      - kind: build
        ref: "next build + check-types green; /unwrap + /wrap both emitted"
        status: pass
    human_judgment: true
    rationale: "In-app navigability is build-proven; the live full wrap→decrypt→unwrap loop is exercised in 05-UAT."

# Metrics
duration: 6min
completed: 2026-07-08
status: complete
---

# Phase 5 Plan 02: Reachable honest unwrap surface (/unwrap + loop closure) Summary

**The user-facing unwrap slice: a `/unwrap` screen mirroring `/wrap` reversed — amount sourced from the Phase-3 decrypted confidential balance (or Unwrap-all with no decrypt), an honest Request → Decrypting → Finalize → Done indicator whose success + "ERC-20 arrived" proof appear ONLY at `finalized` (ERC-20 `balanceOf` refetched to prove arrival + confidential-drop decrypt), a Resume banner for an interrupted finalize, all under `ChainGuard` — plus the Wrap/Unwrap toggle and a PairCard "Unwrap →" link that close the wrap → decrypt → unwrap loop (SC4).**

## Performance
- **Duration:** 6 min
- **Started:** 2026-07-08T06:22:56Z
- **Completed:** 2026-07-08T06:29:48Z
- **Tasks:** 3 (all `type="auto"`)
- **Files:** 3 created, 3 modified

## Accomplishments
- **UnwrapStageIndicator** (Task 1): a pure presentational mirror of `WrapStageIndicator` driven off `UnwrapStage`, relabeled to the honest four steps — `Request` (burn + request decrypt), `Decrypting` (oracle publicly decrypts — the explicit oracle-wait, never a bare spinner, Pitfall 2), `Finalize` (release ERC-20), `Done` (ERC-20 arrived). The ✓/Done step is reachable ONLY when `stage === "finalized"`; reuses `inkPulse` + existing `--green`/`--red`/`--line` vars (zero new CSS).
- **UnwrapPanel + /unwrap route** (Task 2): mirrors `WrapPanel` reversed (From · Confidential ERC-7984 → To · Public ERC-20). Amount ceiling (UNW-01) comes from the Phase-3 `useUserDecrypt` — a **Reveal max** affordance decrypts, then **Max** fills the input and `parseUnwrapAmount` caps + validates (decimals-driven, `exceedsBalance`/`belowMinimum` shown inline, primary disabled when invalid). Two actions from `useUnwrap`: the primary **Unwrap `<cSymbol>`** runs `unwrap(raw)`, secondary **Unwrap all** runs `unwrapAll()` (no decrypt needed). Errors render via `toUnwrapError` (no raw revert). **Honest DONE (UNW-02, T-05-01):** the success block — with the refetched underlying ERC-20 `balanceOf` (increased) AND `<PairCardDecrypt>` (confidential dropped) — renders ONLY inside the `stage === "finalized"` branch; a `useEffect` fires `refetchErc20()` on `finalized`. **Resume (T-05-06):** on mount `readPendingUnwrap` surfaces a banner whose button calls `resumePending()` through the same honest stage machine, clearing local pending state on resolve. `/unwrap` resolves the pair from the trusted `useRegistryPairs` by `?token=` (T-05-05) inside `<Suspense>` under `ChainGuard` (T-05-03).
- **Loop closure** (Task 3, SC4): the `WrapPanel` Unwrap tab is now a functional `next/link` to `/unwrap?token=` (replacing the disabled Phase-5 span), and valid `PairCard`s expose an **Unwrap →** link alongside **Wrap →** — so a judge can enter unwrap from the ledger for a token they just wrapped. Revoked pairs' `Unavailable` state and JSX-escaped name/symbol (T-02-01) unchanged.

## Task Commits
1. **Task 1: honest 4-stage UnwrapStageIndicator** — `4d6349c` (feat)
2. **Task 2: UnwrapPanel + /unwrap route** — `958df65` (feat)
3. **Task 3: close the loop (toggle + PairCard link)** — `60f6f9e` (feat)

## Files Created/Modified
- `packages/nextjs/components/unwrap/UnwrapStageIndicator.tsx` — honest 4-stage indicator (created)
- `packages/nextjs/components/unwrap/UnwrapPanel.tsx` — unwrap panel: amount/Unwrap-all/finalized-proof/resume (created)
- `packages/nextjs/app/unwrap/page.tsx` — /unwrap route under ChainGuard + Suspense, trusted-registry ?token= resolution (created)
- `packages/nextjs/components/wrap/WrapPanel.tsx` — Unwrap toggle → /unwrap link (modified)
- `packages/nextjs/components/registry/PairCard.tsx` — Unwrap → link alongside Wrap → (modified)
- `.planning/phases/05-unwrap-async-finalize/05-UAT.md` — appended 05-02 surface-ready note (modified)

## Decisions Made
- **Resume reuses `useUnwrap.resumePending()`** (which wraps `useResumeUnshield` internally) rather than a second `useResumeUnshield` instance in the panel — one stage machine drives the indicator; no divergent finalize state.
- **No client-side unwrap "preview"** — unwrap has no rate estimate; the right-side box shows the typed amount + the live ERC-20 balance, and the honest proof is the post-`finalized` `balanceOf` refetch, not a pre-tx figure.
- **Symmetric toggles** — the inactive tab (Unwrap-in-WrapPanel, Wrap-in-UnwrapPanel) is an ink-colored `next/link` so the Wrap⇄Unwrap toggle actually switches surfaces.

## Deviations from Plan
None — plan executed exactly as written. (Task 2's plan text suggested instantiating `useResumeUnshield` directly in the panel; used the equivalent `useUnwrap.resumePending()` from 05-01 instead to keep a single honest stage machine — same SDK primitive, satisfies the never-strand-funds must-have. Not a scope change.)

## Issues Encountered
None. `check-types`, `next build` (all routes emitted incl. `/unwrap` static), and full vitest (98/98) green on the first run for every task.

## Threat Mitigations Applied
- **T-05-01** (no optimistic success): success copy + ERC-20-arrived proof render exclusively in the `stage === "finalized"` block; ERC-20 `balanceOf` refetched on finalize.
- **T-05-05** (?token= tampering): pair resolved from trusted `useRegistryPairs`, never used as a raw contract target.
- **T-05-03** (write gating): `/unwrap` renders under `ChainGuard` (connection + Sepolia).
- **T-05-06** (interrupted finalize): persisted pending unwrap surfaces a Resume banner → `resumePending()`.
- **T-05-02** (amount tampering): reuses decimals-driven `parseUnwrapAmount`, capped at decrypted balance, button disabled when invalid.

## User Setup Required
None — zero new dependencies (Phase 5 installs nothing). Live two-tx unwrap → finalize → ERC-20-arrives verification and the full wrap → decrypt → unwrap loop are deferred to `05-UAT.md` (end-of-project manual session).

## Next Phase Readiness
- The reachable unwrap surface is complete and the headline loop (wrap → decrypt → unwrap) is navigable in-app. Phase 7 polish can theme the panel/indicator; the live-URL loop proof is the only outstanding item (05-UAT).
- No regression: full vitest **98/98**, `check-types` exit 0, `next build` exit 0 (all routes incl. `/unwrap` emitted).

## Known Stubs
None — every affordance is wired to a real hook/route; no placeholder/empty-value data paths introduced.

## Self-Check: PASSED

All 3 created files present on disk (`UnwrapStageIndicator.tsx`, `UnwrapPanel.tsx`, `app/unwrap/page.tsx`); both modified files updated; all 3 task commits (`4d6349c`, `958df65`, `60f6f9e`) present in git history. Gates: vitest 98/98, `check-types` exit 0, `next build` exit 0 with `/unwrap` route emitted.

---
*Phase: 05-unwrap-async-finalize*
*Completed: 2026-07-08*
