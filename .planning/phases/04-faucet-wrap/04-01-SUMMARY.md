---
phase: 04-faucet-wrap
plan: 01
subsystem: faucet
tags: [faucet, fct-01, fct-02, mint, wagmi, error-map, tdd]

# Dependency graph
requires:
  - phase: 02-registry-browse
    provides: "useRegistryPairs engine (underlying ERC-20 side + metadata) + TokenIcon + tokenSymbol helpers + registry/abis.ts + registry/types.ts"
  - phase: 01-foundation-deploy-spike
    provides: "ChainGuard (Sepolia gate) + Header nav idiom + wagmi/viem provider tree"
provides:
  - "lib/faucetErrors.ts — clampFaucetAmount(<=1,000,000, rejects <=0/NaN) + toFaucetError readable-copy map (no raw revert)"
  - "hooks/useFaucet.ts — wagmi public-mint claim engine (useWriteContract + receipt wait); success = receipt not submit"
  - "registry/abis.ts erc20MintAbi — verified public mint(to,uint256) fragment (selector 0x40c10f19)"
  - "/faucet route (the test-token cask) under ChainGuard + Header Faucet nav link"
affects: [04-faucet-wrap (04-02 wrap slice consumes the same claimed underlyings), 07-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Faucet = plain wagmi public mint(address,uint256) on the cTokenMock underlying — NO SDK/FHE (04-RESEARCH Pattern 1)"
    - "Success is the receipt (useWaitForTransactionReceipt), never the submit (Pitfall 6)"
    - "Amount clamped then parseUnits by the token's own decimals — never hardcode 18 (Pitfall 1)"
    - "Every tx failure classified to readable copy via a pure error map; no raw revert reaches the UI (T-04-03)"
    - "No cooldown state — a cooldown/already-claimed UI would be fiction (04-RESEARCH Anti-Patterns)"

key-files:
  created:
    - packages/nextjs/lib/faucetErrors.ts
    - packages/nextjs/lib/faucetErrors.test.ts
    - packages/nextjs/hooks/useFaucet.ts
    - packages/nextjs/components/faucet/FaucetRow.tsx
    - packages/nextjs/components/faucet/FaucetPanel.tsx
    - packages/nextjs/app/faucet/page.tsx
  modified:
    - packages/nextjs/registry/abis.ts
    - packages/nextjs/components/Header.tsx

key-decisions:
  - "Detect the restricted tGBP mock by symbol (/gbp/i on either side) and disable its row up-front with restricted copy — never send a doomed tx"
  - "Fixed 1,000 whole-tokens per claim (well under the 1,000,000 cap); clampFaucetAmount still enforces the cap as the correctness floor"
  - "Native-gas pre-check via useBalance (< 0.001 ETH) drives both the low-ETH banner and per-row ethLow disable — a real FCT-02 case, not a guessed one"
  - "Token rows come only from VALID registry pairs' underlying side (useRegistryPairs), never a hardcoded token list"

# Metrics
duration: 4min
completed: 2026-07-08
status: complete
requirements: [FCT-01, FCT-02]
---

# Phase 04 Plan 01: Faucet Slice — The Test-Token Cask Summary

**Shipped the FCT-01/FCT-02 faucet slice: a `/faucet` screen where a connected Sepolia wallet claims the official cTokenMock UNDERLYING ERC-20 test tokens via a plain public `mint(address,uint256)` (verified selector `0x40c10f19`, no access control, 1,000,000/call cap), with the three real edge cases — low Sepolia ETH for gas, tGBP restricted mint, over-cap amount — mapped to readable copy through a pure, test-locked error map. No SDK/FHE; no cooldown fiction.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-08T00:03:52+03:00 (RED test commit)
- **Completed:** 2026-07-08T00:07:20+03:00 (cask screen commit)
- **Tasks:** 3 (all `type="auto"`; Task 1 `tdd="true"`)
- **Files:** 6 created, 2 modified (~470 lines)

## Accomplishments

- **Task 1 — Faucet pure logic (TDD RED→GREEN):** `lib/faucetErrors.ts` exports:
  - `clampFaucetAmount(number|string) -> number` — bounds to `FAUCET_CAP` (1,000,000), rejects `<=0` / `NaN` / non-numeric / `Infinity` / `""` to `0` (caller disables the claim), allows fractional whole tokens below the cap (T-04-01, V5 validation).
  - `toFaucetError(e, { restricted? }) -> string` — priority-ordered map: tGBP-restricted → gas/insufficient-funds → wallet-rejection → revert/over-cap → generic fallback. Never returns a raw revert string (T-04-03).
  - Locked by 9 vitest cases in `lib/faucetErrors.test.ts` (RED committed first, then GREEN).
- **Task 2 — Claim engine:** `registry/abis.ts` gains `erc20MintAbi` (verified `mint(to,uint256)` fragment, transcribed verbatim from 04-RESEARCH). `hooks/useFaucet.ts` wraps wagmi `useWriteContract` + `useWaitForTransactionReceipt`; `claim(underlying, to, whole, decimals)` clamps then `parseUnits` by the token's own decimals and mints to the connected wallet. Returns `{ claim, txHash, isPending, confirming, isSuccess, error }` — success is the receipt, never the submit.
- **Task 3 — The test-token cask screen:**
  - `FaucetPanel.tsx` — lists a `FaucetRow` per VALID registry pair from `useRegistryPairs` (never hardcoded; revoked pairs skipped). `useBalance` gas pre-check renders the low-Sepolia-ETH alert banner (with a Sepolia ETH faucet link) and sets `ethLow` on rows when the balance is below 0.001 ETH.
  - `FaucetRow.tsx` — TokenIcon + underlying symbol/italic name + "1,000 per claim" + a Claim button driven by `useFaucet` (idle "Claim" → "Claiming…" → "Claimed ✓"). Errors render as `toFaucetError` sub-label copy. tGBP detected and disabled with restricted copy; rows disabled on `ethLow` / no connection / in-flight. Untrusted on-chain symbol/name stay JSX-escaped (T-02-01 carried).
  - `app/faucet/page.tsx` — `/faucet` under `ChainGuard` (connection + Sepolia required for the write flow), mirroring `app/decrypt/page.tsx`.
  - `components/Header.tsx` — added the `Faucet` (`/faucet`) nav link between Registry and Decrypt, same Gelasio idiom + active-route underline.

## Task Commits

1. **Task 1 (RED):** test-lock faucet error map + amount clamp — `a7c72f0` (test)
2. **Task 1 (GREEN):** implement faucetErrors (clamp + toFaucetError) — `1703682` (feat)
3. **Task 2:** erc20MintAbi + useFaucet hook — `d6df6a3` (feat)
4. **Task 3:** cask screen + /faucet route + Header nav — `db99cc1` (feat)

## Files Created/Modified

- **Created:** `lib/faucetErrors.ts`, `lib/faucetErrors.test.ts`, `hooks/useFaucet.ts`, `components/faucet/FaucetRow.tsx`, `components/faucet/FaucetPanel.tsx`, `app/faucet/page.tsx`
- **Modified:** `registry/abis.ts` (+`erc20MintAbi`), `components/Header.tsx` (+Faucet nav link)

## Verification

- `npx vitest run` — **64 passed** (55 prior + 9 new; no regression to Phase 1/2/3 locks).
- `npm run check-types` — exit 0.
- `npm run build` — exit 0; `/faucet` emitted as a static route (7.38 kB). The `@react-native-async-storage/async-storage` line is a pre-existing MetaMask-SDK optional-dependency warning, not a build error.

## TDD Gate Compliance

Task 1 followed RED→GREEN: `test(04-01)` (`a7c72f0`, module-not-found RED) precedes `feat(04-01)` (`1703682`, GREEN). No test passed unexpectedly during RED.

## Deviations from Plan

None — plan executed exactly as written. Interrupted by an API error while committing the Task-3 docs; all four code commits had already landed cleanly and were re-confirmed (64/64 green, check-types clean) before writing this summary.

## Threat Model Coverage

- **T-04-01 (Tampering — faucet amount):** `clampFaucetAmount` bounds to 1,000,000 and rejects non-positive/non-numeric to 0; the Claim button is disabled when the effective amount can't produce a valid tx.
- **T-04-03 (Info Disclosure — raw revert leak):** `toFaucetError` maps every failure (gas / cap / tGBP / rejected / unknown) to human copy; a vitest case asserts the over-cap branch does not match `/reverted/i`.
- **T-04-04 (Tampering — wrong network):** `/faucet` is wrapped in `ChainGuard` (chainId === 11155111) before any write can mount.
- **T-04-02 (public unbounded mint):** accepted — testnet-only intended-public mock; per-call clamp; no mainnet exposure.
- **T-04-SC (package installs):** no package installs this phase — all deps pinned since Phase 1.

## Known Stubs

None. Every faucet row is wired to live data: token rows come from `useRegistryPairs` (onchain), the claim fires a real wagmi mint, and gas state comes from `useBalance`. No placeholder/mock data flows to the UI.

## Deferred (by design)

Live faucet proof — claim → underlying ERC-20 balance arrives after the receipt, plus the tGBP/low-ETH/over-cap edge states on the live URL — is deferred to `04-UAT.md` (FCT-01/FCT-02), an end-of-project manual session. The tx path is wagmi-owned and intentionally not unit-tested (04-RESEARCH Validation Architecture); the app-authored pure logic is locked by vitest.

## Self-Check: PASSED
- Files verified present: `lib/faucetErrors.ts`, `lib/faucetErrors.test.ts`, `hooks/useFaucet.ts`, `components/faucet/FaucetRow.tsx`, `components/faucet/FaucetPanel.tsx`, `app/faucet/page.tsx`, `registry/abis.ts` (modified), `components/Header.tsx` (modified)
- Commits verified in git log: `a7c72f0`, `1703682`, `d6df6a3`, `db99cc1`
- Gates re-confirmed: vitest 64/64, check-types exit 0, build exit 0 with `/faucet` route

---
*Phase: 04-faucet-wrap*
*Completed: 2026-07-08*
