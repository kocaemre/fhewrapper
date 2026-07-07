---
phase: 01-foundation-deploy-spike
plan: 03
subsystem: infra
tags:
  [
    nextjs,
    vercel,
    deploy,
    coop-coep,
    cross-origin-isolation,
    sepolia,
    fhevm,
    walking-skeleton,
  ]

# Dependency graph
requires:
  - "01-01: scaffolded packages/nextjs, exact-pinned @zama-fhe/* 3.0.0, COOP/COEP headers, client-only ZamaProvider, npm lockfile"
  - "01-02: ChainGuard Sepolia gate + runtime-ready shell surfacing crossOriginIsolated"
provides:
  - "Live public Vercel deployment (https://fhewrapper-nextjs.vercel.app/) proven crossOriginIsolated === true in-browser (FND-04, SUB-03)"
  - "npm-only monorepo (pnpm-lock.yaml + packageManager field removed) — reproducible Vercel/CI install"
  - "Clean-env-safe root install: prepare 'husky || true' + orphaned FHE-counter demo removed (no ts-node/stub dependency at build)"
  - "GitHub->Vercel import deploy path (Root Directory=packages/nextjs, NEXT_PUBLIC_IPFS_BUILD unset, defaults) — no vercel CLI"
affects: [02, 03, deploy, registry-browse, user-decryption, wrap-unwrap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deploy via GitHub->Vercel dashboard import (private repo), Root Directory=packages/nextjs, Vercel defaults — no install/build override needed"
    - "COEP mode require-corp confirmed live (all future media self-hosted per DIF-02)"
    - "Root lifecycle scripts made resilient to clean/prod installs (husky || true); build has zero ts-node/stub dependency"

key-files:
  created:
    - ".planning/phases/01-foundation-deploy-spike/01-03-SUMMARY.md"
  modified:
    - ".github/workflows/ci.yml (pnpm -> npm build+test job)"
    - ".prettierignore (ignore .planning/ + package-lock.json)"
    - "packages/nextjs/scripts/check-pins.mjs (prettier-formatted)"
    - "package.json (prepare 'husky || true'; removed packageManager: pnpm field)"
  removed:
    - "pnpm-lock.yaml (stale; carried ^3.0.0, mismatched exact-3.0.0 package-lock.json)"
    - "packages/nextjs/contracts/FHECounter.ts (orphaned demo — only importer of gitignored stub)"
    - "packages/nextjs/hooks/fhecounter-example/useFHECounterWagmi.tsx (orphaned demo hook)"

key-decisions:
  - "Deploy path adapted: GitHub->Vercel dashboard import (private kocaemre/fhewrapper), NOT the vercel CLI the plan's Task 1 described. Orchestrator owns push/import; executor did file work + verified clean-room runbook."
  - "Standardized the monorepo on npm (Option A): removed stale pnpm-lock.yaml + packageManager:pnpm field so Vercel/CI use the exact-pinned package-lock.json. Aligns with 01-01's npm decision."
  - "Removed the orphaned FHE-counter demo instead of fixing ts-node-in-build: 01-02 stripped it from the app, nothing reachable imported it, so removal eliminates the gitignored ./FHECounter.local stub dependency entirely (lowest-risk of 3 options)."
  - "prepare 'husky' -> 'husky || true' so a missing husky no-ops in Vercel/CI prod installs (127) while local git hooks still install (husky v9 style)."
  - "COEP = require-corp (confirmed live) — not credentialless. Closes the STATE.md open GAP."
  - "No Alchemy key: public Sepolia RPC fallback used on the live deploy (build logs 'Falling back to public RPCs')."

patterns-established:
  - "Pattern 4: Deploy via GitHub->Vercel import with Vercel defaults; keep NEXT_PUBLIC_IPFS_BUILD unset so next.config headers() (COOP/COEP) are emitted (not static-export)."
  - "Pattern 5: Root install/build must survive a clean/prod env with no global ts-node or husky — devDep-only tools guarded (|| true) and no build-time codegen dependency."

requirements-completed: [FND-02, FND-04, SUB-03]

coverage:
  - id: D1
    description: "Live public Vercel URL reachable in incognito, HTTP 200 (SUB-03)"
    requirement: "SUB-03"
    verification:
      - kind: automated
        ref: "curl -sSI https://fhewrapper-nextjs.vercel.app/ -> HTTP/2 200"
        status: pass
      - kind: manual_procedural
        ref: "Human confirmed incognito-reachable on the live URL"
        status: pass
    human_judgment: true
    rationale: "Public reachability is a live-URL property confirmed both by automated curl (200) and human incognito load."
  - id: D2
    description: "crossOriginIsolated === true on the live URL (FND-04)"
    requirement: "FND-04"
    verification:
      - kind: automated
        ref: "curl -sSI live URL -> Cross-Origin-Opener-Policy: same-origin + Cross-Origin-Embedder-Policy: require-corp on the wire"
        status: pass
      - kind: manual_procedural
        ref: "In-browser on the live URL the shell renders 'FHE runtime shell ready · crossOriginIsolated: true'"
        status: pass
    human_judgment: true
    rationale: "Header presence proven on the wire (curl); the real acceptance (crossOriginIsolated === true) confirmed in-browser on the live deploy. COEP mode = require-corp."
  - id: D3
    description: "FHE provider mounts client-only with no SSR/window-is-not-defined error; wallet + Sepolia guard work on the live URL (FND-03 live, FND-02)"
    requirement: "FND-02"
    verification:
      - kind: manual_procedural
        ref: "Live: provider mounts (no SSR error); wallet connects; on Sepolia the shell renders (0.0585 ETH, Sepolia). Off-Sepolia switch-prompt path verified in code (01-02 ChainGuard + typecheck)."
        status: pass
    human_judgment: true
    rationale: "On-network live path confirmed in-browser; the off-network switch prompt is a deterministic ChainGuard branch verified statically in 01-02 (FND-02 gate)."

# Metrics
duration: 40min
completed: 2026-07-07
status: complete
---

# Phase 1 Plan 3: Live Vercel Deploy + Cross-Origin-Isolation Verification Summary

**Deployed `packages/nextjs` to a live public Vercel URL (https://fhewrapper-nextjs.vercel.app/) via GitHub import and proved on the real URL that the walking skeleton holds: `crossOriginIsolated === true` in-browser, COOP `same-origin` + COEP `require-corp` on the wire, the client-only FHE provider mounts with no SSR error, and the Sepolia-gated shell renders — after fixing two deploy blockers (two-lockfile package-manager mismatch, and a clean-env root install that died on `husky`/`ts-node`).**

## Performance

- **Duration:** ~40 min (excludes human deploy + verification wait)
- **Completed:** 2026-07-07
- **Tasks:** 2 (Task 1 deploy-readiness/file work — adapted to GitHub->Vercel import; Task 2 live-URL human verification)
- **Files:** 1 created (SUMMARY) + 4 modified + 3 removed across 2 fix commits

## Live Verification Results (Task 2 — all pass)

- **Live public URL:** https://fhewrapper-nextjs.vercel.app/ — HTTP/2 **200**, incognito-reachable (**SUB-03**).
- **`crossOriginIsolated === true`** — confirmed **in-browser** on the live URL; the shell itself renders `FHE runtime shell ready · crossOriginIsolated: true` (**FND-04**).
- **Headers on the wire** (curl -sSI): `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. **COEP mode = require-corp** (closes the STATE.md open GAP).
- **FHE provider mounts client-only** — no SSR / `window is not defined` error (**FND-03** live).
- **Wallet + chain guard:** wallet connects; on Sepolia the shell renders (0.0585 ETH, Sepolia shown). The off-Sepolia switch-prompt path is verified in code (01-02 ChainGuard + typecheck); on-network live path confirmed (**FND-02**).
- **Alchemy decision:** no key — public Sepolia RPC fallback used (build logs `Falling back to public RPCs`).
- **Deploy path:** private GitHub repo (kocaemre/fhewrapper) -> Vercel import, Root Directory=`packages/nextjs`, Vercel defaults (no install/build override needed after `3d12e37`), `NEXT_PUBLIC_IPFS_BUILD` unset.

## Accomplishments

- Verified deploy-readiness via **faithful clean-room reproductions** (fresh `git clone` -> install -> build) that mimic Vercel, catching two blockers before/at deploy.
- Standardized the monorepo on **npm**: removed stale `pnpm-lock.yaml` and the `packageManager: "pnpm@10.18.3"` field so Vercel auto-detects npm and builds from the exact-pinned `package-lock.json`.
- Switched CI `build + test` from pnpm to npm (`npm ci --legacy-peer-deps` at root; frontend steps under `working-directory: packages/nextjs`); ignored `.planning/` in prettier and formatted `check-pins.mjs` so `prettier --check .` passes.
- Made the root install survive a clean/prod env with no global `ts-node`/`husky`: `prepare` -> `husky || true`, and removed the orphaned FHE-counter demo so `next build` needs neither `ts-node` nor the gitignored `FHECounter.local.ts` stub.
- Confirmed the live deploy is **hybrid, not static-export** (`.next`, no `out/`), so `next.config` `headers()` are emitted -> cross-origin isolation on.

## Task Commits

1. **Deploy-readiness / two-lockfile fix** — `6ca8417` (ci): remove `pnpm-lock.yaml`; CI pnpm->npm; `.prettierignore` `.planning/` + `package-lock.json`; format `check-pins.mjs`.
2. **Clean-env install fix** — `3d12e37` (fix): `prepare: husky || true`; remove orphaned FHE-counter demo (`contracts/FHECounter.ts` + `hooks/fhecounter-example/useFHECounterWagmi.tsx`); drop `packageManager: pnpm` field.
3. **Plan finalize** — this SUMMARY + STATE + ROADMAP (final docs commit — see git log).

## Deviations from Plan

**1. [Adaptation] Deploy via GitHub->Vercel import, not the `vercel` CLI**

- **Plan Task 1** described `vercel login` + a CLI production deploy and exporting `DEPLOY_URL`.
- **Reality:** deploy path is private GitHub repo (kocaemre/fhewrapper) -> Vercel dashboard import. The orchestrator owns all outward actions (push/import); the executor did the file work + produced a verified import runbook and handed off at the human-action gate. Functionally equivalent — same reproducible npm build, same headers-emitting config, same live URL.

**2. [Rule 3 - Blocking] Two-lockfile package-manager mismatch broke Vercel + CI install**

- **Found during:** clean-room reproduction of Task 1.
- **Issue:** `package.json` was exact-pinned via npm (updating `package-lock.json`), but the template's `pnpm-lock.yaml` still carried `^3.0.0`; Vercel/CI defaulted to pnpm and hit `ERR_PNPM_OUTDATED_LOCKFILE`.
- **Fix:** removed `pnpm-lock.yaml` + `packageManager: pnpm` field (npm standardization); switched CI to npm.
- **Commits:** `6ca8417`, `3d12e37`.

**3. [Rule 3 - Blocking] Root install died in Vercel's clean/prod env (no global ts-node/husky)**

- **Found during:** the actual Vercel deploy (my first clean-room missed it because `ts-node`/`husky` resolve locally).
- **Issue:** Vercel ran `npm install` at repo root; root `prepare: husky` exited **127** (husky absent in prod install) — FATAL; and `postinstall`'s bare `ts-node` was command-not-found so the gitignored `FHECounter.local.ts` stub was never generated.
- **Fix:** `prepare: husky || true`; removed the orphaned FHE-counter demo (the only importer of `./FHECounter.local`), so the build needs no `ts-node` and no stub. Reproduced faithfully with `npm install --omit=dev` (devDeps absent): pre-fix install exit 127 -> post-fix exit 0; full build exit 0 with the stub absent.
- **Commit:** `3d12e37`.

**Runbook correction:** after `3d12e37`, Vercel needs **defaults** — no Install Command override, no Build Command override, no `.npmrc` (the committed `package-lock.json` resolves the next-themes/React-19 peer without `--legacy-peer-deps`). Root Directory=`packages/nextjs`, `NEXT_PUBLIC_IPFS_BUILD` unset.

## Known Stubs

None. The shell surfaces only the `crossOriginIsolated` status (thinnest walking-skeleton slice). Registry browse, wrap/unwrap, and decryption are later phases.

## Threat Model Coverage

- **T-01-01 (RPC/Alchemy key leak, mitigate):** No key provisioned; public Sepolia RPC fallback. Only `NEXT_PUBLIC_*` public values in the bundle; `.env.example` carries no real values.
- **T-01-04b (static-export drops headers, mitigate):** `NEXT_PUBLIC_IPFS_BUILD` unset + Root Directory=`packages/nextjs`; live curl confirms COOP/COEP on the wire and the build produced `.next` (no `out/`).
- **T-01-SC (unpinned SDK on fresh build, mitigate):** Build reproduces from the committed exact-3.0.0 `package-lock.json`; `check-pins.mjs` guards FND-01.

## Deploy Considerations (carry-forward, now resolved)

- Two-lockfile / package-manager selection — **resolved** (npm-only).
- `FHECounter.local.ts` gitignored/regenerated at build — **resolved** (demo removed; build needs no stub).
- Clean-env `husky`/`ts-node` lifecycle failures — **resolved** (`husky || true`; no build-time codegen).
- Foundry CI steps (`forge soldeer install`/`build`/`test`) run via the foundry-toolchain action; not reproducible locally (forge not installed) and untouched by the package-manager fix.

## Next Phase Readiness

- The deploy/SSR/COOP-COEP risk is **retired on the real URL** — the whole point of Phase 1. A live, isolated, Sepolia-gated dApp shell is proven publicly. Phase 2 (registry browse) can build on a trusted live foundation.

## Self-Check: PASSED

- Live URL https://fhewrapper-nextjs.vercel.app/ — FOUND (HTTP/2 200, COOP/COEP on the wire, crossOriginIsolated true in-browser)
- Commit `6ca8417` — FOUND in git log
- Commit `3d12e37` — FOUND in git log
- `pnpm-lock.yaml` — REMOVED (git rm)
- `packages/nextjs/contracts/FHECounter.ts` + `hooks/fhecounter-example/useFHECounterWagmi.tsx` — REMOVED

---

_Phase: 01-foundation-deploy-spike_
_Completed: 2026-07-07_
