# Phase 4: Faucet + Wrap - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** MVP (discuss skipped via workflow.skip_discuss — floor-it directive; decisions below are orchestrator-set from ROADMAP + design + verified SDK)

<domain>
## Phase Boundary

A cold judge (zero balance) can (1) claim official cTokenMock underlying ERC-20 test tokens from the app, and (2) wrap an ERC-20 into its ERC-7984 confidential equivalent, with a preview that matches the onchain result — verified via the Phase-3 decrypt. This is the FIRST HALF of the headline wrap→decrypt→unwrap loop, made visible by Phase 3. Covers FCT-01, FCT-02, WRP-01, WRP-02. Uses the @zama-fhe SDK 3.0.0 wrap hooks (verified present on disk) + a faucet mechanism (SDK-external — to be verified in research).
</domain>

<decisions>
## Implementation Decisions

### A. Wrap (ERC-20 → ERC-7984)
- Use the VERIFIED installed 3.0.0 hooks (confirmed present in `node_modules/@zama-fhe/react-sdk/dist/index.d.ts`): `useApproveUnderlying` / `useConfidentialApprove` / `useConfidentialIsApproved` for the ERC-20 approval, and `useShield` for the wrap. Verify EXACT signatures + the approve→wrap orchestration against the .d.ts in research (do NOT assume from CLAUDE.md). `useIsWrapper` / `useWrappersRegistryAddress` available if needed.
- Flow: approve (ERC-20) → wrap (`useShield`) → confirmation. Show the design's 4-stage indicator (approve/wrap/confirming/done).
- The wrapped result MUST equal the previewed amount and be verifiable via the Phase-3 decrypt (`useConfidentialBalance`) — this is the correctness proof (WRP-01/02).

### B. Wrap preview (never hardcode 18)
- Read `rate()` + `decimals()` per pair ONCHAIN (both ERC-20 and ERC-7984 sides), compute the confidential-unit output, ROUND DOWN, and WARN when the entered amount is below one confidential unit (SC4). Never hardcode 18 decimals — reuse the Phase-2 metadata + `formatConfidential` decimals-safe helper.

### C. Faucet (claim underlying ERC-20)
- Claim the official cTokenMock's UNDERLYING ERC-20 test token from the app (FCT-01). The faucet MECHANISM is a known GAP (CLAUDE.md) — research must determine it: likely a public `mint`/`faucet`/`drip` function on the mock ERC-20 (or a separate faucet contract), verified via context7 / the mock ABI / a live Sepolia call.
- Handle FCT-02 edge cases with CLEAR messaging (no raw revert strings): cooldown / already-claimed, insufficient Sepolia ETH for gas, wrong network. (Full production error system is Phase 6; here cover these basics readably.)

### D. UI + gating
- Follow the Cellar Registry design's Wrap panel (4-stage indicator + preview) and Faucet screen (`.dc.html`). Attach wrap/faucet to the Phase-2 pair cards and/or a dedicated panel. Reuse Phase-2 `useRegistryPairs` + Phase-3 decrypt (`PairCardDecrypt`/`useUserDecrypt`) to SHOW the wrapped result.
- Wrap + faucet are WRITE flows → require wallet connection + Sepolia (reuse ChainGuard / the self-gate pattern). Registry browse stays ungated.

### Claude's Discretion
- Exact panel placement (per-card vs dedicated /wrap route), input UX, amount validation specifics, tx-status toast wording — follow the design + scaffold-eth/wagmi conventions.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (Phases 1-3)
- Phase 2: `useRegistryPairs`, `PairCard`, `tokenSymbol`/`iconFor`, `formatConfidential`, both-side metadata (decimals) — wrap preview + faucet attach here.
- Phase 3: `useUserDecrypt`, `useConfidentialBalance`, `PairCardDecrypt`, error taxonomy — to SHOW/verify the wrapped balance (the correctness proof).
- Provider wired (ZamaProvider + RelayerWeb(SepoliaConfig) + WagmiSigner); relayer testnet.zama.org/v2; crossOriginIsolated live. `ChainGuard` for write gating. wagmi/viem for the faucet/approve tx + rate()/decimals() reads.
- vitest 4.1.10 installed (55 tests). @zama-fhe pinned EXACT 3.0.0 — verify hook signatures on disk (`node_modules/@zama-fhe/react-sdk/dist/index.d.ts`); CLAUDE.md hook NAMES are only partly right for 3.0.0.

### Established Patterns
- Verified onchain addresses (7 cTokenMocks + registry) in CLAUDE.md. Public Sepolia RPC (no Alchemy). Cellar engraving theme. Anti-hallucination: verify Zama/registry/faucet specifics via context7 + on-disk types + live eth_call.

### Integration Points
- Wrap/faucet write flows mount under connection+Sepolia; wrapped result shown via Phase-3 decrypt.
</code_context>

<specifics>
## Specific Ideas
- The correctness proof (WRP-01/02): wrap N → decrypt shows N (matches preview). This ties Phase 4 to Phase 3.
- Faucet mechanism is the main research unknown (CLAUDE.md GAP).
- Confirmed on-disk 3.0.0 wrap hooks: useShield / useApproveUnderlying / useConfidentialApprove / useConfidentialIsApproved / useIsWrapper.
</specifics>

<deferred>
## Deferred Ideas
- Unwrap + async finalize (Phase 5 — useUnshield/useUnwrap/useFinalizeUnwrap). Full production error/status system (Phase 6). Animation/polish (Phase 7). Live-URL manual UAT deferred to the end-of-project session.
</deferred>
