# Roadmap: Confidential Wrapper Registry App (Zama Bounty S3)

## Overview

The journey is deliberately correctness- and deploy-risk-front-loaded. First we prove the single biggest "works locally, breaks on Vercel" risk is dead — COOP/COEP cross-origin isolation plus client-only WASM/SSR — on a real live URL before building anything on top of it (Phase 1). Then we surface the whole onchain registry with no FHE dependency, de-risking the Coverage axis and giving a visible product early (Phase 2). We build user-decryption next (Phase 3) because a wrapped balance is an opaque handle without it — decrypt is the tool that lets a judge _see_ the result of every other flow. From there we walk the natural demo path: faucet then wrap (Phase 4), then the hardest async flow, unwrap-with-finalize, last (Phase 5), completing the headline wrap → decrypt → unwrap loop. Only once that loop is verified correct do we layer production-grade error/status UX (Phase 6) and the signature bottle animation plus the full submission package — the wedge to place 1st (Phase 7).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Deploy Spike** - Live Sepolia dApp shell, cross-origin-isolated FHE runtime, wallet + chain guard, proven on a real Vercel URL (completed 2026-07-07)
- [x] **Phase 2: Registry Browse** - Every official ERC-20 ↔ ERC-7984 pair surfaced from the onchain registry with real token metadata (no SDK dependency) (completed 2026-07-07)
- [x] **Phase 3: User-Decryption (EIP-712)** - Decrypt any ERC-7984 balance via a correct EIP-712 flow — the tool that verifies every other flow (completed 2026-07-07)
- [x] **Phase 4: Faucet + Wrap** - Claim test tokens, then approve → wrap → confirm with an onchain-accurate preview (completed 2026-07-08)
- [x] **Phase 5: Unwrap (async finalize)** - ERC-7984 → ERC-20 with the two-step pending→finalized flow modeled honestly; closes the core loop (completed 2026-07-08)
- [x] **Phase 6: Error Handling + Status System** - Typed human-readable errors, toasts, tx stages, explorer links, and a production-grade async-wait state (completed 2026-07-08)
- [x] **Phase 7: Polish + Animation Differentiator + Submission** - Signature bottle cinematic, reveal micro-interactions, reusable hooks, and the full submission package (completed 2026-07-08)

## Phase Details

### Phase 1: Foundation + Deploy Spike

**Goal**: A live, publicly reachable Sepolia dApp shell where the FHE WASM runtime is cross-origin-isolated and a wallet can connect — retiring the deploy/SSR/COOP-COEP risk before any feature is built on top of it.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, SUB-03
**Success Criteria** (what must be TRUE):

1. On the live Vercel URL (not localhost), the browser console reports `crossOriginIsolated === true` and the FHE WASM loads with no SSR / `window is not defined` errors.
2. A judge can connect MetaMask; if the wallet is not on Sepolia the app prompts a network switch and disables actions until `chainId === 11155111`.
3. `next build` completes clean and the deployed route renders without a 500 — the FHE SDK initializes client-only via a single memoized provider (no module-scope / SSR init).
4. `package.json` pins `@zama-fhe/sdk` / `@zama-fhe/react-sdk` at an exact 3.2.0 version (no `^`), and a fresh `npm ci` + redeploy still boots the app.

**Plans**: 3/3 plans complete

- [x] 01-01-PLAN.md — Scaffold from fhevm-react-template + exact-pin 3.2.0 + COOP/COEP headers (Wave 1)
- [x] 01-02-PLAN.md — Runtime-ready shell + Sepolia chain guard (Wave 2)
- [x] 01-03-PLAN.md — Live Vercel deploy + on-URL isolation/wallet verification (Wave 3)

### Phase 2: Registry Browse

**Goal**: Every official ERC-20 ↔ ERC-7984 wrapper pair is discoverable, sourced from the onchain Sepolia registry with real token metadata — delivered with no FHE/WASM dependency so it de-risks Coverage immediately.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07
**Success Criteria** (what must be TRUE):

1. On a fresh / incognito wallet, the pair list is populated entirely from onchain reads of the registry at `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` (never hardcoded), with revoked pairs filtered out via `isValid`.
2. All 7 official cTokenMocks (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) render with correct symbol, name, and decimals resolved via multicall from the token contracts.
3. Each pair card shows both-network addresses, symbol / name / decimals, and a valid/revoked badge.
4. A pair added to `registry/pairs.config.ts` appears in the UI, deduped by confidential-token address (onchain wins on conflict), and the README documents the add-a-pair flow with a concrete example.

**Plans**: 4/4 plans complete

- [x] 02-01-PLAN.md — Tested data engine: onchain registry read + multicall metadata + hybrid merge + minimal live render (Wave 1)
- [x] 02-02-PLAN.md — Cellar Registry look: fonts/themes, self-hosted optimized icons, full engraving pair cards + hero (Wave 2)
- [x] 02-04-PLAN.md — README add-a-pair (hybrid config, onchain-wins) (Wave 2)
- [x] 02-03-PLAN.md — Search + valid/revoked filter, loading/empty/error states, visual sign-off (Wave 3)

**UI hint**: yes

### Phase 3: User-Decryption (EIP-712)

**Goal**: A connected wallet can decrypt its confidential balance for any ERC-7984 token via a correct EIP-712 user-decryption flow — built early because it is the only way to _see_ the result of wrap and unwrap, so it exists to verify them.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DEC-01, DEC-02, DEC-03, DEC-04
**Success Criteria** (what must be TRUE):

1. A judge can decrypt the connected wallet's balance for a registry cTokenMock and see the correct cleartext value.
2. Decryption also works for an ERC-7984 token _outside_ the registry via paste-an-address (and/or auto-detect), proving the "any token" claim.
3. The EIP-712 payload signs only `UserDecryptRequestVerification` with a single reused timestamp/duration and a `0x`-stripped signature, and the signature is cached and reused within its validity window (no repeat prompt per decrypt).
4. A token the wallet has no ACL access to shows a graceful "no decryption access" message, not an infinite spinner.

**Plans**: 3/3 plans complete

- [x] 03-01-PLAN.md — Tested decrypt engine (useUserDecrypt) + error/decimals pure-logic + per-card blur→reveal registry decrypt (Wave 1)
- [x] 03-02-PLAN.md — Paste-an-address decrypt panel: validated input + state atoms + /decrypt route under ChainGuard (Wave 2)
- [x] 03-03-PLAN.md — Quick-picks + permit indicator + self-hosted hero + Decrypt nav + live-URL verification gate (Wave 3)

### Phase 4: Faucet + Wrap

**Goal**: A cold judge can claim official test tokens and wrap an ERC-20 into its ERC-7984 equivalent, with a preview that matches the onchain result — the first half of the headline loop, made visible by Phase 3.
**Mode:** mvp
**Depends on**: Phase 2, Phase 3
**Requirements**: FCT-01, FCT-02, WRP-01, WRP-02
**Success Criteria** (what must be TRUE):

1. A judge with zero balance can claim the official cTokenMock underlying ERC-20 from the app and see the balance arrive.
2. The faucet handles cooldown / already-claimed, insufficient Sepolia ETH, and wrong-network cases with clear messaging (no raw revert).
3. Wrapping runs approve → wrap → confirmation, and the wrapped result — verified via Phase 3 decrypt — equals the previewed amount.
4. The wrap preview reads `rate()` + `decimals()` per pair onchain, rounds down, and warns when the entered amount is below one confidential unit (never hardcodes 18 decimals).

**Plans**: 2/2 plans complete

- [x] 04-01-PLAN.md — Faucet slice: public `mint` claim engine + The test-token cask screen + edge-case copy (FCT-01/02) (Wave 1)
- [x] 04-02-PLAN.md — Wrap slice: tested previewWrap/rate math + `useShield` 4-stage + decrypt==preview proof (WRP-01/02) (Wave 1)

### Phase 5: Unwrap (async finalize)

**Goal**: A judge can unwrap an ERC-7984 back to its ERC-20, with the two-step async finalize modeled honestly so success is shown only when the ERC-20 actually arrives — closing the wrap → decrypt → unwrap loop.
**Mode:** mvp
**Depends on**: Phase 3, Phase 4
**Requirements**: UNW-01, UNW-02
**Success Criteria** (what must be TRUE):

1. A judge can unwrap an ERC-7984 balance (encrypted input → unwrap) and the underlying ERC-20 balance actually increases after finalize.
2. The UI shows an explicit pending → finalized progression; success never appears at the unwrap step before `finalizeUnwrap` completion / the ERC-20 `Transfer`.
3. Unwrap grants the wrapper ACL / allowance correctly (via the `inputProof` variant or operator) and does not revert.
4. On the live URL, the full wrap → decrypt → unwrap loop completes end-to-end for a token the judge just wrapped.

**Plans**: 2/2 plans complete

- [x] 05-01-PLAN.md — Honest unwrap engine: tested stage machine + amount/error logic + pending persistence + `useUnwrap` (`useUnshield`) (Wave 1)
- [x] 05-02-PLAN.md — `/unwrap` screen + Unwrap-all + honest finalized-only end-state proof + resume + Wrap/Unwrap loop closure (Wave 2)

### Phase 6: Error Handling + Status System

**Goal**: Every write flow communicates its state and failures in production-grade, human-readable terms — turning the async unwrap wait and raw revert strings into polished UX that the bounty explicitly judges.
**Mode:** mvp
**Depends on**: Phase 4, Phase 5
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

1. Each failure mode (missing approval, insufficient balance, network mismatch, unsupported token, ACL denial, faucet cooldown) surfaces a typed, human-readable message rather than a raw revert.
2. Every write flow shows toasts, transaction-stage indicators, and a working block-explorer link to the transaction.
3. The async unwrap "pending decryption" wait is presented as a visible, reassuring state, never a silent hang.

**Plans**: 2/2 plans complete

- [x] 06-01-PLAN.md — Unified typed error model (toAppError) + shared status primitives (toast + explorer link), proven end-to-end on the faucet flow (Wave 1)
- [x] 06-02-PLAN.md — Wrap + unwrap toasts/explorer/unified error rows + the reassuring async-wait state (UX-03) (Wave 2)

**UI hint**: yes

### Phase 7: Polish + Animation Differentiator + Submission

**Goal**: The signature bottle animation and full submission package land — the wedge to place 1st — layered on only after the wrap → decrypt → unwrap loop is verified correct, with all media self-hosted to survive COEP.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: DIF-01, DIF-02, DIF-03, DIF-04, DIF-05, SUB-01, SUB-02, SUB-04, SUB-05
**Success Criteria** (what must be TRUE):

1. Wrapping triggers the signature cinematic (contract → folded into a bottle → aged → opened as ERC-7984), driven by the real tx lifecycle and skippable; all fal.ai / ElevenLabs assets are self-hosted in `/public` and still load under COOP/COEP.
2. Decrypt-any-token uses a blurred → decrypts-in-place reveal micro-interaction, and the registry browser has search/filter, valid/revoked badges, and copy buttons.
3. The codebase exposes clean, well-typed reusable hooks (`useRegistry`, `useWrap`, `useUnwrap`, `useUserDecrypt`) in a public, open-source GitHub repository.
4. The README covers live URL, supported networks, how the registry is sourced, how to add a pair, and deploy scripts; a 3-minute real-person pitch video shows the full flow and an X thread / article is published.

**Plans**: 4/4 plans complete

- [x] 07-01-PLAN.md — Wrap cinematic: tested honest beat engine + compressed self-hosted videos + tx-driven skippable overlay (Wave 1)
- [x] 07-02-PLAN.md — Ambient cellar audio: howler install + self-host + gesture-unlocked default-muted header toggle (Wave 1)
- [x] 07-03-PLAN.md — Public hooks API barrel + decrypt reveal / registry polish-verify (Wave 1)
- [x] 07-04-PLAN.md — Submission README + deferred UAT (repo public, real-person pitch, X thread, live checks) (Wave 2)

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase                              | Plans Complete | Status      | Completed |
| ---------------------------------- | -------------- | ----------- | --------- |
| 1. Foundation + Deploy Spike       | 3/3 | Complete    | 2026-07-07 |
| 2. Registry Browse                 | 4/4 | Complete    | 2026-07-07 |
| 3. User-Decryption (EIP-712)       | 3/3 | Complete    | 2026-07-07 |
| 4. Faucet + Wrap                   | 2/2 | Complete    | 2026-07-08 |
| 5. Unwrap (async finalize)         | 2/2 | Complete    | 2026-07-08 |
| 6. Error Handling + Status System  | 2/2 | Complete    | 2026-07-08 |
| 7. Polish + Animation + Submission | 4/4 | Complete    | 2026-07-08 |
