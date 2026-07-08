---
phase: 06-error-handling-status
plan: 01
subsystem: error-handling-status
tags: [error-model, toasts, explorer, faucet, ux]
requires:
  - "@zama-fhe/react-sdk 3.0.0 (typed error subclasses + matchAclRevert, already installed)"
  - "react-hot-toast (Toaster already mounted in DappWrapperWithProviders)"
provides:
  - "lib/appError.ts::toAppError — the ONE unified {chip,body,recoverable} classifier"
  - "lib/explorer.ts::sepoliaTxUrl / sepoliaAddressUrl — host-pinned explorer URLs"
  - "components/status/txToast.tsx — notifyPending/Success/Error (id-reuse, explorer link)"
  - "components/status/ExplorerTxLink.tsx — validated Sepolia etherscan anchor"
  - "components/faucet/FaucetStageIndicator.tsx — Submit->Confirm->Done view"
affects:
  - "faucet claim flow (fully treated: stage + toast + explorer + typed error)"
  - "wrap/unwrap/decrypt error maps (now delegate to toAppError)"
tech-stack:
  added: []
  patterns:
    - "Single classifier + thin per-flow delegating maps (preserves existing string signatures)"
    - "Pending toast id reused so the terminal toast replaces it in place (no stacking)"
    - "Host-pinned + regex-validated explorer URLs (undefined -> render nothing)"
key-files:
  created:
    - packages/nextjs/lib/appError.ts
    - packages/nextjs/lib/appError.test.ts
    - packages/nextjs/lib/explorer.ts
    - packages/nextjs/lib/explorer.test.ts
    - packages/nextjs/components/status/txToast.tsx
    - packages/nextjs/components/status/ExplorerTxLink.tsx
    - packages/nextjs/components/faucet/FaucetStageIndicator.tsx
  modified:
    - packages/nextjs/lib/faucetErrors.ts
    - packages/nextjs/lib/wrapErrors.ts
    - packages/nextjs/lib/unwrapErrors.ts
    - packages/nextjs/lib/decryptErrors.ts
    - packages/nextjs/components/faucet/FaucetRow.tsx
decisions:
  - "toAppError uses instanceof (SDK subclasses) first, then text branches for non-SDK wagmi errors; flow tunes only the branches whose copy legitimately differs"
  - "faucet path stays purely text-based inside toAppError (plain ERC-20 mint, no SDK), preserving the exact pre-consolidation copy + priority order"
  - "the four maps keep their existing signatures (toFaucetError/toWrapError/toUnwrapError return string; toDecryptError returns the triplet) so all 98 pre-existing tests stay green unchanged"
metrics:
  duration: ~10m
  completed: 2026-07-08
status: complete
---

# Phase 6 Plan 01: Unified Error Model + Status Primitives (proven on the faucet) Summary

A single `toAppError` classifier now maps every faucet/wrap/unwrap/decrypt failure to one `{chip, body, recoverable}` triplet (never a raw revert), the four per-flow maps delegate to it with signatures intact, and the faucet claim is fully treated end-to-end with a themed toast (pending → success/error), a Submit → Confirm → Done stage view, a host-pinned Sepolia explorer link, and typed error copy.

## What Was Built

- **`lib/appError.ts` (`toAppError`)** — the ONE classifier. Order: faucet-restricted short-circuit → typed `@zama-fhe/react-sdk` subclasses (specific→generic, incl. the shared ACL/relayer "NO DECRYPTION ACCESS" group and generic `ZamaError`) → text branches for non-SDK wagmi errors (chain-mismatch for all flows; faucet's rejection/gas/over-cap) → per-flow generic fallback. Reproduces the exact strings the four old maps returned.
- **`lib/explorer.ts`** — `SEPOLIA_EXPLORER` constant + `sepoliaTxUrl`/`sepoliaAddressUrl`, each regex-validating input (`^0x[0-9a-fA-F]{64}$` / `{40}`) and returning `undefined` for junk.
- **`components/status/ExplorerTxLink.tsx`** — renders a `sepolia.etherscan.io/tx/<hash>` anchor (`target=_blank`, `rel=noopener noreferrer`) only for a valid hash; renders nothing otherwise.
- **`components/status/txToast.tsx`** — Cellar-themed `notifyPending`/`notifySuccess`/`notifyError` over the already-mounted `<Toaster/>`; pending returns an id that success/error reuse to replace it in place; success embeds `ExplorerTxLink`; all text is JSX-escaped children (no `dangerouslySetInnerHTML`).
- **`components/faucet/FaucetStageIndicator.tsx`** — compact Submit → Confirm → Done view sharing the `WrapStageIndicator` visual language (`--green`/`--red`/`--line`, `inkPulse`, ✓ / pulse / muted); no new CSS.
- **`FaucetRow` wiring** — stage derives from `useFaucet` state; `notifyPending` on submit, replaced by `notifySuccess` (with `txHash` link) on receipt or `notifyError` (typed body) on failure; sub-label + error toast use `toAppError`; untrusted `underlying.symbol` interpolated as JSX children only.

## Delegation (four maps → one model)

- `faucetErrors.toFaucetError(e, opts)` → `toAppError(e, { flow: "faucet", restricted }).body` (keeps `FAUCET_CAP` + `clampFaucetAmount`).
- `wrapErrors.toWrapError(e)` → `.body` under flow `"wrap"`.
- `unwrapErrors.toUnwrapError(e)` → `.body` under flow `"unwrap"`.
- `decryptErrors.toDecryptError(e)` → `toAppError(e, { flow: "decrypt" })` (keeps `isZeroBalance`; `DecryptErrorInfo = AppError`).

## Verification

- **TDD RED→GREEN proven in git history:** `appError.test.ts` + `explorer.test.ts` committed failing (modules absent, commit 57c82db) then passing (ef3947f).
- **vitest:** 112 passed (98 pre-existing locks unchanged + 14 new). No regression to Phases 1–5.
- **`npm run check-types`:** exit 0 (only installed 3.0.0 SDK symbols referenced; no new SDK surface).
- **`npm run build`:** exit 0; `/faucet` still emitted (6.86 kB).
- **Grep sanity:** the four flow maps delegate to `lib/appError`; no `dangerouslySetInnerHTML` in the new status/faucet components (the only match is a documentation comment).

## Threat Mitigations Applied

- **T-06-01 (info disclosure):** every failure maps to curated copy; `appError.test.ts` asserts no SC1-mode body contains a raw-revert substring; unknowns fall to a safe generic body.
- **T-06-02 (XSS):** all toast/row title/desc/symbol text passed as React children; no `dangerouslySetInnerHTML`.
- **T-06-03 (tampering):** `sepoliaTxUrl` rejects malformed hashes → no link rendered.
- **T-06-04 (phishing link):** host pinned to `SEPOLIA_EXPLORER` (unit-tested); anchor uses `rel="noopener noreferrer"` + `target="_blank"`.

## Deviations from Plan

None — plan executed as written. (The chain-mismatch text branch and the per-flow chips were specified in the plan; the pre-existing 98 tests remained untouched.)

## Deferred

- Live "each faucet error mode surfaces on the deployed URL" check is deferred to `06-UAT.md` per the plan's time-box directive (the mint tx path is wagmi-owned).

## Known Stubs

None — all primitives are wired to real `useFaucet` state and live tx hashes.

## Follow-ups for Plan 06-02

- Apply the same `txToast` + `ExplorerTxLink` + stage-view idiom to the wrap and unwrap flows (the primitives are flow-agnostic and ready).

## Self-Check: PASSED

- All 5 created source files exist on disk.
- All 4 task commits (57c82db RED, ef3947f, 9858c7c, 98dc0fe) present in history.
