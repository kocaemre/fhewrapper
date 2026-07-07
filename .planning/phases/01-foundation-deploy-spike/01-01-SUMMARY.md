---
phase: 01-foundation-deploy-spike
plan: 01
subsystem: infra
tags:
  [
    nextjs,
    fhevm,
    zama-sdk,
    coop-coep,
    cross-origin-isolation,
    wagmi,
    viem,
    rainbowkit,
    scaffold-eth,
  ]

# Dependency graph
requires: []
provides:
  - "Scaffolded packages/nextjs foundation (fork of zama-ai/fhevm-react-template) that builds clean"
  - "Exact-pinned @zama-fhe/sdk + @zama-fhe/react-sdk at 3.0.0 with committed lockfile (FND-01)"
  - "next.config.ts headers() emitting COOP same-origin + COEP require-corp + nosniff + Referrer-Policy (FND-04, staged for live verification in Plan 03)"
  - "Preserved client-only memoized ZamaProvider/RelayerWeb wiring (DappWrapperWithProviders.tsx) — no SSR/window-is-not-defined crash (FND-03)"
  - "scripts/check-pins.mjs FND-01 exact-pin CI/Vercel guard"
affects: [01-02, 01-03, foundation, deploy, sepolia-guard, registry-browse, user-decryption]

# Tech tracking
tech-stack:
  added:
    - "@zama-fhe/sdk 3.0.0 (exact)"
    - "@zama-fhe/react-sdk 3.0.0 (exact)"
    - "next ~15.2.3, react ~19.0.0, typescript ~5.8.2 (template baseline)"
    - "wagmi ^2.19.5, viem ^2.47.12, @rainbow-me/rainbowkit ^2.2.10, @tanstack/react-query ^5.96.2 (template baseline)"
  patterns:
    - "Client-only memoized FHE provider (RelayerWeb in useMemo, ZamaProvider) — never initSDK/createInstance at module scope"
    - "Cross-origin isolation via next.config headers() (SSR/hybrid, not static-export)"
    - "Exact SDK pin enforced by a standalone check-pins.mjs guard runnable in CI/Vercel"

key-files:
  created:
    - "packages/nextjs/scripts/check-pins.mjs"
    - "packages/nextjs/ (full fhevm-react-template frontend)"
    - "package-lock.json (root; npm workspace lockfile pinning 3.0.0)"
  modified:
    - "packages/nextjs/package.json (exact 3.0.0 pins)"
    - "packages/nextjs/next.config.ts (headers() COOP/COEP + baseline security)"
    - "packages/nextjs/scaffold.config.ts (public-RPC fallback; dropped production Alchemy-key throw)"
    - "package.json (removed foundry forge-fmt lint-staged rule)"

key-decisions:
  - "FND-01 version corrected 3.2.0 -> 3.0.0: the official template locks 3.0.0 and its preserved provider targets the 3.0.0 API; 3.2.0 introduced breaking changes incompatible with the verbatim provider. Human-approved."
  - "COEP mode: require-corp (not credentialless) — all future media self-hosted per DIF-02."
  - "No Alchemy key provisioned: wire viem public-RPC fallback; convert scaffold.config.ts production throw to a warning."
  - "Installed with npm (not template's pnpm); root package-lock.json is the authoritative lockfile reproducing exact 3.0.0."

patterns-established:
  - "Pattern 1: Preserve the inherited client-only ZamaProvider verbatim; strip demo UI only (page.tsx handled in later plan)."
  - "Pattern 2: Cross-origin isolation headers live in next.config headers(); keep NEXT_PUBLIC_IPFS_BUILD unset so output:export never drops them."

requirements-completed: [FND-01, FND-03, FND-04]

coverage:
  - id: D1
    description: "Exact-pin @zama-fhe/sdk + @zama-fhe/react-sdk (FND-01) with committed lockfile reproducing on npm ci"
    requirement: "FND-01"
    verification:
      - kind: automated
        ref: "cd packages/nextjs && node scripts/check-pins.mjs (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Client-only FHE provider preserved verbatim; next build completes with no SSR/window-is-not-defined error (FND-03)"
    requirement: "FND-03"
    verification:
      - kind: automated
        ref: "cd packages/nextjs && npm run build (exit 0, 4/4 static pages, no SSR error)"
        status: pass
    human_judgment: false
  - id: D3
    description: "next.config.ts headers() emits COOP same-origin + COEP require-corp + nosniff + Referrer-Policy (FND-04, staged)"
    requirement: "FND-04"
    verification:
      - kind: automated
        ref: "grep -c Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy next.config.ts (both present)"
        status: pass
      - kind: manual_procedural
        ref: "Live crossOriginIsolated === true on the deployed Vercel URL — deferred to Plan 03"
        status: unknown
    human_judgment: true
    rationale: "Header presence in config is proven statically, but FND-04's real acceptance (crossOriginIsolated === true) can only be verified on the live deploy in Plan 03."

# Metrics
duration: 21min
completed: 2026-07-07
status: complete
---

# Phase 1 Plan 1: Walking-Skeleton Foundation Summary

**Forked the Zama fhevm-react-template into packages/nextjs, exact-pinned @zama-fhe/sdk + @zama-fhe/react-sdk to 3.0.0, added COOP/COEP cross-origin-isolation headers, and preserved the client-only ZamaProvider so `npm run build` exits clean with no SSR crash.**

## Performance

- **Duration:** ~21 min (excludes human checkpoint wait time)
- **Started:** 2026-07-07T10:29:16Z
- **Completed:** 2026-07-07T10:50:00Z
- **Tasks:** 3 (1 probe, 1 blocking-human gate, 1 scaffold+config)
- **Files modified:** 71 (initial template scaffold + 4 plan-specific config/artifact files)

## Toolchain State (Task 1 probe — recorded for downstream plans)

- **node:** v22.21.1 (>= 18.18 required by Next 15 — OK)
- **npm:** 11.11.0
- **git:** 2.39.5 (Apple Git-154)
- **Vercel:** CLI not installed / not authenticated — EXPECTED and non-blocking. Plan 03 deploy is via **GitHub -> Vercel import** (private repo import), not the `vercel` CLI. No `vercel login` required.

## Accomplishments

- Scaffolded the official `zama-ai/fhevm-react-template` into the repo root, preserving the existing `.planning/` and `.claude/` directories.
- Pinned `@zama-fhe/sdk` and `@zama-fhe/react-sdk` to **exact `3.0.0`** (no caret) with a committed root `package-lock.json` so `npm ci` reproduces the pins (FND-01).
- Added a `headers()` block to `next.config.ts`: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` (FND-04, staged for live verification in Plan 03).
- Preserved `components/DappWrapperWithProviders.tsx` **verbatim** — confirmed byte-identical to the template (client-only memoized ZamaProvider/RelayerWeb; FND-03).
- Created `scripts/check-pins.mjs` — the FND-01 exact-pin guard (exit 0).
- `npm run build` in `packages/nextjs` **exits 0** with 4/4 static pages and no `window is not defined` / SSR error.

## Package Legitimacy Gate (Task 2)

Human verified `@zama-fhe/sdk` + `@zama-fhe/react-sdk` provenance before first install: official `zama-ai` repo/maintainer, no pre/postinstall scripts, public npm registry (threat T-01-SC mitigated). The gate covered the `@zama-fhe` scope; the version was subsequently corrected 3.2.0 -> 3.0.0 (same scope/publisher, older/battle-tested, lower supply-chain risk) — see Deviations.

## Task Commits

1. **Task 1: Environment + toolchain probe** — no commit (diagnostic gate, no file changes)
2. **Task 2: Package legitimacy gate** — no commit (blocking-human approval, no file changes)
3. **Task 3: Scaffold + exact-pin 3.0.0 + isolation headers** — `f97b3c4` (feat)

**Plan metadata:** (final docs commit — see git log)

## Files Created/Modified

- `packages/nextjs/next.config.ts` — added `headers()` COOP/COEP + baseline security headers.
- `packages/nextjs/package.json` — `@zama-fhe/sdk` and `@zama-fhe/react-sdk` exact `3.0.0`.
- `packages/nextjs/scripts/check-pins.mjs` — FND-01 exact-pin assertion (asserts `3.0.0`).
- `packages/nextjs/scaffold.config.ts` — public-RPC fallback; removed the production Alchemy-key throw.
- `packages/nextjs/components/DappWrapperWithProviders.tsx` — preserved verbatim (unchanged from template).
- `package.json` (root) — removed the `packages/foundry/**/*.sol` -> `forge fmt` lint-staged rule (foundry toolchain not installed / out of scope).
- `package-lock.json` (root) — npm workspace lockfile pinning both `@zama-fhe/*` at `3.0.0`.
- Plus the full `packages/nextjs` + `packages/foundry` template scaffold.

## Decisions Made

- **npm over pnpm:** The template ships pnpm, but the plan mandated npm + `package-lock.json`. Installed with npm; the lockfile landed at the workspace **root** (`/package-lock.json`) per npm workspace semantics, not `packages/nextjs/` — functionally equivalent (`npm ci` reproduces exact pins). `pnpm-lock.yaml` is retained as template content.
- **COEP `require-corp`** (not `credentialless`) — all future media self-hosted (DIF-02).

## Deviations from Plan

### Approved / Auto-fixed Issues

**1. [Rule 4 - Architectural, HUMAN-APPROVED] FND-01 version corrected 3.2.0 -> 3.0.0**

- **Found during:** Task 3 (build)
- **Issue:** The plan/must_haves/FND-01 named exact `3.2.0`, but the official `fhevm-react-template` locks `@zama-fhe/sdk`/`@zama-fhe/react-sdk` at **3.0.0**, and its preserved provider (`DappWrapperWithProviders.tsx`) targets the 3.0.0 API. `3.2.0` introduced breaking changes — `SepoliaConfig` and `hardhatCleartextConfig` removed, `RelayerWeb` moved to the `/web` subpath, `ZERO_HANDLE` -> `ZERO_ENCRYPTED_VALUE` — that are incompatible with the verbatim-preserved provider (FND-03). Pinning 3.2.0 AND preserving the provider AND building clean is impossible.
- **Fix:** Escalated as a Rule 4 decision checkpoint; human chose Option A. Re-pinned both packages to exact `3.0.0`, updated `check-pins.mjs` to assert `3.0.0`. Exact-pin intent (FND-01) fully preserved; only the version number corrected to the template-correct release.
- **Files modified:** `packages/nextjs/package.json`, `packages/nextjs/scripts/check-pins.mjs`, `package-lock.json`
- **Verification:** `check-pins.mjs` exit 0; `npm run build` exit 0; provider confirmed byte-identical to template.
- **Committed in:** `f97b3c4`

**2. [Rule 3 - Blocking, PRE-APPROVED] Public-RPC fallback (no Alchemy key)**

- **Found during:** Task 3 (build)
- **Issue:** `scaffold.config.ts` throws when `NEXT_PUBLIC_ALCHEMY_API_KEY` is unset and `NODE_ENV === "production"` (which `next build` sets). No Alchemy key is provisioned for this project.
- **Fix:** Converted the production throw to a warning; the wagmi client already degrades to viem's default public RPC (`http()`) when the Alchemy URL is empty. Sepolia walking-skeleton uses the public-RPC path.
- **Files modified:** `packages/nextjs/scaffold.config.ts`
- **Verification:** Build logs `NEXT_PUBLIC_ALCHEMY_API_KEY is not set. Falling back to public RPCs.` and exits 0.
- **Committed in:** `f97b3c4`

**3. [Rule 3 - Blocking] `--legacy-peer-deps` for npm install**

- **Found during:** Task 3 (install)
- **Issue:** `next-themes@0.3.0` declares peer `react ^16.8||^17||^18`; the template runs React 19. pnpm tolerates this; npm's stricter resolver errors (ERESOLVE).
- **Fix:** Installed with `--legacy-peer-deps` (standard for this template under npm). Packages themselves are the already-gated `@zama-fhe/*` — not a new/substituted package.
- **Files modified:** `package-lock.json`
- **Verification:** Install succeeds; build passes.
- **Committed in:** `f97b3c4`

**4. [Rule 3 - Blocking] Generated the gitignored `FHECounter.local.ts` stub**

- **Found during:** Task 3 (build)
- **Issue:** `contracts/FHECounter.ts` statically imports `./FHECounter.local` (a gitignored local-chain overlay the template's `postinstall`/`generate` produces). The subdir npm install didn't run the root `postinstall`, so the stub was absent -> build module-not-found.
- **Fix:** Ran the template's own generator (root `npm install` -> `postinstall` -> `generateTsAbis.ts` -> `ensureLocalStubs()`), materializing the empty stub. File stays gitignored (regenerated at build/deploy time).
- **Files modified:** none tracked (`FHECounter.local.ts` is gitignored)
- **Verification:** Build resolves the import and exits 0.
- **Committed in:** n/a (generated artifact)

**5. [Rule 3 - Blocking] Removed foundry `forge fmt` lint-staged rule**

- **Found during:** Task 3 (commit)
- **Issue:** The template's husky pre-commit runs `lint-staged`, which invokes `forge fmt` on `.sol` files. The foundry/`forge` toolchain is not installed (ENOENT), aborting the commit and reverting.
- **Fix:** Removed the `packages/foundry/**/*.sol` -> `forge fmt` rule from the root `package.json` lint-staged config. Frontend hooks (prettier/eslint on `packages/nextjs`) remain active; hooks were NOT bypassed (no `--no-verify`). Per CLAUDE.md the project reads the existing onchain registry and deploys no custom contracts for table stakes, so `forge fmt` is out of scope; a later foundry-using phase can re-add it.
- **Files modified:** `package.json`
- **Verification:** Commit `f97b3c4` succeeded with hooks enabled (prettier ran, provider unchanged).
- **Committed in:** `f97b3c4`

---

**Total deviations:** 1 human-approved architectural (version correction) + 4 blocking auto-fixes (2 pre-approved/expected: public-RPC, --legacy-peer-deps).
**Impact on plan:** All necessary to satisfy the plan's own acceptance criteria (exact pin + clean build + isolation headers). Exact-pin and preserve-provider intents fully honored; only the version literal and out-of-scope foundry hook adjusted. No scope creep.

## Issues Encountered

- **3.2.0 vs 3.0.0 API incompatibility** — root-caused by inspecting the template's `pnpm-lock.yaml` (locks 3.0.0) and diffing 3.2.0's export map. Resolved via the Rule 4 human decision (Option A).
- **npm workspace lockfile placement** — npm detected the root `workspaces` field and wrote `/package-lock.json` rather than `packages/nextjs/package-lock.json`; accepted as functionally equivalent.

## Deploy Considerations for Plan 03 (carry-forward)

- **Two lockfiles present:** `package-lock.json` (npm, authoritative) and `pnpm-lock.yaml` (template original). Vercel auto-detects package manager by lockfile — set the Vercel install to **npm** (or remove `pnpm-lock.yaml`) so it uses the exact-pinned npm lockfile, and set **Root Directory = `packages/nextjs`**.
- **`FHECounter.local.ts` is gitignored** and regenerated by the root `postinstall`/`generate`. Ensure the deploy install step runs it (or the counter import will fail on a fresh clone). Note: the counter demo is slated to be stripped from `page.tsx` in a later plan (SKELETON.md).
- **Keep `NEXT_PUBLIC_IPFS_BUILD` unset** on Vercel — `output: "export"` silently drops the COOP/COEP `headers()` and FND-04 fails.
- **No Alchemy key** — deploy runs on public Sepolia RPC by design.

## User Setup Required

None for this plan. (Vercel account/import and the private-repo push are Plan 03 concerns.)

## Next Phase Readiness

- `packages/nextjs` builds clean with exact-pinned SDK, committed lockfile, isolation headers staged, and the client-only provider preserved — ready for Plan 02 (Sepolia chain guard + runtime-ready page shell) and Plan 03 (live Vercel deploy + `crossOriginIsolated` verification).
- Open blocker for Plan 03: two-lockfile / package-manager selection on Vercel (documented above).

## Self-Check: PASSED

- `packages/nextjs/next.config.ts` — FOUND (COOP + COEP present)
- `packages/nextjs/scripts/check-pins.mjs` — FOUND (exit 0)
- `packages/nextjs/package.json` — FOUND (exact 3.0.0 pins)
- `packages/nextjs/components/DappWrapperWithProviders.tsx` — FOUND (verbatim vs template)
- Commit `f97b3c4` — FOUND in git log

---

_Phase: 01-foundation-deploy-spike_
_Completed: 2026-07-07_
