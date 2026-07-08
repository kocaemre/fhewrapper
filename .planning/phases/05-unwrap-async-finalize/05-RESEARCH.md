# Phase 5: Unwrap (async finalize) - Research

**Researched:** 2026-07-08
**Domain:** FHEVM confidential-token unwrap (ERC-7984 → ERC-20) with a two-step, oracle-decrypted, app-submitted finalize; honest pending→finalized UX
**Confidence:** HIGH (all hook/param/event/contract signatures verified against the EXACT installed `@zama-fhe/react-sdk` + `@zama-fhe/sdk` **3.0.0** type declarations on disk)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. Unwrap flow (verified 3.0.0 hooks)**
- Use the installed 3.0.0 hooks confirmed on-disk: `useUnwrap` / `useUnwrapAll`, `useUnshield` / `useUnshieldAll`, `useFinalizeUnwrap`, `useResumeUnshield`. RESEARCH must determine the EXACT two-step orchestration + signatures against `node_modules/@zama-fhe/react-sdk/dist/index.d.ts` (repo ROOT), and resolve the CLAUDE.md GAP: **is `finalizeUnwrap` oracle-driven (auto, the app just polls) or app-driven (the user/app must call finalize after the decryption oracle resolves)?** The hooks (`useFinalizeUnwrap`, `useResumeUnshield`, `onUnwrapSubmitted`/`onFinalizing`/`onFinalizeSubmitted` callbacks per CLAUDE.md) suggest an app-orchestrated finalize — confirm.
- ACL/allowance: unwrap must grant the wrapper the correct ACL / operator allowance (via the `inputProof` variant or an operator approval) so it does NOT revert (SC3). Verify the exact mechanism.

**B. Honest async modeling (the correctness/UX heart — UNW-02)**
- The UI shows an EXPLICIT pending → finalizing → finalized progression. "Success" (the done state) must NOT appear at the unwrap-submit step — only after `finalizeUnwrap` completes / the underlying ERC-20 `Transfer` is observed (watch the ERC-20 balance increase, or the Transfer event / receipt). Model the wait honestly — a spinner/pending that resolves to real success, never optimistic.
- Reuse Phase-3 decrypt to SHOW the confidential balance decreasing and the underlying ERC-20 (Phase-2 metadata / wagmi useBalance) increasing — the honest end-state proof.

**C. Full loop (SC4)**
- The full wrap → decrypt → unwrap loop must complete end-to-end on the live URL for a token the judge just wrapped (Phase 4). Wire unwrap onto the same pair surfaces (PairCard / a /unwrap route) so the loop is continuous.

**D. UI + gating**
- Follow the Cellar Registry design's unwrap treatment (the design's Wrap/Unwrap panel 4-stage indicator + async pending-decryption). Functional-first; visual polish is Phase 7. Write flow → require connection + Sepolia (ChainGuard/self-gate). Reuse Phase 3 (decrypt), Phase 4 (wrap/preview patterns, the 4-stage indicator component).

### Claude's Discretion
- Exact unwrap surface (per-card vs /unwrap route), amount input (uses the decrypted balance), how the pending state is polled (event watch vs balance poll vs hook callback) — follow the design + the SDK's finalize model + wagmi conventions.

### Deferred Ideas (OUT OF SCOPE)
- Full production error/status system (Phase 6 — this phase covers unwrap's honest states; Phase 6 systematizes). Animation/polish + submission (Phase 7). Live-URL full-loop manual UAT deferred to the end-of-project session.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UNW-01 | User can unwrap an ERC-7984 back to its ERC-20 (encrypted input → unwrap) with correct wrapper ACL / allowance setup | Verified `useUnshield({ tokenAddress, wrapperAddress }).mutate({ amount })` single-call orchestration (or `useUnwrap`+`useFinalizeUnwrap` two-step). ACL is granted by the FHE **inputProof** the SDK builds inside `useUnwrap`/`useUnshield` (no separate operator approval for self-unwrap) — see "ACL / Allowance" below. |
| UNW-02 | The two-step async flow is modeled — explicit pending→finalized state; success shown only when the ERC-20 actually arrives (`finalizeUnwrap` completion) | Finalize is **app-submitted** (two on-chain txs). `UnshieldCallbacks` (`onUnwrapSubmitted`/`onFinalizing`/`onFinalizeSubmitted`) drive the honest stage machine; the `useUnshield` mutate promise resolves ONLY after the finalize tx receipt. Confirm via ERC-20 `balanceOf` refetch / `UnwrappedFinalized` event. |
</phase_requirements>

## Summary

Phase 5 closes the headline loop by unwrapping an ERC-7984 confidential token back to its underlying ERC-20. The installed **3.0.0** SDK models unwrap as an inherently **two-transaction, asynchronously-decrypted** flow, and the on-disk type declarations resolve the central CLAUDE.md GAP definitively:

**The finalize is APP-DRIVEN, not oracle-auto-release.** The flow is: (1) the app submits an **unwrap request** tx (`unwrap(...)` with an FHE-encrypted amount + inputProof) which burns/locks the confidential amount and asks the Zama decryption oracle/KMS to *publicly* decrypt the burn-amount handle; (2) once the oracle produces the cleartext + a decryption proof (fetched via the relayer's public-decryption endpoint), the app submits a **second `finalizeUnwrap(...)` tx** carrying `burntAmountCleartext` + `decryptionProof`, and *that* tx is what actually releases the ERC-20 to the receiver. The oracle decrypts in between but does **not** move the ERC-20 itself — the app must send the finalize tx. This is proven by `finalizeUnwrapContract(wrapper, burntAmount, burntAmountCleartext, decryptionProof)` requiring a proof + cleartext, by the `useUnwrap` JSDoc ("Call `useFinalizeUnwrap` after the request is processed on-chain"), and by the three progress callbacks `onUnwrapSubmitted` → `onFinalizing` → `onFinalizeSubmitted`.

**Primary recommendation:** Use **`useUnshield({ tokenAddress, wrapperAddress })`** (single-call orchestration: unwrap → wait receipt → parse event → public-decrypt → finalize) as the single-token unwrap hook, driving a 4-stage machine off its `UnshieldCallbacks`. Mark "success" ONLY when the mutate promise resolves (finalize receipt) and confirm with an ERC-20 `balanceOf` refetch — never on `onUnwrapSubmitted`. Persist the pending unwrap (`savePendingUnshield`) and offer `useResumeUnshield({ unwrapTxHash })` recovery for interrupted finalizes. Mirror Phase 4's `useWrap`/4-stage indicator shape; reuse Phase 3 decrypt to show the confidential balance drop and Phase 2 metadata + wagmi `useBalance` to show the ERC-20 arrive.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Unwrap request (encrypt amount, submit tx) | Browser / Client (SDK hook + wallet) | — | FHE encryption + inputProof built client-side; wallet signs. No backend. |
| Public decryption of burn handle | External service (Zama KMS/oracle via relayer) | Browser (fetches proof) | Decryption is off-chain in KMS; SDK/relayer fetches cleartext+proof for the client. |
| Finalize tx (submit proof, release ERC-20) | Browser / Client (SDK hook + wallet) | Onchain (wrapper contract) | App must submit the second tx; wrapper verifies the proof and transfers ERC-20. |
| Honest pending→finalized state machine | Browser / Client | — | Driven by hook callbacks + tx receipts; pure UI state (zustand/react-query). |
| DONE detection (ERC-20 arrived) | Browser / Client | Onchain reads (wagmi) | Confirmed via finalize receipt + `balanceOf` refetch / `UnwrappedFinalized` event watch. |
| Write gating (connection + Sepolia) | Browser / Client (ChainGuard) | — | Reuse existing Phase 1 ChainGuard. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@zama-fhe/react-sdk` | **3.0.0 (exact, installed)** | `useUnshield`/`useUnwrap`/`useFinalizeUnwrap`/`useResumeUnshield`/`useUnwrapAll`/`useUnshieldAll` + `useConfidentialBalance` | Every unwrap step maps to one installed hook. Verified on disk. [VERIFIED: node_modules/@zama-fhe/react-sdk/dist/index.d.ts] |
| `@zama-fhe/sdk` | **3.0.0 (exact, installed)** | Underlying param/event/contract types (`UnwrapParams`, `FinalizeUnwrapParams`, `UnshieldParams`, `ResumeUnshieldParams`, `UnwrapRequestedEvent`, `UnwrappedFinalizedEvent`), `savePendingUnshield`/`loadPendingUnshield`/`clearPendingUnshield` | The react-sdk hooks wrap these query-mutation options. [VERIFIED: node_modules/@zama-fhe/sdk/dist/esm/query/index.d.ts] |
| wagmi | ^2.19.5 (installed) | ERC-20 `balanceOf` / `useBalance` refetch + `Transfer` watch for honest DONE proof | Already wired (Phases 2/4). |
| viem | ^2.47.12 (installed) | Low-level reads/event decode | Already wired. |
| `@tanstack/react-query` | ^5 (installed) | The mutation/query cache under every Zama hook | Peer dep, already wired. |
| zustand | ~5.0.0 (installed) | Local unwrap stage state (mirror Phase 4 wrap machine) | Already used for wrap 4-stage. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Phase 3 `useUserDecrypt` / `useConfidentialBalance` | in-repo | Show confidential balance dropping; offer max-amount = decrypted balance | Amount input + honest end-state proof |
| Phase 4 `useWrap` / 4-stage indicator / `previewWrap` / `wrapErrors` | in-repo | The mirror shape for `useUnwrap` machine + preview + error map | Reuse component + patterns |
| Phase 2 `useRegistryPairs` / `PairCard` / metadata (`decimals`, `formatConfidential`) | in-repo | Pair surfaces + decimals-correct formatting | Wire unwrap onto same surfaces |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useUnshield` (single-call, amount) | `useUnwrap` + `useFinalizeUnwrap` (manual two-step) | Manual gives finer control over the gap between txs (e.g. show the oracle wait explicitly) but you must parse the `UnwrapRequested` event yourself to get `burnAmountHandle` and drive both mutations. Prefer `useUnshield` unless you need a hard pause between steps. |
| `useUnshield` (specific amount) | `useUnshieldAll` / `useUnwrapAll` (entire balance) | "Unwrap all" uses `unwrapFromBalanceContract(...encryptedBalance: Handle)` — **no plaintext amount and no inputProof needed** (operates on the balance handle directly). Great when the user has NOT decrypted. Use for a "Unwrap all" button; use `useUnshield` when the user picks a partial amount. |

**Installation:** No new packages. All hooks ship in the already-installed `@zama-fhe/react-sdk@3.0.0` / `@zama-fhe/sdk@3.0.0`. (Note: CLAUDE.md/ROADMAP reference 3.2.0, but **disk is 3.0.0** — the source of truth. All signatures below are from 3.0.0.)

## Package Legitimacy Audit

> Not applicable — Phase 5 installs **no new packages**. Every hook used is exported from the already-installed, already-audited `@zama-fhe/react-sdk@3.0.0` and `@zama-fhe/sdk@3.0.0` (verified present in `node_modules` with matching `package.json` version). No registry lookups required.

## Architecture Patterns

### System Architecture Diagram

```
User picks amount (≤ decrypted confidential balance from Phase 3)
        │  amount: bigint (plaintext)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1 — REQUESTING (client)                                │
│ useUnshield.mutate({ amount })                               │
│  ├─ SDK FHE-encrypts amount + builds inputProof (ACL grant)  │
│  └─ submits unwrap(encryptedErc20, from, to, enc, proof) tx  │
│         │  onUnwrapSubmitted(txHash)  ← DO NOT show success   │
└─────────┼───────────────────────────────────────────────────┘
          ▼  tx mined → emits UnwrapRequested{ receiver, encryptedAmount: Handle }
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2 — DECRYPTING / FINALIZING (oracle + client)          │
│  onFinalizing()  ← receipt parsed, burn handle extracted     │
│  Zama KMS/oracle publicly decrypts the burn handle           │
│  relayer returns { burntAmountCleartext, decryptionProof }   │
└─────────┼───────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3 — FINALIZE TX (client submits SECOND tx)             │
│  finalizeUnwrap(wrapper, handle, cleartext, proof)           │
│         │  onFinalizeSubmitted(txHash)                        │
└─────────┼───────────────────────────────────────────────────┘
          ▼  tx mined → emits UnwrappedFinalized{ receiver } + ERC-20 Transfer
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4 — FINALIZED (client) ← success shown ONLY here       │
│  mutate promise resolves (TransactionResult)                 │
│  confirm: ERC-20 balanceOf(receiver) increased (wagmi refetch)│
│  confirm: Phase-3 decrypt shows confidential balance dropped │
└─────────────────────────────────────────────────────────────┘
   On interruption between STAGE 1 and STAGE 4:
   savePendingUnshield(txHash) → later useResumeUnshield({ unwrapTxHash })
```

### Recommended Project Structure
```
features/unwrap/
├── use-unwrap.ts          # wrapper around useUnshield → exposes 4-stage machine (mirror Phase 4 useWrap)
├── unwrap-stages.ts       # 'idle'|'requesting'|'finalizing'|'finalized'|'error' + persisted pending state
├── unwrap-errors.ts       # map SDK errors → messages (mirror wrapErrors; Phase 6 systematizes)
├── UnwrapPanel.tsx        # amount input (max = decrypted balance) + 4-stage indicator (reuse Phase 4 component)
└── UnwrapStageIndicator   # reuse Phase 4 4-stage indicator component
app/unwrap/page.tsx        # /unwrap route under ChainGuard (OR wire into PairCard — Claude's discretion)
```

### Pattern 1: Single-call honest unwrap (RECOMMENDED)
**What:** One `useUnshield` mutation drives the whole two-tx flow; callbacks advance an honest stage machine; success is gated on promise resolution.
**When to use:** Default single-token unwrap.
```typescript
// Source: node_modules/@zama-fhe/react-sdk/dist/index.d.ts (useUnshield, lines 678-698)
//         + @zama-fhe/sdk query types (UnshieldParams, UnshieldCallbacks)
const unshield = useUnshield({ tokenAddress, wrapperAddress }); // both required

function onUnwrap(amount: bigint) {
  setStage('requesting');
  unshield.mutate(
    {
      amount, // plaintext bigint = decrypted balance (Phase 3) or user-entered ≤ that
      onUnwrapSubmitted: (txHash) => { savePendingUnshield(/* token */ txHash); /* stage stays 'requesting' — NOT success */ },
      onFinalizing:      ()      => setStage('finalizing'),   // oracle decrypting + about to send finalize tx
      onFinalizeSubmitted: (tx)  => {/* finalize tx in flight — still not success */},
    },
    {
      onSuccess: async () => {
        setStage('finalized');            // ← success ONLY here (finalize receipt resolved)
        clearPendingUnshield(/* token */);
        await refetchErc20Balance();      // wagmi balanceOf(receiver) — confirm ERC-20 arrived
        await refetchConfidentialBalance();// Phase 3 — confirm confidential balance dropped
      },
      onError: (e) => setStage('error'),  // pending state persisted for resume
    }
  );
}
```
> `UnshieldParams = { amount: bigint } & UnshieldCallbacks & { skipBalanceCheck?: boolean }`. `UnshieldCallbacks = { onUnwrapSubmitted?(txHash: Hex), onFinalizing?(), onFinalizeSubmitted?(txHash: Hex) }`. [VERIFIED: sdk query/index.d.ts + relayer-sdk.types]

### Pattern 2: Manual two-step (finer control over the oracle wait)
**What:** Split the two txs to show an explicit "waiting for decryption oracle" state between them.
**When to use:** If the design wants a distinct pending-decryption panel between request and finalize.
```typescript
// Source: node_modules/@zama-fhe/react-sdk/dist/index.d.ts (useUnwrap 634, useFinalizeUnwrap 676)
const unwrap = useUnwrap({ tokenAddress });          // UnwrapParams { amount: bigint }
const finalize = useFinalizeUnwrap({ tokenAddress }); // FinalizeUnwrapParams { burnAmountHandle: Address }

// 1) request
const result = await unwrap.mutateAsync({ amount });          // emits UnwrapRequested{ encryptedAmount: Handle }
// 2) extract the burn handle from the receipt (findUnwrapRequested(logs).encryptedAmount)
const burnAmountHandle = findUnwrapRequested(result.receipt.logs)!.encryptedAmount;
// 3) finalize — hook internally public-decrypts the handle + fetches the proof, then submits finalize tx
await finalize.mutateAsync({ burnAmountHandle });             // emits UnwrappedFinalized + releases ERC-20
```
> `useFinalizeUnwrap` only needs the **handle** — it fetches `burntAmountCleartext` + `decryptionProof` (public decryption via relayer) internally before submitting `finalizeUnwrapContract(wrapper, handle, cleartext, proof)`. [VERIFIED: sdk activity chunk, finalizeUnwrapContract @ 12851]

### Pattern 3: Unwrap-all without decrypting
**What:** Unwrap the entire confidential balance directly from the balance handle — no plaintext, no inputProof.
```typescript
// Source: index.d.ts useUnshieldAll (719) / useUnwrapAll (655); sdk unwrapFromBalanceContract (7716)
const unshieldAll = useUnshieldAll({ tokenAddress, wrapperAddress });
unshieldAll.mutate(); // UnshieldAllParams | void — same callbacks, same honest stages
```

### Pattern 4: Resume an interrupted finalize (honest recovery)
**What:** If the tab closed / finalize failed after the unwrap tx, recover using the saved unwrap tx hash.
```typescript
// Source: index.d.ts useResumeUnshield (740); sdk ResumeUnshieldParams { unwrapTxHash: Hex }
const resume = useResumeUnshield({ tokenAddress, wrapperAddress });
const pending = loadPendingUnshield(/* token */);         // persisted by savePendingUnshield
if (pending) resume.mutate({ unwrapTxHash: pending.unwrapTxHash }); // re-decrypts + finalizes
```

### Anti-Patterns to Avoid
- **Showing success on `onUnwrapSubmitted` (or after the first tx receipt):** The ERC-20 has NOT arrived yet — the burn is requested but not finalized. This is the exact UNW-02 failure. Success = finalize receipt + ERC-20 balance increase only.
- **Assuming an oracle auto-releases the ERC-20 (poll-and-done):** WRONG for 3.0.0. No ERC-20 moves until the app submits the finalize tx. A poller that only watches balance without ever calling finalize will hang forever.
- **Hardcoding 18 decimals for the amount:** The confidential side uses the token's own decimals; mirror Phase 4's `rate()`/`decimals()` handling. The `amount: bigint` is in confidential units.
- **Requiring a separate operator/`setOperator` approval for self-unwrap:** Not needed — the inputProof grants the ACL (see below). Adding an approval step is wasted UX and a wrong revert diagnosis.
- **Dropping the pending state on error:** Persist it (`savePendingUnshield`) so the honest flow can resume rather than silently losing a burned-but-unfinalized position.

## ACL / Allowance (SC3) — resolved

**Mechanism: the FHE `inputProof`, NOT an operator approval.** For a self-unwrap the caller burns their **own** confidential balance, so `unwrapContract(encryptedErc20, from, to, encryptedAmount, inputProof)` is called with `from = to = the connected wallet`. The `inputProof` accompanying the encrypted amount grants the wrapper transient ACL permission to operate on that ciphertext handle — this is built automatically inside `useUnwrap` / `useUnshield`. No `setOperator` / `approve` step is required and unwrap will not revert for lack of allowance. [VERIFIED: sdk `unwrapContract` signature @ activity chunk 6433]

- `useUnwrapAll` / `useUnshieldAll` use `unwrapFromBalanceContract(encryptedErc20, from, to, encryptedBalance: Handle)` — the wrapper already holds ACL on its own balance handle, so again **no approval and no inputProof**. [VERIFIED @ 7716]
- `setOperatorContract(tokenAddress, spender, timestamp?)` / `isOperatorContract(...)` exist ONLY for the delegated case where a *different* spender unwraps on the holder's behalf (`from !== caller`). **Not used in this phase.** [VERIFIED @ 5150 / 3866]

## Amount input (resolved)

`UnwrapParams { amount: bigint }` / `UnshieldParams { amount: bigint }` — a **plaintext bigint** in the token's confidential units. Source it from the **Phase 3 decrypted confidential balance** (offer "Max = decrypted balance", and validate `amount ≤ decrypted balance`). The hook FHE-encrypts it and builds the inputProof internally. If the user has not decrypted, offer **Unwrap All** (`useUnshieldAll`) which needs no plaintext amount. [VERIFIED: sdk query/index.d.ts UnwrapParams @ 314, UnshieldParams @ 295]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FHE-encrypt the unwrap amount + inputProof | Custom relayer encrypt/proof plumbing | `useUnwrap`/`useUnshield` (does it internally) | ACL correctness + proof format are error-prone; SDK owns it |
| Public-decrypt the burn handle + fetch proof | Manual relayer `publicDecrypt` + proof assembly | `useFinalizeUnwrap`/`useUnshield` | Proof + cleartext must match the finalize contract call exactly |
| Two-tx orchestration (request→wait→parse→finalize) | Hand-rolled receipt polling + event parsing | `useUnshield` single-call | Event parse (`UnwrapRequested.encryptedAmount`) + sequencing is fiddly |
| Interrupted-finalize recovery | Custom "resume" logic | `useResumeUnshield` + `save/load/clearPendingUnshield` | Burned-but-unfinalized funds otherwise stranded |
| Honest DONE detection | Optimistic success flag | mutate-promise resolution + wagmi `balanceOf` refetch / `UnwrappedFinalized` watch | The whole point of UNW-02 |

**Key insight:** The SDK already encodes the honest two-step model in its hook shape and callbacks — the phase's job is to *surface* it faithfully, not to re-implement the relayer/oracle plumbing.

## Common Pitfalls

### Pitfall 1: Optimistic success at unwrap-submit
**What goes wrong:** UI flips to "done" when the first tx is mined; ERC-20 never shown arriving, or arrives much later.
**Why it happens:** Treating the unwrap request as the whole operation; ignoring that finalize is a separate tx.
**How to avoid:** Gate success on the `useUnshield` promise resolution (finalize receipt) + an ERC-20 `balanceOf` refetch. Stages `requesting`→`finalizing` are explicitly NOT success.
**Warning signs:** Success appears in <5s; confidential balance and ERC-20 balance don't both change.

### Pitfall 2: Finalize latency on Sepolia (the async wait)
**What goes wrong:** A long, silent gap between the two txs while the KMS/oracle decrypts; users think it hung.
**Why it happens:** Public decryption of the burn handle is off-chain and takes seconds to (occasionally) a minute+.
**How to avoid:** Show an explicit "waiting for decryption" state on `onFinalizing`; keep a spinner + reassurance (Phase 6 will polish this — UX-03). Never a bare spinner with no state text.
**Warning signs:** No visible stage between request-mined and finalize-submitted.

### Pitfall 3: Interrupted finalize strands funds
**What goes wrong:** Tab closes / finalize tx fails after the unwrap burn; the confidential amount is gone but no ERC-20 released.
**Why it happens:** The two txs aren't atomic.
**How to avoid:** `savePendingUnshield` on `onUnwrapSubmitted`, detect on load, and offer `useResumeUnshield({ unwrapTxHash })`. `clearPendingUnshield` only on finalized.
**Warning signs:** A confidential balance that dropped with no matching ERC-20 increase and no pending record.

### Pitfall 4: Wrong decimals in the amount
**What goes wrong:** Amount off by 10^n; unwrap reverts or unwraps the wrong quantity.
**Why it happens:** Hardcoding 18 decimals instead of the token's own.
**How to avoid:** Mirror Phase 4's `rate()`/`decimals()` handling; the `amount: bigint` is in the confidential token's units. Reuse Phase 2 `formatConfidential`/metadata.
**Warning signs:** Preview vs decrypted balance mismatch.

### Pitfall 5: `wrapperAddress` omitted from `useUnshield` config
**What goes wrong:** unshield hooks need the wrapper address; missing it breaks orchestration.
**Why it happens:** `useUnwrap`/`useFinalizeUnwrap` examples show only `{ tokenAddress }`, but `useUnshield`/`useUnshieldAll`/`useResumeUnshield` require **both** `tokenAddress` and `wrapperAddress` (config comment: "Address of the wrapper contract (required for shield/unshield operations)").
**How to avoid:** Pass `{ tokenAddress, wrapperAddress }` from the registry pair. For unwrap, `tokenAddress` is the ERC-7984 confidential token (which is the wrapper). [VERIFIED: index.d.ts config @ 348]

## Code Examples

### Honest DONE confirmation via wagmi (never optimistic)
```typescript
// Source: wagmi v2 useReadContract; ERC-20 balanceOf. Confirms UNW-02 end state.
const { data: erc20Balance, refetch: refetchErc20Balance } = useReadContract({
  address: underlyingErc20Address, // from registry pair metadata (Phase 2)
  abi: erc20Abi, functionName: 'balanceOf', args: [account],
});
// Call refetchErc20Balance() inside useUnshield onSuccess; assert it increased.
```

### Minimal event ABI (for manual finalize / DONE watch)
```
event UnwrapRequested(address indexed receiver, bytes32 encryptedAmount);   // burn handle for finalize
event UnwrappedStarted(bool returnVal, uint256 requestId);                   // request accepted
event UnwrappedFinalized(address indexed receiver, bytes32 encryptedAmount); // ERC-20 released
// SDK decoders: decodeUnwrapRequested / decodeUnwrappedStarted / decodeUnwrappedFinalized / findUnwrapRequested
```
[VERIFIED: sdk activity chunk UnwrapRequestedEvent @ 22493, UnwrappedFinalizedEvent @ 22501, UnwrappedStartedEvent @ 22511]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `@zama-fhe/relayer-sdk` `userDecrypt`/manual unwrap | `@zama-fhe/react-sdk` `useUnshield`/`useFinalizeUnwrap` hooks | 3.x | Two-step orchestration + ACL + proof handled by hooks |
| Assume oracle auto-releases on unwrap | App submits a second `finalizeUnwrap` tx with the decryption proof | 3.0.0 (verified) | Honest pending→finalized required; poll-only will hang |

**Deprecated/outdated:**
- CLAUDE.md's "3.2.0" version reference: **disk is 3.0.0** — treat 3.0.0 signatures as authoritative for this phase.
- `fhevmjs` (0.6.2): deprecated; not used.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Finalize latency on Sepolia is "seconds to a minute+" | Pitfall 2 | Only affects copy/UX timing expectations, not correctness. Confirm empirically during live UAT. |
| A2 | `useFinalizeUnwrap` fetches `burntAmountCleartext` + `decryptionProof` internally from only the `burnAmountHandle` | Pattern 2 | If it needs the cleartext passed in, manual two-step needs a `usePublicDecrypt` call first. `useUnshield` (recommended path) is unaffected — it orchestrates internally. Verify if using the manual path. |
| A3 | For a partial `useUnshield` amount, the SDK encrypts to the token's decimals without extra config | Amount input | If a scaling arg is required, amount could be off by decimals — validate against a live partial unwrap. `useUnshieldAll` avoids this entirely. |

**All hook names, param shapes, event shapes, callback names, and contract-call signatures are `[VERIFIED]` against the installed 3.0.0 `.d.ts` files — not assumed.**

## Open Questions

1. **Exact Sepolia finalize latency + failure rate**
   - What we know: finalize is a second app-submitted tx after off-chain KMS decryption; `useResumeUnshield` exists precisely because it can be interrupted.
   - What's unclear: typical wait and how often finalize needs a resume on live Sepolia.
   - Recommendation: instrument the stages during the live full-loop UAT (deferred to end-of-project session); Phase 6 polishes the wait UX (UX-03).

2. **Manual finalize proof plumbing (only if NOT using `useUnshield`)**
   - What we know: `useFinalizeUnwrap` takes just `{ burnAmountHandle }`.
   - What's unclear: whether a separate public-decrypt call is needed in the manual path (see A2).
   - Recommendation: use `useUnshield` single-call (recommended) and this question is moot.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@zama-fhe/react-sdk` | all unwrap hooks | ✓ | 3.0.0 (on disk) | — |
| `@zama-fhe/sdk` | param/event/contract types + pending-unshield persistence | ✓ | 3.0.0 (on disk) | — |
| wagmi/viem | ERC-20 balance/Transfer honest DONE proof | ✓ | 2.19.5 / 2.47.12 | — |
| Zama relayer (testnet.zama.org/v2) | public decryption of burn handle | ✓ (wired Phase 1) | — | none — required for finalize |
| Sepolia RPC + funded wallet | submit unwrap + finalize txs | ✓ (MetaMask, public RPC) | — | — |
| `crossOriginIsolated` on live URL | FHE WASM for encrypt | ✓ (verified Phase 1) | — | none |

**Missing dependencies with no fallback:** None — all runtime dependencies are already wired from Phases 1-4.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 (installed; 75 tests passing) |
| Config file | existing vitest config (repo) |
| Quick run command | `npx vitest run features/unwrap` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UNW-01 | amount validation (≤ decrypted balance), stage machine transitions, `useUnshield` called with `{tokenAddress, wrapperAddress}` + `{amount}` | unit | `npx vitest run features/unwrap/use-unwrap.test.ts -t "requests"` | ❌ Wave 0 |
| UNW-02 | success NOT set on `onUnwrapSubmitted`/`onFinalizing`; success set only on resolve; error persists pending; resume path | unit | `npx vitest run features/unwrap/unwrap-stages.test.ts -t "honest"` | ❌ Wave 0 |
| UNW-01 | ACL: no operator-approval step invoked for self-unwrap (inputProof path) | unit | `npx vitest run features/unwrap/use-unwrap.test.ts -t "no operator"` | ❌ Wave 0 |
| SC4 (loop) | wrap→decrypt→unwrap end-to-end on live URL | manual (live UAT) | — (deferred to end-of-project session per CONTEXT) | manual-only |

### Sampling Rate
- **Per task commit:** `npx vitest run features/unwrap`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`; SC4 full-loop is manual live UAT (deferred).

### Wave 0 Gaps
- [ ] `features/unwrap/unwrap-stages.ts` + `unwrap-stages.test.ts` — honest stage machine (UNW-02), pending persistence
- [ ] `features/unwrap/use-unwrap.ts` + `use-unwrap.test.ts` — mock `useUnshield`; assert callback→stage mapping, amount validation, no-operator (UNW-01)
- [ ] Mock harness for `useUnshield`/`useResumeUnshield` (react-query mutation mock) — mirror Phase 4 `useWrap` test setup
- [ ] Reuse Phase 4 4-stage indicator test fixtures

## Security Domain

### Applicable ASVS Categories (Level 1)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Wallet-based; no app auth |
| V3 Session Management | no | Stateless client |
| V4 Access Control | yes | FHE ACL via inputProof (SDK-owned); onchain wrapper enforces burn-from-caller |
| V5 Input Validation | yes | Validate `amount` is a positive bigint ≤ decrypted confidential balance; reject NaN/negative; sanitize any pasted address (reuse Phase 3 validation) |
| V6 Cryptography | yes | FHE encryption + decryption proofs are SDK/KMS-owned — **never hand-roll**; use hooks only |

### Known Threat Patterns for FHEVM unwrap (client dApp)
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Optimistic success masks a failed/stranded finalize | Repudiation / Info | Gate success on finalize receipt + balance confirmation; persist + resume pending |
| Wrong-decimals amount → revert or wrong quantity | Tampering | Use token `decimals()`/`rate()`; amount in confidential units (mirror Phase 4) |
| Write on wrong network / disconnected | Elevation / DoS | Reuse Phase 1 ChainGuard — require connection + Sepolia before mutate |
| Reverting on missing ACL (misdiagnosed as needing approval) | DoS | inputProof grants ACL automatically; no operator step; surface real revert reason (Phase 6 UX-01) |
| Untrusted relayer/oracle proof | Tampering | Wrapper verifies the decryption proof onchain in `finalizeUnwrap`; app does not trust cleartext blindly |

## Sources

### Primary (HIGH confidence)
- `node_modules/@zama-fhe/react-sdk/dist/index.d.ts` (installed **3.0.0**) — `useUnwrap` (634), `useUnwrapAll` (655), `useFinalizeUnwrap` (676), `useUnshield` (698), `useUnshieldAll` (719), `useResumeUnshield` (740), config `wrapperAddress` (348). Authoritative installed contract.
- `node_modules/@zama-fhe/sdk/dist/esm/query/index.d.ts` (installed 3.0.0) — `UnwrapParams`{amount} (314), `FinalizeUnwrapParams`{burnAmountHandle} (324), `UnshieldParams`{amount} (295), `UnshieldAllParams` (302), `ResumeUnshieldParams`{unwrapTxHash} (307), `ShieldParams` (251).
- `node_modules/@zama-fhe/sdk/dist/esm/relayer-sdk.types-*.d.ts` — `UnshieldCallbacks` (356: onUnwrapSubmitted/onFinalizing/onFinalizeSubmitted), `UnshieldOptions` (393).
- `node_modules/@zama-fhe/sdk/dist/esm/activity-*.d.ts` — `unwrapContract` (6433, inputProof), `unwrapFromBalanceContract` (7716), `finalizeUnwrapContract` (12851, requires cleartext+proof), `setOperatorContract`/`isOperatorContract` (5150/3866), events `UnwrapRequestedEvent` (22493)/`UnwrappedFinalizedEvent` (22501)/`UnwrappedStartedEvent` (22511), decoders `decodeUnwrapRequested`/`findUnwrapRequested`.

### Secondary (MEDIUM confidence)
- CLAUDE.md Feature→SDK Hook Map + Phase 3/4 in-repo research (reuse patterns) — cross-checked; version note corrected 3.2.0→3.0.0 against disk.

### Tertiary (LOW confidence)
- None used. All claims grounded in on-disk installed types.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every hook/param/event/contract signature read from the installed 3.0.0 `.d.ts`.
- Architecture (two-step, app-driven finalize; inputProof ACL): HIGH — resolved definitively from `finalizeUnwrapContract` proof requirement + `useUnwrap` JSDoc + three progress callbacks.
- Pitfalls: HIGH for the model-level ones (optimistic success, resume, ACL, decimals); MEDIUM for exact Sepolia latency (empirical, A1).

**Project Constraints (from CLAUDE.md):** Sepolia only; correctness (EIP-712 + wrap/unwrap) is a top judging axis; use react-sdk hooks not raw relayer; anti-hallucination via on-disk types + context7 + live eth_call; do NOT jump SDK/wagmi/Next major versions; reuse the template's wagmi/viem path.

**Research date:** 2026-07-08
**Valid until:** while `@zama-fhe/*@3.0.0` stays installed (pin is exact) — re-verify only if the SDK version changes.
