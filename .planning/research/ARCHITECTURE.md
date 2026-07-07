# Architecture Research

**Domain:** Zama FHEVM confidential-token dApp (Next.js + relayer SDK, Sepolia)
**Researched:** 2026-07-07
**Confidence:** HIGH (registry interface, relayer SDK init, EIP-712 decryption, and wrap/unwrap signatures verified against official Zama + OpenZeppelin docs via context7/WebFetch)

## Standard Architecture

This is a **client-heavy, wallet-driven dApp** with no application backend. All state of record lives onchain (Sepolia). The only "server" concerns are (1) static Next.js hosting and (2) HTTP calls the relayer SDK makes to Zama's Relayer + CDN. The FHE cryptography (encryption of inputs, decryption of handles) runs **in the browser inside a Web Worker via WASM** — there is no trusted server doing crypto.

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        UI / Animation Layer (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌───────────┐ │
│  │ PairGrid │  │ WrapPanel│  │ DecryptBox│  │ Faucet  │  │ WrapAnim  │ │
│  │ (cards)  │  │ (wrap/un)│  │ (any addr)│  │ (claim) │  │ (bottle)  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬────┘  └───────────┘ │
├───────┼─────────────┼──────────────┼────────────┼──────────────────────┤
│       │        Application / Hooks Layer (state + orchestration)        │
│  ┌────┴─────┐  ┌────┴───────┐  ┌───┴────────┐  ┌┴────────────────────┐  │
│  │useRegistry│ │ useWrap /  │  │useUserDecrypt│ │ useFaucet          │  │
│  │ (pairs)   │ │ useUnwrap  │  │ (EIP-712)   │ │ (mint cToken)      │  │
│  └────┬──────┘ └────┬───────┘  └───┬─────────┘  └──┬─────────────────┘  │
├───────┼─────────────┼──────────────┼───────────────┼────────────────────┤
│       │         Integration / Provider Layer                            │
│  ┌────┴───────┐ ┌───┴────────────┐ ┌┴─────────────┐ ┌─────────────────┐ │
│  │ Registry   │ │ Wallet/Chain   │ │ FHEVM        │ │ Local Config    │ │
│  │ Read Client│ │ (wagmi/viem)   │ │ Instance     │ │ Pairs (JSON/TS) │ │
│  │ (viem read)│ │ connect/sign   │ │ (relayer SDK)│ │ merge+dedupe    │ │
│  └────┬───────┘ └───┬────────────┘ └┬─────────────┘ └─────────────────┘ │
├───────┼─────────────┼───────────────┼──────────────────────────────────┤
│       ▼             ▼               ▼                                    │
│  Sepolia RPC   Injected Wallet   Zama Relayer + CDN (HTTP/WASM/Worker)   │
│  (registry,    (MetaMask:        (public key fetch, input verification,  │
│   ERC20/7984)   sign, send tx)    userDecrypt, WASM crypto bundle)       │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Registry Read Client** | Enumerate onchain wrapper pairs; resolve token metadata | viem `readContract` against Registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` (Sepolia); `getTokenConfidentialTokenPairsLength()` + `getTokenConfidentialTokenPairsSlice()` |
| **Local Config Pairs** | Provide custom/dev-only pairs on top of onchain source | Static `pairs.config.ts`/JSON; merged + deduped by the registry hook |
| **Wallet / Chain Layer** | Connect injected wallet, expose signer, enforce Sepolia | wagmi + viem; `useAccount`, `useWalletClient`, chain guard |
| **FHEVM Instance** | Load WASM, fetch FHE public key, create encrypted inputs, run userDecrypt | relayer SDK `initSDK()` + `createInstance({...SepoliaConfig, network: window.ethereum})`; held in a React context/provider, client-only |
| **Wrap/Unwrap Tx Layer** | ERC-20 approve → wrap; ERC-7984 unwrap (encrypted amount + proof) | viem `writeContract` on `ERC7984ERC20Wrapper.wrap(to,amount)` / `unwrap(from,to,externalEuint64,inputProof)` |
| **User-Decryption Layer** | EIP-712 sign + request cleartext of any ERC-7984 balance handle | `generateKeypair` → `createEIP712` → `signTypedData` → `instance.userDecrypt(...)` |
| **Faucet Layer** | Mint official cTokenMock test tokens to the user | `writeContract` mint/claim on cTokenMock addresses (verify per-token mint fn) |
| **UI / Animation Layer** | Render pair cards, forms, decrypted balances; the signature wrap animation | React components; fal.ai visuals + ElevenLabs audio driven by wrap tx lifecycle |

## Recommended Project Structure

```
packages/nextjs/                    # base: fhevm-react-template
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # wraps DappWrapperWithProviders (client boundary)
│   ├── page.tsx                    # registry grid + panels
│   └── decrypt/page.tsx            # paste-an-address decrypt tool (optional route)
├── components/
│   ├── DappWrapperWithProviders.tsx# ZamaProvider + wagmi + relayer wiring (from template)
│   ├── PairGrid.tsx / PairCard.tsx # rendered registry pairs
│   ├── WrapPanel.tsx               # approve → wrap → confirm
│   ├── UnwrapPanel.tsx             # encrypt amount → unwrap
│   ├── DecryptBox.tsx              # EIP-712 user-decrypt any handle
│   ├── FaucetButton.tsx            # claim cTokenMock
│   └── anim/WrapBottle.tsx         # bottle→age→open animation
├── fhevm/                          # relayer SDK integration (template-provided)
│   ├── useFhevmInstance.ts         # initSDK + createInstance, memoized, client-only
│   ├── useUserDecrypt.ts           # EIP-712 keypair+sign+userDecrypt
│   └── useEncryptInput.ts          # createEncryptedInput helper (add64/encrypt)
├── registry/
│   ├── registry.abi.ts             # verified Registry ABI (read fns + events)
│   ├── useRegistryPairs.ts         # onchain enumerate + local merge + metadata
│   └── pairs.config.ts             # LOCAL CONFIG — add-a-pair here
├── contracts/
│   ├── erc7984Wrapper.abi.ts       # wrap/unwrap ABI
│   └── erc20.abi.ts / erc7984.abi.ts
├── lib/tokenMeta.ts                # symbol/decimals/name multicall
├── next.config.js                  # COOP/COEP or CSP wasm-unsafe-eval headers
└── package.json                    # "type": "module" for SDK bundle import
```

### Structure Rationale

- **`fhevm/`:** Isolates every WASM/relayer-coupled call behind hooks so the client-only boundary and instance memoization live in one place (the SDK cannot run during SSR).
- **`registry/`:** Keeps the hybrid-sourcing logic (onchain enumerate + local config merge/dedupe) in a single hook so the rest of the UI just consumes a normalized `Pair[]`.
- **`contracts/` + `*.abi.ts`:** ABIs are the anti-hallucination surface — pin them to verified signatures and never inline ad-hoc.

## Architectural Patterns

### Pattern 1: Client-only FHEVM instance provider (WASM boundary)

**What:** `initSDK()` (loads TFHE WASM into a Web Worker) then `createInstance({...SepoliaConfig, network: window.ethereum})`, done once behind a React context, guarded so it never runs on the server.
**When to use:** Always, for any encrypt/decrypt path.
**Trade-offs:** Adds a load-time async gate (public-key fetch + WASM); must show a "cryptography loading" state. Instance is not serializable — cannot cross the SSR boundary.

**Example:**
```typescript
// fhevm/useFhevmInstance.ts  (client component only)
import { initSDK, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

let _instance: Promise<FhevmInstance> | null = null;
export function getFhevm() {
  if (typeof window === 'undefined') throw new Error('FHEVM is client-only');
  if (!_instance) _instance = (async () => {
    await initSDK();                              // load WASM
    return createInstance({ ...SepoliaConfig, network: window.ethereum });
  })();
  return _instance;                               // memoized across renders
}
```

### Pattern 2: Hybrid registry sourcing (onchain primary + local config)

**What:** Read all pairs from the onchain Registry, filter to `isValid`, then merge local-config pairs. Dedupe by lowercased `confidentialTokenAddress` (or the `erc20↔confidential` pair key). **Onchain wins on conflict**; local entries only add pairs the registry does not already list.
**When to use:** The registry is the source of truth but the bounty requires supporting custom/dev pairs.
**Trade-offs:** Local entries can go stale vs onchain; make precedence explicit and tag local pairs in the UI ("local").

**Example:**
```typescript
// registry/useRegistryPairs.ts
const len = await read('getTokenConfidentialTokenPairsLength');           // uint
const raw = await read('getTokenConfidentialTokenPairsSlice', [0, len]);  // TokenWrapperPair[]
const onchain = raw
  .filter(p => p.isValid)                                                  // drop revoked
  .map(p => ({ erc20: p.tokenAddress, ctoken: p.confidentialTokenAddress, source: 'registry' }));

const seen = new Set(onchain.map(p => p.ctoken.toLowerCase()));
const merged = [...onchain, ...LOCAL_PAIRS.filter(p => !seen.has(p.ctoken.toLowerCase()))];
// enrich each with symbol/decimals/name via multicall before render
```

### Pattern 3: EIP-712 user-decryption of a balance handle

**What:** ERC-7984 `confidentialBalanceOf` returns a ciphertext **handle**, not a number. To show a cleartext balance the user signs an EIP-712 grant and the SDK asks the relayer to decrypt for that user.
**When to use:** Every time a confidential balance/amount is displayed (registry token or arbitrary pasted address).
**Trade-offs:** Requires a wallet signature per grant (cacheable for `durationDays`); only handles the connected wallet is ACL-authorized for will decrypt.

**Example (verified signatures):**
```typescript
const keypair = instance.generateKeypair();
const start = Math.floor(Date.now()/1000).toString();
const days = '10';
const eip712 = instance.createEIP712(keypair.publicKey, [ctokenAddr], start, days);
const sig = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message,
);
const res = await instance.userDecrypt(
  [{ handle, contractAddress: ctokenAddr }],
  keypair.privateKey, keypair.publicKey, sig.replace('0x',''),
  [ctokenAddr], signer.address, start, days,
);
const clear = res[handle];   // bigint cleartext
```

### Pattern 4: Wrap (plaintext in) vs Unwrap (encrypted in) asymmetry

**What:** `wrap(to, amount)` takes a **plaintext** ERC-20 amount (public — you are revealing what you deposit) after an ERC-20 `approve`. `unwrap(from, to, externalEuint64 encryptedAmount, bytes inputProof)` takes an **encrypted** amount built client-side via `createEncryptedInput`.
**When to use:** Wrap = approve then wrap; Unwrap = encrypt amount + proof then unwrap.
**Trade-offs:** Wrap amount is rounded down to a multiple of `rate()`; unwrap requires the encrypt step (WASM) and correct ACL grants on the handle.

**Example (encrypt for unwrap):**
```typescript
const buf = instance.createEncryptedInput(wrapperAddr, userAddr);
buf.add64(BigInt(amount));
const { handles, inputProof } = await buf.encrypt();
await writeContract({ address: wrapperAddr, abi, functionName: 'unwrap',
  args: [userAddr, userAddr, handles[0], inputProof] });
```

## Data Flow

### Primary flow: onchain pair → card → wrap → encrypted balance → decrypted display

```
Registry.getTokenConfidentialTokenPairsSlice()   (viem read, Sepolia RPC)
    ↓  filter isValid, merge LOCAL_PAIRS, dedupe
[Pair[]] → enrich (symbol/decimals/name multicall)
    ↓
PairCard rendered  ──user clicks Wrap──▶ ERC20.approve(wrapper, amt)  (wallet sign+send)
    ↓                                          ↓ confirmed
                                        wrapper.wrap(user, amt)        (wallet sign+send)
    ↓ confirmed → trigger WrapBottle animation
ERC7984.confidentialBalanceOf(user) → handle (ciphertext)   (viem read)
    ↓
useUserDecrypt: generateKeypair → createEIP712 → signTypedData → instance.userDecrypt
    ↓ (relayer HTTP + WASM)
cleartext bigint → format by decimals → rendered balance
```

### Unwrap flow

```
user enters amount → createEncryptedInput(wrapper,user).add64().encrypt()
    ↓ {handles, inputProof}  (WASM, Web Worker)
wrapper.unwrap(user, user, handles[0], inputProof)   (wallet sign+send)
    ↓ confirmed → ERC-20 back in wallet; re-read + re-decrypt balances
```

### Faucet flow

```
user clicks Claim → cTokenMock.mint/claim(user, amt)  (wallet sign+send)
    ↓ confirmed → user now has ERC-20 (or cToken) to exercise wrap/unwrap
```

### State management

```
wagmi (account, chainId, walletClient)  ─┐
FHEVM instance (context, client-only)    ─┼─▶ hooks (useRegistryPairs, useWrap,
LOCAL_PAIRS (static import)              ─┘     useUserDecrypt, useFaucet)
                                                    ↓ React Query / local state
                                              components (cards, panels, balances)
```
No global app store required beyond wagmi + a FHEVM context + React Query (or SWR) for read caching. Decrypted values are session-only state (never persisted).

## Suggested Build Order (dependency graph)

```
1. Base template boots on Sepolia (fhevm-react-template) ── wallet connect works
        │
        ├─▶ 2. Registry read layer (ABI + enumerate + isValid filter)   [no SDK needed]
        │        └─▶ 3. Token metadata enrichment (multicall)
        │                 └─▶ 4. PairGrid renders (table-stakes visible)
        │
        ├─▶ 5. FHEVM instance provider (initSDK + createInstance)  [gates all crypto]
        │        ├─▶ 6. User-decryption (EIP-712) — decrypt a known handle
        │        │        └─▶ 7. "Any address" decrypt tool (paste address)
        │        └─▶ 8. Encrypted input helper (createEncryptedInput)
        │
        ├─▶ 9. Wrap flow (approve → wrap) — depends on 4 + wallet          
        │        └─▶ 10. Unwrap flow — depends on 8 (encrypt) + 6 (verify)
        │
        ├─▶ 11. Faucet (mint cTokenMock) — independent; unblocks manual testing early
        │
        ├─▶ 12. Hybrid local-config pairs merge — small add-on to step 2
        │
        └─▶ 13. Animation + polish layer — after the wrap→decrypt loop is correct
                 └─▶ 14. Vercel deploy hardening (headers/WASM) + README add-a-pair
```

**Critical dependencies:**
- **Registry read (2) is independent of the SDK** — build and render pairs first; it de-risks the "browse" table-stake without waiting on WASM.
- **FHEVM instance (5) must exist before any decrypt (6/7) or unwrap encrypt (8).** Wallet connect (1) must precede both signing (decrypt) and sending (wrap/unwrap).
- **Faucet (11) is independent** and worth building early so you can manually exercise wrap/unwrap without hunting for test tokens.
- **Deploy hardening (14)** should be validated early on a throwaway Vercel deploy — the COOP/COEP/WASM constraint is the single biggest "works locally, breaks on Vercel" risk (see below).

## Add-a-New-Pair Mechanism (documented, local-config)

Lives in `registry/pairs.config.ts`. The registry hook merges these after the onchain set, deduped by confidential-token address. Shape:

```typescript
// registry/pairs.config.ts
export const LOCAL_PAIRS: LocalPair[] = [
  {
    erc20:  '0xYourErc20Address',            // underlying ERC-20 on Sepolia
    ctoken: '0xYourErc7984WrapperAddress',   // ERC-7984 wrapper (ERC7984ERC20Wrapper)
    label:  'cMYTOKEN',                      // optional display override
    source: 'local',                         // tags card as local vs registry
  },
];
```
README documents: deploy an `ERC7984ERC20Wrapper` for your ERC-20, add one entry here, rebuild. Onchain-registered pairs always take precedence; a local entry that later gets registered onchain is silently superseded by the dedupe.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Sepolia RPC** | viem publicClient reads (Registry, ERC-20, ERC-7984) | Use a reliable RPC; multicall for metadata |
| **Injected wallet (MetaMask)** | wagmi connector; `signTypedData` (decrypt), `writeContract` (approve/wrap/unwrap/mint) | Enforce chainId 11155111; prompt switch on mismatch |
| **Zama Relayer** | relayer SDK HTTP: input verification + `userDecrypt` | `SepoliaConfig` sets `relayerUrl` (`https://relayer.testnet.zama.org`), gatewayChainId 10901 |
| **Zama CDN** | WASM/crypto bundle load via `initSDK()` | CDN `relayer-sdk-js.umd.cjs` recommended for SSR frameworks to avoid bundler WASM issues |
| **fal.ai / ElevenLabs** | Pre-generated static assets (mp4/webp/audio) in `public/` | Do NOT call at runtime; bake assets to keep Vercel light and demo deterministic |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ hooks | props/return values | Components stay dumb; hooks own async + errors |
| hooks ↔ FHEVM context | `getFhevm()` promise | Single memoized instance; never re-create per render |
| registry hook ↔ local config | static import + merge | Precedence: onchain > local; dedupe by ctoken addr |
| SSR ↔ client | client-component boundary | SDK/WASM code guarded with `typeof window` / `'use client'` |

## Anti-Patterns

### Anti-Pattern 1: Importing the relayer SDK at module top-level in a server-rendered file
**What people do:** `import { createInstance } from '@zama-fhe/relayer-sdk'` in a shared/server file.
**Why it's wrong:** WASM + `window.ethereum` are unavailable during SSR; build/hydration breaks, or Vercel serverless bundling fails.
**Do this instead:** Confine SDK imports to `'use client'` modules; load via `/bundle` (or CDN) and gate `initSDK()` behind `typeof window !== 'undefined'`. Dynamic-import the crypto path if needed.

### Anti-Pattern 2: Rendering a ciphertext handle as if it were a balance
**What people do:** Show `confidentialBalanceOf()` output directly.
**Why it's wrong:** It's a 32-byte handle, not a number; decryption requires the EIP-712 userDecrypt flow and ACL authorization.
**Do this instead:** Always route confidential values through `useUserDecrypt`; show "encrypted • click to reveal" until decrypted.

### Anti-Pattern 3: Deploying without cross-origin isolation / CSP for WASM
**What people do:** Ship to Vercel with default headers.
**Why it's wrong:** The FHE Web Worker can throw `EncryptionFailedError`/`ConfigurationError` when WASM is blocked by a restrictive CSP or missing isolation — works locally, fails on the live URL judges use.
**Do this instead:** In `next.config.js` set CSP to include `wasm-unsafe-eval`, and add `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (COEP may require serving/loading the CDN bundle with proper CORP). Validate on a real Vercel deploy before polish.

### Anti-Pattern 4: Forgetting the ERC-20 approve before wrap, or the rate rounding
**What people do:** Call `wrap()` directly, or expect `wrap(x)` to mint exactly `x`.
**Why it's wrong:** `wrap` does `safeTransferFrom` (reverts without allowance) and rounds to a multiple of `rate()` (`amount - amount % rate()`), minting `amount/rate()`.
**Do this instead:** Approve first; display the effective (rounded) wrapped amount and the wrapper's `rate()`.

## Next.js / Relayer-SDK Deploy Constraints (must-address)

- **Client-only + WASM:** SDK runs FHE in a Web Worker via WASM (`RelayerWeb`). `initSDK()` must load WASM before `createInstance`. Keep all of it inside client components; never SSR it. **(HIGH confidence — Zama docs.)**
- **Headers:** Missing WASM permission or restrictive CSP causes `EncryptionFailedError` — include `wasm-unsafe-eval`; add COOP/COEP for cross-origin isolation. Set in `next.config.js` headers(). **(HIGH — Zama error docs; exact COEP necessity depends on whether SharedArrayBuffer path is used — verify on deploy.)**
- **Bundle import:** Use `@zama-fhe/relayer-sdk/bundle` (or `/web`) for browser; CDN bundle recommended for SSR frameworks to sidestep bundler WASM packaging. `package.json` needs `"type": "module"`. Pin the SDK version the template ships. **(HIGH — Zama webapp docs.)**
- **Vercel:** Static Next.js export/SSR both fine; the risk is headers + WASM, not compute. Bake fal.ai/ElevenLabs assets into `public/` rather than generating at runtime to stay within free-plan limits.

## Verified Interface Reference (anti-hallucination anchor)

- **Registry (Sepolia):** `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`. Struct `TokenWrapperPair { address tokenAddress; address confidentialTokenAddress; bool isValid }`. Reads: `getTokenConfidentialTokenPairsLength()`, `getTokenConfidentialTokenPairsSlice(fromIndex,toIndex)`, `getTokenConfidentialTokenPair(index)`, `getTokenConfidentialTokenPairs()`, `getConfidentialTokenAddress(erc20)→(bool,address)`, `getTokenAddress(ctoken)→(bool,address)`, `isConfidentialTokenValid(ctoken)`, `getTokenIndex(token)`. Events: `ConfidentialTokenRegistered(tokenAddress, confidentialTokenAddress)`, `ConfidentialTokenRevoked(...)`. Enumerate via length+slice, filter `isValid` client-side.
- **cTokenMock (Sepolia):** cUSDC `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`, cUSDT `0x4E7B06D78965594eB5EF5414c357ca21E1554491`, cWETH `0x46208622DA27d91db4f0393733C8BA082ed83158`, cBRON `0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891`, cZAMA `0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB`, ctGBP `0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC`, cXAUt `0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7`. (Mint/faucet fn to verify per token.)
- **Relayer SDK init:** `await initSDK(); createInstance({...SepoliaConfig, network: window.ethereum})`. `SepoliaConfig` carries aclContractAddress, kmsContractAddress, inputVerifierContractAddress, verifyingContractAddressDecryption, chainId 11155111, gatewayChainId 10901, relayerUrl `https://relayer.testnet.zama.org`. SDK version seen: `0.3.0-7`.
- **Encrypt input:** `createEncryptedInput(contractAddr,userAddr).add64(BigInt(x)); await .encrypt() → {handles, inputProof}`.
- **User decrypt:** `generateKeypair()` → `createEIP712(pub, [ctoken], start, days)` → `signTypedData(domain,{UserDecryptRequestVerification},message)` → `userDecrypt([{handle,contractAddress}], priv, pub, sig.replace('0x',''), [ctoken], userAddr, start, days)`.
- **Wrapper (ERC7984ERC20Wrapper):** `wrap(address to, uint256 amount)` (plaintext, needs prior ERC-20 approve, rounds to `rate()`), `unwrap(address from, address to, externalEuint64 encryptedAmount, bytes inputProof)` (encrypted). ERC-7984 interface id `0x4958f2a4` (supportsInterface / ERC-165).

## Sources

- Zama Wrappers Registry contract interface — docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry (HIGH)
- Zama Sepolia addresses — docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia (HIGH)
- Zama Relayer SDK: createInstance, initSDK, webapp/CDN setup, user-decryption — /zama-ai/relayer-sdk via context7 + github.com/zama-ai/relayer-sdk/docs (HIGH)
- Zama SDK errors (EncryptionFailedError/ConfigurationError, CSP wasm-unsafe-eval, RelayerWeb Web Worker) — docs.zama.org/protocol/sdk/api-references (HIGH)
- OpenZeppelin Confidential Contracts: ERC7984ERC20Wrapper wrap/unwrap, rate rounding — docs.openzeppelin.com/confidential-contracts/token + /api/token (HIGH)
- fhevm-react-template structure (RelayerWeb on Sepolia, DappWrapperWithProviders) — github.com/zama-ai/fhevm-react-template (MEDIUM — README-level)

---
*Architecture research for: Zama FHEVM confidential-token registry dApp (Next.js, Sepolia)*
*Researched: 2026-07-07*
