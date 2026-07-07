# Phase 2: Registry Browse - Research

**Researched:** 2026-07-07
**Domain:** Onchain contract reads (wagmi/viem multicall) + client-side data merge/render — NO FHE/WASM
**Confidence:** HIGH (registry ABI + pairs verified end-to-end via live Sepolia `eth_call`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. Data & Onchain Reads**
- Read the onchain registry via wagmi `useReadContracts` (batched multicall) — never hardcode the pair list.
- Verify the Wrappers Registry ABI (`listPairs` / `getConfidentialToken` / `isValid` and the pair struct) via **context7 MCP** before encoding a minimal ABI (project anti-hallucination rule — do NOT rely on training data for the registry ABI).
- Resolve token `symbol` / `name` / `decimals` for both the ERC-20 and ERC-7984 sides via multicall of the token contracts.
- Filter revoked pairs with `isValid`; show a valid/revoked badge on each card.
- Loading = skeleton cards; RPC failure = inline retry.

**B. Pair List UI (Cellar Registry design)**
- UI follows the "The Cellar Registry" design source of truth: `.planning/design/Confidential-Wrapper-Registry.dc.html` — registry-browser screen, parchment (light) + cellar (dark) themes, copperplate engraving aesthetic, Gelasio serif + JetBrains Mono. Theme CSS vars come from the .dc.html.
- Each pair card shows: symbol, name, decimals, BOTH-network addresses (copyable), and a valid/revoked badge.
- Client-side search (by symbol/name) + a valid/revoked filter toggle.
- **Real token icons: the 7 official cToken icons (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) generated via fal.ai in the engraving style, self-hosted in `packages/nextjs/public/` (COEP require-corp blocks cross-origin media). Icons land in `.planning/design/assets/icons/`; Phase 2 execute copies them into `public/`. NOT placeholders.**

**C. Hybrid Registry (onchain + local config)**
- `packages/nextjs/registry/pairs.config.ts` = a typed array of custom/dev-only pairs (erc20 + erc7984 addresses, optional metadata overrides).
- Merge onchain + local, deduped by confidential-token (ERC-7984) address; **onchain wins on conflict** (REG SC4).
- README documents the add-a-pair flow with a concrete example.

### Claude's Discretion
- Exact card grid columns/responsive breakpoints, skeleton design specifics, copy-to-clipboard affordance, address truncation format — follow the .dc.html design + scaffold-eth conventions.

### Deferred Ideas (OUT OF SCOPE)
- Decryption, wrap, unwrap, faucet — later phases (3/4/5). This phase is read-only registry browse, no FHE.
- The wrap cinematic + ambient audio + full animation — Phase 7.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | App reads the **onchain** Sepolia Wrappers Registry (`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`) as source of truth (never hardcoded pairs) | Verified live: `getTokenConfidentialTokenPairs()` returns 9 valid pairs. Minimal ABI in Code Examples. |
| REG-02 | Revoked pairs are filtered client-side via `isValid` | Pair struct field `isValid` (bool) — filter `pairs.filter(p => p.isValid)` for the list; keep revoked to render the `✕ Revoked` badge per design. |
| REG-03 | Token metadata (symbol, decimals, name) resolved from token contracts (multicall) — registry stores only addresses + isValid | Both ERC-20 and ERC-7984 sides expose `symbol()/name()/decimals()`. Verified: `USDCMock`/6 and `cUSDCMock`/"Confidential USDC (Mock)"/6. Multicall pattern in Code Examples. |
| REG-04 | All 7 official cTokenMocks (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) surface | All 7 CLAUDE.md confidential addresses present in the onchain 9-pair set (verified). 2 additional pairs also present — surface all onchain pairs, not just the 7. |
| REG-05 | Hybrid sourcing — local `registry/pairs.config.ts` overlays custom/dev pairs, deduped by confidential-token address (onchain wins) | Merge strategy in Architecture Patterns (Map keyed by lowercased ERC-7984 address, onchain written last). |
| REG-06 | Each pair card shows both-network addresses, symbol/name/decimals, valid/revoked status | Both sides resolvable via one multicall batch; card spec in UI-SPEC PairCard. |
| REG-07 | README documents the add-a-pair process with a concrete example | `pairs.config.ts` shape + example entry in Architecture Patterns; README task. |
</phase_requirements>

## Summary

Phase 2 is a **pure onchain-read + client-render** phase with **no new dependencies** — everything needed (`wagmi@^2.19.5`, `viem@^2.47.12`, `@tanstack/react-query@^5.96.2`) is already installed from Phase 1. The core work is: (1) a minimal, hand-written ABI for the `ConfidentialTokenWrappersRegistry` at `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`, (2) one registry read to enumerate pairs, (3) a batched multicall to resolve `symbol/name/decimals` for both sides of every pair, (4) a hybrid merge with a local `pairs.config.ts`, and (5) the Cellar Registry UI from the locked `.dc.html`.

The registry ABI and the live pair set were **verified end-to-end** in this session via a real Sepolia `eth_call` (viem), cross-checked against the Zama docs (context7) and the GitHub contract source. `getTokenConfidentialTokenPairs()` returns a `TokenWrapperPair[]` of `{ tokenAddress, confidentialTokenAddress, isValid }`. The chain currently holds **9 valid pairs** — the 7 documented cTokenMocks **plus 2 more** — so the UI must render *all* onchain pairs, not a hardcoded 7. Both the ERC-20 and the ERC-7984 wrapper expose standard ERC-20-style metadata (`symbol()`, `name()`, `decimals()`), so a single multicall batch resolves everything.

The single biggest execution gotcha: **onchain symbols do not match the design/icon keys.** The underlying symbol is `USDCMock` (not `USDC`) and the confidential symbol is `cUSDCMock` (not `cUSDC`). The design's icon map is keyed on clean symbols, so icon lookup and any symbol-based logic must **normalize** (strip a `Mock` suffix, strip a leading `c`, lowercase) — do not match raw onchain symbols. A second constraint: the public Sepolia RPC (no Alchemy key) rate-limits, so metadata **must** go through multicall (one RPC round-trip for all tokens), never N individual reads.

**Primary recommendation:** Build a `useRegistryPairs()` hook: `useReadContract(getTokenConfidentialTokenPairs)` → then one `useReadContracts` multicall of `{symbol,name,decimals}×2×N` → merge with `pairs.config.ts` (deduped by lowercased ERC-7984 address, onchain wins) → return typed `RegistryPair[]`. Render with the Cellar Registry components. No SDK, no FHE, no new packages.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Enumerate wrapper pairs | Database/Storage (onchain registry) | Browser/Client (read via wagmi) | The onchain registry IS the datastore; client only reads it. Never hardcode. |
| Resolve token metadata | Database/Storage (token contracts) | Browser/Client (multicall) | `symbol/name/decimals` live on each token contract; batch-read via Multicall3. |
| Hybrid merge (onchain + local config) | Browser/Client | — | Pure client-side dedup/merge of onchain array + static config array. |
| Search / filter / valid-revoked toggle | Browser/Client | — | Client-side over the already-fetched pair set (no re-query). |
| Copy address, card render, skeleton/error UI | Browser/Client | — | Presentation only; `navigator.clipboard` + React. |
| RPC transport | CDN/Static (public RPC endpoint) | — | Public Sepolia RPC via viem `http()` fallback (no Alchemy key). |

**No Frontend-Server (SSR) or API/Backend tier work.** All reads are client-side inside the existing Phase-1 client-only provider tree. There is no server route, no indexer, no database (out of scope per REQUIREMENTS).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `wagmi` | `^2.19.5` (installed) | `useReadContract` (single registry call) + `useReadContracts` (multicall metadata) + `useChainId`/`useAccount` | Already wired in the template; the canonical React-onchain-read layer. `useReadContracts` auto-batches via Multicall3. [VERIFIED: package.json + wagmi docs] |
| `viem` | `^2.47.12` (installed) | Types (`Address`, `Abi`), address utils (`getAddress`, `isAddress`), the RPC transport under wagmi | wagmi peer; provides checksum/validation for `pairs.config.ts` inputs. [VERIFIED: package.json] |
| `@tanstack/react-query` | `^5.96.2` (installed) | Async cache/retry/loading state powering every wagmi read | Required wagmi peer; gives the loading→skeleton and error→retry states for free. [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `daisyUI` | `5.0.9` (installed) | Component primitives on Tailwind 4 | Only lightly — the UI is hand-built to the engraving spec via CSS vars, not default daisyUI look. [VERIFIED: package.json] |
| `zustand` | `~5.0.0` (installed) | Local UI state (search string, active filter) if not using plain `useState` | Optional — `useState` in the toolbar is sufficient for search/filter this phase. [VERIFIED: package.json] |
| `react-hot-toast` | `~2.4.0` (installed) | Copy-success toast ("Copied … address copied to clipboard.") | The design's copy-success toast. Already a template dep. [VERIFIED: package.json] |
| `usehooks-ts` | `~3.1.0` (installed) | `useCopyToClipboard`, `useDebounceValue` (search) | Optional convenience for clipboard + debounced search. [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written minimal registry ABI + wagmi | `@zama-fhe/react-sdk` `useTokenPairsRegistry()` / `useListPairs({metadata:true})` | The SDK hook does exactly this (returns pairs + optional metadata), BUT: (a) CONTEXT locks "no SDK dependency this phase / no FHE", (b) the SDK is pinned EXACT 3.0.0 and pulls the FHE/WASM init path we deliberately keep out of this phase, (c) the anti-hallucination rule wants an explicit verified ABI. Use wagmi. Keep the SDK hook names as a documented cross-check only. |
| `useReadContracts` (wagmi multicall) | N× individual `useReadContract` | N individual reads hammer the keyless public RPC and hit rate limits (Pitfall 1). Multicall = one round-trip. |
| Read `getTokenConfidentialTokenPairs()` (all at once) | `getTokenConfidentialTokenPairsLength()` + `…Slice(from,to)` pagination | With 9 pairs, one read is simplest. Keep slice pagination in the ABI as a documented fallback if the registry ever grows large. |

**Installation:** None. All packages already in `packages/nextjs/package.json` from Phase 1. This phase adds source files only (`registry/`, `hooks/`, `components/registry/`) + copies icon PNGs into `public/`.

**Version verification:** Confirmed against `packages/nextjs/package.json` (installed lockfile state), not the npm registry — no new installs occur, so registry-version drift is irrelevant here. wagmi `^2.19.5`, viem `^2.47.12`, react-query `^5.96.2` are the Phase-1 baseline. [VERIFIED: package.json 2026-07-07]

## Package Legitimacy Audit

**No new external packages are installed in this phase.** It uses only packages already vetted and installed in Phase 1 (`wagmi`, `viem`, `@tanstack/react-query`, `daisyui`, `zustand`, `react-hot-toast`, `usehooks-ts`). The Package Legitimacy Gate is therefore N/A.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
  Sepolia chain     │  ConfidentialTokenWrappersRegistry           │
  (source of truth) │  0x2f0750Bbb0A246059d80e94c454586a7F27a128e  │
                    │  getTokenConfidentialTokenPairs() → Pair[]    │
                    └───────────────────┬─────────────────────────┘
                                        │ (1) useReadContract  [1 RPC call]
                                        ▼
                          TokenWrapperPair[] {tokenAddress, confidentialTokenAddress, isValid}
                                        │
                                        │ build multicall list: for each pair →
                                        │   erc20.symbol/name/decimals + c.symbol/name/decimals
                                        ▼
   Sepolia token     ┌─────────────────────────────────────────────┐
   contracts ────────│  useReadContracts (Multicall3)  [1 RPC call] │
   (per token)       │  6 calls × N pairs, one batch                │
                     └───────────────────┬─────────────────────────┘
                                         ▼
                            Enriched onchain pairs (addr + metadata + isValid)
                                         │
   registry/pairs.config.ts ────────────┤ (2) MERGE — dedup by lowercased
   (local dev/custom pairs)             │     ERC-7984 address; onchain wins
                                         ▼
                              RegistryPair[]  (typed, deduped)
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              client search/       normalize symbol      icon lookup
              filter (symbol,      (strip Mock, strip     (/icons/{key}.png
              name, addresses)     leading c, lower)       → fallback monogram)
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         ▼
                          Cellar Registry UI (PairGrid → PairCard)
                          states: skeleton (loading) · error+retry (RPC fail) · empty
```

### Recommended Project Structure
```
packages/nextjs/
├── registry/
│   ├── pairs.config.ts       # typed local overlay pairs (REG-05) + LocalPair type
│   ├── registryAbi.ts        # minimal verified ConfidentialTokenWrappersRegistry ABI
│   ├── erc20MetadataAbi.ts   # symbol/name/decimals fragment (both sides use it)
│   └── addresses.ts          # REGISTRY_ADDRESS per chainId (Sepolia)
├── hooks/
│   └── useRegistryPairs.ts   # orchestrates read → multicall → merge → typed RegistryPair[]
├── lib/
│   └── tokenSymbol.ts        # normalizeSymbol() + iconFor() + truncateAddress()
├── components/registry/      # RegistryHero, RegistryToolbar, PairGrid, PairCard,
│                             # AddressCopyButton, PairBadge, TokenIcon, PairCardSkeleton,
│                             # RegistryEmpty, RegistryError  (per UI-SPEC inventory)
└── public/icons/             # cusdc.png … cxaut.png + 01-hero.png (self-hosted, COEP)
```

### Pattern 1: Two-phase read (enumerate → enrich via multicall)
**What:** First read the registry array; then batch-read metadata for every token address in one multicall.
**When to use:** Any "list of onchain entities each needing per-entity metadata" — the canonical registry-browse shape.
**Example:**
```typescript
// Source: verified live against Sepolia 2026-07-07; wagmi useReadContracts docs
// Step 1 — enumerate (1 RPC call)
const { data: pairs } = useReadContract({
  address: REGISTRY_ADDRESS,
  abi: registryAbi,
  functionName: "getTokenConfidentialTokenPairs",
  chainId: sepolia.id,
});

// Step 2 — build a flat multicall list (6 reads per pair) and batch (1 RPC call)
const contracts = (pairs ?? []).flatMap((p) => [
  { address: p.tokenAddress,             abi: erc20MetadataAbi, functionName: "symbol"   },
  { address: p.tokenAddress,             abi: erc20MetadataAbi, functionName: "name"     },
  { address: p.tokenAddress,             abi: erc20MetadataAbi, functionName: "decimals" },
  { address: p.confidentialTokenAddress, abi: erc20MetadataAbi, functionName: "symbol"   },
  { address: p.confidentialTokenAddress, abi: erc20MetadataAbi, functionName: "name"     },
  { address: p.confidentialTokenAddress, abi: erc20MetadataAbi, functionName: "decimals" },
]);
const { data: meta } = useReadContracts({ contracts, allowFailure: true, query: { enabled: !!pairs } });
// meta is a flat array of {status,result}; regroup in chunks of 6 back onto each pair.
```

### Pattern 2: Hybrid merge (onchain wins), keyed by ERC-7984 address
**What:** Overlay `pairs.config.ts` under the onchain set, deduped by the confidential address.
**When to use:** REG-05.
**Example:**
```typescript
// Source: derived from CONTEXT decision C
const byConf = new Map<string, RegistryPair>();
for (const local of localPairs)  byConf.set(local.confidentialTokenAddress.toLowerCase(), local);   // write local first
for (const chain of onchainPairs) byConf.set(chain.confidentialTokenAddress.toLowerCase(), chain);   // onchain overwrites → wins
const merged = [...byConf.values()];
```

### Pattern 3: Symbol normalization for icon + display
**What:** Map noisy onchain symbols to clean icon keys.
**When to use:** Icon lookup and any symbol-based matching (verified: onchain gives `USDCMock`/`cUSDCMock`).
**Example:**
```typescript
// Source: derived from live onchain symbols verified 2026-07-07
// underlying "USDCMock" → "usdc"; confidential "cUSDCMock" → "usdc"
export const iconKey = (sym: string) =>
  sym.replace(/Mock$/i, "").replace(/^c/, "").toLowerCase(); // "USDCMock"→"usdc", "cUSDCMock"→"usdc"
export const iconFor = (confidentialSymbol: string) => {
  const key = iconKey(confidentialSymbol);           // e.g. "usdc"
  return `/icons/c${key}.png`;                        // maps to /icons/cusdc.png (design filenames)
};
// If the file is absent → render the monogram fallback tile (UI-SPEC), never a broken <img>.
```

### Anti-Patterns to Avoid
- **Hardcoding the 7 pairs:** Violates REG-01 (SC1 says "never hardcoded"). The chain has 9; always render whatever the registry returns.
- **N individual metadata reads:** Rate-limits the keyless public RPC. Always one `useReadContracts` batch.
- **Matching raw onchain symbols (`USDC`, `cUSDC`) for icons:** They are `USDCMock`/`cUSDCMock` onchain — always normalize.
- **Rendering token `name`/`symbol` via `dangerouslySetInnerHTML`:** Onchain metadata is attacker-controllable for arbitrary tokens; rely on React's default escaping.
- **Filtering revoked pairs out of the dataset entirely:** Keep them so the `✕ Revoked` badge + `opacity:0.6` card render (REG-06/UI-SPEC); the ALL/VALID/REVOKED filter needs them.
- **Using `@zama-fhe/*` SDK here:** Pulls the FHE/WASM path CONTEXT explicitly excludes this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Batching N token reads into 1 RPC call | A custom Multicall3 encoder / `Promise.all` of eth_calls | wagmi `useReadContracts` (auto Multicall3) | wagmi handles aggregate3, per-call failure, decoding, react-query caching. |
| Loading / error / retry state machine | Custom `useState` fetch orchestration | react-query (via wagmi) `isLoading`/`isError`/`refetch` | Powers skeleton (loading), RegistryError (`refetch` = Retry), and caching for free. |
| Address checksum / validation of `pairs.config.ts` inputs | Regex address checks | viem `isAddress` / `getAddress` | Correct EIP-55 checksum + validation; catches typos in the local config. |
| Copy-to-clipboard + toast | Manual `document.execCommand` | `navigator.clipboard.writeText` + `react-hot-toast` (installed) | Modern async clipboard; toast already a dep. |
| Registry ABI | Guessing function names from training data | The **verified** ABI in Code Examples (docs + GitHub + live call) | Anti-hallucination rule; guessed selectors silently return `0x` and break. |

**Key insight:** This phase is deceptively "just reads" — the only genuinely hard part (efficient batched onchain reads with correct failure handling) is exactly what wagmi/react-query already solve. The custom code should be thin: an ABI, a merge, a normalize, and presentation.

## Common Pitfalls

### Pitfall 1: Keyless public Sepolia RPC rate-limits under many reads
**What goes wrong:** With no Alchemy key (scaffold falls back to viem public `http()`), firing one read per token (6×9 = 54 calls) trips rate limits → intermittent `RegistryError`.
**Why it happens:** Public RPC endpoints throttle aggressively; `pollingInterval` is 30s but initial burst matters.
**How to avoid:** One `useReadContracts` multicall (Multicall3 aggregates all 54 into a single `eth_call`). Consider `batch: { multicall: true }` on the transport and a sane `staleTime`.
**Warning signs:** Sporadic failures that vanish on Retry; works on Alchemy but flaky on the deployed URL.

### Pitfall 2: Onchain symbols ≠ design/icon symbols
**What goes wrong:** Icon lookup by `USDC` fails because the onchain symbol is `USDCMock` (`cUSDCMock` on the confidential side); cards show broken images or wrong icons.
**Why it happens:** The registry lists *Mock* tokens; the design/CLAUDE.md use clean names.
**How to avoid:** `normalizeSymbol()` (strip `Mock`, strip leading `c`, lowercase) → map to `/icons/c{key}.png`; monogram fallback when no file. [VERIFIED live: `USDCMock`, `cUSDCMock`]
**Warning signs:** Only some/no icons render; `<img>` 404s in the network tab.

### Pitfall 3: The registry has 9 pairs, not 7
**What goes wrong:** Code that assumes exactly the 7 CLAUDE.md cTokens drops 2 real onchain pairs, or worse, hardcodes 7.
**Why it happens:** CLAUDE.md documents 7 known mocks; the live registry currently returns 9 (7 + 2). [VERIFIED live 2026-07-07]
**How to avoid:** Render the full onchain array. Treat the "7" as a *minimum must-appear* set (REG-04), not the total.
**Warning signs:** Pair count shows `07` when the hero binds to `pairs.length` = 9.

### Pitfall 4: `decimals` returns `uint8`, not a JS number by default
**What goes wrong:** Passing the raw decoded value into formatting without care, or confusing confidential decimals with underlying decimals.
**Why it happens:** `decimals()` is `uint8`; viem decodes to `number` — fine — but the confidential wrapper's decimals **can differ** from the underlying (`wrapper.decimals()` is set at deploy). For USDC both are 6 (verified), but do not assume equality; display each side's own decimals (REG-06).
**How to avoid:** Store `underlying.decimals` and `confidential.decimals` separately on `RegistryPair`.
**Warning signs:** Wrong decimals shown for a pair whose two sides differ (matters more in Phase 4 wrap-rate; correctness starts here).

### Pitfall 5: `allowFailure` + partial metadata
**What goes wrong:** One token's `name()` reverts (non-standard token in local config), and a non-`allowFailure` multicall throws the whole batch → entire grid errors.
**Why it happens:** Some ERC-20s omit `name`/`symbol` or return `bytes32`.
**How to avoid:** `useReadContracts({ allowFailure: true })`; per-call `status === 'success'` guard; fall back to a truncated address for missing symbol/name.
**Warning signs:** Whole registry errors when one custom `pairs.config.ts` entry is odd.

## Code Examples

### Verified minimal registry ABI (hand-written, anti-hallucination compliant)
```typescript
// Source: Zama docs (context7 /websites/zama, wrapper-registry.md) + GitHub
//   zama-ai/protocol-apps ConfidentialTokenWrappersRegistry.sol + LIVE Sepolia eth_call 2026-07-07.
// All three sources agree on names & signatures. HIGH confidence.
export const registryAbi = [
  {
    type: "function", name: "getTokenConfidentialTokenPairs", stateMutability: "view",
    inputs: [],
    outputs: [{ type: "tuple[]", components: [
      { name: "tokenAddress", type: "address" },
      { name: "confidentialTokenAddress", type: "address" },
      { name: "isValid", type: "bool" },
    ]}],
  },
  { type: "function", name: "getTokenConfidentialTokenPairsLength", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getTokenConfidentialTokenPairsSlice", stateMutability: "view",
    inputs: [{ name: "fromIndex", type: "uint256" }, { name: "toIndex", type: "uint256" }],
    outputs: [{ type: "tuple[]", components: [
      { name: "tokenAddress", type: "address" },
      { name: "confidentialTokenAddress", type: "address" },
      { name: "isValid", type: "bool" },
    ]}] },
  { type: "function", name: "getConfidentialTokenAddress", stateMutability: "view",
    inputs: [{ name: "tokenAddress", type: "address" }],
    outputs: [{ type: "bool" }, { type: "address" }] },
  { type: "function", name: "isConfidentialTokenValid", stateMutability: "view",
    inputs: [{ name: "confidentialTokenAddress", type: "address" }],
    outputs: [{ type: "bool" }] },
] as const;

export const REGISTRY_ADDRESS = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e" as const; // Sepolia
```

### ERC-20 / ERC-7984 metadata ABI fragment (both sides)
```typescript
// Source: verified live — both underlying & confidential expose these.
export const erc20MetadataAbi = [
  { type: "function", name: "symbol",   stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name",     stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8"  }] },
] as const;
```

### Local overlay config shape (REG-05 / REG-07)
```typescript
// registry/pairs.config.ts — documented add-a-pair mechanism
export type LocalPair = {
  tokenAddress: `0x${string}`;             // underlying ERC-20
  confidentialTokenAddress: `0x${string}`; // ERC-7984 wrapper (dedup key)
  isValid?: boolean;                        // default true
  // optional metadata overrides if a token lacks readable symbol/name/decimals
  overrides?: { underlying?: Partial<TokenMeta>; confidential?: Partial<TokenMeta> };
};
export const localPairs: LocalPair[] = [
  // Example (README): add a custom dev pair — onchain entries with the same
  // confidentialTokenAddress take precedence.
  // { tokenAddress: "0x…", confidentialTokenAddress: "0x…" },
];
```

### Live-verified pair set (Sepolia, 2026-07-07) — for test fixtures / sanity
```
9 valid pairs. confidentialTokenAddress → tokenAddress:
0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 → 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF  (cUSDCMock / USDCMock, 6 dp)  [cUSDC]
0x4E7B06D78965594eB5EF5414c357ca21E1554491 → 0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0  [cUSDT]
0x46208622DA27d91db4f0393733C8BA082ed83158 → 0xff54739b16576FA5402F211D0b938469Ab9A5f3F  [cWETH]
0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891 → 0xFf021fB13cA64e5354c62c954b949a88cfDEb25E  [cBRON]
0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB → 0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57  [cZAMA]
0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC → 0x93c931278A2aad1916783F952f94276eA5111442  [ctGBP]
0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7 → 0x24377AE4AA0C45ecEe71225007f17c5D423dd940  [cXAUt]
0x167DC962808B32CFFFc7e14B5018c0bE06A3A208 → 0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3  [extra #8]
0x13F7d34A4f0102734F19E3Ff16e068Fe194B28c4 → 0x6AB54988261AEC573a2CA13cF802d3B1114f864C  [extra #9]
```
All 7 CLAUDE.md confidential addresses are present. **Note:** the ERC-20 (`tokenAddress`) counterparts were NOT in CLAUDE.md — they come from the registry read (as designed). CLAUDE.md's "cUSDC address" `0x7c5BF43B…` is the ERC-7984 side; its ERC-20 pair is `0x9b5Cd13b…`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fhevmjs` / manual relayer plumbing to read pairs | Onchain `ConfidentialTokenWrappersRegistry` read (SDK or plain wagmi) | SDK 3.x | This phase reads it directly with wagmi — no SDK needed. |
| Hardcoded token lists | Onchain registry as source of truth + `isValid` revocation | current | REG-01/REG-02 mandate this. |

**Deprecated/outdated:**
- Do not use `@zama-fhe/relayer-sdk` or `fhevmjs` for registry reads — unnecessary and pulls FHE init.
- The design's mock `PAIRS` array (fake addresses `0x1c7D…`, symbols `USDC`/`cUSDC`, `hue`, `pubBal`/`confBal`) is **UI scaffolding only** — replace entirely with live onchain data. Real onchain symbols are `*Mock`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 2 extra onchain pairs (#8, #9) are legitimate registry entries safe to render | Live pair set | Low — they're valid onchain; if a judge questions them, they're genuinely registry-listed. Rendering all pairs is what REG-01 demands. |
| A2 | Confidential-wrapper `decimals()` may differ from underlying for non-USDC pairs | Pitfall 4 | Low for browse (display only); matters in Phase 4. Verified equal (6) only for USDC. Read both independently to be safe. |
| A3 | Icon files in `.planning/design/assets/icons/` map cleanly via normalized key to `/icons/c{key}.png` | Pattern 3 | Medium — filenames are `cusdc.png…cxaut.png`; the 2 extra pairs have no icon → monogram fallback (already specified). Verify each of the 7 filenames matches its normalized symbol during execute. |
| A4 | `react-query refetch()` is the right Retry mechanism for RegistryError | Don't Hand-Roll | Low — standard wagmi/react-query pattern. |

**Note:** The registry ABI, pair struct, live pair set, and both-side metadata readability are **NOT assumptions** — they were verified end-to-end via live `eth_call`.

## Open Questions

1. **Should the 2 extra onchain pairs (#8, #9) be shown or filtered to just the 7 branded cTokens?**
   - What we know: The registry returns 9 valid pairs; REG-01 says onchain is source of truth and "never hardcoded"; REG-04 says the 7 must appear (minimum).
   - What's unclear: Whether the design intends a curated 7 or the full registry.
   - Recommendation: **Show all 9** (render whatever the registry returns) — this is the literal REG-01 requirement and strongest for judging Coverage. The 7 are guaranteed present; extras with no icon get the monogram fallback.

2. **Icon filename ↔ symbol exactness for all 7.**
   - What we know: Files are `cusdc/cusdt/cweth/cbron/czama/ctgbp/cxaut.png`; normalized keys derive from onchain symbols.
   - What's unclear: Whether every onchain confidential symbol normalizes exactly to its filename (e.g. `ctGBPMock` → `tgbp`? `cXAUtMock` → `xaut`?). Case handling of `tGBP`/`XAUt`.
   - Recommendation: During execute, log each pair's normalized key vs available files; adjust `normalizeSymbol` (or add an explicit address→icon override map) so all 7 resolve. The monogram fallback prevents broken images regardless.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Sepolia public RPC | REG-01/03 onchain reads | ✓ | `ethereum-sepolia-rpc.publicnode.com` responded live | Alchemy key (not provisioned); other public endpoints |
| Multicall3 on Sepolia | Batched metadata | ✓ | Standard `0xcA11…11` (viem default) | Per-call reads (rate-limit risk) |
| node/npm | Build | ✓ | node v22.21.1 | — |
| Registry contract | All | ✓ (live, 9 pairs) | `0x2f0750…128e` | none — hard dependency, verified live |

**Missing dependencies with no fallback:** none — the registry and RPC are live and verified.
**Missing dependencies with fallback:** Alchemy key absent → viem public `http()` fallback (already configured in `scaffold.config.ts`); mitigate rate limits via multicall.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None installed** (no vitest/jest/*.test.* present) — Wave 0 gap |
| Config file | none — see Wave 0 |
| Quick run command | `npm run check-types` (tsc) + `npm run lint` (available now) |
| Full suite command | `npx vitest run` (after Wave 0 install) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-01 | Registry read returns pairs from `0x2f07…128e` | integration (live RPC) | `npx vitest run registry/registryRead.test.ts` | ❌ Wave 0 |
| REG-02 | Revoked filtered via `isValid` | unit | `npx vitest run lib/mergePairs.test.ts -t "revoked"` | ❌ Wave 0 |
| REG-03 | Metadata multicall regroups 6-per-pair correctly | unit | `npx vitest run lib/regroupMeta.test.ts` | ❌ Wave 0 |
| REG-04 | All 7 cToken addresses present in output | integration | `npx vitest run registry/registryRead.test.ts -t "7 cTokens"` | ❌ Wave 0 |
| REG-05 | Merge dedup by ERC-7984 addr, onchain wins | unit | `npx vitest run lib/mergePairs.test.ts` | ❌ Wave 0 |
| REG-06 | Card shows both addresses + metadata + badge | manual/visual | live URL visual check | manual |
| REG-07 | README add-a-pair example present | manual | doc review | manual |
| — | `normalizeSymbol`/`iconKey` maps `USDCMock`→`usdc` | unit | `npx vitest run lib/tokenSymbol.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run check-types && npm run lint` (fast; available immediately)
- **Per wave merge:** `npx vitest run` (pure-function units: merge, regroup, normalize)
- **Phase gate:** Full unit suite green + live-URL visual check of the grid/skeleton/error states before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Framework install: `npm i -D vitest @vitest/coverage-v8` (no test runner exists) — pin versions; run legitimacy check before install
- [ ] `lib/mergePairs.test.ts` — covers REG-02, REG-05 (dedup/onchain-wins/revoked)
- [ ] `lib/tokenSymbol.test.ts` — covers icon-key normalization (`USDCMock`→`usdc`, `cUSDCMock`→`usdc`)
- [ ] `lib/regroupMeta.test.ts` — covers REG-03 (chunk-of-6 regroup + `allowFailure` partial handling)
- [ ] `registry/registryRead.test.ts` — integration read vs live Sepolia (REG-01/04); may be network-gated/skippable in CI

*Pure functions (merge, normalize, regroup) are the high-value automated targets; onchain reads and the visual UI are integration/manual.*

## Security Domain

> `security_enforcement: true`, ASVS L1. This phase: read-only onchain data + client render + clipboard. No auth, no writes, no user-supplied server input.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Wallet connect owned by Phase 1; no new auth. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | no | Read-only public registry; no privileged actions. |
| V5 Input Validation | yes | Validate/checksum addresses in `pairs.config.ts` via viem `isAddress`/`getAddress`. Treat onchain `name`/`symbol` strings as untrusted display data. |
| V6 Cryptography | no | No crypto here (FHE is Phase 3). |
| V14 Config | yes | Registry address is a hardcoded constant per chainId — not user-supplied; keep it in one `addresses.ts`. |

### Known Threat Patterns for wagmi/viem client reads

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious token `name`/`symbol` containing markup (arbitrary tokens, esp. via local config) | Tampering/Injection | React default escaping; **never** `dangerouslySetInnerHTML` for token metadata; truncate/clamp display length. |
| Homograph / spoofed symbol impersonating a real token | Spoofing | Onchain source-of-truth registry (official); show full copyable address so users verify identity, not just symbol. |
| RPC endpoint returns manipulated data (untrusted public RPC) | Tampering | Low impact (read-only display); acceptable for testnet browse. Multicall via canonical Multicall3. |
| Clipboard hijack expectations | — | `navigator.clipboard.writeText` writes only the exact address string; no read-back. |
| Bad address in `pairs.config.ts` → runtime crash | DoS (self) | viem `isAddress` guard + `allowFailure` multicall; skip invalid local entries with a console warning. |

**No high/critical threats** for a read-only testnet registry browser. The one real control worth enforcing: treat onchain metadata strings as untrusted and rely on React escaping (no raw HTML injection).

## Sources

### Primary (HIGH confidence)
- **Live Sepolia `eth_call`** (viem, this session 2026-07-07) — `getTokenConfidentialTokenPairs()` returned 9 valid pairs; multicall of `symbol/name/decimals` on both sides succeeded (`USDCMock`/6, `cUSDCMock`/"Confidential USDC (Mock)"/6). End-to-end verification of ABI + pair set + metadata readability.
- **GitHub** `zama-ai/protocol-apps` → `ConfidentialTokenWrappersRegistry.sol` (WebFetch) — exact Solidity function signatures + `TokenWrapperPair` struct.
- **Zama docs** (context7 `/websites/zama`) — `wrapper-registry.md`, `useTokenPairsRegistry`, `useConfidentialTokenAddress`, `useIsConfidentialTokenValid`, `useTokenPairsLength`, registry contract-builders, `token.md` (name/symbol/decimals), `confidential-wrapper.md` (`wrapper.decimals()` fixed at deploy). Cross-checks the ABI and confirms both sides expose metadata.
- `packages/nextjs/package.json` — installed versions (wagmi ^2.19.5, viem ^2.47.12, react-query ^5.96.2, react-hot-toast, usehooks-ts, zustand).

### Secondary (MEDIUM confidence)
- context7 provider tier for docs-only claims classified MEDIUM by the seam (function *names* were independently corroborated by GitHub source + live call → promoted to HIGH for the ABI).

### Tertiary (LOW confidence)
- WebFetch of docs page for the Solidity interface (LOW by seam) — but corroborated by two other sources, so not relied on alone.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed; verified in package.json.
- Registry ABI + pairs: HIGH — verified via live `eth_call` + GitHub source + docs (three independent sources agree).
- Metadata readability (both sides): HIGH — live multicall succeeded on both ERC-20 and ERC-7984.
- Icon/symbol normalization exactness: MEDIUM — onchain `*Mock` symbols verified for USDC; per-token filename match to confirm during execute.
- Pitfalls: HIGH — Pitfalls 1–5 grounded in verified facts (keyless RPC, `*Mock` symbols, 9-vs-7 count).

**Research date:** 2026-07-07
**Valid until:** 2026-08-06 (30 days) — onchain data is stable; re-verify pair count before submission in case the registry adds pairs.
