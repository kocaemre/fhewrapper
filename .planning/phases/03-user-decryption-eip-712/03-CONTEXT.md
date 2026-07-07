# Phase 3: User-Decryption (EIP-712) - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart-discuss (autonomous), MVP

<domain>
## Phase Boundary

A connected wallet can decrypt its confidential (ERC-7984) balance via a correct EIP-712 user-decryption flow, and see the correct cleartext value — for registry cTokenMocks AND for any ERC-7984 token outside the registry via paste-an-address. This is built early because it is the ONLY way to *see* the result of wrap (Phase 4) and unwrap (Phase 5), so it exists to verify them. Correctness of the EIP-712 user-decryption is a top judging axis. Covers DEC-01..DEC-04. First phase to use the @zama-fhe SDK (pinned EXACT 3.0.0 — see the sdk-version-3-0-0 memory).
</domain>

<decisions>
## Implementation Decisions

### A. Decryption flow + EIP-712 permit
- Use a SINGLE EIP-712 permit that authorizes decryption for any FHE contract (per CLAUDE.md `useGrantPermit` / `useHasPermit`) — NOT a per-token permit. One signature enables the paste-an-address "any token" claim.
- Decryption is triggered by an EXPLICIT per-balance "Decrypt" action (blur→reveal on click), NOT auto-decrypt on load.
- **CRITICAL:** the exact @zama-fhe user-decryption API MUST be verified via context7 against the pinned **3.0.0** SDK (the CLAUDE.md Feature→Hook map lists 3.2.0 hook names — `useConfidentialBalance`/`useGrantPermit`/`useHasPermit`/`useConfidentialTokenAddress` — which may differ in 3.0.0). If the react-sdk 3.0.0 hooks differ, use the 3.0.0 equivalents (or drop to the relayer-sdk `userDecrypt`/EIP-712 flow the react-sdk wraps). Anti-hallucination rule applies — verify, don't assume.
- Batch "decrypt all" is OPTIONAL: include only if the 3.0.0 SDK exposes it cleanly (e.g. a batch-decrypt hook) — otherwise per-balance decrypt is the baseline.

### B. Paste-an-address (any ERC-7984)
- An address input: paste an ERC-7984 contract address → decrypt the CONNECTED wallet's balance for that token. Validate with viem `isAddress`/`getAddress`; handle non-ERC-7984 / bad address gracefully.
- Also decrypt balances for the connected wallet's REGISTRY cTokens (from Phase 2's pair list) — both entry points prove "any token".

### C. UI (blur→reveal — from the Cellar Registry design)
- Encrypted balance renders as a blurred / ciphertext-styled value; the Decrypt action reveals the cleartext (the design's "Decrypt (blur→reveal)" screen). Follow `.dc.html`.
- Surfaces: on the registry pair cards (decrypt the wallet's balance for that token, gated on connection) AND a dedicated paste-an-address decrypt panel.
- Wallet connection IS required for decryption (unlike the read-only browse) — decryption needs the user's wallet + EIP-712 signature. Use the existing ChainGuard/connect flow for this write-ish path (Sepolia).

### D. Error / edge states
- Permit signature rejected (user rejects EIP-712) → clear "authorize to decrypt" retry state.
- Decryption failure / relayer error → readable error + retry.
- Zero / no balance, non-ERC-7984 pasted address, wrong network → explicit states (full production-grade error UX is Phase 6; here cover the basics).

### Claude's Discretion
- Exact decrypt-button placement on the card, blur styling specifics, permit-status indicator, and whether balances refetch after decrypt — follow the design + SDK ergonomics.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phases 1-2)
- Phase 2 registry: `useRegistryPairs`, `PairCard`, `tokenSymbol`/`iconFor`, the pair list — decryption attaches to these (decrypt the wallet's balance per pair).
- `DappWrapperWithProviders` (client-only FHE provider — this is where the Zama/relayer instance lives; Phase 1 preserved it verbatim), `ChainGuard` (Sepolia gate — reuse for the decryption path), `Header`/connect flow, `AddressCopyButton`, toast.
- @zama-fhe/sdk + @zama-fhe/react-sdk pinned EXACT 3.0.0 (installed Phase 1). This phase FINALLY imports them — via the preserved provider's relayer instance / the react-sdk hooks.

### Established Patterns
- Cross-origin isolation (COOP/COEP) is live → the FHE WASM + SharedArrayBuffer work (Phase 1 proved crossOriginIsolated===true). Decryption relies on this.
- Public Sepolia RPC (no Alchemy). Cellar Registry engraving theme (parchment/cellar), Gelasio + JetBrains Mono.

### Integration Points
- The decrypt UI mounts inside the client-only provider tree (needs the relayer instance) + under connection/ChainGuard.
- Reuses Phase 2's pair data; adds a paste-an-address panel.
</code_context>

<specifics>
## Specific Ideas
- Design's "Decrypt (blur→reveal)" screen is the UI source of truth. Verified onchain cTokenMock addresses in CLAUDE.md.
- The whole point: this phase's decrypt is how Phases 4/5 (wrap/unwrap) results get *seen* and verified — build it to be reusable by those phases.
</specifics>

<deferred>
## Deferred Ideas
- Wrap (Phase 4), unwrap (Phase 5), faucet (Phase 4). Full production error/status system (Phase 6). Animation/polish (Phase 7).
</deferred>
