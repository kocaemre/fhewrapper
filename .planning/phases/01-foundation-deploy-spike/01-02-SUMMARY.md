---
phase: 01-foundation-deploy-spike
plan: 02
subsystem: frontend
tags: [nextjs, wagmi, sepolia, chain-guard, cross-origin-isolation, walking-skeleton, fhevm]

# Dependency graph
requires:
  - "01-01: scaffolded packages/nextjs, exact-pinned @zama-fhe/* 3.0.0, COOP/COEP headers, preserved client-only ZamaProvider (DappWrapperWithProviders)"
provides:
  - "components/ChainGuard.tsx — named export `ChainGuard({ children })` gating content on chainId === sepolia.id (11155111) with a useSwitchChain prompt (FND-02)"
  - "app/page.tsx — runtime-ready shell surfacing live window.crossOriginIsolated inside ChainGuard; FHE-counter demo removed (FND-02/FND-03)"
affects: [01-03, deploy, sepolia-guard, registry-browse, wrap-unwrap, user-decryption]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sepolia chain-id gate derived from the imported `sepolia` chain object (wagmi/chains) — never a bare 11155111 literal"
    - "Read window.crossOriginIsolated after mount (useEffect+useState) to display the live value without an SSR hydration mismatch"
    - "Compose the page under ChainGuard; ChainGuard owns connect + wrong-network states so the page only declares the guarded content"

key-files:
  created:
    - "packages/nextjs/components/ChainGuard.tsx"
  modified:
    - "packages/nextjs/app/page.tsx (FHE-counter demo + useFHECounterWagmi import stripped; runtime-ready shell)"

key-decisions:
  - "ChainGuard owns all three states (disconnected -> connect button, wrong network -> switch prompt, on-Sepolia -> children) so page.tsx composes by wrapping only the guarded status content — one source of truth for the gate."
  - "crossOriginIsolated read post-mount via useEffect (state initialised null, shown as '…' pre-mount) to avoid a server/client hydration mismatch while still displaying the live value. The typeof-window guard also prevents any SSR window-is-not-defined crash (FND-03 preserved)."

patterns-established:
  - "Pattern 3 (from 01-RESEARCH): explicit Sepolia chain-id guard beyond RainbowKit — the template's wagmi config auto-adds mainnet + hardhat, so RainbowKit alone will not flag a wrong network."

requirements-completed: [FND-02, FND-03]

coverage:
  - id: D1
    description: "ChainGuard gates on chainId === sepolia.id with a useSwitchChain prompt disabled while pending; withholds children off-Sepolia (FND-02)"
    requirement: "FND-02"
    verification:
      - kind: automated
        ref: "cd packages/nextjs && grep -c useSwitchChain components/ChainGuard.tsx (>=1) && grep -c sepolia components/ChainGuard.tsx (>=1) && npm run check-types (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "app/page.tsx renders the runtime-ready shell (displays crossOriginIsolated) inside ChainGuard; FHE-counter demo + imports removed; build + check-types clean, no SSR error (FND-02/FND-03)"
    requirement: "FND-03"
    verification:
      - kind: automated
        ref: "cd packages/nextjs && grep -c crossOriginIsolated app/page.tsx (>=1) && grep -c ChainGuard app/page.tsx (>=1) && npm run check-types (exit 0) && npm run build (exit 0)"
        status: pass
      - kind: manual_procedural
        ref: "Live crossOriginIsolated === true on the deployed URL — deferred to Plan 03"
        status: unknown
    human_judgment: true
    rationale: "The shell surfaces the value and builds clean statically; FND-04's real acceptance (crossOriginIsolated === true) is a live-deploy check owned by Plan 03."

# Metrics
duration: 2min
completed: 2026-07-07
status: complete
---

# Phase 1 Plan 2: Interactive Shell + Sepolia ChainGuard Summary

**Added a `ChainGuard` Sepolia network gate and replaced the template's FHE-counter demo with a runtime-ready `app/page.tsx` shell that surfaces the live `crossOriginIsolated` state — both build clean with the inherited client-only FHE provider tree preserved.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-07-07T10:54:41Z
- **Completed:** 2026-07-07T10:57:12Z
- **Tasks:** 2 (both `type=auto`, autonomous — no checkpoints)
- **Files:** 1 created, 1 modified

## Interface Contract (carry-forward for Plan 03)

**`ChainGuard` export signature:**

```tsx
// packages/nextjs/components/ChainGuard.tsx  ('use client')
export function ChainGuard({ children }: { children: ReactNode }): JSX.Element;
```

Behavior:

- **Not connected** -> renders `<RainbowKitCustomConnectButton />` (no Sepolia assertion yet).
- **Connected, `chainId !== sepolia.id`** -> renders a `<button>` bound to `switchChain({ chainId: sepolia.id })`, `disabled` while `isPending` (label "Switching…" / "Wrong network — switch to Sepolia"); guarded `children` are withheld.
- **Connected, `chainId === sepolia.id`** -> renders `children`.

Sepolia id is taken from `sepolia.id` (`wagmi/chains`), i.e. `11155111` — no bare literal in the code.

**Shell isolation-status behavior (`app/page.tsx`, for Plan 03's live check):**

- The shell renders, inside `ChainGuard`, the line: `FHE runtime shell ready · crossOriginIsolated: <value>`.
- `<value>` is read from `window.crossOriginIsolated` in a `useEffect` (state initialised `null`, shown as `…` until mounted), so it reflects the live browser value with no hydration mismatch.
- **Plan 03 live check:** on the deployed URL, connected + on Sepolia, this line must read `crossOriginIsolated: true` (FND-04 pass condition). Locally/statically the value may be `false` — that is expected; only the live deploy proves FND-04.

## Accomplishments

- Created `packages/nextjs/components/ChainGuard.tsx` — a `'use client'` named export using `useAccount` + `useChainId` + `useSwitchChain` and the `sepolia` chain object; gates on `chainId === sepolia.id`, shows a switch-network prompt (disabled while pending) off-Sepolia, and renders `children` on Sepolia (FND-02).
- Replaced the FHE-counter demo in `app/page.tsx` with a minimal runtime-ready shell that surfaces the live `crossOriginIsolated` state inside `ChainGuard`; removed the `useFHECounterWagmi` import and all counter UI (net −111/+26 lines).
- Left `app/layout.tsx` and `components/DappWrapperWithProviders.tsx` untouched — the page still renders inside the inherited client-only FHE provider tree (FND-03).
- `npm run check-types` and `npm run build` both exit 0; the home route (`/`) prerenders as static content (762 B) with no SSR / `window is not defined` error.

## Task Commits

1. **Task 1: ChainGuard component (Sepolia gate + switch)** — `d30e70f` (feat)
2. **Task 2: Runtime-ready shell in app/page.tsx** — `3262997` (feat)

## Files Created/Modified

- `packages/nextjs/components/ChainGuard.tsx` — **created.** `'use client'` Sepolia gate; `useSwitchChain` prompt; derives id from `sepolia.id`.
- `packages/nextjs/app/page.tsx` — **modified.** Stripped counter demo + `useFHECounterWagmi` import; renders `crossOriginIsolated` status inside `ChainGuard`.

## Decisions Made

- **ChainGuard owns the connect + wrong-network states** (not just the on-Sepolia gate), so `page.tsx` composes by wrapping only the guarded content. Single source of truth for the network gate; keeps the shell declarative. (The plan's Task 2 described rendering the connect button in the page when disconnected — delegating that to ChainGuard is functionally equivalent and DRY, and matches ChainGuard's Task-1 "not connected -> connect button" behavior.)
- **`crossOriginIsolated` read post-mount** (`useEffect` + `useState`, initial `null` shown as `…`) rather than inline `typeof window !== "undefined" && window.crossOriginIsolated` during render. Both are SSR-safe (the typeof guard prevents the crash), but the effect approach also avoids a server/client hydration-mismatch console warning while still showing the live value the plan requires.

## Deviations from Plan

**1. [Rule 2 — Correctness] `crossOriginIsolated` read via post-mount effect instead of inline during render**

- **Found during:** Task 2.
- **Issue:** The 01-RESEARCH Pattern 3 snippet reads `typeof window !== "undefined" && window.crossOriginIsolated` inline during render. That is SSR-safe (no crash) but produces different server (`false`) and client (`true` on the live isolated deploy) output — a React hydration mismatch warning.
- **Fix:** Initialise state to `null` (rendered as `…`), then set the real value in a `useEffect`. Same live value surfaced; no mismatch. Still guarded by `typeof window`, so FND-03's no-SSR-crash property is preserved.
- **Files modified:** `packages/nextjs/app/page.tsx`
- **Commit:** `3262997`

**2. [Rule 1 — Composition] Connect-button state delegated to ChainGuard rather than duplicated in page.tsx**

- **Found during:** Task 2.
- **Issue:** Task 2's action text describes rendering the connect button in the page when disconnected. ChainGuard (Task 1) already renders the connect button when disconnected, so duplicating it in the page would create two connect paths.
- **Fix:** `page.tsx` wraps its content in `ChainGuard` and lets ChainGuard render the connect button; the page declares only the guarded status content. Functionally equivalent, DRY.
- **Files modified:** `packages/nextjs/app/page.tsx`
- **Commit:** `3262997`

_No other deviations. No auth gates. No architectural (Rule 4) escalations._

## Constraints Honored

- `app/layout.tsx` and `components/DappWrapperWithProviders.tsx` **unchanged** (`git status` clean for both) — provider tree preserved (FND-03).
- Sepolia id derived from the imported `sepolia` chain object — **no bare `11155111` literal** in source.
- No module-scope SDK init added; the page does not import `@zama-fhe/*` (no version concerns this plan).
- Git hooks enabled on both commits (no `--no-verify`).

## Threat Model Coverage

- **T-01-02 (wrong-network signing, mitigate):** Mitigated by `ChainGuard` — guarded actions/children are withheld and a switch-to-Sepolia prompt is shown until `chainId === sepolia.id`, an explicit gate beyond RainbowKit (FND-02).
- **T-01-03 (cross-origin resource injection under COEP, accept):** No cross-origin subresources introduced this phase; `require-corp` (Plan 01) stands. Disposition unchanged.

## Known Stubs

None. The shell intentionally surfaces only the `crossOriginIsolated` status (the thinnest walking-skeleton slice per 01-RESEARCH Open Question #1 — no encrypt/decrypt round-trip this phase). Registry browse, wrap/unwrap, and decryption are later phases, not stubs.

## Next Phase Readiness

- App is deploy-ready for Plan 03: builds clean, home route is the runtime-ready shell (not the demo), Sepolia guard in place. Plan 03 pushes the private repo to GitHub, imports to Vercel (Root Directory = `packages/nextjs`, package manager = npm per 01-01 carry-forward), and verifies `crossOriginIsolated === true` on the live URL (FND-04).
- Carry-forward from 01-01 still applies: two lockfiles present (use npm), keep `NEXT_PUBLIC_IPFS_BUILD` unset, `FHECounter.local.ts` is gitignored/regenerated at build.

## Self-Check: PASSED

- `packages/nextjs/components/ChainGuard.tsx` — FOUND
- `packages/nextjs/app/page.tsx` — FOUND (counter demo removed; ChainGuard + crossOriginIsolated present)
- Commit `d30e70f` (Task 1) — FOUND in git log
- Commit `3262997` (Task 2) — FOUND in git log
- `app/layout.tsx` / `DappWrapperWithProviders.tsx` — unchanged (not in this plan's diff)

---

_Phase: 01-foundation-deploy-spike_
_Completed: 2026-07-07_
