# Phase 3: User-Decryption (EIP-712) - Research

**Researched:** 2026-07-07
**Domain:** FHE confidential-balance user-decryption via `@zama-fhe/react-sdk` **3.0.0** (EIP-712 permit + relayer gateway) on Sepolia
**Confidence:** HIGH (API verified by inspecting the installed 3.0.0 `.d.ts` on disk — the authoritative source of truth)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. Decryption flow + EIP-712 permit**
- Use a SINGLE EIP-712 permit that authorizes decryption for any FHE contract (per CLAUDE.md `useGrantPermit` / `useHasPermit`) — NOT a per-token permit. One signature enables the paste-an-address "any token" claim.
- Decryption is triggered by an EXPLICIT per-balance "Decrypt" action (blur→reveal on click), NOT auto-decrypt on load.
- **CRITICAL:** the exact @zama-fhe user-decryption API MUST be verified via context7 against the pinned **3.0.0** SDK (the CLAUDE.md Feature→Hook map lists 3.2.0 hook names — `useConfidentialBalance`/`useGrantPermit`/`useHasPermit`/`useConfidentialTokenAddress` — which may differ in 3.0.0). If the react-sdk 3.0.0 hooks differ, use the 3.0.0 equivalents (or drop to the relayer-sdk `userDecrypt`/EIP-712 flow the react-sdk wraps). Anti-hallucination rule applies — verify, don't assume.
- Batch "decrypt all" is OPTIONAL: include only if the 3.0.0 SDK exposes it cleanly (e.g. a batch-decrypt hook) — otherwise per-balance decrypt is the baseline.

**B. Paste-an-address (any ERC-7984)**
- An address input: paste an ERC-7984 contract address → decrypt the CONNECTED wallet's balance for that token. Validate with viem `isAddress`/`getAddress`; handle non-ERC-7984 / bad address gracefully.
- Also decrypt balances for the connected wallet's REGISTRY cTokens (from Phase 2's pair list) — both entry points prove "any token".

**C. UI (blur→reveal — from the Cellar Registry design)**
- Encrypted balance renders as a blurred / ciphertext-styled value; the Decrypt action reveals the cleartext (the design's "Decrypt (blur→reveal)" screen). Follow `.dc.html`.
- Surfaces: on the registry pair cards (decrypt the wallet's balance for that token, gated on connection) AND a dedicated paste-an-address decrypt panel.
- Wallet connection IS required for decryption (unlike the read-only browse) — decryption needs the user's wallet + EIP-712 signature. Use the existing ChainGuard/connect flow for this write-ish path (Sepolia).

**D. Error / edge states**
- Permit signature rejected (user rejects EIP-712) → clear "authorize to decrypt" retry state.
- Decryption failure / relayer error → readable error + retry.
- Zero / no balance, non-ERC-7984 pasted address, wrong network → explicit states (full production-grade error UX is Phase 6; here cover the basics).

### Claude's Discretion
- Exact decrypt-button placement on the card, blur styling specifics, permit-status indicator, and whether balances refetch after decrypt — follow the design + SDK ergonomics.

### Deferred Ideas (OUT OF SCOPE)
- Wrap (Phase 4), unwrap (Phase 5), faucet (Phase 4). Full production error/status system (Phase 6). Animation/polish (Phase 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEC-01 | User can decrypt the connected wallet's balance for any ERC-7984 token via the EIP-712 user-decryption flow | `useConfidentialBalance({ tokenAddress })` returns the decrypted cleartext `bigint`; it reads the on-chain handle and decrypts via the relayer, acquiring the EIP-712 credential on first use. Gate the query `enabled` on an explicit Decrypt click (CONTEXT: no auto-decrypt). |
| DEC-02 | Decryption works for tokens **outside** the registry (paste-an-address and/or auto-detect) | Same `useConfidentialBalance` works for ANY confidential-token address. Validate the pasted address with viem `isAddress`, then `useIsConfidential(address)` (ERC-165 ERC-7984 check) before attempting decrypt. `useReadonlyToken(address)` gives an imperative fallback (`token.balanceOf()`, `token.confidentialBalanceOf()`). |
| DEC-03 | EIP-712 payload assembled correctly (sign only `UserDecryptRequestVerification`, consistent timestamp/duration), signature cached for its validity window | `useAllow([addresses])` signs ONE non-token-specific EIP-712 message authorizing any listed FHE contract; the SDK assembles `UserDecryptRequestVerification` internally (app must NOT hand-build it). Signature cached in `IndexedDBStorage("SignatureStore")` for `sessionTTL` (default 2592000s / 30 days), keypair for `keypairTTL` (default 86400s / 1 day). `useIsAllowed({ contractAddresses })` reports a cached in-window permit → drives the "Decrypt" (no re-sign) path + permit indicator. |
| DEC-04 | "No ACL access" case detected and messaged gracefully (some arbitrary tokens are undecryptable by design) | A decrypt on a handle the wallet has no ACL grant for rejects at the relayer → caught as `DecryptionFailedError` (or `RelayerRequestFailedError`). A never-initialized balance returns `ZERO_HANDLE` (`isZeroHandle()` → treat as `0`). Use `instanceof` on `ZamaError` subclasses + `matchAclRevert`/`matchZamaError` to render "no decryption access", never a hanging spinner. |
</phase_requirements>

## Summary

Phase 3 is the first phase to actually import `@zama-fhe/sdk` + `@zama-fhe/react-sdk` (both pinned **exact 3.0.0**). The single most important research outcome: **the installed 3.0.0 hook API differs from BOTH the CLAUDE.md "3.2.0" map AND the current docs.zama.org docs.** The public docs describe `useGrantPermit` / `useHasPermit` / `useDecryptValues` (shipped in a later 3.x line); the **installed 3.0.0** package instead exports `useAllow` / `useIsAllowed`, and has **no `useDecryptValues` and no `useGrantPermit`**. Building against the doc/CLAUDE names would fail to compile. Every hook name below was verified by reading `node_modules/@zama-fhe/react-sdk/dist/index.d.ts` and `@zama-fhe/sdk/dist/esm/activity-DBMyE78S.d.ts` on disk. [VERIFIED: installed 3.0.0 .d.ts]

The good news: 3.0.0 exposes a **higher-level, cleaner** decrypt path than CLAUDE.md assumed. `useConfidentialBalance({ tokenAddress })` returns the connected wallet's **decrypted cleartext `bigint`** directly — it reads the on-chain encrypted handle, decrypts via the relayer, and caches the result (relayer only hit when the handle changes). Authorization is a single, reusable, non-token-specific EIP-712 permit via `useAllow([addresses])`; `useIsAllowed({ contractAddresses })` checks whether a cached in-window signature already covers those addresses (drives the "skip signing" path and the permit indicator). This maps every CONTEXT decision onto real 3.0.0 primitives with no manual EIP-712 assembly — the SDK builds `UserDecryptRequestVerification` internally.

The provider is already fully wired (Phase 1, `DappWrapperWithProviders.tsx`): `ZamaProvider` with `RelayerWeb(SepoliaConfig)`, a `WagmiSigner`, and two `IndexedDBStorage` stores (`KeypairStore` + `SignatureStore`) that persist the keypair and EIP-712 session across reloads. Cross-origin isolation (`require-corp`) is live and proven (Phase 1), which the FHE WASM worker requires. The relayer endpoint is `https://relayer.testnet.zama.org/v2` (built into `SepoliaConfig`); no relayer proxy route is needed for the browser `RelayerWeb` path.

**Primary recommendation:** Build a single reusable `useUserDecrypt` hook wrapping `useIsAllowed` + `useAllow` + `useConfidentialBalance` (per-token) and `useConfidentialBalances` (batch), keyed by token address, with an explicit `reveal()` trigger and a 4-stage state machine (`idle → signing → decrypting → revealed | error`). Consume it from both `DecryptStateBox` (paste panel) and `PairCardDecrypt` (per-card). Do NOT hand-assemble EIP-712 or call the relayer-sdk directly — the 3.0.0 react hooks cover the entire flow.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| EIP-712 permit signing (`useAllow`) | Browser / Client (wallet) | — | Requires the user's private key via MetaMask; a wallet-only operation. SDK assembles the typed data. |
| Handle read + FHE decrypt (`useConfidentialBalance`) | Browser / Client (WASM worker) | External relayer service | Ciphertext handle read on-chain (viem/wagmi), re-encryption/decrypt runs in the FHE WASM worker + relayer gateway. No app backend. |
| Permit cache / session persistence | Browser / Client (IndexedDB) | — | `IndexedDBStorage` persists keypair + EIP-712 signature across reloads; already wired in the provider. |
| Address validation + ERC-165 confidential check | Browser / Client | — | `isAddress` (viem) + `useIsConfidential` (on-chain ERC-165 read via the SDK). |
| Registry pair data (for quick-pick chips) | Browser / Client | — | Reuses Phase 2 `useRegistryPairs` (on-chain multicall reads, no FHE). |
| Chain guard (Sepolia) | Browser / Client | — | Reuses Phase 1 `ChainGuard`. Decryption requires `chainId === 11155111`. |

**Note:** This phase is entirely **client-tier**. There is no server/API tier — the app is client-only (per CLAUDE.md "Custom onchain indexer / backend" is out of scope). The only external service is the Zama relayer/gateway (`relayer.testnet.zama.org`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@zama-fhe/react-sdk` | **3.0.0** (exact, installed) | React hooks: `useAllow`, `useIsAllowed`, `useConfidentialBalance`, `useConfidentialBalances`, `useIsConfidential`, `useReadonlyToken`, `useUserDecrypt` | Already installed + provider wired (Phase 1). Every DEC requirement maps to a hook. [VERIFIED: installed 3.0.0 .d.ts] |
| `@zama-fhe/sdk` | **3.0.0** (exact, installed) | Core types + error classes (`ZamaError`, `DecryptionFailedError`, `SigningRejectedError`, `NoCiphertextError`, …), `SepoliaConfig`, `ReadonlyToken`, `ZERO_HANDLE`/`isZeroHandle`, `matchAclRevert`/`matchZamaError` | The react-sdk re-exports these; import error classes from `@zama-fhe/react-sdk` (re-exported) or `@zama-fhe/sdk`. [VERIFIED: installed 3.0.0 .d.ts] |
| `wagmi` | ^2.19.5 (installed) | `useAccount` (connection gate), `useChainId` | Provides the connected address + chain; already the app's wallet layer. |
| `viem` | ^2.47.12 (installed) | `isAddress`, `getAddress`, `formatUnits` (display) | Address validation for paste-an-address; format cleartext `bigint` with the confidential token's decimals. |
| `@tanstack/react-query` | ^5.96.2 (installed) | Underlying query/mutation cache for all Zama hooks | Every Zama hook is a `useQuery`/`useMutation`; already the provider's client. |

### Supporting
| Symbol | From | Purpose | When to Use |
|--------|------|---------|-------------|
| `useReadonlyToken(address)` | react-sdk 3.0.0 | Memoized `ReadonlyToken` instance: `.balanceOf()`, `.confidentialBalanceOf()` (raw handle), `.isConfidential()`, `.allow()`, `.isAllowed()` | Imperative fallback when the declarative `useConfidentialBalance` doesn't fit (e.g. custom orchestration). Not needed for the baseline. |
| `useRevoke` / `useRevokeSession` | react-sdk 3.0.0 | Clear cached credentials for addresses / the whole session | Optional "lock viewing key" affordance; wallet-disconnect handler. |
| `ZERO_HANDLE`, `isZeroHandle(h)` | sdk 3.0.0 (re-exported) | Detect a never-initialized encrypted balance | A wallet that never received the token has a zero handle → render `0` without hitting the relayer. |
| `matchZamaError(error, handlers)`, `matchAclRevert(error)` | sdk 3.0.0 (re-exported) | Map raw/relayer/ACL errors to typed `ZamaError` | Error-taxonomy switch for the DEC-04 no-ACL + gateway-failure states. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useConfidentialBalance` (declarative, returns `bigint`) | `useUserDecrypt({ handles })` (query over raw handles → `DecryptResult` = `Record<Handle, ClearValueType>`) | `useUserDecrypt` is lower-level: you must fetch the handle yourself (`token.confidentialBalanceOf()`) and map it back. Only use if you need to decrypt a non-balance handle. For balances, `useConfidentialBalance` is strictly simpler. |
| `useConfidentialBalances` (batch, one hook) | Loop `useConfidentialBalance` per card | Batch pre-authorizes all tokens in ONE signature and returns partial results (`{ results, errors }`) — better UX for "decrypt all". Per-card loop is fine for the baseline; batch is the CONTEXT-optional "decrypt all". |
| High-level react hooks | `@zama-fhe/relayer-sdk` `userDecrypt` + manual EIP-712 | Manual path re-implements keypair gen, EIP-712 assembly, `0x`-stripping, caching — everything the hooks already do. Only drop down if a hook is genuinely missing (none are, for DEC-01..04). Do NOT hand-roll. |
| `useAllow` / `useIsAllowed` (installed 3.0.0) | `useGrantPermit` / `useHasPermit` (CLAUDE.md / docs.zama.org) | **These do not exist in 3.0.0** — using them fails to compile. This is the central anti-hallucination correction of this phase. |

**Installation:** None. Both packages are installed at exact 3.0.0 (`packages/nextjs/package.json`) and the provider is wired. This phase only writes app code that imports them. [VERIFIED: package.json + node_modules on disk]

**Version verification:**
```bash
node -e "console.log(require('./node_modules/@zama-fhe/react-sdk/package.json').version)"  # -> 3.0.0
node -e "console.log(require('./node_modules/@zama-fhe/sdk/package.json').version)"        # -> 3.0.0
```
Confirmed both resolve to exactly `3.0.0` on disk. [VERIFIED: node_modules]

## Package Legitimacy Audit

> No new packages are installed in this phase — it consumes already-installed, already-wired dependencies. Audit covers the two SDK packages this phase newly imports.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@zama-fhe/react-sdk` | npm | pinned 3.0.0 (installed Phase 1) | official Zama org | github.com/zama-ai | OK | Approved — already installed, official Zama scope |
| `@zama-fhe/sdk` | npm | pinned 3.0.0 (installed Phase 1) | official Zama org | github.com/zama-ai | OK | Approved — already installed, official Zama scope |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Legitimacy is established by (a) both packages already vetted + pinned in Phase 1, (b) the `@zama-fhe` npm scope being the official Zama org referenced throughout docs.zama.org, and (c) on-disk inspection of the actual published type definitions. No install step occurs in this phase, so no new legitimacy risk is introduced.

## Architecture Patterns

### System Architecture Diagram

```
[User clicks "Decrypt" on a token]
            |
            v
   +-------------------------+     no valid permit    +---------------------------+
   | useUserDecrypt (shared) |----------------------->| useAllow([tokenAddr, ...])|
   | reveal(tokenAddress)    |                        | -> wallet EIP-712 prompt  |
   +-------------------------+                        |    (UserDecryptRequest-   |
            |  useIsAllowed({contractAddresses})      |     Verification)         |
            |  == true (cached, in-window)            +-------------+-------------+
            v                                                       | signed -> cached in
   +-------------------------+                                      | IndexedDBStorage(SignatureStore)
   | useConfidentialBalance  |<-------------------------------------+
   | ({ tokenAddress })      |
   +-----------+-------------+
               |
               | 1. read encrypted handle on-chain (viem/wagmi via SDK)
               v
        [ ERC-7984 confidentialBalanceOf -> euint64 handle ]
               |
               | 2. if ZERO_HANDLE -> return 0n (no relayer)
               | 3. else decrypt via relayer + FHE WASM worker
               v
   [ RelayerWeb -> https://relayer.testnet.zama.org/v2 ]
     (re-encrypt to the session keypair; runs under crossOriginIsolated)
               |
      success  |  failure
        |      |     \
        v      v      v
   bigint   DecryptionFailedError / RelayerRequestFailedError / NoCiphertextError
   (revealed) --------> matchZamaError / instanceof -> "NO DECRYPTION ACCESS" (DEC-04)
        |
        v
  formatUnits(bigint, confidentialDecimals) -> blur->reveal cleartext in UI
```

### Recommended Project Structure
```
packages/nextjs/
├── hooks/
│   └── useUserDecrypt.ts        # NEW — shared decrypt engine (wraps useAllow/useIsAllowed/useConfidentialBalance)
├── components/decrypt/          # NEW (per UI-SPEC Component Inventory)
│   ├── DecryptPanel.tsx         #   dedicated paste-an-address screen (section, 2-col grid)
│   ├── DecryptAddressInput.tsx  #   isAddress-validated ERC-7984 input
│   ├── DecryptQuickPicks.tsx    #   registry cToken chips (from useRegistryPairs)
│   ├── DecryptStateBox.tsx      #   blur->reveal display + state chip
│   ├── DecryptCTA.tsx           #   Sign & Decrypt button (state-driven)
│   ├── PermitIndicator.tsx      #   "VIEWING KEY ACTIVE" badge (useIsAllowed)
│   └── PairCardDecrypt.tsx      #   per-card inline decrypt (reuses useUserDecrypt)
├── lib/
│   └── decryptErrors.ts         # NEW — map ZamaError subclasses -> UI-SPEC reason strings
└── app/decrypt/page.tsx         # NEW — route hosting DecryptPanel (Header gets a "Decrypt" nav item)
```

### Pattern 1: Single reusable permit + explicit-trigger decrypt (the core hook)
**What:** One `useUserDecrypt` hook exposes `{ stage, reveal, value, error, hasPermit }`. `hasPermit` from `useIsAllowed`; `reveal()` grants the permit if missing (`useAllow`) then enables the balance query.
**When to use:** Both `DecryptStateBox` (paste panel) and `PairCardDecrypt` (per card). Shared so a granted permit reveals across surfaces without re-signing.
**Example:**
```tsx
// Source: verified against node_modules/@zama-fhe/react-sdk/dist/index.d.ts (3.0.0)
"use client";
import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import {
  useAllow,
  useIsAllowed,
  useConfidentialBalance,
  SigningRejectedError,
  DecryptionFailedError,
  NoCiphertextError,
  type Address,
} from "@zama-fhe/react-sdk";

type Stage = "idle" | "signing" | "decrypting" | "revealed" | "error";

export function useUserDecrypt(tokenAddress: Address | undefined) {
  const { address: account, isConnected } = useAccount();
  const [enabled, setEnabled] = useState(false); // explicit trigger (no auto-decrypt)
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<Error | null>(null);

  // DEC-03: single, non-token-specific EIP-712 permit; SDK builds UserDecryptRequestVerification
  const { mutateAsync: allow } = useAllow();
  const { data: hasPermit } = useIsAllowed(
    tokenAddress ? { contractAddresses: [tokenAddress] } : { contractAddresses: [account!] },
  );

  // DEC-01/02: returns the DECRYPTED cleartext bigint; enabled gates the explicit trigger
  const { data: value, isFetching } = useConfidentialBalance(
    { tokenAddress: tokenAddress! },
    { enabled: enabled && !!tokenAddress && isConnected },
  );

  const reveal = useCallback(async () => {
    if (!tokenAddress) return;
    try {
      setError(null);
      if (!hasPermit) {
        setStage("signing");
        await allow([tokenAddress]); // one wallet prompt; cached for sessionTTL
      }
      setStage("decrypting");
      setEnabled(true); // triggers useConfidentialBalance
    } catch (e) {
      setStage("error");
      setError(e as Error); // SigningRejectedError handled by the CTA layer
    }
  }, [tokenAddress, hasPermit, allow]);

  // stage transitions on query settle handled in an effect (see DecryptStateBox)
  return { stage, setStage, reveal, value, error, hasPermit, isFetching };
}
```

### Pattern 2: Paste-an-address validation before decrypt (DEC-02)
**What:** Validate the pasted string is an address, then confirm it's an ERC-7984 confidential token via ERC-165 before enabling decrypt.
```tsx
// Source: verified against 3.0.0 .d.ts (useIsConfidential, ERC-165 check)
import { isAddress, getAddress } from "viem";
import { useIsConfidential } from "@zama-fhe/react-sdk";

const trimmed = raw.trim();
const valid = isAddress(trimmed);
const tokenAddress = valid ? getAddress(trimmed) : undefined;

const { data: isConfidential, isLoading: checking } =
  useIsConfidential(tokenAddress ?? "0x0000000000000000000000000000000000000000", {
    enabled: !!tokenAddress,
  });
// valid === false            -> "NOT A VALID ADDRESS" (CTA disabled)
// isConfidential === false    -> "NOT A CONFIDENTIAL (ERC-7984) TOKEN"
// isConfidential === true      -> allow the Sign & Decrypt CTA
```

### Pattern 3: Batch "decrypt all" (CONTEXT-optional)
**What:** One signature, all registry cTokens, partial results.
```tsx
// Source: verified against 3.0.0 .d.ts (useConfidentialBalances -> { results, errors })
import { useConfidentialBalances } from "@zama-fhe/react-sdk";

const { data } = useConfidentialBalances(
  { tokenAddresses: validCTokens }, // from useRegistryPairs (valid only)
  { enabled: revealAllClicked },
);
// data.results: Map<Address, bigint>   (decrypted)
// data.errors:  Map<Address, ZamaError> (per-token failures — e.g. no ACL)
```

### Anti-Patterns to Avoid
- **Importing `useGrantPermit` / `useHasPermit` / `useDecryptValues`:** these are NOT in 3.0.0 — build fails. Use `useAllow` / `useIsAllowed` / `useConfidentialBalance`.
- **Hand-assembling the EIP-712 typed data / `UserDecryptRequestVerification` / stripping `0x` from the signature:** the SDK does all of this inside `useAllow`. Manual assembly re-introduces the exact bugs DEC-03 warns about.
- **Auto-decrypting on mount:** CONTEXT mandates an explicit per-balance Decrypt action. Gate `useConfidentialBalance` with `enabled` flipped by the click.
- **Per-token permits:** the permit is intentionally non-token-specific. One `useAllow([...])` covers many contracts — the whole point of the paste-an-address "any token" claim.
- **Treating a zero balance as an error:** `ZERO_HANDLE` / a `0n` cleartext is a valid decrypt; render `0 {symbol}` in the success state.
- **Reading the relayer via a proxy route:** `RelayerWeb` (browser) hits `relayer.testnet.zama.org` directly with CORS. No Next.js proxy route is needed (and none exists).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EIP-712 typed-data for user decryption | Custom `signTypedData` with a hand-written `UserDecryptRequestVerification` struct | `useAllow([addresses])` | SDK builds the exact typed data, manages keypair, strips `0x`, and caches — DEC-03 correctness is a top judging axis; hand-rolling reintroduces the bugs. |
| Handle read + re-encryption + decrypt | Manual `confidentialBalanceOf` read + relayer `userDecrypt` plumbing | `useConfidentialBalance({ tokenAddress })` | Returns cleartext `bigint`, handles the WASM worker, caches per-handle, only hits the relayer on change. |
| Permit "is it cached / still valid" check | LocalStorage TTL bookkeeping | `useIsAllowed({ contractAddresses })` | Reads the SDK's own session store (IndexedDB) with correct TTL semantics. |
| Signature persistence across reloads | Custom IndexedDB writes | `IndexedDBStorage("SignatureStore")` (already passed to `ZamaProvider`) | Already wired in `DappWrapperWithProviders`; the SDK reads/writes it. |
| Confidential-token detection | Custom ERC-165 `supportsInterface` call | `useIsConfidential(address)` | Canonical ERC-7984 interface-ID check, cached indefinitely. |
| Error classification | String-matching revert messages | `instanceof ZamaError` subclasses + `matchZamaError` / `matchAclRevert` | Typed, stable error codes; string matching breaks on relayer message changes. |
| Batch decrypt with partial failure | `Promise.allSettled` over per-token decrypts | `useConfidentialBalances` / `ReadonlyToken.batchBalancesOf` | Pre-authorizes all in one signature; returns `{ results, errors }` so one bad token doesn't abort the rest. |

**Key insight:** 3.0.0's react hooks are a complete, high-level decrypt toolkit. For DEC-01..DEC-04 there is **zero** need to touch `@zama-fhe/relayer-sdk`, assemble EIP-712, or manage keypairs manually. The only app-authored logic is the state machine, address validation, error-string mapping, and UI.

## Common Pitfalls

### Pitfall 1: Wrong hook names (3.0.0 vs docs/CLAUDE.md)
**What goes wrong:** `import { useGrantPermit, useHasPermit, useDecryptValues } from "@zama-fhe/react-sdk"` — a TypeScript/build error; these symbols don't exist in 3.0.0.
**Why it happens:** CLAUDE.md's Feature→Hook map and current docs.zama.org both describe a later 3.x API. The installed package is pinned exact 3.0.0 (Phase 1 decision).
**How to avoid:** Use the 3.0.0 names — `useAllow`, `useIsAllowed`, `useConfidentialBalance`, `useConfidentialBalances`, `useIsConfidential`, `useReadonlyToken`, `useUserDecrypt`. All verified in the on-disk export list.
**Warning signs:** `Module '"@zama-fhe/react-sdk"' has no exported member 'useGrantPermit'`.

### Pitfall 2: Silent hang on a no-ACL-access token (DEC-04)
**What goes wrong:** Pasting an arbitrary ERC-7984 the wallet has no ACL grant for spins forever.
**Why it happens:** The relayer rejects the decrypt (no ACL), but the UI never leaves `decrypting`.
**How to avoid:** Await the balance query settle; on error set `stage = "error"` and classify via `instanceof DecryptionFailedError` / `RelayerRequestFailedError` (and `matchAclRevert` for on-chain reverts) → render `✕ NO DECRYPTION ACCESS`. Also short-circuit `ZERO_HANDLE` to `0` before the relayer. ACL for cTokenMocks is granted to the holder by the token's business logic (mint/transfer), so registry tokens the wallet holds decrypt fine; arbitrary tokens may not.
**Warning signs:** `isFetching` stuck true; relayer HTTP 500/403.

### Pitfall 3: Cross-origin isolation / relayer fetch under `require-corp`
**What goes wrong:** Decrypt silently fails on the live URL though it works locally.
**Why it happens:** The FHE WASM worker requires `crossOriginIsolated === true` (SharedArrayBuffer). Cross-origin subresources need CORP; the relayer fetch needs CORS.
**How to avoid:** `require-corp` + `same-origin` opener policy are already set (Phase 1, `next.config.ts`) and `crossOriginIsolated === true` is proven. The relayer call is a CORS `fetch` (not a CORP-governed subresource), so it works — but **verify a real decrypt on the deployed Vercel URL early**, not just localhost. Isolation failures are silent until you decrypt.
**Warning signs:** `crossOriginIsolated === false` in console; WASM worker init errors; relayer CORS errors.

### Pitfall 4: Signer readiness / `WagmiSigner` alpha caveat
**What goes wrong:** First decrypt after connect throws because the signer/relayer isn't ready.
**Why it happens:** The provider comment notes `WagmiSigner` is a local shim pending a patched `@zama-fhe/react-sdk/wagmi` (fix in ≥3.0.0-alpha.16). `RelayerWeb` is rebuilt on chain change and terminated on unmount.
**How to avoid:** Gate all decrypt UI behind `isConnected && chainId === 11155111` (ChainGuard). Don't fire `useAllow`/`useConfidentialBalance` before the wallet is connected. Treat the first signature prompt as expected UX.
**Warning signs:** "no signer" / "signer not connected" errors on cold load.

### Pitfall 5: Formatting the cleartext with the wrong decimals
**What goes wrong:** Revealed balance is off by orders of magnitude.
**Why it happens:** `useConfidentialBalance` returns a raw `bigint` (base units). ERC-7984 cTokens have their own `decimals` (often not 18).
**How to avoid:** Format with the confidential token's decimals — `formatUnits(value, pair.confidential.decimals)` for registry tokens (Phase 2 already resolves this), or read `useReadonlyToken(addr).decimals()` / `useMetadata(addr)` for pasted tokens. Never hardcode 18. (Mirrors the WRP-02 "never hardcode 18 decimals" rule.)
**Warning signs:** Decrypted value has too many/few zeros vs. the wrapped amount.

## Runtime State Inventory

> Not a rename/refactor/migration phase — this is greenfield feature work. Inventory included only to note pre-existing runtime state this phase depends on.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `IndexedDBStorage("KeypairStore")` + `IndexedDBStorage("SignatureStore")` persist the FHE keypair and EIP-712 session across reloads (wired Phase 1 in `DappWrapperWithProviders`). | None — reuse as-is. The permit-cache behavior (DEC-03) depends on these already existing. |
| Live service config | Zama relayer/gateway (`https://relayer.testnet.zama.org/v2`) built into `SepoliaConfig`; external, not in git. | None — no config change; verify reachability on the live URL. |
| OS-registered state | None. | None — verified: no OS-level registrations. |
| Secrets/env vars | None required for decryption. No relayer API key; public Sepolia RPC. `.env.example` has no relayer/decrypt vars. | None — verified: no new env vars. |
| Build artifacts | None new — packages already installed at exact 3.0.0. | None — verified: no install/build-artifact change. |

## Code Examples

### Error taxonomy → UI-SPEC reason strings (lib/decryptErrors.ts)
```typescript
// Source: verified against @zama-fhe/sdk 3.0.0 error classes (activity-DBMyE78S.d.ts)
import {
  ZamaError, SigningRejectedError, DecryptionFailedError, NoCiphertextError,
  RelayerRequestFailedError, ConfigurationError, matchAclRevert,
} from "@zama-fhe/react-sdk";

export function toDecryptError(e: unknown): { chip: string; body: string; recoverable: boolean } {
  if (e instanceof SigningRejectedError)
    return { chip: "", body: "Signature declined.", recoverable: true }; // returns to idle
  // no-ACL-access (DEC-04): relayer rejects a handle the wallet can't view
  const acl = matchAclRevert(e);
  if (acl || e instanceof DecryptionFailedError || e instanceof RelayerRequestFailedError)
    return {
      chip: "NO DECRYPTION ACCESS",
      body: "This token hasn't granted your address a viewing key — some confidential tokens are undecryptable by design.",
      recoverable: true,
    };
  if (e instanceof NoCiphertextError) // never shielded -> effectively zero
    return { chip: "DECRYPTED BALANCE", body: "0", recoverable: false };
  if (e instanceof ConfigurationError)
    return { chip: "DECRYPTION FAILED", body: "Unsupported network or configuration.", recoverable: false };
  if (e instanceof ZamaError)
    return { chip: "DECRYPTION FAILED", body: "The FHE gateway didn't respond.", recoverable: true };
  return { chip: "DECRYPTION FAILED", body: "Unexpected error.", recoverable: true };
}
```

### Zero-handle short-circuit
```typescript
// Source: verified against @zama-fhe/sdk 3.0.0 (ZERO_HANDLE, isZeroHandle)
import { isZeroHandle } from "@zama-fhe/react-sdk";
// with useReadonlyToken for the raw handle path:
const handle = await token.confidentialBalanceOf(account);
if (isZeroHandle(handle)) return 0n; // valid zero balance — no relayer round-trip
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fhevmjs` browser lib, manual `userDecrypt` + hand-built EIP-712 | `@zama-fhe/react-sdk` declarative hooks (`useConfidentialBalance`, `useAllow`) | SDK 3.x | No manual EIP-712/keypair/relayer plumbing. |
| `useGrantPermit` / `useHasPermit` / `useDecryptValues` (later 3.x + docs.zama.org) | **`useAllow` / `useIsAllowed` / `useConfidentialBalance`** (installed 3.0.0) | renamed after 3.0.0 | **Must use the 3.0.0 names** — the pinned version predates the rename. |
| Per-token decrypt authorization | Single non-token-specific EIP-712 permit over many contracts | 3.x | One signature enables the paste-an-address "any token" flow (DEC-02/03). |

**Deprecated/outdated (do NOT use in this phase):**
- `useGrantPermit`, `useHasPermit`, `useDecryptValues` — not exported by installed 3.0.0.
- `@zama-fhe/relayer-sdk` direct `userDecrypt` — unnecessary; the react hooks wrap it.
- `fhevmjs` — deprecated (CLAUDE.md "What NOT to Use").

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A no-ACL-access decrypt surfaces as `DecryptionFailedError` / `RelayerRequestFailedError` (vs. a distinct ACL error type) at the relayer for user-decryption. `matchAclRevert` primarily targets on-chain ACL *reverts*; the relayer path may return a generic decrypt failure. | Common Pitfalls / DEC-04 / decryptErrors.ts | Low — the error handler catches all `ZamaError` subclasses and renders the graceful "no access" state regardless of the exact subclass, so DEC-04 is satisfied either way. Confirm the concrete error class during implementation with a known no-ACL token. |
| A2 | The relayer `fetch` from `RelayerWeb` is CORS-governed (not CORP-blocked) and therefore works under `Cross-Origin-Embedder-Policy: require-corp`. | Common Pitfalls (Pitfall 3) | Medium — if the relayer response lacks the needed CORS/CORP headers under isolation, decrypt fails on the live URL. Mitigation: verify a real decrypt on the deployed Vercel URL early (already flagged as a phase-gate check). |
| A3 | Confidential cToken `decimals()` is readable and Phase 2's `pair.confidential.decimals` is correct for display formatting of the decrypted `bigint`. | Pitfall 5 | Low — Phase 2 already resolves confidential decimals via multicall; fallback is `useReadonlyToken(addr).decimals()`. |
| A4 | `useConfidentialBalance`'s `enabled: false → true` toggle is a clean way to implement explicit-trigger decryption without an auto-fetch on mount. | Pattern 1 | Low — standard react-query gating; if the hook refetches unexpectedly, fall back to `useReadonlyToken` + an imperative `balanceOf()` call inside `reveal()`. |

## Open Questions

1. **Exact error class for relayer no-ACL user-decryption**
   - What we know: `DecryptionFailedError`, `RelayerRequestFailedError`, `AclPausedError`, `NoCiphertextError`, `BalanceCheckUnavailableError` all exist; `matchAclRevert` maps on-chain ACL reverts.
   - What's unclear: which concrete class a *relayer-side* no-ACL user-decrypt rejection produces.
   - Recommendation: catch-all on `ZamaError` in `toDecryptError` (already does) → DEC-04 graceful state holds regardless. Confirm the exact class in a Wave-0 integration test against a token the test wallet can't view.

2. **Does `useConfidentialBalance` prompt for a signature itself, or only decrypt after `useAllow`?**
   - What we know: `ReadonlyToken.balanceOf` "acquires FHE credentials via a wallet signature if none are cached"; `useConfidentialBalance` calls `token.balanceOf`.
   - What's unclear: whether calling `useConfidentialBalance` with no cached permit triggers its own prompt (making an explicit `useAllow` redundant) — the state machine assumes we drive the signature via `useAllow` first for a clean `signing` stage.
   - Recommendation: drive the permit explicitly via `useAllow` in `reveal()` (gives the deterministic `signing` chip the UI-SPEC needs), then enable the balance query. If the balance hook double-prompts, gate it strictly on `hasPermit`.

3. **Relayer reachability + latency on the live Vercel URL**
   - What we know: endpoint is `relayer.testnet.zama.org/v2`; isolation is live.
   - What's unclear: real end-to-end decrypt latency and header behavior under `require-corp` on Vercel.
   - Recommendation: phase-gate — perform a real decrypt on the deployed URL (not localhost) before sign-off; present `decrypting` as a reassuring visible state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@zama-fhe/react-sdk` | all DEC hooks | ✓ | 3.0.0 (exact) | — |
| `@zama-fhe/sdk` | types + error classes | ✓ | 3.0.0 (exact) | — |
| `ZamaProvider` runtime (RelayerWeb + WagmiSigner + IndexedDB) | decrypt path | ✓ | wired Phase 1 (`DappWrapperWithProviders.tsx`) | — |
| Cross-origin isolation (`crossOriginIsolated`) | FHE WASM worker | ✓ | `require-corp` set Phase 1, proven true | — |
| Zama relayer/gateway (Sepolia) | actual decryption | ✓ (external) | `relayer.testnet.zama.org/v2` (in `SepoliaConfig`) | none — required; verify on live URL |
| Public Sepolia RPC | handle reads | ✓ | `ethereum-sepolia-rpc.publicnode.com` (in `SepoliaConfig`) + wagmi config | — |
| Phase 2 `useRegistryPairs` | quick-pick chips | ✓ | `packages/nextjs/hooks/useRegistryPairs.ts` | — |
| Phase 1 `ChainGuard` | Sepolia gate | ✓ | `packages/nextjs/components/ChainGuard.tsx` | — |

**Missing dependencies with no fallback:** none (relayer is external but expected; reachability is a verify-on-live-URL item, not a missing install).
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (+ `@vitest/coverage-v8`) |
| Config file | `packages/nextjs/vitest.config.ts` |
| Quick run command | `cd packages/nextjs && npx vitest run <file>` |
| Full suite command | `cd packages/nextjs && npm run test` (`vitest run`) |

Existing tests live beside source (Phase 2: `lib/filterPairs.test.ts`, `lib/mergePairs.test.ts`, `lib/regroupMeta.test.ts`, `lib/tokenSymbol.test.ts`) — pure-function unit tests. The Zama hooks require the provider + a live relayer + wallet, so hook-level decryption is **integration/manual-only** (not unit-testable in CI without mocking the SDK).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEC-01 | Decrypt connected wallet's registry cToken balance → correct cleartext | integration / manual (live relayer + wallet) | manual on live URL | ❌ manual |
| DEC-02 | Decrypt an out-of-registry pasted ERC-7984 | integration / manual | manual on live URL | ❌ manual |
| DEC-02 | Address validation: `isAddress` reject + ERC-165 non-confidential reject | unit (pure) | `npx vitest run lib/decryptValidate.test.ts` | ❌ Wave 0 |
| DEC-03 | Permit reuse: one signature covers repeated decrypts within window | integration / manual | manual on live URL | ❌ manual |
| DEC-04 | No-ACL token → graceful "no access", never a spinner | unit (error mapper) + manual | `npx vitest run lib/decryptErrors.test.ts` | ❌ Wave 0 |
| DEC-04 | Zero handle → renders `0` (not error) | unit (pure) | `npx vitest run lib/decryptErrors.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <changed .test.ts>` (the pure-logic tests: address validation, error mapping, decimals formatting).
- **Per wave merge:** `cd packages/nextjs && npm run test` (full suite).
- **Phase gate:** Full suite green + a **real decrypt on the deployed Vercel URL** (DEC-01/02/03/04 are relayer-dependent and cannot be proven by unit tests alone). `next build` clean.

### Wave 0 Gaps
- [ ] `lib/decryptValidate.ts` + `lib/decryptValidate.test.ts` — pure `isAddress`/`getAddress` normalization + confidential-check gating (covers DEC-02 input handling).
- [ ] `lib/decryptErrors.ts` + `lib/decryptErrors.test.ts` — `ZamaError` subclass → UI reason string mapping; zero-handle → `0` (covers DEC-04 without a live relayer, by constructing the error instances).
- [ ] `lib/formatConfidential.ts` + test — `formatUnits(bigint, decimals)` display helper (Pitfall 5).
- [ ] Manual UAT checklist for DEC-01/02/03/04 on the live URL (relayer-dependent behaviors).

*(Hook-level decrypt logic is not unit-tested — the SDK owns the relayer/EIP-712 path; wrapping it in a mock would test the mock, not the requirement. Cover the app-authored pure logic in units; cover the SDK integration via manual UAT on the live URL.)*

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No app accounts; wallet is the identity. EIP-712 signature via MetaMask. |
| V3 Session Management | yes | FHE session = the cached EIP-712 signature in `IndexedDBStorage("SignatureStore")` with `sessionTTL` (default 30d) + keypair `keypairTTL` (default 1d). SDK-managed; `useRevokeSession` clears it. Do not lower TTLs without cause. |
| V4 Access Control | yes | On-chain ACL governs who can decrypt a handle (DEC-04). Enforced by the relayer/gateway, not the app — the app only surfaces the "no access" result. |
| V5 Input Validation | yes | Pasted address validated with viem `isAddress`/`getAddress` + ERC-165 `useIsConfidential` before any relayer call. |
| V6 Cryptography | yes | All FHE crypto (keypair, re-encryption, EIP-712 assembly) is SDK/relayer-owned — **never hand-roll** (Don't Hand-Roll table). |
| V7 Error Handling & Logging | yes | Typed `ZamaError` mapping; no raw revert strings shown; no secret material logged. |

### Known Threat Patterns for a client-only FHE decrypt dApp
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/garbage pasted address → unexpected contract call | Tampering | `isAddress` + `getAddress` checksum + ERC-165 confidential check before decrypt; catch-all error state. |
| Phishing via a look-alike EIP-712 prompt | Spoofing | SDK builds the canonical `UserDecryptRequestVerification` typed data; the app never constructs arbitrary sign requests. Footer copy explains what the signature grants. |
| Decrypted cleartext leakage | Info Disclosure | Cleartext lives only in client memory/session ("Decrypted locally — never leaves your session"); nothing broadcast on-chain; no backend receives it. |
| Over-broad permit (authorizing more contracts than needed) | Elevation | `useAllow([tokenAddress])` scopes to the specific token(s) being decrypted; batch authorizes only the valid registry cTokens. Offer `useRevoke`/`useRevokeSession`. |
| Silent isolation/relayer failure exposing a hung state | DoS (UX) | Verify `crossOriginIsolated` on the live URL; time-bounded `decrypting` stage → error, never an infinite spinner (DEC-04). |

## Sources

### Primary (HIGH confidence)
- `node_modules/@zama-fhe/react-sdk/dist/index.d.ts` (installed **3.0.0**) — full hook export list + signatures: `useAllow`, `useIsAllowed`, `useConfidentialBalance`, `useConfidentialBalances`, `useIsConfidential`, `useReadonlyToken`, `useUserDecrypt`, `useRevoke`, `useRevokeSession`, `useEncrypt`, `useGenerateKeypair`, `useCreateEIP712`, `ZamaProvider` props (`keypairTTL`/`sessionTTL`). [VERIFIED]
- `node_modules/@zama-fhe/sdk/dist/esm/activity-DBMyE78S.d.ts` (installed **3.0.0**) — `ReadonlyToken` class (`balanceOf`/`confidentialBalanceOf`/`isConfidential`/`allow`/`isAllowed`), error classes (`DecryptionFailedError`, `SigningRejectedError`, `NoCiphertextError`, `AclPausedError`, `BalanceCheckUnavailableError`, `RelayerRequestFailedError`, `ConfigurationError`), `matchAclRevert`/`matchZamaError`, `ZERO_HANDLE`/`isZeroHandle`, `UserDecryptQueryConfig`/`DecryptResult`. [VERIFIED]
- `node_modules/@zama-fhe/sdk/dist/esm/relayer-utils-iSPis4x-.d.ts` — `SepoliaConfig` (relayerUrl `https://relayer.testnet.zama.org/v2`, aclContractAddress, registryAddress `0x2f07…128e`, chainId 11155111). [VERIFIED]
- `packages/nextjs/components/DappWrapperWithProviders.tsx` — provider wiring: `ZamaProvider` + `RelayerWeb(SepoliaConfig)` + `WagmiSigner` + `IndexedDBStorage(KeypairStore/SignatureStore)`. [VERIFIED]
- `packages/nextjs/package.json` — `@zama-fhe/sdk` + `@zama-fhe/react-sdk` pinned exact `3.0.0`. [VERIFIED]
- `packages/nextjs/hooks/useRegistryPairs.ts` + `registry/types.ts` — Phase 2 pair shape (`RegistryPair.confidential.{address,decimals}`) for quick-pick chips. [VERIFIED]

### Secondary (MEDIUM confidence)
- context7 `/websites/zama` — user-decryption conceptual flow, single non-token-specific permit semantics, EIP-712 gating. **Names differ from installed 3.0.0** (`useGrantPermit`/`useHasPermit`/`useDecryptValues` are the later API) — used only to confirm the *concept*, not the *names*. [CITED: docs.zama.org/protocol/sdk/api-references/react]

### Tertiary (LOW confidence)
- CLAUDE.md Feature→Hook map — treated as SUSPECT per the phase brief; its "3.2.0" hook names (`useGrantPermit`/`useHasPermit`/`useConfidentialBalance`) do not match installed 3.0.0 exports and were superseded by the on-disk verification.

## Metadata

**Confidence breakdown:**
- Standard stack (hook names/signatures): HIGH — read directly from installed 3.0.0 `.d.ts`.
- Architecture (provider wiring, tier map, data flow): HIGH — verified against the actual provider file + SDK types.
- Pitfalls: HIGH for the hook-name and decimals pitfalls (verified); MEDIUM for the exact no-ACL error class and relayer-under-isolation behavior (see Assumptions A1/A2, Open Questions 1/3 — resolve on the live URL).

**Research date:** 2026-07-07
**Valid until:** 2026-08-06 (30 days) — but tied to the **exact 3.0.0 pin**; if the SDK is ever unpinned/upgraded, re-verify hook names (they were renamed after 3.0.0).
