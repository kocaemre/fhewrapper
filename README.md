<div align="center">

<img src=".github/assets/banner.jpg" alt="The Cellar Registry" width="100%" />

<h1>The Cellar Registry</h1>

<p><em>Browse, wrap, unwrap &amp; decrypt every official ERC-20 ↔ ERC-7984 confidential wrapper pair on Sepolia — one app over the Zama Wrappers Registry.</em></p>

<p>
  <a href="https://zama.0xemrek.dev/"><img src="https://img.shields.io/badge/▶_Live_app-zama.0xemrek.dev-8B2635?style=flat-square" alt="Live app" /></a>
  <a href="https://youtu.be/C9kkgs5QxJU"><img src="https://img.shields.io/badge/▶_Demo-YouTube-b31217?style=flat-square&logo=youtube&logoColor=white" alt="Demo video" /></a>
  <img src="https://img.shields.io/badge/network-Sepolia-627EEA?style=flat-square&logo=ethereum&logoColor=white" alt="Sepolia" />
  <img src="https://img.shields.io/badge/license-BSD--3--Clause--Clear-8B2635?style=flat-square" alt="License" />
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/wagmi-2-1B1B1B?style=flat-square" alt="wagmi 2" />
  <img src="https://img.shields.io/badge/FHEVM-@zama--fhe%2Fsdk_3.0.0-FFD208?style=flat-square&labelColor=1a1a1a" alt="Zama FHEVM SDK 3.0.0" />
  <img src="https://img.shields.io/badge/Zama_Developer_Program-Season_3-6E29C4?style=flat-square" alt="Zama Developer Program Season 3" />
</p>

</div>

---

Built for the **Zama Developer Program — Mainnet Season 3 Bounty Track**. The Cellar Registry turns the Zama **Wrappers Registry** into a usable product: it reads the official registry live onchain, makes "use the official registry" the path of least resistance, and wraps the whole confidential-token loop (wrap → decrypt → unwrap) in a signature cinematic.

FHEVM (Fully Homomorphic Encryption Virtual Machine) lets smart contracts compute on encrypted data — ERC-7984 balances stay private ciphertext handles, decryptable only by the authorized holder via the EIP-712 user-decryption flow.

## Supported network

**Sepolia testnet only** (chain id `11155111`). Mainnet is a read-only reference; all write operations (wrap, unwrap, faucet) are Sepolia. The app detects the wallet's chain and prompts a switch to Sepolia (ChainGuard).

## What it does

- **Browse the registry** — reads the **onchain** Sepolia Wrappers Registry (`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`) as the source of truth; resolves both sides' symbol/name/decimals in one Multicall3 batch; flags revoked pairs via the registry's `isValid` bit. Search, valid/revoked filter chips, and address-copy affordances included.
- **Faucet** — claim the official cTokenMock underlying ERC-20 test tokens (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) straight from the app, with low-gas / over-cap / wrong-network handling.
- **Wrap** — approve + wrap a registry ERC-20 into its ERC-7984 equivalent; reads `rate()` + `decimals()` per pair onchain and previews the resulting amount (never hardcodes 18 decimals).
- **Unwrap** — the honest two-tx async flow (burn → gateway public-decrypt → finalize); success is shown only when the ERC-20 actually arrives (`finalizeUnwrap` receipt), with a resumable pending state.
- **Decrypt any ERC-7984 balance** — one reusable EIP-712 permit user-decrypts the connected wallet's balance for **any** ERC-7984 token, including tokens **outside** the registry (paste-an-address); the "no ACL access" case is detected and messaged, not left spinning.
- **Signature cinematic + ambient audio** — a fal.ai-rendered "fold → insert → seal → age → pop → token" sequence driven by the real wrap tx lifecycle (skippable, `prefers-reduced-motion`-aware), over self-hosted ElevenLabs ambient audio.

## Wrapper registry

### How the registry is sourced

The wrapper pairs shown in the app are **read live from the onchain Sepolia Wrappers Registry** at `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` — never hardcoded. Each render:

1. enumerates the registry's ERC-20 ↔ ERC-7984 pairs onchain,
2. resolves both sides' `symbol` / `name` / `decimals` in a **single Multicall3 batch** (never per-token — a keyless public RPC would rate-limit that), and
3. flags any revoked pair via the registry's validity bit (`isValid`) so revoked pairs are still shown but marked, not silently dropped.

Supported network: **Sepolia testnet** (chain id `11155111`).

### Adding a wrapper pair

To surface a custom or dev-only wrapper pair that the onchain registry does not list yet, overlay it locally in `packages/nextjs/registry/pairs.config.ts`. That file exports a typed `localPairs: LocalPair[]` array (empty by default) that is merged into the onchain list. The `LocalPair` shape (from `packages/nextjs/registry/types.ts`) is:

```ts
export type LocalPair = {
  /** underlying ERC-20 */
  tokenAddress: `0x${string}`;
  /** ERC-7984 wrapper (dedup key) */
  confidentialTokenAddress: `0x${string}`;
  /** default true */
  isValid?: boolean;
  /** optional metadata overrides if a token lacks a readable symbol/name/decimals */
  overrides?: {
    underlying?: Partial<TokenMeta>;
    confidential?: Partial<TokenMeta>;
  };
};
```

Add an entry by pushing an object with both addresses:

```ts
// packages/nextjs/registry/pairs.config.ts
import type { LocalPair } from "./types";

export const localPairs: LocalPair[] = [
  {
    // underlying ERC-20 (the token being wrapped)
    tokenAddress: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
    // ERC-7984 confidential wrapper (this is the dedup key)
    confidentialTokenAddress: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    // isValid defaults to true; set false to render it as revoked
    // overrides: { confidential: { symbol: "cDEV", name: "Dev cToken", decimals: 6, decimalsKnown: true } },
  },
];
```

The addresses above are **illustrative** — the shipped `pairs.config.ts` stays empty so no fake pair leaks into the live app. Addresses you add are validated with viem `isAddress` / `getAddress` where they enter the read pipeline, so a typo is skipped with a console warning rather than crashing the grid.

**Precedence rule (dedup by confidential address, onchain wins):** merged entries are deduped by the **lowercased ERC-7984 (`confidentialTokenAddress`)**. When the same confidential address exists both onchain and in `localPairs`, **the onchain registry entry always wins** — a local entry can only surface a pair the registry does not already list, and can never override or mask a real onchain pair.

## Reusable hooks (public API)

The four table-stakes flows are exposed as clean, well-typed React hooks from a single barrel, `packages/nextjs/hooks/index.ts` — the deliberate public surface a judge or downstream dev imports from:

```ts
import { useRegistry, useWrap, useUnwrap, useUserDecrypt, useFaucet } from "~~/hooks";
```

| Hook                                         | Returns (abridged)                                                        | Onchain state                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `useRegistry` (alias of `useRegistryPairs`)  | `{ pairs, validCount, isLoading, isError, refetch }`                      | reads the Wrappers Registry (enumerate + metadata multicall) + local overlay — read-only |
| `useWrap(confidentialAddr)`                  | `{ stage, wrap, isPending, rate, preview, confirmed, txHash }`            | reads `rate()`; writes ERC-20 approval + wrap (shield)                                   |
| `useUnwrap(confidentialAddr)`                | `{ stage, unwrap, unwrapAll, resumePending, isPending, reset, txHash }`   | writes the honest two-tx unwrap; success gated on the finalize receipt                   |
| `useUserDecrypt(tokenAddress, { decimals })` | `{ stage, reveal, reset, value, error, hasPermit, isFetching, decimals }` | signs one reusable EIP-712 permit; user-decrypts ANY ERC-7984 balance locally            |
| `useFaucet()`                                | `{ claim, txHash, isPending, confirming, isSuccess, error }`              | writes the cTokenMock `mint(to, amount)`; success is the receipt                         |

The barrel is a re-export only — `check-types` resolves every symbol, so the documented API can never drift from the implementations.

## Stack / versions

- **Frontend** — Next.js 15 (App Router), React 19, TypeScript, wagmi 2 / viem 2, RainbowKit 2, Tailwind + daisyUI.
- **FHE SDK** — [`@zama-fhe/sdk`](https://github.com/zama-ai/sdk) + `@zama-fhe/react-sdk`, **pinned EXACT `3.0.0`** (no caret/tilde).
- **Animation / media** — self-hosted fal.ai cinematic (`/public/cinematic/*.mp4`) + ElevenLabs ambient audio (`/public/audio/cellar-ambient.mp3`).

### Why the SDK is exact-pinned to 3.0.0

The official `fhevm-react-template` locks `@zama-fhe/sdk` + `@zama-fhe/react-sdk` to **3.0.0**, and the preserved client-only provider targets the 3.0.0 API. 3.2.0 introduced breaking changes (`SepoliaConfig` / `RelayerWeb` location / `hardhatCleartextConfig` / `ZERO_HANDLE`) incompatible with that provider. Both packages are therefore pinned to an exact `3.0.0` — no range — and a guard script, `packages/nextjs/scripts/check-pins.mjs`, exits non-zero if either drifts off exact `3.0.0`, so an unpinned SDK can never auto-update into a judged deploy.

## Cross-origin isolation (COOP / COEP)

The FHE WASM worker needs `SharedArrayBuffer`, which requires the page to be **cross-origin isolated** (`crossOriginIsolated === true`). `packages/nextjs/next.config.ts` emits, on every route:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Because COEP is `require-corp` (not `credentialless`), cross-origin subresources would be blocked — so **all media (cinematic MP4s, ambient audio) is self-hosted under `/public`**. Confirmed live on the deployed URL: COOP/COEP on the wire and `crossOriginIsolated === true` in-browser.

> **Warning:** a static export (`output: "export"`, triggered by `NEXT_PUBLIC_IPFS_BUILD=true`) **silently drops these headers**. Leave `NEXT_PUBLIC_IPFS_BUILD` unset for any hosted deploy, or cross-origin isolation — and therefore decryption — breaks.

## Deploy

The live app deploys via **GitHub → Vercel dashboard import** (no Vercel CLI needed). The reproducible pipeline:

1. Push the repo to GitHub and **import it into Vercel** (New Project → import the repo).
2. Set **Root Directory = `packages/nextjs`** (the monorepo frontend).
3. Leave the Install/Build commands on **Vercel defaults** — the committed exact-pinned `package-lock.json` resolves everything; **npm is the package manager** (the stale `pnpm-lock.yaml` and `packageManager` field were removed so Vercel/CI auto-detect npm — do not reintroduce a second lockfile).
4. Leave **`NEXT_PUBLIC_IPFS_BUILD` unset** so `next.config.ts` `headers()` emit the COOP/COEP headers (see above) instead of a static export.
5. No env vars are required to boot — with no `NEXT_PUBLIC_ALCHEMY_API_KEY` the app falls back to public Sepolia RPCs. Set `NEXT_PUBLIC_ALCHEMY_API_KEY` (name only — never commit the value) for a dedicated RPC.

After import, the deploy is a hybrid build (`.next`, no `out/`) at a public URL — confirmed at https://zama.0xemrek.dev/.

### Local development

```bash
cd packages/nextjs
npm install
npm run dev          # http://localhost:3000
```

> Local dev is fine for UI work, but **decryption / relayer flows must be verified on the live isolated URL** — `crossOriginIsolated` and the real Sepolia relayer are the true gate.

Frontend scripts (`packages/nextjs`):

| Command                       | What it does                           |
| ----------------------------- | -------------------------------------- |
| `npm run dev`                 | Next dev server                        |
| `npm run build`               | Production build                       |
| `npm run check-types`         | `tsc --noEmit`                         |
| `npm run test`                | `vitest run`                           |
| `npm run lint`                | Next lint                              |
| `node scripts/check-pins.mjs` | Assert `@zama-fhe/*` are exact `3.0.0` |

## Verified onchain addresses (Sepolia)

| Contract              | Address                                      |
| --------------------- | -------------------------------------------- |
| **Wrappers Registry** | `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` |
| cUSDC (Mock)          | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` |
| cUSDT (Mock)          | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |
| cWETH (Mock)          | `0x46208622DA27d91db4f0393733C8BA082ed83158` |
| cBRON (Mock)          | `0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891` |
| cZAMA (Mock)          | `0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB` |
| ctGBP (Mock)          | `0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC` |
| cXAUt (Mock)          | `0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7` |

## References

[Zama Protocol docs](https://docs.zama.org/) · [`@zama-fhe/sdk`](https://github.com/zama-ai/sdk) · [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts) · [Discord](https://discord.com/invite/zama)

## License

BSD-3-Clause-Clear. See [LICENSE](LICENSE).
