# Phase 1: Foundation + Deploy Spike - Research

**Researched:** 2026-07-07
**Domain:** Next.js 15 App Router + Zama FHEVM `@zama-fhe/sdk`/`react-sdk` 3.2.0 client-only bootstrap, wallet/Sepolia guard, cross-origin-isolated Vercel deploy
**Confidence:** HIGH

## Summary

Phase 1 is a **walking skeleton** whose entire purpose is to retire the single biggest "works on localhost, breaks on Vercel" risk — WASM/SSR + COOP/COEP cross-origin isolation — before any feature is built on top. The good news, discovered by fetching the **actual source of the official `fhevm-react-template`**, is that the template already ships a correct client-only, memoized `ZamaProvider` wiring (`DappWrapperWithProviders.tsx`) with wagmi + RainbowKit + Sepolia as a target network. **FND-03 (client-only FHE provider) is therefore largely inherited, not built** — the phase's job is to *not break it* and to add the two things the template is missing: (1) the COOP/COEP headers, and (2) an explicit Sepolia chain-id guard.

A critical correction to earlier project research: with the **new** `@zama-fhe/sdk` 3.2.0 `RelayerWeb`, missing COOP/COEP headers do **NOT** hard-crash the SDK — per Zama's official docs the SDK *degrades to slower single-threaded WASM* [CITED: docs.zama.org/protocol/sdk/concepts/security-model]. The headers are still mandatory here because **FND-04 explicitly requires `crossOriginIsolated === true`**, and multi-threaded FHE makes the eventual judge demo noticeably snappier. This de-risks the phase: the headers are purely additive, and a header misconfiguration degrades rather than white-screens.

**Primary recommendation:** Clone `zama-ai/fhevm-react-template`, work in `packages/nextjs`, **keep the template's `DappWrapperWithProviders` provider wiring verbatim** (do not rewrite it to the docs' `createConfig`/`@zama-fhe/react-sdk/wagmi` style — the template ships its own validated `WagmiSigner`), **re-pin `@zama-fhe/sdk` + `@zama-fhe/react-sdk` to EXACT `3.2.0`** (template ships `^3.0.0`), **add the `headers()` block to `next.config.ts`**, add a `chainId === 11155111` guard with `useSwitchChain`, strip the FHE-counter demo down to a "runtime ready" shell, and **deploy to Vercel to verify `crossOriginIsolated === true` on the real URL**.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Boot from official `fhevm-react-template`, pin `@zama-fhe/sdk`/`react-sdk` to 3.2.0 | Verified repo/structure + exact npm 3.2.0; template ships `^3.0.0` → must re-pin to exact `3.2.0` (no caret) |
| FND-02 | Wallet connect + Sepolia chain-id guard | Template ships RainbowKit + wagmi + Sepolia target; add explicit `chainId===11155111` gate + `useSwitchChain` |
| FND-03 | FHE SDK client-only, memoized provider, no SSR/module-scope init | **Inherited** from template `DappWrapperWithProviders.tsx` (`'use client'` + `useMemo` RelayerWeb) — preserve, don't rebuild |
| FND-04 | Live deploy with `crossOriginIsolated === true` | COOP/COEP `require-corp` headers in `next.config.ts` (template lacks them); verify on live URL console |
| SUB-03 | Publicly accessible live deployment | Vercel deploy of `packages/nextjs`; honors `next.config` `headers()` unless static-export mode is on |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FHE WASM runtime init | Browser / Client (Web Worker) | — | `RelayerWeb` spawns a WASM worker; SDK is browser-only, must never touch SSR |
| Cross-origin isolation | CDN / Edge (response headers) | Frontend Server (next.config) | COOP/COEP are HTTP response headers Vercel emits per `next.config` `headers()` |
| Wallet connect + chain guard | Browser / Client | — | wagmi/RainbowKit read `window.ethereum`; chain switch is a client action |
| Static hosting + header emission | CDN / Static (Vercel) | — | No app backend; Next serves static + SSR shell, Vercel edge attaches headers |
| Provider composition (SSR shell) | Frontend Server (SSR) | Browser (hydration) | `layout.tsx` (server) renders the `'use client'` provider tree; hydration mounts the worker |

## Standard Stack

### Core (inherited from the official template — verified against live repo)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@zama-fhe/sdk` | **`3.2.0` (EXACT, no `^`)** | Core FHE SDK: `RelayerWeb`, `SepoliaConfig`, `IndexedDBStorage` | The SDK the official template ships; FND-01 mandates exact 3.2.0 pin |
| `@zama-fhe/react-sdk` | **`3.2.0` (EXACT)** | React `ZamaProvider` + hooks over the SDK | Template's provider layer; keep sdk + react-sdk on identical 3.2.x |
| `next` | `~15.2.3` | App Router framework + Vercel deploy | Template baseline — do NOT jump to Next 16 |
| `react` / `react-dom` | `~19.0.0` | UI runtime | Template baseline |
| `typescript` | `~5.8.2` | Types (a judging axis) | Template baseline |
| `wagmi` | `^2.19.5` | Wallet state, chain, `useChainId`/`useSwitchChain` | Template baseline — do NOT upgrade to wagmi 3 |
| `viem` | `^2.47.12` | EVM client under wagmi | Template baseline |
| `@rainbow-me/rainbowkit` | `^2.2.10` | Injected/MetaMask connect UI | Template's connector UI (`RainbowKitCustomConnectButton`) |
| `@tanstack/react-query` | `^5.96.2` | Async cache powering Zama hooks + wagmi | Required peer of react-sdk & wagmi |

### Supporting (already in template `package.json`)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `daisyui` / `tailwindcss` | `5.0.9` / `4.1.3` | Styling | Present; theme later (Phase 7) |
| `zustand` | `~5.0.0` | Global UI state (`useGlobalState`, target network) | Template's scaffold store |
| `react-hot-toast` | `~2.4.0` | Toasts | Wired via `<Toaster/>` in provider |
| `vercel` | `~39.1.3` | Deploy CLI | `npm run vercel` script present |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Template's explicit `<ZamaProvider relayer={} signer={} storage={}>` wiring | Docs' `createZamaConfig({chains,wagmiConfig,relayers:{web()}})` + `<ZamaProvider config={}>` | Docs style is cleaner but the template deliberately does NOT use `@zama-fhe/react-sdk/wagmi` yet (comment: "swap once a patched stable ships ≥3.0.0-alpha.16") and ships its own `WagmiSigner`. **Keep the template wiring** — it is the validated path; rewriting risks a signer regression under deadline. |
| `COEP: require-corp` | `COEP: credentialless` | `credentialless` loads cross-origin subresources without credentials (no CORP header needed) — but DIF-02 already mandates self-hosting all animation assets in `/public`, so `require-corp` (the docs-blessed default) is correct and simpler. Note credentialless has had Chrome blocking-page reports on Vercel (next.js discussion #81384). |
| Vercel | Own Node server / Cloudflare Pages | Fall back only if asset weight or headers misbehave; Vercel honors `next.config` `headers()`. |

**Installation:**
```bash
# 1. Clone the official template; the frontend lives in packages/nextjs
git clone https://github.com/zama-ai/fhevm-react-template
cd fhevm-react-template/packages/nextjs

# 2. RE-PIN the Zama SDK to EXACT 3.2.0 (template ships ^3.0.0; FND-01 wants exact)
npm install --save-exact @zama-fhe/sdk@3.2.0 @zama-fhe/react-sdk@3.2.0
# then verify package.json shows "3.2.0" with NO caret for both
```

**Version verification (done this session):**
```
npm view @zama-fhe/sdk version        → 3.2.0   (published 2026-06-24)
npm view @zama-fhe/react-sdk version  → 3.2.0   (published 2026-06-24)
# peerDeps @zama-fhe/react-sdk: viem>=2, react>=18, wagmi>=2, @zama-fhe/sdk ^3.2.0, @tanstack/react-query>=5
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@zama-fhe/sdk` | npm | ~2 wk (2026-06-24) | 10.5k/wk | github.com/zama-ai/sdk | SUS (too-new) | **Keep — flagged**; official Zama org repo, no postinstall, shipped by official template. Mandated by FND-01. |
| `@zama-fhe/react-sdk` | npm | ~2 wk (2026-06-24) | 3.1k/wk | github.com/zama-ai/sdk | SUS (too-new) | **Keep — flagged**; same official org, no postinstall. Mandated by FND-01. |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** `@zama-fhe/sdk`, `@zama-fhe/react-sdk` — the *only* reason is "too-new" (a fast-moving SDK published ~2 weeks ago). Both resolve to the official `zama-ai` GitHub org, carry no `postinstall`, and are the exact packages the official `fhevm-react-template` ships. They are unavoidable (FND-01 mandates them). The planner MAY add a single `checkpoint:human-verify` confirming the pinned `3.2.0` came from the official npm scope `@zama-fhe/*` before first install, but this is low-risk given the corroborating evidence above.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────────── Vercel Edge (CDN) ────────────────────┐
   Browser request ─────▶│  attaches response headers from next.config headers():    │
                         │   COOP: same-origin   COEP: require-corp                   │
                         └───────────────┬───────────────────────────────────────────┘
                                         ▼
                         ┌──────────── Next.js App Router ───────────┐
                         │  app/layout.tsx  (SERVER component)       │
                         │    └─ renders ──▶ DappWrapperWithProviders │  'use client'
                         └───────────────┬───────────────────────────┘
                                         ▼  (hydrates in browser → crossOriginIsolated===true)
   ┌─────────────────────────── Client provider tree ('use client') ───────────────────────────┐
   │  <WagmiProvider config={wagmiConfig}>          ── wallet/account/chainId (window.ethereum)  │
   │    <QueryClientProvider>                                                                     │
   │      <RainbowKitProvider>                       ── connect UI + wrong-network state          │
   │        <ZamaRuntimeProvider> ── useMemo(RelayerWeb{transports:{[Sepolia.chainId]:Sepolia}})  │
   │          <ZamaProvider relayer signer storage>  ── spawns FHE WASM Web Worker (client only)  │
   │            page.tsx  ── Sepolia guard (chainId===11155111 ? shell : SwitchChain prompt)      │
   └─────────────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                              Injected wallet (MetaMask)      Zama Relayer + CDN (WASM/pubkey)
```

Data flow to trace for this phase: request → Vercel attaches COOP/COEP → server renders the client provider shell → browser hydrates → `RelayerWeb` worker constructs client-side → `crossOriginIsolated` is `true` → wallet connects → chain guard confirms Sepolia. That is the whole walking skeleton.

### Recommended Project Structure (work inside the template — do not restructure)

```
packages/nextjs/                        # ← the frontend (a scaffold-eth-style app)
├── app/
│   ├── layout.tsx                      # SERVER; renders <DappWrapperWithProviders> (leave as-is)
│   └── page.tsx                        # STRIP FHE-counter demo → "runtime ready" shell + Sepolia guard
├── components/
│   ├── DappWrapperWithProviders.tsx    # ← client-only ZamaProvider wiring (PRESERVE; this is FND-03)
│   └── helper/RainbowKitCustomConnectButton/  # connect button (reuse)
├── services/web3/
│   ├── wagmiConfig.tsx                 # createConfig({chains, ssr:true, ...}) (leave)
│   └── wagmiSigner.ts                  # template's WagmiSigner adapter (leave)
├── scaffold.config.ts                  # targetNetworks:[hardhat, sepolia] (leave; sepolia present)
├── next.config.ts                      # ← ADD headers() COOP/COEP block here
└── package.json                        # ← re-pin @zama-fhe/* to exact 3.2.0
```

### Pattern 1: Client-only memoized FHE provider (INHERITED — do not rebuild)

**What:** The template already implements the exact FND-03 pattern. `DappWrapperWithProviders.tsx` is `'use client'`; `RelayerWeb` (the WASM worker relayer) is built in a `useMemo` keyed on `chainId`, terminated on cleanup; the signer/storage are module-scoped but SSR-safe (lazy). Never call `initSDK()`/`createInstance()` at module scope — the new SDK uses the provider/`RelayerWeb` model instead.
**When to use:** Always. Preserve this file; only strip demo UI from `page.tsx`.
**Example (verbatim shape shipped by the template):**
```tsx
// components/DappWrapperWithProviders.tsx  [VERIFIED: github.com/zama-ai/fhevm-react-template packages/nextjs]
"use client";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { IndexedDBStorage, RelayerWeb, SepoliaConfig, type ZamaSDKEvent } from "@zama-fhe/sdk";
import { WagmiProvider, useChainId } from "wagmi";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { WagmiSigner } from "~~/services/web3/wagmiSigner";

const signer = new WagmiSigner({ config: wagmiConfig });      // module-scope, SSR-safe (lazy)
const storage = new IndexedDBStorage("KeypairStore", 1);
const sessionStorage = new IndexedDBStorage("SignatureStore", 1);

const ZamaRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const chainId = useChainId();
  const relayer = useMemo(() => new RelayerWeb({          // ← WASM worker, built client-side
    getChainId: () => signer.getChainId(),
    transports: { [SepoliaConfig.chainId]: SepoliaConfig },
  }), [chainId]);
  useEffect(() => () => relayer.terminate(), [relayer]);  // cleanup worker
  return (
    <ZamaProvider relayer={relayer} signer={signer} storage={storage} sessionStorage={sessionStorage}
      onEvent={(e: ZamaSDKEvent) => window.dispatchEvent(new CustomEvent(e.type, { detail: e }))}>
      {children}
    </ZamaProvider>
  );
};
// ...wrapped by WagmiProvider → QueryClientProvider → RainbowKitProvider → ZamaRuntimeProvider
```

### Pattern 2: COOP/COEP headers in `next.config.ts` (ADD — template is missing this)

**What:** The template's `next.config.ts` has **no `headers()` function**. Add one. Value `require-corp` per official docs.
**Example (merge into the existing `nextConfig` object):**
```ts
// next.config.ts  [CITED: docs.zama.org/protocol/sdk/guides/encrypt-decrypt] [VERIFIED: template lacks this]
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  typescript: { ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true" },
  eslint: { ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true" },
  webpack: (config) => { config.externals.push("pino-pretty", "lokijs", "encoding"); return config; },
  async headers() {                                    // ← ADD THIS BLOCK
    return [{
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    }];
  },
};

// NOTE: template file ends with `module.exports = nextConfig;` — keep that.
// WARNING: template also has an IPFS branch that sets `nextConfig.output = "export"`.
// Static export CANNOT emit runtime headers — headers() is silently dropped.
// For the Vercel deploy, ensure NEXT_PUBLIC_IPFS_BUILD is NOT "true".
export default nextConfig; // (or the existing module.exports = nextConfig)
```

### Pattern 3: Sepolia chain-id guard (ADD — FND-02)

**What:** Gate the app on `chainId === 11155111`; if wrong, prompt a switch. RainbowKit alone will NOT flag mainnet as "wrong" because the template's wagmi config auto-adds mainnet (for ENS) and includes hardhat — so an explicit Sepolia gate is required.
**Example:**
```tsx
// app/page.tsx (walking-skeleton shell)  [CITED: wagmi.sh useSwitchChain]
"use client";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";

export default function Home() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return <RainbowKitCustomConnectButton />;
  if (chainId !== sepolia.id) {                         // sepolia.id === 11155111
    return (
      <button disabled={isPending} onClick={() => switchChain({ chainId: sepolia.id })}>
        Wrong network — switch to Sepolia
      </button>
    );
  }
  const isolated = typeof window !== "undefined" && window.crossOriginIsolated;
  return <div>FHE runtime shell ready · crossOriginIsolated: {String(isolated)}</div>;
}
```

### Anti-Patterns to Avoid
- **Rewriting `DappWrapperWithProviders` to the docs `createConfig`/`@zama-fhe/react-sdk/wagmi` style.** The template intentionally avoids that path for now and ships its own `WagmiSigner`. Rewriting risks a signer/relayer regression for zero phase benefit.
- **`import { createInstance } from '@zama-fhe/relayer-sdk'` at module scope.** That is the OLD SDK. The 3.2.0 template uses `RelayerWeb` + `ZamaProvider`. Do not reintroduce the legacy pattern.
- **Leaving `output: "export"` / `NEXT_PUBLIC_IPFS_BUILD=true` on for the Vercel deploy.** Static export drops `headers()`, so `crossOriginIsolated` will be `false` and FND-04 fails.
- **Adding a restrictive CSP in this phase.** Only if you later add a CSP do you need `wasm-unsafe-eval`. The template ships no CSP; don't introduce one now (it can silently block WASM).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-only FHE provider + WASM worker lifecycle | A custom `initSDK()`/`createInstance()` provider | Template's `DappWrapperWithProviders` + `ZamaProvider`/`RelayerWeb` | Worker spawn, cleanup, storage, SSR-safety already solved & validated |
| Wallet connect UI + wrong-network state | Custom connector modal | RainbowKit `RainbowKitCustomConnectButton` (template) | Handled, themed, wired to wagmi |
| Cross-origin isolation | Manual server / middleware header injection | `next.config.ts` `headers()` | Next + Vercel emit them per-route natively |
| RPC config / Sepolia chain object | Hand-written chain metadata | `viem/chains` `sepolia` + template `scaffold.config.ts` | Chain IDs, RPC fallbacks already configured |

**Key insight:** Phase 1 is ~90% *inheriting and preserving* the template and ~10% *additive config* (exact pin + headers + chain guard + strip demo + deploy). Building anything from scratch here is a regression risk.

## Common Pitfalls

### Pitfall 1: SSR/WASM crash (`window is not defined`)
**What goes wrong:** Build or first load 500s because SDK code ran during SSR.
**Why it happens:** SDK touches `window`/`Worker` if imported/initialized at module scope in a server-rendered path.
**How to avoid:** Preserve the template boundary — all SDK usage stays inside the `'use client'` `DappWrapperWithProviders`; `RelayerWeb` is built in `useMemo` (client). Do NOT add module-scope `initSDK`. (Note: the new SDK's `RelayerWeb`/`IndexedDBStorage` constructors are SSR-tolerant/lazy, which is why the template can module-scope the signer/storage safely.)
**Warning signs:** Works in `next dev`, fails in `next build`/Vercel; hydration mismatch.

### Pitfall 2: `crossOriginIsolated === false` on the live URL (FND-04 fails)
**What goes wrong:** Headers missing/overridden → `crossOriginIsolated` is `false`; FHE runs single-threaded (slower) and FND-04 is not met.
**Why it happens:** Template ships no `headers()`; or static-export mode drops them; localhost is more permissive so it hides the gap.
**How to avoid:** Add the `headers()` block; keep `NEXT_PUBLIC_IPFS_BUILD` unset; **verify on the deployed Vercel URL**, not localhost.
**Warning signs:** `crossOriginIsolated` logs `false`; `SharedArrayBuffer is not defined` in console on the live URL only.
**Nuance [CITED: docs.zama.org security-model]:** Missing headers **degrade to single-threaded WASM**, they do not crash — so the failure is "slow + FND-04 unmet," not a white screen. Still blocking for this phase.

### Pitfall 3: `require-corp` will block future cross-origin assets (forward-looking)
**What goes wrong:** In later phases, fal.ai/ElevenLabs media loaded cross-origin get blocked by COEP.
**Why it happens:** `require-corp` requires every subresource to send CORP or be same-origin.
**How to avoid:** DIF-02 already mandates self-hosting assets in `/public`. Lock `require-corp` now; keep all media same-origin. (Fallback: `credentialless`, but verify the worker + isolation still hold — Chrome has blocked `credentialless`+COOP pages in some Vercel setups.)

### Pitfall 4: Unpinned SDK auto-updates before judging
**What goes wrong:** A fresh Vercel build pulls a breaking `@zama-fhe/*` release the night before the deadline.
**Why it happens:** Template ships `^3.0.0` (caret) on a day-old, fast-moving SDK.
**How to avoid:** `--save-exact` to `3.2.0`; commit the lockfile; a clean `npm ci` must reproduce.
**Warning signs:** `package.json` still shows `^3.x`; lockfile drift between installs.

## Runtime State Inventory

> Greenfield phase (new project scaffold) — no rename/migration. Section retained per protocol with explicit "none" answers.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — new project, no existing datastore | none |
| Live service config | None — Vercel project not yet created; created fresh in this phase | none |
| OS-registered state | None | none |
| Secrets/env vars | `NEXT_PUBLIC_ALCHEMY_API_KEY` (required in production build), `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` (template has a default) — set in Vercel env, not committed | Set in Vercel dashboard before deploy |
| Build artifacts | None — clean clone | none |

## Code Examples

All three phase-critical config snippets are in **Architecture Patterns → Pattern 1/2/3** above (provider, headers, chain guard), each tagged with source. No additional SDK calls are needed for the walking skeleton — the thinnest slice does not decrypt/encrypt, it only proves the runtime mounts and the page is cross-origin isolated.

### Verify `crossOriginIsolated` on the live URL (the judge/self check)
```js
// Paste in the browser console on the DEPLOYED Vercel URL (not localhost):
crossOriginIsolated            // must log: true   ← FND-04 pass condition
typeof SharedArrayBuffer       // "function" when isolated; "undefined" when not
```
[CITED: docs.zama.org/protocol/sdk/concepts/security-model — `crossOriginIsolated` gates SharedArrayBuffer]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@zama-fhe/relayer-sdk` `initSDK()` + `createInstance(SepoliaConfig)` | `@zama-fhe/sdk` `RelayerWeb` + `@zama-fhe/react-sdk` `ZamaProvider` | v3.x (SDK 3.2.0, template migrated) | Provider-based init; earlier ARCHITECTURE.md `initSDK` snippets describe the *legacy* path — do NOT use them for wiring |
| Missing COOP/COEP = hard WASM crash | Missing COOP/COEP = **single-threaded fallback** | New `RelayerWeb` | Header misconfig degrades, not white-screens — but FND-04 still requires isolation |
| `fhevmjs` browser lib | `@zama-fhe/sdk` 3.2.0 | superseded | `fhevmjs` deprecated — never use |

**Deprecated/outdated:**
- `fhevmjs`, `@zama-fhe/relayer-sdk` as the *primary* wiring path — superseded by the 3.2.0 provider model shown here.
- Any snippet doing module-scope `createInstance` — replaced by `RelayerWeb` in a `useMemo`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `RelayerWeb`/`IndexedDBStorage` constructors are SSR-tolerant (lazy), which is why the template module-scopes `signer`/`storage` without an SSR crash | Pattern 1 | LOW — inferred from the template shipping them at module scope in a hydrated component; if wrong, wrap in a `mounted` gate. Verify by running `next build` early. |
| A2 | The template's default `RelayerWeb` (using `SepoliaConfig`'s built-in `relayerUrl`, no `/api/relayer` proxy) is sufficient for the walking skeleton | Alternatives | LOW — docs recommend a proxy route to hide relayer URL, but the skeleton only needs the worker to mount + isolation; add the proxy later if needed. |
| A3 | Vercel emits `next.config` `headers()` on all routes in SSR/hybrid mode (not static-export) | Pattern 2 | LOW — well-established (Vercel KB on SharedArrayBuffer); the only trap is static-export mode, already flagged. |

## Open Questions

1. **Does the walking skeleton need a live FHE round-trip to "prove" the runtime, or is provider-mount + `crossOriginIsolated===true` enough?**
   - What we know: FND-03 asks for client-only init behind a memoized provider (mount proves this); FND-04 asks for `crossOriginIsolated===true` (console check proves this).
   - What's unclear: whether the planner wants a trivial SDK call (e.g., `useZamaSDK()` reading a token name) as extra evidence.
   - Recommendation: Thinnest slice = provider mounts without SSR crash + `crossOriginIsolated===true` on live URL. Treat any SDK call as an optional stretch check, not a phase gate.

2. **Alchemy key required in production build** — `scaffold.config.ts` throws if `NEXT_PUBLIC_ALCHEMY_API_KEY` is unset in `NODE_ENV=production`.
   - Recommendation: Provide an Alchemy Sepolia key as a Vercel env var before deploy, OR temporarily allow the public-RPC fallback for the spike. Do not commit the key.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next build/dev | probe at plan time | ≥18.18 (Next 15) | none — required |
| npm | Install/pin deps | probe | — | pnpm (template uses pnpm-lock) |
| git | Clone template | probe | — | download tarball |
| Vercel CLI / account | Live deploy (SUB-03/FND-04) | needs auth | `~39.1.3` (template) | Cloudflare Pages / own Node server |
| Alchemy API key (Sepolia) | Production RPC (scaffold.config) | user-provided | — | public RPC fallback (dev only) |
| WalletConnect project id | RainbowKit | template default present | — | template default |

**Missing dependencies with no fallback:** Vercel account/login must exist to satisfy SUB-03 + FND-04 (the live-URL isolation check). Confirm auth before the deploy task.
**Missing dependencies with fallback:** Alchemy key → public RPC for the spike; npm → pnpm.

*(Planner: add a probe task — `node -v`, `git --version`, `vercel whoami` — as the first wave to catch missing tooling before scaffolding.)*

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None shipped by the template** — no test runner in `packages/nextjs/package.json`. This is a deploy/config spike; primary validation is observational (build + live-URL console), not unit tests. |
| Config file | none — see Wave 0 |
| Quick run command | `npm run build` (must compile clean; proves no SSR/WASM crash) + `npm run check-types` |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | Exact 3.2.0 pin present | smoke | `node -e "const p=require('./package.json');['@zama-fhe/sdk','@zama-fhe/react-sdk'].forEach(k=>{if(p.dependencies[k]!=='3.2.0')throw Error(k+' not pinned exact: '+p.dependencies[k])})"` | ✅ (package.json) |
| FND-03 | No SSR/module-scope crash | smoke | `npm run build` exits 0 (App Router prerenders the provider shell without `window is not defined`) | ✅ |
| FND-02 | Sepolia guard renders | manual/UAT | connect on mainnet → "switch to Sepolia" prompt; switch → shell renders | ❌ manual |
| FND-04 | Cross-origin isolated on live URL | manual/UAT | on deployed URL console: `crossOriginIsolated === true` | ❌ manual (live URL) |
| SUB-03 | Public live deployment | manual/UAT | open Vercel URL in incognito → shell loads | ❌ manual |

### Sampling Rate
- **Per task commit:** `npm run check-types` (fast) and, for provider/config tasks, `npm run build`.
- **Per wave merge:** `npm run build && npm run lint`.
- **Phase gate:** `npm run build` clean locally **AND** on the live Vercel URL: `crossOriginIsolated === true`, wallet connects, Sepolia guard works.

### Wave 0 Gaps
- [ ] No test runner present — for a config/deploy spike, **do not add a heavy test harness**; rely on `next build` + typecheck + the live-URL console check as the automated/observed gates.
- [ ] (Optional, low priority) A tiny `scripts/check-pins.mjs` asserting exact `3.2.0` — cheap FND-01 guard runnable in CI/Vercel.

*If the planner wants automation beyond build+typecheck, a single Playwright smoke test hitting the deployed URL and asserting `page.evaluate(() => crossOriginIsolated) === true` would automate FND-04 — but it is optional for a spike.*

## Security Domain

> `security_enforcement: true`, ASVS level 1. This is a client-only dApp shell with no backend, no auth, no user data storage in Phase 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No app auth — wallet connection is not app authentication in this phase |
| V3 Session Management | no | No server sessions; SDK keypair/session in IndexedDB (client) |
| V4 Access Control | no | No protected resources yet (ACL/decrypt is Phase 3) |
| V5 Input Validation | minimal | Only chain-id comparison; no user free-text input in the skeleton |
| V6 Cryptography | no (do-not-touch) | FHE crypto is the SDK's; never hand-roll — just wire the provider |
| V14 Config (headers) | **yes** | COOP/COEP set via `next.config` `headers()`; consider adding `X-Content-Type-Options: nosniff` |

### Known Threat Patterns for {Next.js client dApp + Vercel}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets leaked in client bundle | Info Disclosure | Only `NEXT_PUBLIC_*` values are public by design (Alchemy/WalletConnect ids are meant to be client-side & rate-limited); never put a private key or write-scoped secret in `NEXT_PUBLIC_*` |
| Wrong-network signing / phishing chain | Spoofing/Tampering | Hard `chainId===11155111` gate before any action (FND-02) |
| Cross-origin resource injection under COEP | Tampering | `require-corp` + self-hosted assets (DIF-02) already isolates subresources |
| Missing baseline security headers | Info Disclosure | Add `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` alongside COOP/COEP (cheap, no downside) |

**Note:** No `security_enforcement` blockers for this phase (block-on: high). No high-risk surface — no backend, no secrets beyond public client ids, no user data.

## Sources

### Primary (HIGH confidence)
- `github.com/zama-ai/fhevm-react-template` `packages/nextjs/*` (fetched raw via `gh api` this session) — actual `next.config.ts` (no headers), `DappWrapperWithProviders.tsx` (client-only ZamaProvider/RelayerWeb wiring), `package.json` (`^3.0.0` → must re-pin), `wagmiConfig.tsx`, `scaffold.config.ts` (`targetNetworks:[hardhat,sepolia]`), `app/layout.tsx`/`page.tsx`
- npm registry (`npm view`, 2026-07-07) — `@zama-fhe/sdk` `3.2.0`, `@zama-fhe/react-sdk` `3.2.0` (both published 2026-06-24), peerDeps confirmed
- `gsd-tools query package-legitimacy check` — both SDKs SUS=too-new only, official `zama-ai` org repo, no postinstall

### Secondary (MEDIUM confidence)
- context7 `/websites/zama` (docs.zama.org) — COOP/COEP `require-corp` requirement AND the single-threaded-degradation nuance (security-model, encrypt-decrypt guide, RelayerWeb API ref); ZamaProvider `createConfig` docs style; `useZamaSDK`
- WebSearch (Vercel KB "fix SharedArrayBuffer not defined Next.js", next.js discussions #48508/#81384) — Vercel honors `next.config` `headers()`; `credentialless` caveats

### Tertiary (LOW confidence)
- A1/A2/A3 assumptions in the Assumptions Log — inferred, low risk, verify by an early `next build` + first Vercel deploy

## Metadata

**Confidence breakdown:**
- Standard stack / template structure: HIGH — verified against live official repo files + npm
- Provider wiring (FND-03 inherited): HIGH — read the actual `DappWrapperWithProviders.tsx`
- COOP/COEP config + degradation behavior: HIGH — official Zama docs (context7), corrected the "hard-crash" assumption
- Chain guard pattern: HIGH — standard wagmi `useSwitchChain`; template already targets Sepolia
- Vercel header emission: MEDIUM — well-established; verify on first deploy

**Research date:** 2026-07-07
**Valid until:** 2026-07-14 (fast-moving SDK — re-verify pins if planning slips a week)
