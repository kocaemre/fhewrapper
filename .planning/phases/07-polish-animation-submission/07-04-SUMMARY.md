---
phase: 07-polish-animation-submission
plan: 04
subsystem: submission-docs
tags: [sub-02, sub-01, sub-04, sub-05, readme, uat, deploy-guide, coop-coep, hooks-api]
requires:
  - "07-03: hooks/index.ts public barrel (the reusable hooks API the README documents)"
  - "01-03: verified GitHub->Vercel deploy pipeline (Root Directory packages/nextjs, npm, IPFS_BUILD unset, COEP require-corp)"
provides:
  - "README.md — The Cellar Registry submission README (SUB-02): live URL, network, registry sourcing, add-a-pair, hooks API, deploy guide, SDK-3.0.0 pin, COOP/COEP note"
  - "07-UAT.md — the single hand-off surface for every deferred human/outward item (SUB-01 repo public, SUB-04 pitch video, SUB-05 X thread) + the end-of-project live-URL verification pass"
affects: [submission, docs]
tech-stack:
  added: []
  patterns:
    - "README documents env var NAMES only (never values) — repo-public safety (T-07-09)"
    - "Deploy/isolation guidance mirrors the real next.config.ts + Phase-1 pipeline (T-07-10)"
key-files:
  created:
    - .planning/phases/07-polish-animation-submission/07-UAT.md
  modified:
    - README.md
decisions:
  - "Followed REQUIREMENTS.md numbering (authoritative) over the 07-CONTEXT decision-F labels: SUB-04 = 3-min real-person pitch video, SUB-05 = X thread/article (07-CONTEXT F had mislabeled the video as SUB-05). Plan Task 2 verify grep expects SUB-01/04/05, which matches."
  - "Kept and extended the existing accurate registry-sourcing + add-a-pair section (REG-07) verbatim rather than regressing it; rewrote everything around it to make The Cellar Registry the README's subject instead of the generic FHEVM template."
  - "Described check-pins.mjs as a runnable guard script (node scripts/check-pins.mjs), not as a wired prebuild/CI step — it is not currently referenced in package.json scripts or the CI workflow, so claiming it runs automatically would overstate. Documented it accurately as a guard the pin rationale points to."
metrics:
  duration: ~15m
  completed: 2026-07-08
status: complete
---

# Phase 07 Plan 04: Submission README + Deferred-Tasks UAT Summary

Completed the submission documentation package: rewrote the root `README.md` so its subject is **The Cellar Registry** (the bounty submission) with the live URL, network, registry sourcing, add-a-pair, reusable hooks API, deploy guide, exact SDK 3.0.0 pin, and COOP/COEP cross-origin-isolation note (SUB-02), and created `07-UAT.md` as the single hand-off checklist for every deferred human/outward item — flip the repo public (SUB-01), record the real-person pitch video (SUB-04), publish the X thread (SUB-05) — plus the consolidated end-of-project live-URL verification pass.

## What Was Built

### Task 1 — Rewrite the submission README (SUB-02) — commit `1178320`
Rewrote `README.md` from the generic FHEVM-template doc into The Cellar Registry submission entry point:
- Leads with the project one-liner, the **live URL** (https://fhewrapper-nextjs.vercel.app/), and the supported network (**Sepolia / chain id 11155111**, write-only; mainnet read-only reference).
- "What it does" — browse (onchain registry, Multicall3, isValid badges, search/filter/copy), faucet (7 cTokenMocks), wrap (`rate()`/`decimals()` preview, no hardcoded 18), unwrap (honest two-tx finalize-gated), decrypt-any-ERC-7984 (one EIP-712 permit, out-of-registry paste, ACL-denial handling), and the cinematic + ambient audio.
- **Kept and extended** the already-accurate "How the registry is sourced" + "Adding a wrapper pair" section (REG-07) — the concrete `LocalPair` example and onchain-wins dedup rule preserved.
- Added a **Reusable hooks (public API)** section with a table for `useRegistry`/`useWrap`/`useUnwrap`/`useUserDecrypt`/`useFaucet`, pointing at the `hooks/index.ts` barrel from 07-03 (satisfies the SUB-02 "reusable" surface reference).
- Added **Stack / versions** with the **exact-pinned `@zama-fhe/*` 3.0.0** call-out and a "Why 3.0.0" subsection (3.2.0 breaking changes; `check-pins.mjs` guard).
- Added a **Cross-origin isolation (COOP/COEP)** section documenting `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (verbatim from `next.config.ts`), why all media is self-hosted, and the static-export-drops-headers warning.
- Added a **Deploy** section documenting the real Phase-1 pipeline: GitHub → Vercel import, Root Directory `packages/nextjs`, npm (single lockfile), `NEXT_PUBLIC_IPFS_BUILD` unset, no required env vars (public-RPC fallback). Plus local-dev commands and a frontend scripts table.
- Kept the verified Sepolia address table and the License section.

### Task 2 — Deferred submission + live-verification UAT (SUB-01, SUB-04, SUB-05) — commit `3f9ace4`
Created `07-UAT.md` mirroring the `06-UAT.md` front-matter + section style, as the single hand-off surface for every non-autonomous item:
- Front-matter: `type: manual-uat`, `status: pending`, `deferred: true`, `when: end-of-project`, `url`, `repo`, `requirements: [SUB-01, SUB-04, SUB-05]`.
- **Preconditions** — latest commit deployed, `crossOriginIsolated === true`, MetaMask on Sepolia, a wrapped confidential balance, and a **secret pre-check** that gates the public flip.
- **SUB-01** — flip `kocaemre/fhewrapper` public **only after a green gitleaks scan** (+ no tracked `.env`, README documents env var names only), with the exact `gh repo edit ... --visibility public` command.
- **SUB-04** — a 9-beat real-person pitch shot list (browse → faucet → wrap → decrypt → unwrap → decrypt-out-of-registry → add-a-pair), explicitly no AI voice/video.
- **SUB-05** — publish the X thread/article with the live URL + public repo link.
- **Live-URL verification pass** — cinematic honesty (real tx, skippable, reduced-motion), audio unlock (no autoplay, loops on gesture), media under COEP `require-corp` with `crossOriginIsolated` still true, and the full wrap→decrypt→unwrap loop. Notes which automated gates were green at phase close so the user only runs human/live items.

## Deviations from Plan

None affecting scope. One naming clarification: the plan's 07-CONTEXT decision F labeled the pitch video as "SUB-05", but `REQUIREMENTS.md` (authoritative) defines **SUB-04 = pitch video** and **SUB-05 = X thread**. Used the REQUIREMENTS.md numbering, which also matches the plan Task 2 verify grep (`SUB-01`/`SUB-04`/`SUB-05`). No code changed.

## Verification

- Task 1 grep gate: `fhewrapper-nextjs.vercel.app` + `11155111` + `require-corp` + `packages/nextjs` + `add` all present in README.md — PASS.
- Task 2 grep gate: `07-UAT.md` exists with `SUB-01` + `SUB-04` + `SUB-05` + `crossOriginIsolated` — PASS.
- Docs only — no app code touched. `check-types`, `vitest` (130 passed), and `build` were green at 07-03 close and are unaffected by this docs-only plan.
- Accuracy cross-checks against the real code: SDK pins (`3.0.0` exact in `packages/nextjs/package.json`), COOP/COEP headers (`next.config.ts` lines 25-26), hooks barrel exports (`hooks/index.ts`), `pairs.config.ts` empty overlay, and the Phase-1 deploy pipeline (`01-03-SUMMARY.md`) — all verified before writing.

## Threat Model Coverage

- **T-07-09 (secret leak on repo-public, mitigate):** 07-UAT.md gates the public flip behind a green gitleaks scan + no-tracked-`.env` check; README documents only env var NAMES (`NEXT_PUBLIC_ALCHEMY_API_KEY`), never values.
- **T-07-10 (inaccurate README deploy/isolation guidance, mitigate):** deploy + COOP/COEP guidance mirrors the verified Phase-1 pipeline and the real `next.config.ts` (require-corp, Root Directory packages/nextjs, npm, IPFS build unset).

## Known Stubs

None.

## Requirements

- **SUB-02** — complete (README covers live URL, networks, registry sourcing, add-a-pair, deploy guide, hooks API, SDK pin, COOP/COEP).
- **SUB-01 / SUB-04 / SUB-05** — intentionally **user-deferred** (outward/human/hard-to-reverse); captured in `07-UAT.md`, not marked complete.

## Self-Check: PASSED
- FOUND: `README.md` (rewritten, prettier-formatted)
- FOUND: `.planning/phases/07-polish-animation-submission/07-UAT.md`
- FOUND commit: `1178320` (docs(07-04): rewrite submission README)
- FOUND commit: `3f9ace4` (docs(07-04): add deferred submission + live-URL verification UAT)
