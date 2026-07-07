# Phase 2: Registry Browse - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart-discuss (autonomous), MVP

<domain>
## Phase Boundary

Deliver a browsable list of every official ERC-20 ↔ ERC-7984 wrapper pair, sourced from the ONCHAIN Sepolia Wrappers Registry (`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`) as the source of truth, with real token metadata (symbol/name/decimals) resolved via multicall, revoked pairs filtered via `isValid`, and a hybrid local `registry/pairs.config.ts` merged on top (onchain wins on conflict). No FHE/WASM dependency this phase — this de-risks Coverage early and yields a visible product. Covers REG-01…REG-07.
</domain>

<decisions>
## Implementation Decisions

### A. Data & Onchain Reads
- Read the onchain registry via wagmi `useReadContracts` (batched multicall) — never hardcode the pair list.
- Verify the Wrappers Registry ABI (`listPairs` / `getConfidentialToken` / `isValid` and the pair struct) via **context7 MCP** before encoding a minimal ABI (project anti-hallucination rule — do NOT rely on training data for the registry ABI).
- Resolve token `symbol` / `name` / `decimals` for both the ERC-20 and ERC-7984 sides via multicall of the token contracts.
- Filter revoked pairs with `isValid`; show a valid/revoked badge on each card.
- Loading = skeleton cards; RPC failure = inline retry.

### B. Pair List UI (Cellar Registry design)
- UI follows the "The Cellar Registry" design source of truth: `.planning/design/Confidential-Wrapper-Registry.dc.html` — registry-browser screen, parchment (light) + cellar (dark) themes, copperplate engraving aesthetic, Gelasio serif + JetBrains Mono. Theme CSS vars come from the .dc.html.
- Each pair card shows: symbol, name, decimals, BOTH-network addresses (copyable), and a valid/revoked badge.
- Client-side search (by symbol/name) + a valid/revoked filter toggle.
- **Real token icons (user decision): the 7 official cToken icons (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) are being generated now via fal.ai in the engraving style and will be self-hosted in `packages/nextjs/public/` (COEP require-corp blocks cross-origin media). Icons land in `.planning/design/assets/icons/` — Phase 2 execute copies them into `public/`. NOT placeholders.**

### C. Hybrid Registry (onchain + local config)
- `packages/nextjs/registry/pairs.config.ts` = a typed array of custom/dev-only pairs (erc20 + erc7984 addresses, optional metadata overrides).
- Merge onchain + local, deduped by confidential-token (ERC-7984) address; **onchain wins on conflict** (REG SC4).
- README documents the add-a-pair flow with a concrete example.

### Claude's Discretion
- Exact card grid columns/responsive breakpoints, skeleton design specifics, copy-to-clipboard affordance, address truncation format — follow the .dc.html design + scaffold-eth conventions.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (packages/nextjs, from Phase 1)
- `components/Header.tsx`, `components/ChainGuard.tsx` (Sepolia gate), `components/DappWrapperWithProviders.tsx` (client-only provider — leave unchanged), `components/ThemeProvider.tsx`, `components/helper/` (RainbowKit connect button).
- wagmi/viem are wired (template scaffold-eth-2 base); use wagmi hooks for reads. No registry/multicall hook exists yet — build under `hooks/` and `registry/`.
- Public Sepolia RPC (no Alchemy key) — reads must tolerate public-RPC rate limits (batch via multicall).

### Established Patterns
- SDK pinned EXACT **3.0.0** (not 3.2.0) — see the sdk-version-3-0-0 memory. This phase has no FHE dependency, so it mainly touches wagmi/viem, not @zama-fhe.
- COOP/COEP headers active; all media self-hosted under `public/`.

### Integration Points
- New route/section for the registry list (home shell from Phase 1 becomes the registry browser, still under ChainGuard + the client-only provider tree).
</code_context>

<specifics>
## Specific Ideas
- Cellar Registry design (`.dc.html`) is the UI source of truth. Real token metadata replaces the design's mock PAIRS array.
- 7 real cToken icons generated via fal.ai (engraving style), self-hosted.
- Verified onchain addresses (registry + 7 cTokenMocks) are in `.claude/CLAUDE.md`.
</specifics>

<deferred>
## Deferred Ideas
- Decryption, wrap, unwrap, faucet — later phases (3/4/5). This phase is read-only registry browse, no FHE.
- The wrap cinematic + ambient audio + full animation — Phase 7.
</deferred>
