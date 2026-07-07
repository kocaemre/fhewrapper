# Walking Skeleton — Confidential Wrapper Registry App (Zama Bounty S3)

**Phase:** 1
**Generated:** 2026-07-07

## Capability Proven End-to-End

> One sentence: the smallest user-visible capability that exercises the full stack.

A judge can open a **publicly reachable Vercel URL** (not localhost) where the page is
**cross-origin isolated** (`crossOriginIsolated === true`), the client-only FHE runtime
provider mounts with no SSR/`window is not defined` error, MetaMask connects, and if the
wallet is off Sepolia the app prompts a network switch and disables actions until
`chainId === 11155111`.

This retires the single biggest "works on localhost, breaks on Vercel" risk
(WASM/SSR + COOP/COEP cross-origin isolation) before any feature is built on top.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Base | Fork of official `zama-ai/fhevm-react-template`, work in `packages/nextjs` | Ships a correct client-only, memoized `ZamaProvider` wiring (`DappWrapperWithProviders.tsx`) + wagmi + RainbowKit + Sepolia target. FND-03 is largely **inherited**, not built (01-RESEARCH.md Pattern 1). Do NOT restructure the template. |
| Framework | Next.js `~15.2.3` App Router + React `~19.0.0` + TypeScript `~5.8.2` | Template baseline. Do NOT jump to Next 16 or wagmi 3 (breaking; RainbowKit 2.2.x/react-sdk validated on wagmi 2 / Next 15). |
| FHE SDK | `@zama-fhe/sdk` + `@zama-fhe/react-sdk` **exact `3.2.0`** (no caret) | FND-01 mandates exact pin. Template ships `^3.0.0` → must re-pin with `--save-exact`; commit the lockfile so a clean `npm ci` reproduces (01-RESEARCH.md Pitfall 4). |
| FHE runtime boundary | Client-only, single memoized provider (`RelayerWeb` in `useMemo`, `ZamaProvider`) | Preserve template's `DappWrapperWithProviders.tsx` verbatim. Never call `initSDK()`/`createInstance()` at module scope; the new SDK uses the provider/`RelayerWeb` model (01-RESEARCH.md Anti-Patterns). |
| Cross-origin isolation | COOP `same-origin` + COEP `require-corp` via `next.config.ts` `headers()` | FND-04 requires `crossOriginIsolated === true`. Missing headers degrade to single-threaded WASM (not a crash) but still fail FND-04. `require-corp` (not `credentialless`) because all future media is self-hosted per DIF-02. |
| Chain guard | Explicit `chainId === 11155111` gate + `useSwitchChain`, beyond RainbowKit | Template's wagmi config auto-adds mainnet (ENS) + hardhat, so RainbowKit alone will not flag a wrong network. Actions disabled off-Sepolia (FND-02). |
| Deployment target | Vercel (SSR/hybrid mode — **not** static export) | Vercel emits `next.config` `headers()` on all routes. `output: "export"` / `NEXT_PUBLIC_IPFS_BUILD=true` silently drops headers → FND-04 fails. Keep it UNSET. |
| RPC / secrets | Only `NEXT_PUBLIC_*` public values; `NEXT_PUBLIC_ALCHEMY_API_KEY` in Vercel env (or public-RPC fallback for the spike) | `scaffold.config.ts` throws on unset Alchemy key in production. Never place a private/write-scoped secret in a `NEXT_PUBLIC_*` var. |
| Directory layout | Monorepo preserved; app root = `packages/nextjs/`; build/deploy scoped to that dir | Matches the template; avoids a risky restructure. Vercel "Root Directory" set to `packages/nextjs`. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint) — booted from `fhevm-react-template`
- [x] Routing — one real route (`app/page.tsx`) renders the runtime-ready shell
- [x] Real read/write of runtime state — reads `crossOriginIsolated`, `chainId`, wallet account (browser globals via wagmi + the SDK worker); no app backend/DB by design (onchain is the source of record)
- [x] UI wired to runtime — MetaMask connect (RainbowKit) + Sepolia `useSwitchChain` action
- [x] Deployment — a live, public Vercel URL where `crossOriginIsolated === true`

> Note: this project has **no application backend or database** (client-only dApp; state of
> record is onchain). The walking-skeleton "real read/write" is the FHE WASM worker mounting +
> live wallet/chain reads on the deployed URL — the equivalent full-stack proof for this app.

## Out of Scope (Deferred to Later Slices)

> Explicit so later phases do not re-litigate Phase 1's minimalism.

- Any FHE encrypt/decrypt round-trip, registry reads, wrap/unwrap, faucet (Phases 2–5)
- Reading the onchain Wrappers Registry / token metadata (Phase 2)
- EIP-712 user-decryption (Phase 3)
- Relayer proxy route `/api/relayer/11155111` (template default `SepoliaConfig` relayer URL is sufficient for the skeleton; add the proxy later if needed)
- Restrictive CSP / `wasm-unsafe-eval` (no CSP this phase; adding one can silently block WASM)
- Any animation/media, theming, or polish (Phase 7)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its
architectural decisions:

- **Phase 2:** Browse every official ERC-20 ↔ ERC-7984 pair from the onchain registry (no SDK dependency).
- **Phase 3:** Decrypt any ERC-7984 balance via the EIP-712 user-decryption flow.
- **Phase 4:** Claim faucet tokens, then approve → wrap with an onchain-accurate preview.
- **Phase 5:** Unwrap with the two-step async finalize; closes the wrap → decrypt → unwrap loop.
- **Phase 6:** Typed human-readable errors, toasts, tx-stage indicators, explorer links.
- **Phase 7:** Signature bottle animation + submission package (self-hosted assets under COEP).
