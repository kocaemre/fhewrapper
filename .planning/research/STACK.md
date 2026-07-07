# Stack Research

**Domain:** Zama FHEVM confidential-token dApp (ERC-20 ↔ ERC-7984 Wrappers Registry) on Sepolia
**Researched:** 2026-07-07
**Confidence:** HIGH (Zama SDK, wallet, template versions verified via context7 official docs + live npm registry + the official template's `package.json`)

---

## TL;DR — The One Decision That Reshapes Everything

**The official `fhevm-react-template` has migrated off the low-level relayer SDK onto a brand-new high-level SDK: `@zama-fhe/sdk` + `@zama-fhe/react-sdk` (v3.x).** This new SDK ships **first-class support for this exact app**:

- **Registry reading** — `sdk.registry.listPairs()`, `useConfidentialTokenAddress`, `useWrappersRegistryAddress` (reads the onchain Wrappers Registry; Sepolia/Mainnet addresses built-in).
- **Wrap** — `useShield` / `wrappedToken.shield(amount)` (ERC-20 approval + wrap in one call).
- **Unwrap** — `useUnshield` / `useUnshieldAll` (orchestrates the two-step unwrap + decryption-proof finalize).
- **User decryption of ANY ERC-7984 balance** — `useConfidentialBalance` + `useGrantPermit` / `useHasPermit` (a single EIP-712 permit authorizes decryption for any FHE contract — works for the paste-an-address requirement).

**Implication for the roadmap:** the table-stakes features (browse registry, wrap, unwrap, decrypt any balance) are largely *SDK wiring*, not from-scratch contract integration. This de-risks correctness (a top judging axis) and frees time for the animation differentiator. Build against the **high-level `@zama-fhe/react-sdk` hooks**, not raw relayer calls.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@zama-fhe/sdk` | `^3.2.0` (latest 3.2.0, pub 2026-07-06) | Core TS SDK: registry, `createWrappedToken().shield()/unshield()`, decryption | **This is the current SDK** the official template ships. Built-in Wrappers Registry, wrap/unwrap, and user-decryption. Verified via docs.zama.org + npm. |
| `@zama-fhe/react-sdk` | `^3.2.0` | React hooks over the SDK: `ZamaProvider`, `useShield`, `useUnshield`, `useConfidentialBalance`, `useConfidentialTokenAddress`, `useGrantPermit` | Every table-stakes feature maps to one hook. Removes most bespoke EIP-712 / relayer plumbing. peerDeps: `wagmi>=2`, `viem>=2`, `react>=18`, `@tanstack/react-query>=5`, `@zama-fhe/sdk ^3.2.0`. |
| Next.js | `~15.2.3` (App Router) | Framework + Vercel deploy + relayer proxy routes | Version the official template pins. App Router + client `providers.tsx` is the documented FHE pattern. **Do NOT jump to Next 16** (template untested there). |
| React | `~19.0.0` | UI runtime | Template baseline; react-sdk peer `react>=18`. |
| TypeScript | `~5.8.2` | Type safety (a judging axis: "well-typed") | Template baseline. |
| wagmi | `^2.19.5` | Wallet state, chain/account, contract reads/writes | Template baseline. **Stay on wagmi 2.x — do NOT upgrade to wagmi 3** (breaking; RainbowKit 2.2.x + template are on v2). |
| viem | `^2.47.12` | Low-level EVM client under wagmi (registry reads, ERC-20 calls) | Template baseline; react-sdk peer `viem>=2`. |
| `@tanstack/react-query` | `^5.96.2` | Async cache powering all Zama hooks + wagmi | Required peer of react-sdk and wagmi. |
| `@rainbow-me/rainbowkit` | `^2.2.10` | Injected/MetaMask wallet connect UI | The template's chosen connector UI. Satisfies "standard injected wallet" scope. |

### Contracts / Standards (read-mostly; no custom deploy required for table stakes)

| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fhevm/solidity` | `0.11.1` | FHEVM Solidity lib (`ZamaConfig`, encrypted types) | Only if you deploy/read a custom contract. Registry + faucet mocks already onchain — likely NOT needed. |
| `@openzeppelin/confidential-contracts` | `0.5.1` | Canonical `ERC7984`, `ERC7984ERC20Wrapper` reference | Reference for ABIs/interfaces when reading pairs. Deploy only if you add a *custom* dev-only pair. |
| ERC-7984 | standard | Confidential fungible token interface (encrypted balances via `euint64` handles) | The "confidential" side of every registry pair. Read via SDK, not by hand. |

### Animation & Media (the differentiator)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion` (was `framer-motion`) | `^12.42.2` | Primary React animation: enter/exit, layout, gestures, scroll orchestration | **Default choice.** Package renamed `framer-motion` → `motion`; import from `"motion/react"`. Declarative, React-19 friendly. |
| `gsap` + `@gsap/react` | `3.15.0` / `2.1.2` | Signature multi-stage timeline (fold → age → open) | Use for the *hero cinematic* where you need frame-precise sequencing/scrubbing. **GSAP is now 100% free incl. all plugins** (ScrollTrigger, etc.). `useGSAP()` hook for clean React cleanup. |
| `howler` | `2.2.4` | Ambient audio playback (ElevenLabs assets): fade, loop, gesture-unlock | Browsers block autoplay audio until a user gesture — Howler simplifies the unlock + crossfade. |
| `@lottiefiles/dotlottie-react` | `0.19.7` | Designer-authored vector motion (After Effects → Lottie) | Optional. Use if a designer/fal.ai produces AE-style micro-animations (badges, confirmations). |
| Pre-rendered video (fal.ai) | n/a | The "bottle aging" cinematic as an MP4/WebM played via `<video>` (optionally scroll-scrubbed) | **Recommended for the hero moment** — highest visual quality, cheapest to ship, no live-3D risk. See COEP/CORP warning below. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Tailwind CSS | Styling | Template pins `tailwindcss 4.1.3` + `@tailwindcss/postcss 4.0.15`. |
| daisyUI | Component primitives on Tailwind | Template pins `5.0.9`. Fine for speed; theme it heavily so the UI doesn't look default. |
| zustand | `~5.0.0` | Local UI state (wizard steps, animation stage) outside react-query. |
| Vercel CLI | Deploy | Template pins `vercel ~39.1.3`. See COOP/COEP deploy note. |
| ESLint / Prettier | Lint/format (judging axis: code quality) | Template ships `eslint 9.23`, `prettier 3.5.3`, import-sort plugin. |

---

## Installation

Base on the official template rather than hand-assembling:

```bash
# 1. Clone the official template (App Router, packages/nextjs is the frontend)
git clone https://github.com/zama-ai/fhevm-react-template
# frontend deps already include @zama-fhe/sdk ^3.0.0 + @zama-fhe/react-sdk ^3.0.0,
# wagmi ^2.19.5, viem ^2.47.12, next ~15.2.3, rainbowkit ^2.2.10, tailwind 4 + daisyui

# 2. Pin the Zama SDK to the latest 3.2.0 line
npm install @zama-fhe/sdk@^3.2.0 @zama-fhe/react-sdk@^3.2.0

# 3. Animation / media differentiator
npm install motion gsap @gsap/react howler @lottiefiles/dotlottie-react
npm install -D @types/howler
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@zama-fhe/react-sdk` hooks | `@zama-fhe/relayer-sdk` `0.4.4` (raw relayer: `initSDK`/`createInstance`/`SepoliaConfig`/`userDecrypt`) | Only if you need a low-level flow the hooks don't expose (custom `userDecrypt` over exotic handles). The react-sdk sits on top of this; prefer the hooks. `0.5.0-rc.1` prerelease exists but is not `latest`. |
| Pre-rendered fal.ai video for hero | `@react-three/fiber` `9.6.1` + `drei` `10.7.7` + `three` `0.185.1` (live 3D bottle) | Only if you have time budget for real-time 3D. High risk under a hard deadline; adds bundle weight + WASM/COEP interplay. A pre-rendered cinematic looks better for less risk. |
| `motion` (primary) + `gsap` (timeline) | `motion` alone | If the "fold → age → open" sequence is simple enough to express as chained `motion` variants, skip GSAP entirely to cut a dependency. |
| RainbowKit connector | ConnectKit / Web3Modal / bare wagmi injected connector | If you want a lighter connect UI. RainbowKit is already wired in the template — changing it costs time for no judging benefit. |
| Vercel deploy | Own Node server / Cloudflare Pages | Fall back if animation-asset weight or COOP/COEP header needs exceed Vercel's comfort (PROJECT.md already flags this). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fhevmjs` (`0.6.2`) | **Deprecated** original browser lib. Superseded by relayer-sdk, then by `@zama-fhe/sdk`. Old tutorials reference it. | `@zama-fhe/sdk` + `@zama-fhe/react-sdk` `^3.2.0` |
| `@zama-fhe/relayer-sdk` as your *primary* API | Lower-level; you'd re-implement registry reads, wrap/unwrap orchestration, and permit/decrypt plumbing the react-sdk already provides. | `@zama-fhe/react-sdk` hooks; drop to relayer-sdk only for gaps |
| `framer-motion` (old package name) | Renamed to `motion`. Installing `framer-motion` pulls the same code but the maintained import path is `"motion/react"`. | `motion` (`^12.42.2`) |
| wagmi `3.x` / Next `16.x` (latest on npm) | Major bumps with breaking changes; the template, RainbowKit 2.2.x, and react-sdk 3.2.0 are validated against wagmi 2 / Next 15. Upgrading burns deadline time debugging peer conflicts. | Template-pinned wagmi `^2.19.5`, Next `~15.2.3` |
| Custom ERC-7984 wrapper deployment for table stakes | The Sepolia registry + mock cTokens already exist onchain. Deploying your own fragments the ecosystem (the very problem this app solves) and adds risk. | Read the onchain registry; use official mocks (addresses below) |
| Live `react-three-fiber` 3D under deadline | Real-time 3D + FHE WASM + COEP isolation is a lot of moving parts before July 7. | Pre-rendered fal.ai video cinematic |

---

## Critical Gotchas (read before deploy)

### 1. Cross-Origin Isolation (COOP/COEP) — affects Vercel deploy AND fal.ai/ElevenLabs assets
FHE runs as **WASM in a Web Worker**, which requires the page to be *cross-origin isolated*. The official Next.js config (verified in docs):

```js
// next.config.js
const nextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    }];
  },
};
```

**The trap:** `COEP: require-corp` will **block any cross-origin resource** (images/video/audio) that doesn't send `Cross-Origin-Resource-Policy` / `crossorigin` — this directly threatens the **fal.ai-generated video/images and ElevenLabs audio** that are the differentiator. Mitigations:
- **Self-host the media** (put fal.ai/ElevenLabs exports in `/public`) so they're same-origin. Safest.
- Or serve from a CDN that sets `Cross-Origin-Resource-Policy: cross-origin` and load with `crossorigin="anonymous"`.
- Or use the more lenient `COEP: credentialless` (loads cross-origin resources without credentials, no CORP header required) — but confirm the SDK's worker still initializes under `credentialless` before relying on it.
- Verify `initSDK`/`ZamaProvider` actually loads on the live Vercel URL early — cross-origin isolation failures are silent until you try to decrypt.

### 2. Relayer proxy route
Docs recommend proxying relayer requests through a backend (Next.js route `/api/relayer/11155111`) so relayer URLs/keys aren't exposed client-side. The template wires `relayerUrl: "/api/relayer/11155111"`. Keep this pattern even on public Sepolia.

### 3. Autoplay policies for ambient audio
ElevenLabs ambient audio cannot autoplay before a user gesture. Gate playback on the wallet-connect click or first wrap interaction (Howler makes the unlock + fade trivial).

---

## Verified Onchain Addresses (Sepolia — primary source of truth)

| Contract | Sepolia Address | Source |
|----------|-----------------|--------|
| **Wrappers Registry** | `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` | docs.zama.org (also `DefaultRegistryAddresses` in SDK) |
| cUSDC (Mock) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | docs.zama.org Sepolia addresses |
| cUSDT (Mock) | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` | " |
| cWETH (Mock) | `0x46208622DA27d91db4f0393733C8BA082ed83158` | " |
| cBRON (Mock) | `0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891` | " |
| cZAMA (Mock) | `0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB` | " |
| ctGBP (Mock) | `0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC` | " |
| cXAUt (Mock) | `0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7` | " |
| Wrappers Registry (**Mainnet**, read-only reference) | `0xeb5015fF021DB115aCe010f23F55C2591059bBA0` | docs.zama.org Ethereum addresses |

> **GAP — faucet:** the docs page surfaced registry + mock tokens but not an explicit faucet contract/URL. The cToken *mocks* almost certainly expose a public `mint`/faucet function, or Zama provides a hosted faucet. **Verify the exact faucet mechanism (contract method vs hosted URL) during the faucet phase** before committing UI copy. Do not hardcode a faucet address until confirmed against docs.

---

## Feature → SDK Hook Map (for the roadmap)

| Table-stakes requirement | Primary API (verified) |
|--------------------------|------------------------|
| Browse onchain registry pairs | `sdk.registry.listPairs({ page })`; `useWrappersRegistryAddress`; `useConfidentialTokenAddress({ tokenAddress })` → `[found, confidentialAddress]` |
| Wrap ERC-20 → ERC-7984 | `useShield(wrapperAddr)` / `wrappedToken.shield(amount, { to, approvalStrategy })` |
| Unwrap ERC-7984 → ERC-20 | `useUnshield(wrapperAddr)` / `useUnshieldAll` (handles unwrap + decryption-proof finalize; progress callbacks `onUnwrapSubmitted`/`onFinalizing`/`onFinalizeSubmitted`) |
| Decrypt ANY ERC-7984 balance (paste-an-address) | `useGrantPermit([token])` (one EIP-712 sig, not token-specific) + `useHasPermit` + `useConfidentialBalance({ address, account })` → `bigint` |
| Batch decrypt many balances | `useBatchDecryptBalancesAs(tokens)` |
| Hybrid registry (onchain + local config) | Merge `sdk.registry.listPairs()` results with a local `pairs.ts` config array |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@zama-fhe/react-sdk@^3.2.0` | `@zama-fhe/sdk@^3.2.0`, `wagmi@>=2`, `viem@>=2`, `react@>=18`, `@tanstack/react-query@>=5` | Peer deps confirmed via `npm view`. Keep sdk + react-sdk on the **same 3.2.x** version. |
| `@zama-fhe/sdk@^3.2.0` | `viem@>=2`, `ethers@>=6`, `@tanstack/query-core@>=5` | SDK supports both viem and ethers adapters; this app uses the viem/wagmi path. |
| `@rainbow-me/rainbowkit@^2.2.10` | `wagmi@2.x`, `viem@2.x` | RainbowKit 2.2.x targets wagmi 2 — another reason to hold wagmi at 2.x. |
| `motion@^12` | `react@19` | Import from `"motion/react"`. |
| `@gsap/react@2.1.2` | `gsap@3.15.0`, `react@19` | Use `useGSAP()` for React-safe cleanup. |

---

## Sources

- `/websites/zama` (context7 — docs.zama.org) — Relayer/SDK configuration, Next.js SSR + COOP/COEP headers, `ZamaProvider`, `useShield`/`useUnshield`/`useConfidentialBalance`/`useGrantPermit`/`useConfidentialTokenAddress`, `sdk.registry.getConfidentialToken`/`listPairs`, `ERC7984ERC20Wrapper`, confidential wrapper `wrap`/`unwrap`. **Confidence: HIGH.**
- `/zama-ai/relayer-sdk`, `/zama-ai/fhevm` (context7) — legacy relayer SDK + FHEVM framework context for disambiguation.
- npm registry (`npm view`, 2026-07-07) — exact latest versions & publish dates: `@zama-fhe/sdk` 3.2.0, `@zama-fhe/react-sdk` 3.2.0, `@zama-fhe/relayer-sdk` 0.4.4 (prerelease 0.5.0-rc.1), `fhevmjs` 0.6.2 (deprecated), `@fhevm/solidity` 0.11.1, `@openzeppelin/confidential-contracts` 0.5.1; UI libs `motion` 12.42.2, `gsap` 3.15.0, `@gsap/react` 2.1.2, `howler` 2.2.4, `@lottiefiles/dotlottie-react` 0.19.7. **Confidence: HIGH.**
- `github.com/zama-ai/fhevm-react-template` → `packages/nextjs/package.json` (via `gh api`) — confirms template ships `@zama-fhe/sdk`/`@zama-fhe/react-sdk` ^3.0.0, wagmi ^2.19.5, viem ^2.47.12, next ~15.2.3, rainbowkit ^2.2.10, tailwind 4 + daisyui, react 19, TS 5.8. **Confidence: HIGH.**
- docs.zama.org Sepolia/Ethereum address pages (WebFetch) — registry + mock cToken addresses. **Confidence: HIGH** (faucet mechanism: **GAP**, verify during implementation).

---
*Stack research for: Zama FHEVM Confidential Wrapper Registry dApp*
*Researched: 2026-07-07*
