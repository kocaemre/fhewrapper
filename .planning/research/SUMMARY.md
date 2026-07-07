# Project Research Summary

**Project:** Confidential Wrapper Registry App (Zama Bounty — Season 3)
**Domain:** Zama FHEVM confidential-token dApp (ERC-20 ↔ ERC-7984 Wrappers Registry, Next.js / Sepolia)
**Researched:** 2026-07-07
**Confidence:** HIGH

## Executive Summary

This is a **client-heavy, wallet-driven FHEVM dApp** with no application backend: all state of record lives onchain (Sepolia), and the FHE cryptography (encrypting inputs, decrypting balance handles) runs in the browser inside a Web Worker via WASM. Experts build it by starting from Zama's official `fhevm-react-template` (Next.js App Router + wagmi/viem + RainbowKit) and wiring the Zama SDK behind client-only React hooks. The bounty is judged on Coverage, Correctness, Extensibility, UX, Code quality, and Production-readiness — with UX/animation polish as the intended wedge to place 1st. The non-negotiable outcome: the **wrap → decrypt → unwrap loop must work flawlessly on the live Sepolia URL** for a cold judge.

The recommended approach is to **build against the new high-level `@zama-fhe/react-sdk` hooks (v3.2.0) as the primary integration path**, treating the lower-level relayer-sdk flow descriptions as the ground-truth semantics behind those hooks (see reconciliation below). Every table-stakes requirement — browse the onchain registry, wrap, unwrap (async finalize), and user-decrypt any ERC-7984 balance — maps to a first-class hook, which converts most of the work from bespoke contract integration into SDK wiring. This de-risks the Correctness axis and frees time for the fal.ai/ElevenLabs "bottle" animation differentiator. Read the onchain Sepolia registry at `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` as the source of truth (never hardcode), overlaid with a local-config layer for the documented add-a-pair path.

The dominant risks are **deploy-time and correctness demo-killers**, not feature scope. Cross-origin isolation (COOP/COEP headers) is mandatory for the FHE WASM/SharedArrayBuffer to work on the live URL — and it silently breaks only on deploy, not localhost. Worse, `COEP: require-corp` blocks cross-origin fal.ai/ElevenLabs assets, so **the animation differentiator must self-host its media in `/public`**. Mitigate by doing an early throwaway Vercel deploy to validate `crossOriginIsolated === true` before any polish. The other demo-killers cluster around FHE correctness: client-only SDK init (no SSR), the exact EIP-712 user-decryption payload, ACL permissions on handles, the two-step async unwrap/finalize, and rate()/decimals rounding.

## Key Findings

### Recommended Stack

Base on the official `fhevm-react-template` and pin the Zama SDK to the latest 3.2.0 line rather than hand-assembling. The stack is verified against context7 official docs, the live npm registry, and the template's `package.json` (HIGH confidence). See [STACK.md](./STACK.md).

**Core technologies:**
- `@zama-fhe/sdk` + `@zama-fhe/react-sdk` `^3.2.0` — FHE registry/wrap/unwrap/decrypt via React hooks — this is the SDK the current official template ships; every table-stake maps to one hook
- Next.js `~15.2.3` (App Router) + React `19` + TypeScript `~5.8.2` — template baseline; the documented FHE client-boundary pattern. **Do NOT jump to Next 16**
- wagmi `^2.19.5` + viem `^2.47.12` + `@rainbow-me/rainbowkit` `^2.2.10` + `@tanstack/react-query` `^5.96.2` — wallet/chain/reads. **Stay on wagmi 2.x — do NOT upgrade to wagmi 3** (breaking; RainbowKit 2.2.x + react-sdk validated on v2)
- `motion` `^12` (primary) + `gsap`/`@gsap/react` (signature timeline) + `howler` (ambient audio unlock) — the animation differentiator; GSAP is now fully free
- Pre-rendered fal.ai video (`<video>`) for the hero cinematic over live react-three-fiber 3D — highest quality, lowest deadline risk

**Verified onchain (Sepolia source of truth):** Wrappers Registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`; 7 official cTokenMocks (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) — all must surface. Mainnet registry `0xeb5015fF021DB115aCe010f23F55C2591059bBA0` is read-only reference.

### CRITICAL RECONCILIATION — High-level hooks vs. low-level relayer flows

The four researchers surfaced one apparent conflict that must be understood, not papered over:

- **STACK.md** found the official template migrated to the NEW high-level `@zama-fhe/sdk` + `@zama-fhe/react-sdk` v3.2.0 (published 2026-07-06), exposing hooks: `useShield`, `useUnshield`/`useUnshieldAll`, `sdk.registry.listPairs()`, `useGrantPermit`/`useHasPermit`, `useConfidentialBalance`, `useConfidentialTokenAddress`.
- **FEATURES.md, ARCHITECTURE.md, PITFALLS.md** describe the LOWER-LEVEL relayer-sdk flows: `initSDK`/`createInstance`, `createEIP712`/`userDecrypt`, `createEncryptedInput().add64().encrypt()`, raw registry getters (`getTokenConfidentialTokenPairsLength/Slice`), and `wrap`/`unwrap`/`finalizeUnwrap`.

**These are not mutually exclusive — the high-level react-sdk hooks WRAP the low-level relayer-sdk semantics.** The resolution:

1. **Build against the high-level `@zama-fhe/react-sdk` hooks as the primary path** — fastest and least error-prone under the deadline, and it collapses the hardest correctness surfaces (async unwrap finalize, EIP-712 assembly, ACL permits) into vetted hooks.
2. **Treat the low-level relayer-sdk flow descriptions as the ground-truth SEMANTICS** that explain what each hook does under the hood and — critically — *where the correctness pitfalls live*: async unwrap→finalize, exact EIP-712 `UserDecryptRequestVerification` payload, ACL permission on the latest handle, rate() rounding, and decimals/euint64 conversion. Read them to know what a hook must be doing correctly.
3. **Caveat:** the react-sdk shipped the day before the deadline. Its exact hook signatures and return shapes MUST be pulled from `@zama-fhe/sdk` types at build time — do not trust remembered signatures. The low-level relayer-sdk (`@zama-fhe/relayer-sdk` 0.4.4) is the documented fallback if any hook has a gap the app needs.

### Expected Features

Submissions will be functionally near-identical by design; the win is correctness + polish. See [FEATURES.md](./FEATURES.md).

**Must have (table stakes — missing any is a disqualifying gap):**
- Wallet connect + Sepolia detection/switch; FHE SDK bootstrap (client-only)
- Browse the **onchain** registry (not hardcoded) + token-metadata resolution layer (registry stores only addresses + isValid; symbol/name/decimals come from the token contracts) + all 7 cTokenMocks
- Hybrid registry: onchain primary + local-config overlay, with a documented add-a-pair README example
- Wrap (approve → wrap → confirm); Unwrap (encrypted input → unwrap → async finalizeUnwrap with a pending state)
- User-decryption (EIP-712) of the wallet's balance for ANY ERC-7984 (paste-an-address / auto-detect), cached signature
- Sepolia faucet (claim underlying cTokenMock ERC-20); sensible error handling (approval/balance/network/unsupported)
- Public live Vercel deploy

**Should have (competitive differentiators — the wedge):**
- Signature "wrap" animation (contract → bottle → aged → opened ERC-7984), gated behind real tx state, skippable
- Decrypt-any-token reveal micro-interaction (blurred → decrypts in place)
- Polished status/toast/tx-stage system (especially the async unwrap "pending decryption" state)
- Registry browser polish (search/filter, valid/revoked badges, both-network addresses, copy buttons)
- Clean, well-typed reusable hooks (`useRegistry`, `useWrap`, `useUnwrap`, `useUserDecrypt`) — itself a judging axis

**Defer / out of scope (do NOT build under deadline):**
- Mainnet writes (read-only reference); custom ERC-7984 deployment UI; onchain `registerConfidentialToken` admin UI; multi-wallet/AA; custom indexer; AI-generated pitch video/voice (bounty forbids)

### Architecture Approach

A layered client dApp: UI/animation → application hooks → integration/provider layer → external services (Sepolia RPC, injected wallet, Zama Relayer+CDN). No app backend; decrypted values are session-only, never persisted. The FHE instance is a single memoized, client-only provider that never crosses the SSR boundary. See [ARCHITECTURE.md](./ARCHITECTURE.md).

**Major components:**
1. **Registry read + local-config layer** — enumerate onchain pairs, filter `isValid`, merge local pairs deduped by confidential-token address (onchain wins); resolve metadata via multicall
2. **FHE instance provider (client-only)** — `initSDK()` (WASM) then `createInstance`, or the react-sdk `ZamaProvider`; gates all encrypt/decrypt; guarded with `typeof window` / `'use client'` / `dynamic({ssr:false})`
3. **Wrap/Unwrap tx layer** — approve→wrap (plaintext in); unwrap (encrypted input) → async finalizeUnwrap (encrypted out)
4. **User-decryption layer** — EIP-712 grant/permit → decrypt any ACL-authorized handle
5. **Faucet layer** — claim underlying cTokenMock ERC-20
6. **UI / animation layer** — pair cards, panels, the bottle cinematic driven by wrap tx lifecycle

### Critical Pitfalls

The demo-killers (make the live URL fail in front of judges) — treat as blocking before any polish. See [PITFALLS.md](./PITFALLS.md).

1. **SSR / WASM crash** (`window is not defined`) — confine all SDK usage to `'use client'` + `dynamic({ssr:false})`; `await initSDK()` before `createInstance()`; never init at module scope
2. **Missing COOP/COEP headers** — set `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` in `next.config.js`; verify `crossOriginIsolated === true` on the live URL, not localhost
3. **COEP blocks cross-origin assets** — `require-corp` blocks fal.ai/ElevenLabs media → **self-host assets in `/public`** (or use `credentialless` and verify SharedArrayBuffer still works)
4. **EIP-712 user-decryption assembled wrong** — sign ONLY `{ UserDecryptRequestVerification }` (not full types); strip `0x` from the signature; compute timestamp/duration once and reuse identically. Wrap in one function so values can't drift
5. **ACL permission on decrypt** — only ACL-authorized wallets can decrypt a handle; always read the *latest* handle before decrypting; message the "no access" case explicitly for the any-token feature
6. **Unwrap treated as synchronous** — it's two-step async (unwrap → finalizeUnwrap after gateway decryption); model pending→finalized; don't show success until ERC-20 actually arrives; grant wrapper ACL via the inputProof variant
7. **Wrap without approval / rate() & decimals rounding** — approve first; read `rate()`+`decimals()` per pair on-chain; round preview down; warn below one confidential unit; never hardcode 18 decimals

## Implications for Roadmap

Based on combined research and the dependency graphs in FEATURES.md and ARCHITECTURE.md, this build sequence is dependency-ordered and front-loads deploy/correctness risk. Registry read is deliberately built before FHE (no SDK needed) to make "browse" visible early; deploy hardening is validated early on a throwaway Vercel deploy.

### Phase 1: Foundation + Deploy Spike
**Rationale:** The single biggest "works locally, breaks on Vercel" risk (COOP/COEP + WASM/SSR) must be retired before building on top of it. Wallet + Sepolia guard is the precondition for everything.
**Delivers:** Template booted on Sepolia; wallet connect + chain-id guard; client-only FHE provider skeleton; **a live throwaway Vercel deploy proving `crossOriginIsolated === true`**.
**Addresses:** wallet connect, SDK bootstrap, live-deploy gate.
**Avoids:** SSR/WASM crash (#1), COOP/COEP (#2), asset-blocking (#3), unpinned SDK config (#9).

### Phase 2: Registry Browse (no SDK dependency)
**Rationale:** Independent of WASM — de-risks the Coverage axis immediately and gives a visible product while FHE work proceeds.
**Delivers:** Onchain registry enumerate + `isValid` filter; metadata resolution (multicall symbol/name/decimals); hybrid local-config overlay; all 7 cTokenMocks surfaced; documented add-a-pair path.
**Uses:** viem reads / `sdk.registry.listPairs()`, `pairs.config.ts`.
**Implements:** Registry read + local-config component.
**Avoids:** hardcoded-registry / wrong-network (#8), decimals mismatch at the metadata layer (#7).

### Phase 3: User-Decryption (EIP-712)
**Rationale:** Build decrypt EARLY — a wrapped balance is an opaque handle without it, so it unblocks *verifying* every other flow. Highest correctness surface.
**Delivers:** `useUserDecrypt` (or `useGrantPermit`/`useConfidentialBalance`) for any ERC-7984 via paste/auto-detect; cached signature; graceful no-ACL messaging.
**Implements:** User-decryption layer.
**Avoids:** EIP-712 assembly errors (#4), ACL permission (#5), handle/ciphertext confusion (#10).

### Phase 4: Faucet + Wrap
**Rationale:** Faucet precedes wrap in the demo path (a cold judge needs tokens first). Wrap is half the core loop; decrypt (Phase 3) makes its result visible.
**Delivers:** Faucet claim (with cooldown handling + ETH check); approve→wrap→confirm with rate()/decimals preview.
**Avoids:** wrap approval + dust (#6), decimals/rate mismatch (#7), faucet cooldown/wrong-token (#11).

### Phase 5: Unwrap (async finalize)
**Rationale:** The hardest correctness flow and the last step of the headline loop; depends on the encrypted-input helper and decrypt (to verify results).
**Delivers:** Encrypted input → unwrap → tracked async finalizeUnwrap with an explicit pending→finalized UI.
**Avoids:** async unwrap + ACL (#5/#12), encrypted-input mis-binding (#12).

### Phase 6: Error Handling + Status System
**Rationale:** Wraps every write flow; turns the async unwrap wait and revert strings into production-grade UX (directly judged).
**Delivers:** Typed error mapping (approval/balance/network/unsupported/ACL/cooldown); toasts, tx stages, explorer links.

### Phase 7: Polish + Animation Differentiator
**Rationale:** Only after the wrap→decrypt→unwrap loop is verified correct. The wedge, but must be skippable and self-hosted.
**Delivers:** Signature bottle cinematic (self-hosted fal.ai/ElevenLabs assets), decrypt reveal micro-interaction, registry browser polish, reusable-hook cleanup + README depth.
**Avoids:** re-confirms asset-under-COEP (#3), animation off the critical path.

### Phase Ordering Rationale
- **Deploy risk first:** COOP/COEP + WASM/SSR is retired in Phase 1 on a real Vercel URL, not discovered at submission time.
- **Registry before FHE:** it needs no SDK, so it de-risks Coverage and produces a visible product in parallel with WASM setup.
- **Decrypt before wrap/unwrap:** decryption is the only way to *see* the result of the other flows, so it must exist to verify them.
- **Faucet before wrap; unwrap last:** matches the natural demo path (connect → faucet → wrap → decrypt → unwrap) and defers the hardest async flow until its dependencies exist.
- **Polish last, gated on correctness:** the animation is the wedge but never at the expense of the loop; self-hosting is mandated by the COEP constraint.

### Research Flags

Phases likely needing `--research-phase` during planning:
- **Phase 1 (Deploy):** confirm exact COOP/COEP vs `credentialless` behavior with the react-sdk worker on Vercel; confirm whether the SDK still uses the SharedArrayBuffer path.
- **Phase 3 (Decrypt):** pull exact `@zama-fhe/react-sdk` hook signatures/return shapes from `@zama-fhe/sdk` types (shipped day before deadline); confirm permit hook vs raw `createEIP712` fallback.
- **Phase 4 (Faucet):** verify the cTokenMock claim/mint function signature against the deployed Sepolia ABI (open GAP — do not hardcode).
- **Phase 5 (Unwrap):** confirm whether `finalizeUnwrap` is oracle/relayer-driven or app-driven (does `useUnshield` finalize automatically, or must the app call finalize?).

Phases with standard patterns (skip research-phase):
- **Phase 2 (Registry):** verified ABI + viem reads, well-documented.
- **Phase 6 (Error/Status):** standard React/wagmi UX patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified via context7 official docs + live npm registry + template `package.json` |
| Features | HIGH | Flows verified against Zama docs; faucet claim fn name is MEDIUM (verify vs deployed ABI) |
| Architecture | HIGH | Registry interface, SDK init, EIP-712, wrap/unwrap signatures verified via context7/WebFetch/OpenZeppelin |
| Pitfalls | HIGH | SDK/contract flows grounded in official Zama+OZ docs; Next.js/Vercel header specifics MEDIUM (well-known WASM pattern) |

**Overall confidence:** HIGH

### Gaps to Address
- **react-sdk hook shapes (v3.2.0):** shipped 2026-07-06 — pull exact signatures/return types from `@zama-fhe/sdk` at build time; relayer-sdk 0.4.4 is the documented fallback. Handle during Phase 1/3 planning.
- **Faucet claim function:** `mint(to,amount)` vs `claim()`/`faucet()` unconfirmed — read the deployed cTokenMock ABI on Sepolia before wiring the button (Phase 4).
- **finalizeUnwrap driver:** oracle/relayer callback vs app-driven call unconfirmed — determine whether `useUnshield`/`useUnshieldAll` auto-finalizes (Phase 5).
- **COEP mode:** `require-corp` vs `credentialless` — validate on the live Vercel deploy that the SDK worker initializes AND assets load (Phase 1).

## Sources

### Primary (HIGH confidence)
- context7 `/websites/zama` (docs.zama.org) — relayer/SDK config, COOP/COEP + Next.js SSR, `ZamaProvider`, `useShield`/`useUnshield`/`useConfidentialBalance`/`useGrantPermit`, `sdk.registry.listPairs`, wrapper `wrap`/`unwrap`
- context7 `/zama-ai/relayer-sdk`, `/zama-ai/fhevm` — `initSDK`/`createInstance`/`SepoliaConfig`, full user-decryption flow, ACL model
- context7 `/websites/openzeppelin_confidential-contracts` — `ERC7984ERC20Wrapper` wrap (rate rounding), unwrap/finalizeUnwrap async flow, `rate()`/`decimals()`
- docs.zama.org Sepolia/Ethereum addresses — registry `0x2f07…128e` + 7 cTokenMock pairs
- npm registry (2026-07-07) — `@zama-fhe/sdk` 3.2.0, `@zama-fhe/react-sdk` 3.2.0, relayer-sdk 0.4.4, UI libs
- `github.com/zama-ai/fhevm-react-template` `packages/nextjs/package.json` — confirmed template versions

### Secondary (MEDIUM confidence)
- COOP/COEP + SharedArrayBuffer requirement for TFHE WASM — established browser cross-origin-isolation pattern; exact necessity depends on SharedArrayBuffer path, verify on deploy
- fhevm-react-template structure (DappWrapperWithProviders, RelayerWeb) — README-level

### Tertiary (LOW confidence)
- Faucet claim function name — inferred; verify against deployed cTokenMock ABI before wiring

---
*Research completed: 2026-07-07*
*Ready for roadmap: yes*
