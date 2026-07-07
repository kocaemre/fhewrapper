# Phase 4: Faucet + Wrap - Research

**Researched:** 2026-07-07
**Domain:** Faucet (public `mint` on cTokenMock underlying ERC-20) + wrap ERC-20 → ERC-7984 via `@zama-fhe/react-sdk` **3.0.0** `useShield`, with an onchain-accurate `rate()`-based preview. Correctness proven via the Phase-3 decrypt.
**Confidence:** HIGH — faucet mechanism, `rate()` semantics, wrap-hook signatures, and decimals were all verified end-to-end via live Sepolia `eth_call` + the installed 3.0.0 `.d.ts` + context7 docs (three agreeing sources).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. Wrap (ERC-20 → ERC-7984)**
- Use the VERIFIED installed 3.0.0 hooks (confirmed present in `node_modules/@zama-fhe/react-sdk/dist/index.d.ts`): `useApproveUnderlying` / `useConfidentialApprove` / `useConfidentialIsApproved` for the ERC-20 approval, and `useShield` for the wrap. Verify EXACT signatures + the approve→wrap orchestration against the .d.ts in research (do NOT assume from CLAUDE.md). `useIsWrapper` / `useWrappersRegistryAddress` available if needed.
- Flow: approve (ERC-20) → wrap (`useShield`) → confirmation. Show the design's 4-stage indicator (approve/wrap/confirming/done).
- The wrapped result MUST equal the previewed amount and be verifiable via the Phase-3 decrypt (`useConfidentialBalance`) — this is the correctness proof (WRP-01/02).

**B. Wrap preview (never hardcode 18)**
- Read `rate()` + `decimals()` per pair ONCHAIN (both ERC-20 and ERC-7984 sides), compute the confidential-unit output, ROUND DOWN, and WARN when the entered amount is below one confidential unit (SC4). Never hardcode 18 decimals — reuse the Phase-2 metadata + `formatConfidential` decimals-safe helper.

**C. Faucet (claim underlying ERC-20)**
- Claim the official cTokenMock's UNDERLYING ERC-20 test token from the app (FCT-01). The faucet MECHANISM is a known GAP (CLAUDE.md) — research must determine it: likely a public `mint`/`faucet`/`drip` function on the mock ERC-20 (or a separate faucet contract), verified via context7 / the mock ABI / a live Sepolia call.
- Handle FCT-02 edge cases with CLEAR messaging (no raw revert strings): cooldown / already-claimed, insufficient Sepolia ETH for gas, wrong network. (Full production error system is Phase 6; here cover these basics readably.)

**D. UI + gating**
- Follow the Cellar Registry design's Wrap panel (4-stage indicator + preview) and Faucet screen (`.dc.html`). Attach wrap/faucet to the Phase-2 pair cards and/or a dedicated panel. Reuse Phase-2 `useRegistryPairs` + Phase-3 decrypt (`PairCardDecrypt`/`useUserDecrypt`) to SHOW the wrapped result.
- Wrap + faucet are WRITE flows → require wallet connection + Sepolia (reuse ChainGuard / the self-gate pattern). Registry browse stays ungated.

### Claude's Discretion
- Exact panel placement (per-card vs dedicated /wrap route), input UX, amount validation specifics, tx-status toast wording — follow the design + scaffold-eth/wagmi conventions.

### Deferred Ideas (OUT OF SCOPE)
- Unwrap + async finalize (Phase 5 — useUnshield/useUnwrap/useFinalizeUnwrap). Full production error/status system (Phase 6). Animation/polish (Phase 7). Live-URL manual UAT deferred to the end-of-project session.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FCT-01 | User can claim the official cTokenMock underlying ERC-20 test tokens from the app | **Verified live:** the underlying ERC-20 mock exposes a public `mint(address,uint256)` (selector `0x40c10f19`) with NO access control — a `call` simulated from a random EOA succeeds; no `owner()`/`hasRole`/`MINTER_ROLE`/`paused` in bytecode. context7 confirms "publicly accessible minting functions with a limit of 1,000,000 tokens per call." Faucet = `writeContract` `mint(userAddress, amount)` on `pair.underlying.address` via wagmi. |
| FCT-02 | Faucet handles cooldown, insufficient-ETH, and wrong-network cases gracefully | **No onchain cooldown exists** (minimal mock, no timestamp/lastClaim state) — so "cooldown/already-claimed" is not a revert to catch; treat as UX (allow re-mint; optionally cap). The real revert paths are: amount > 1,000,000-per-call cap → revert; insufficient Sepolia ETH for gas → wallet/tx error; wrong network → gate via ChainGuard before the write. Map each to readable copy (no raw revert). tGBP is a special case (restricted minting — see Pitfall 3). |
| WRP-01 | User can wrap a registry ERC-20 into its ERC-7984 equivalent (approve → wrap → confirmation) | `useShield({ tokenAddress, wrapperAddress })` (installed 3.0.0) **auto-handles the ERC-20 approval** (`approvalStrategy: "exact"` default). `shield.mutate({ amount, approvalStrategy, onApprovalSubmitted, onShieldSubmitted })` drives the 4-stage indicator via the two submit callbacks. Returns `{ txHash, receipt }`. |
| WRP-02 | Wrap reads `rate()` + `decimals()` per pair onchain and previews (rounds down; warns below one confidential unit) — never hardcodes 18 decimals | **Verified live:** `rate() = 10^(underlyingDecimals − wrapperDecimals)`; the Zama mock wrappers are ALWAYS 6-decimal, underlyings are 6 or 18. cUSDC `rate=1`; cWETH `rate=1_000_000_000_000` (1e12). Preview: `confRaw = floor(underlyingRaw / rate)`; warn when `underlyingRaw < rate` (rounds to 0). Read `rate()` via `rateContract()` (SDK helper) or a 1-line ABI; reuse Phase-2 `pair.underlying.decimals` / `pair.confidential.decimals` + `formatConfidentialAmount`. |
</phase_requirements>

## Summary

Phase 4 has two write flows on top of the fully-wired Phase 1–3 stack, and **both unknowns flagged in CLAUDE.md are now resolved with HIGH confidence.**

**Faucet (FCT-01/02):** there is no separate faucet contract and no `faucet()`/`drip()`/`claim()` function. The official cTokenMock **underlying ERC-20s** each expose a plain **public `mint(address,uint256)`** with no access control — verified by (a) a bytecode selector scan finding only `mint(address,uint256)` (`0x40c10f19`), (b) an `eth_call` simulation of `mint` from a random EOA succeeding, (c) absence of `owner()`/`hasRole`/`MINTER_ROLE`/`paused` selectors, and (d) context7 docs stating the mocks have "publicly accessible minting functions with a limit of 1,000,000 tokens per call." So the faucet is a one-line wagmi `writeContract` of `mint(connectedWallet, amount)` on `pair.underlying.address`. **There is no onchain cooldown** — FCT-02's "cooldown/already-claimed" case does not exist as a revert; the genuine failure modes are the per-call 1,000,000-token cap, insufficient Sepolia ETH for gas, and wrong network (gate before write). **tGBP is the one exception** — docs flag it as wrapping a real testnet token with *restricted* minting, so its faucet may revert; handle gracefully.

**Wrap (WRP-01):** `useShield` (installed 3.0.0) **already orchestrates ERC-20 approval + wrap in a single mutation** — the decision doc's "approve → wrap" is one hook call, not two. Its config is `{ tokenAddress, wrapperAddress }` (NOT the docs' `{ address }` — a version drift; on-disk 3.0.0 wins), and `mutate({ amount, approvalStrategy, onApprovalSubmitted, onShieldSubmitted })` returns `{ txHash, receipt }`. The two submit callbacks are exactly what the design's 4-stage indicator (approve → wrap → confirming → done) needs, so **you do NOT need to hand-orchestrate `useApproveUnderlying` + `useShield`.** `useUnderlyingAllowance` and `useConfidentialIsApproved` remain available to *pre-check* whether the approval stage will fire (so the indicator can skip it) but are optional.

**Wrap preview (WRP-02):** the ERC7984ERC20Wrapper conversion is `rate() = 10^(underlyingDecimals − wrapperDecimals)`; every Zama mock wrapper is 6-decimal. Wrapping `underlyingRaw` mints `floor(underlyingRaw / rate)` confidential base units and consumes `confRaw * rate` underlying (the remainder stays with the user). The below-one-unit warning fires when `underlyingRaw < rate`. This is why hardcoding 18 is fatal: cWETH's underlying is 18-dp but the wrapper is 6-dp with `rate = 1e12`.

**Correctness proof (WRP-01/02, the top judging axis):** after `shield` mines, read the wrapped balance with the Phase-3 `useConfidentialBalance({ tokenAddress: confidentialAddr })` → decrypt → it must equal the preview. `useShield` auto-invalidates the `confidentialBalance` cache on success, so a re-decrypt reflects the new balance (relayer finality is near-immediate on Sepolia; present `decrypting` as a visible state).

**Primary recommendation:** Build two thin hooks — `useFaucet(underlyingAddress)` (wagmi `useWriteContract` of `mint`) and `useWrap(pair)` (wraps `useShield` + a pure `previewWrap()` util reading `rate()`). Drive the 4-stage indicator off `onApprovalSubmitted`/`onShieldSubmitted` + `useWaitForTransactionReceipt`. Reuse Phase-2 `RegistryPair` metadata and `formatConfidentialAmount`, and Phase-3 `PairCardDecrypt`/`useUserDecrypt` to display the wrapped result. Gate both flows behind `ChainGuard`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Faucet mint (`mint(addr,amount)`) | Browser/Client (wallet write) | Database/Storage (ERC-20 contract) | A public onchain write; wagmi `useWriteContract` sends it, the mock ERC-20 mints. No backend. |
| Wrap orchestration (approve + wrap) | Browser/Client (SDK + wallet) | Database/Storage (wrapper contract) | `useShield` runs the ERC-20 approval then the wrap tx from the connected wallet. |
| `rate()` / decimals read for preview | Browser/Client (viem read) | Database/Storage (wrapper contract) | Pure onchain read; cache via react-query. Reuse Phase-2 decimals; add one `rate()` read per pair. |
| Preview math (floor division, warning) | Browser/Client | — | Pure function over `bigint` — unit-testable, no chain call. |
| Wrapped-result verification (decrypt) | Browser/Client (WASM worker) | External relayer | Reuses Phase-3 `useConfidentialBalance` (relayer + FHE worker). |
| Chain guard (Sepolia) + connection gate | Browser/Client | — | Reuse Phase-1 `ChainGuard`; both flows are writes. |

**Entirely client-tier.** No server/API tier — the app is client-only (per CLAUDE.md, custom backend/indexer is out of scope). External services: the Zama relayer (only for the verification decrypt) and the public Sepolia RPC.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@zama-fhe/react-sdk` | **3.0.0** (exact, installed) | `useShield` (approve+wrap in one mutation), `useConfidentialBalance` (verify), optional `useUnderlyingAllowance`/`useConfidentialIsApproved`/`useApproveUnderlying` | Every wrap requirement maps to a hook; `useShield` auto-handles approval. [VERIFIED: installed 3.0.0 `.d.ts` + context7] |
| `@zama-fhe/sdk` | **3.0.0** (exact, installed) | Error classes (`InsufficientERC20BalanceError`, `ApprovalFailedError`, `TransactionRevertedError`, `SigningRejectedError`), `rateContract()` read-config helper, `TransactionResult` type | Re-exported by react-sdk; typed error taxonomy for FCT-02/WRP-01 messaging. [VERIFIED: installed 3.0.0 `.d.ts`] |
| `wagmi` | `^2.19.5` (installed) | `useWriteContract` + `useWaitForTransactionReceipt` for the faucet `mint`; `useReadContract` for `rate()`; `useAccount`/`useChainId` gating | Canonical wallet-write layer; the faucet is a plain ERC-20 write outside the SDK. [VERIFIED: package.json] |
| `viem` | `^2.47.12` (installed) | `parseUnits`/`formatUnits` (amount ⇄ raw), `Address` types, minimal `mint`/`rate` ABIs | Decimals-safe conversion for both faucet amount and wrap preview. [VERIFIED: package.json] |
| `@tanstack/react-query` | `^5.96.2` (installed) | Cache/mutation state under every wagmi + Zama hook | Powers loading/stage state for free. [VERIFIED: package.json] |

### Supporting
| Symbol | From | Purpose | When to Use |
|--------|------|---------|-------------|
| `useApproveUnderlying(config)` | react-sdk 3.0.0 | Explicit ERC-20 approval of the wrapper (`mutate({})` = max, `mutate({ amount })` = exact); resets non-zero allowance first (USDT-safe) | **Only if** you split approval out of `useShield` for a manual 2-tx flow. Baseline uses `useShield`'s built-in approval instead. |
| `useUnderlyingAllowance({ tokenAddress, wrapperAddress })` | react-sdk 3.0.0 | Read the ERC-20 allowance the wrapper holds (`data: bigint`) | Pre-check whether the approve stage will fire, so the 4-stage indicator can render "already approved" and skip it (`approvalStrategy: "skip"`). Optional UX polish. |
| `useConfidentialIsApproved(config)` | react-sdk 3.0.0 | Operator-approval check on the **confidential** side (`data: boolean`) | NOT needed for wrap (that's an ERC-20 allowance concern). Belongs to the confidential-transfer/unwrap path. Included in CONTEXT decision A but is the wrong tool for the ERC-20 approve — use `useUnderlyingAllowance`. |
| `rateContract(address)` | sdk 3.0.0 (re-exported) | Returns a viem read-config `{ address, abi, functionName: "rate" }` | Feed to `useReadContract`/`readContract` to read `rate()` without hand-writing the ABI. |
| `formatConfidentialAmount(value, decimals)` | Phase-2 `lib/formatConfidential.ts` | `formatUnits` wrapper (never hardcodes 18) | Display the preview + the decrypted result. Reuse verbatim. |
| `useUserDecrypt` / `PairCardDecrypt` | Phase-3 | Decrypt + blur→reveal the wrapped balance | The WRP correctness proof — show wrap N → decrypt N. Reuse. |
| `useRegistryPairs` | Phase-2 | `RegistryPair[]` with both-side addresses + decimals | Source of the pair to wrap/faucet; attach panels to its cards. Reuse. |
| `ChainGuard` | Phase-1 | Sepolia + connection gate | Wrap/faucet mount under it. Reuse. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useShield` (approve+wrap in one mutation, callbacks drive stages) | Manual `useApproveUnderlying` → then `useShield({ ..., approvalStrategy: "skip" })` | Two wallet prompts + hand-rolled sequencing you'd have to keep correct (non-zero-allowance reset, USDT quirk). `useShield` already does all of it and exposes `onApprovalSubmitted`/`onShieldSubmitted`. Use the built-in flow; drop to manual only if the design demands a literally separate "Approve" button click. |
| `approvalStrategy: "exact"` (default) | `approvalStrategy: "max"` | `"exact"` costs an approval tx on **every** wrap (safest, clearest for a judge). `"max"` = one approval then future wraps skip it (smoother repeat-demo). For a bounty demo, `"max"` gives a better second-wrap experience; either is correct. Recommend `"max"` once, or a toggle. |
| wagmi `useWriteContract` for the faucet `mint` | A Zama SDK faucet hook | **No SDK faucet hook exists** — the faucet is a plain public ERC-20 `mint`, not an FHE operation. wagmi is the right tool. |
| `rateContract()` SDK helper | Hand-written 1-line `rate()` ABI (`function rate() view returns (uint256)`) | Both work; the live-verified 1-line ABI is trivial and avoids importing the SDK's giant generated ABI. Either is fine. |

**Installation:** None. All packages installed + wired since Phase 1/3. This phase adds source files only (`hooks/useFaucet.ts`, `hooks/useWrap.ts`, `lib/previewWrap.ts`, `components/wrap/*`, `components/faucet/*`, optional `app/wrap/`). [VERIFIED: package.json + node_modules]

**Version verification:**
```bash
node -e "console.log(require('./node_modules/@zama-fhe/react-sdk/package.json').version)"  # -> 3.0.0
node -e "console.log(require('./node_modules/@zama-fhe/sdk/package.json').version)"        # -> 3.0.0
```
Confirmed both resolve to exactly `3.0.0` on disk. [VERIFIED: node_modules]

## Package Legitimacy Audit

> No new packages are installed in this phase — it consumes already-installed, already-wired dependencies (Phase 1/3). The two SDK packages this phase imports were run through the legitimacy seam for completeness.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@zama-fhe/react-sdk` | npm | pinned 3.0.0 (installed Phase 1) | ~3.1k/wk | github.com/zama-ai/sdk | SUS (`too-new`) | Approved — official Zama scope, already vetted+installed, no postinstall |
| `@zama-fhe/sdk` | npm | pinned 3.0.0 (installed Phase 1) | ~10.5k/wk | github.com/zama-ai/sdk | SUS (`too-new`) | Approved — official Zama scope, already vetted+installed, no postinstall |
| `wagmi` / `viem` / `@tanstack/react-query` | npm | mature | very high | established | OK | Already installed (Phase 1) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@zama-fhe/react-sdk`, `@zama-fhe/sdk` — flagged only for `too-new` (published 2026-06-24). They are the official Zama packages (repo `github.com/zama-ai/sdk`, no postinstall script), already installed and vetted in Phase 1, and there is **no install step in this phase**, so no new legitimacy risk is introduced. No `checkpoint:human-verify` needed (no new install).

## Architecture Patterns

### System Architecture Diagram

```
                         [ ChainGuard: connected && chainId === 11155111 ]
                                            |
        ┌───────────────────────────────────┴───────────────────────────────────┐
        v                                                                         v
  FAUCET FLOW (FCT-01/02)                                             WRAP FLOW (WRP-01/02)
        |                                                                         |
  pick pair -> pair.underlying.address                                pick pair + enter amount
        |                                                                         |
  amount = parseUnits(x, underlying.decimals)                        underlyingRaw = parseUnits(x, underlying.decimals)
        |  (cap: <= 1_000_000 * 10^dec per call)                                  |
        v                                                              rate = useReadContract(rateContract(confidentialAddr))
  wagmi useWriteContract:                                                         |
    mint(connectedWallet, amount)  on underlying ERC-20               PREVIEW (pure): previewWrap(underlyingRaw, rate, wrapperDecimals)
        |                                                               confRaw   = underlyingRaw / rate      (floor)
        v                                                               consumed  = confRaw * rate            (rest refunded)
  useWaitForTransactionReceipt(txHash)                                  warnBelowUnit = underlyingRaw < rate  (confRaw == 0)
        |  success                    failure                                     |
        v                              v                              display: formatConfidentialAmount(confRaw, wrapperDecimals)
  ERC-20 balance arrives      insufficient-ETH / cap /                            |
  (useBalance / useReadContract        wrong-net / tGBP-restricted        [ Wrap ] -> useShield({ tokenAddress, wrapperAddress })
   refetch)                     -> readable message                                |  .mutate({ amount: underlyingRaw, approvalStrategy,
                                                                        |            onApprovalSubmitted, onShieldSubmitted })
                                                                        |
                                    4-STAGE INDICATOR  <----------------┤
                                    (1) approve  <- onApprovalSubmitted(txHash)   (skipped if strategy "skip"/already approved)
                                    (2) wrap     <- onShieldSubmitted(txHash)
                                    (3) confirming <- useWaitForTransactionReceipt(receipt)
                                    (4) done     <- mutation resolves { txHash, receipt }
                                                                        |
                                                                        v
                                          CORRECTNESS PROOF (WRP-01/02):
                                          useConfidentialBalance({ tokenAddress: confidentialAddr })  (Phase-3)
                                          -> decrypt -> MUST equal preview confRaw  (auto-cache-invalidated by useShield)
```

### Recommended Project Structure
```
packages/nextjs/
├── hooks/
│   ├── useFaucet.ts      # NEW — wagmi useWriteContract(mint) + receipt wait + status
│   └── useWrap.ts        # NEW — wraps useShield + rate() read + previewWrap + 4-stage machine
├── lib/
│   ├── previewWrap.ts    # NEW — PURE: previewWrap(underlyingRaw, rate, wrapperDecimals) -> { confRaw, consumedRaw, belowOneUnit }
│   ├── faucetErrors.ts   # NEW — map mint/tx errors -> readable copy (insufficient-ETH, cap, wrong-net, tGBP)
│   └── wrapErrors.ts     # NEW — map ZamaError subclasses -> readable copy (approval/revert/rejected/insufficient-ERC20)
├── registry/
│   └── abis.ts           # EXTEND — add minimal erc20 `mint` + wrapper `rate` fragments (verified live)
├── components/faucet/    # NEW — FaucetPanel / FaucetButton / FaucetState (per .dc.html faucet screen)
├── components/wrap/      # NEW — WrapPanel / WrapAmountInput / WrapPreview / WrapStageIndicator (4-stage)
└── app/wrap/page.tsx     # OPTIONAL — dedicated route, or mount panels on Phase-2 pair cards (Claude's discretion)
```

### Pattern 1: Faucet = public `mint(address,uint256)` on the underlying ERC-20
**What:** A plain wagmi write; no SDK, no FHE. The mint is unrestricted on the mocks (except tGBP).
**When to use:** FCT-01.
```typescript
// Source: verified live Sepolia 2026-07-07 (selector 0x40c10f19, simulate-from-random-EOA succeeds,
//         no owner()/hasRole/MINTER_ROLE) + context7 docs ("publicly accessible minting ... 1,000,000 per call").
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Address } from "viem";

const erc20MintAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

export function useFaucet() {
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function claim(underlying: Address, to: Address, whole: string, decimals: number) {
    const amount = parseUnits(whole, decimals); // e.g. "1000" -> 1000 * 10^decimals
    // NOTE: per-call cap is 1,000,000 whole tokens — keep `whole` <= 1_000_000 or the tx reverts.
    return writeContractAsync({ address: underlying, abi: erc20MintAbi, functionName: "mint", args: [to, amount] });
  }
  return { claim, txHash, isPending, confirming, isSuccess, error };
}
```

### Pattern 2: Wrap via `useShield` — approve+wrap in one mutation, callbacks drive the 4-stage indicator
**What:** One hook, one `mutate` call. The SDK does the ERC-20 approval internally (unless `"skip"`), then the wrap.
**When to use:** WRP-01.
```tsx
// Source: verified against node_modules/@zama-fhe/react-sdk/dist/index.d.ts (3.0.0) +
//         @zama-fhe/sdk query ShieldParams/ShieldCallbacks + context7 useShield API.
// IMPORTANT: installed 3.0.0 config is { tokenAddress, wrapperAddress } — NOT the docs' { address }.
"use client";
import { useShield, InsufficientERC20BalanceError, ApprovalFailedError,
         TransactionRevertedError, SigningRejectedError } from "@zama-fhe/react-sdk";
import { useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import type { Address, Hex } from "viem";

type Stage = "idle" | "approving" | "wrapping" | "confirming" | "done" | "error";

export function useWrap(confidentialAddr: Address) {
  const [stage, setStage] = useState<Stage>("idle");
  const [shieldHash, setShieldHash] = useState<Hex | undefined>();
  // For these registry pairs the confidential token IS the ERC7984ERC20Wrapper,
  // so tokenAddress === wrapperAddress === the confidential (registry) address.
  const { mutateAsync: shield, isPending } = useShield({
    tokenAddress: confidentialAddr,
    wrapperAddress: confidentialAddr,
  });
  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: shieldHash });

  async function wrap(underlyingRaw: bigint, approvalStrategy: "exact" | "max" | "skip" = "max") {
    try {
      setStage(approvalStrategy === "skip" ? "wrapping" : "approving");
      const { txHash } = await shield({
        amount: underlyingRaw,
        approvalStrategy,
        onApprovalSubmitted: () => setStage("wrapping"),   // approval tx sent -> move to wrap stage
        onShieldSubmitted: (h) => { setShieldHash(h); setStage("confirming"); },
      });
      setStage("done"); // mutation resolves after the wrap tx is mined ({ txHash, receipt })
      return txHash;
    } catch (e) {
      setStage("error");
      throw e; // classify with instanceof in wrapErrors.ts
    }
  }
  return { stage, wrap, isPending, confirmed };
}
```

### Pattern 3: Preview math — `rate() = 10^(underlyingDec − wrapperDec)`, round down, warn below one unit
**What:** Pure `bigint` math; unit-testable; the WRP-02 core.
**When to use:** WRP-02.
```typescript
// Source: verified live Sepolia 2026-07-07 across all 7 pairs (see live table below).
// ERC7984ERC20Wrapper mints floor(underlyingRaw / rate) confidential base units and
// pulls confRaw*rate underlying (remainder refunded to the user).
export function previewWrap(underlyingRaw: bigint, rate: bigint, wrapperDecimals: number) {
  const confRaw = underlyingRaw / rate;          // floor division (bigint)
  const consumedRaw = confRaw * rate;            // underlying actually consumed
  const refundRaw = underlyingRaw - consumedRaw; // remainder returned
  const belowOneUnit = confRaw === 0n;           // entered amount < one confidential base unit
  return { confRaw, consumedRaw, refundRaw, belowOneUnit };
  // display: formatConfidentialAmount(confRaw, wrapperDecimals)   // never hardcode 18
}
```

### Anti-Patterns to Avoid
- **`useShield({ address })`:** the docs use `{ address }` but the **installed 3.0.0** config is `{ tokenAddress, wrapperAddress }` — `{ address }` will not satisfy the type/behavior. Verified on disk.
- **Hardcoding 18 decimals anywhere in the preview or display:** cWETH/cBRON/cZAMA/ctGBP underlyings are 18-dp but the wrappers are 6-dp (`rate = 1e12`). Read decimals + `rate()` per pair.
- **Hand-orchestrating approve → wrap as two separate hooks/txs:** `useShield` already does it; you'd re-introduce the non-zero-allowance-reset / USDT edge cases the SDK handles.
- **Using `useConfidentialIsApproved` for the wrap approval gate:** that checks confidential-side *operator* approval, not the ERC-20 allowance. Use `useUnderlyingAllowance` if you want to pre-detect the approve stage.
- **Building a cooldown UI for the faucet:** there is no onchain cooldown; a "cooldown/already-claimed" state would be fiction. FCT-02's real cases are ETH/cap/network/tGBP.
- **Minting > 1,000,000 whole tokens in one call:** exceeds the per-call cap → revert. Clamp the faucet amount.
- **Declaring success at the `shield` submit, or the faucet at the `mint` submit:** wait for the receipt (`useWaitForTransactionReceipt`) before "done"; for the wrap, the true proof is the decrypted balance matching the preview.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ERC-20 approval before wrap (non-zero reset, USDT quirk, exact/max) | Custom `approve` + allowance bookkeeping | `useShield`'s built-in approval (`approvalStrategy`) | The SDK resets non-zero allowances first and handles USDT-style tokens; hand-rolling reintroduces those bugs. |
| Wrap tx orchestration + progress | Manual `writeContract(wrap)` + event parsing | `useShield` + `onApprovalSubmitted`/`onShieldSubmitted` | One mutation returns `{ txHash, receipt }` and fires stage callbacks; auto-invalidates the balance cache. |
| Wrapped-balance verification | Manual `confidentialBalanceOf` + relayer `userDecrypt` | Phase-3 `useConfidentialBalance` / `PairCardDecrypt` | Already built + tested in Phase 3; returns the cleartext `bigint`. |
| `rate()` ABI | Guessing the wrapper ABI | `rateContract(addr)` or the live-verified 1-line ABI | Guessed selectors return `0x` and break the preview silently. |
| Decimals-safe formatting | `Number(x) / 10**d` (precision loss) | `parseUnits`/`formatUnits` + `formatConfidentialAmount` | `bigint`-safe; the whole point of WRP-02. |
| Faucet contract | A custom faucet/drip contract or backend | The mocks' public `mint(address,uint256)` | The mint is already public and unrestricted; no contract to deploy. |
| Error classification | String-matching revert text | `instanceof` on `@zama-fhe/sdk` error classes | Typed + stable; string matching breaks on message changes. |

**Key insight:** Phase 4 is mostly *wiring already-solved primitives*. The genuinely new, app-authored logic is small and pure: the faucet `mint` write, the `previewWrap` math, the 4-stage state machine, and the error→copy maps. Everything hard (approval sequencing, FHE decrypt, cache invalidation) is inside the SDK/Phase-3 code.

## Common Pitfalls

### Pitfall 1: Decimals mismatch — underlying 18-dp vs wrapper 6-dp, `rate = 1e12`
**What goes wrong:** Preview shows a value off by 12 orders of magnitude; the decrypted result never matches the preview.
**Why it happens:** cWETH/cBRON/cZAMA/ctGBP underlyings are 18-decimal but their wrappers are 6-decimal, so `rate = 10^(18−6) = 1e12`. Treating both sides as the same decimals (or hardcoding 18) is wrong.
**How to avoid:** Read `rate()` per pair; use `pair.underlying.decimals` for `parseUnits` and `pair.confidential.decimals` (=wrapper decimals) for the confidential display via `formatConfidentialAmount`. Preview = `floor(underlyingRaw / rate)`.
**Warning signs:** cUSDC (rate=1) "works" but cWETH is wildly wrong; wrapped decrypt ≠ preview.

### Pitfall 2: Amount below one confidential base unit rounds to zero
**What goes wrong:** User enters a tiny amount (e.g. `0.0000001` WETH), the wrap mints 0 confidential units, and it looks like a silent no-op / lost funds.
**Why it happens:** `confRaw = floor(underlyingRaw / rate)`; when `underlyingRaw < rate`, `confRaw = 0`. For cWETH, one confidential base unit costs `1e12` underlying wei (= `0.000001` WETH).
**How to avoid:** WRP-02's explicit warning — when `previewWrap().belowOneUnit` is true, disable the Wrap button and show "Amount too small — below one confidential unit for this pair."
**Warning signs:** Wrap "succeeds" but the decrypted balance is unchanged.

### Pitfall 3: tGBP faucet is restricted — `mint` may revert
**What goes wrong:** The faucet works for 6 of 7 mocks but reverts for tGBP.
**Why it happens:** context7 docs: "The confidential tGBP token is an exception, wrapping an official testnet token with restricted minting." Its underlying is a real testnet token, not a freely-mintable mock.
**How to avoid:** Either hide/disable the faucet for tGBP (detect by underlying address), or let `mint` fail and surface a clear "This token's faucet is restricted — obtain it from the official testnet faucet" message (link if available). Do NOT show a raw revert.
**Warning signs:** Only tGBP's faucet errors; its underlying address differs from the other 6 mock pattern.

### Pitfall 4: `useShield` config field name drift (`tokenAddress` vs docs `{ address }`)
**What goes wrong:** Following docs.zama.org yields `useShield({ address })`, which does not match the installed 3.0.0 `UseShieldConfig` (`{ tokenAddress, wrapperAddress }`).
**Why it happens:** The pinned 3.0.0 predates a later API rename (same pattern Phase 3 hit with `useAllow` vs `useGrantPermit`).
**How to avoid:** Use `{ tokenAddress, wrapperAddress }` — both set to the confidential/wrapper address (the ERC7984ERC20Wrapper is the confidential token). Verified in `node_modules/@zama-fhe/react-sdk/dist/index.d.ts`.
**Warning signs:** Type error on the config object, or the hook not finding the wrapper.

### Pitfall 5: Insufficient Sepolia ETH for gas (both flows)
**What goes wrong:** A cold judge with zero ETH can't send the `mint` or `shield` tx; wallet throws an opaque error.
**Why it happens:** The faucet mints ERC-20s but the tx itself needs ETH for gas; wrapping needs gas for approve + wrap.
**How to avoid:** Pre-check `useBalance({ address })` (native) before enabling the write; if ~0, show "You need Sepolia ETH for gas — get some from a Sepolia ETH faucet" (no raw revert). This is a real FCT-02 case (unlike cooldown).
**Warning signs:** `mint`/`shield` fails immediately at signing with an intrinsic-gas / insufficient-funds error.

### Pitfall 6: Declaring success before finality / before the decrypt confirms
**What goes wrong:** UI shows "wrapped!" but the decrypted balance hasn't updated, or the faucet balance hasn't arrived.
**Why it happens:** Success shown at tx-submit instead of receipt; or the confidential-balance cache not yet refreshed.
**How to avoid:** Gate "done" on `useWaitForTransactionReceipt`. For the wrap proof, `useShield` auto-invalidates the `confidentialBalance` cache — re-run the Phase-3 decrypt after the receipt; present `decrypting` as a visible state. For the faucet, refetch the ERC-20 balance after the receipt.
**Warning signs:** Balance/decrypt lags the success toast.

## Runtime State Inventory

> Not a rename/refactor/migration phase — greenfield feature work. Included to note pre-existing runtime state this phase depends on.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Phase-3 `IndexedDBStorage(KeypairStore/SignatureStore)` (FHE keypair + EIP-712 session) — used only by the verification decrypt, not by faucet/wrap. | None — reuse as-is. |
| Live service config | Zama relayer (`relayer.testnet.zama.org/v2`, in `SepoliaConfig`) — used only for the wrapped-result decrypt. Public Sepolia RPC for `mint`/`shield`/`rate()`. | None — no config change. |
| OS-registered state | None. | None — verified. |
| Secrets/env vars | None required. Faucet/wrap are public onchain writes; no API keys. | None — verified. |
| Build artifacts | None new — packages already installed at exact 3.0.0. | None — verified. |

## Code Examples

### Minimal verified ABIs to add to `registry/abis.ts`
```typescript
// Source: verified live Sepolia 2026-07-07 — mint present (selector 0x40c10f19) & unrestricted;
//         rate() present on every wrapper. Add alongside the existing registry/erc20-metadata ABIs.
export const erc20MintAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

export const wrapperRateAbi = [
  { type: "function", name: "rate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
// (Or import `rateContract` from "@zama-fhe/react-sdk" for a ready-made read config.)
```

### Live-verified rate/decimals table (Sepolia, 2026-07-07) — for previewWrap fixtures
```
label | wrapper.rate()      | wrapper.decimals | underlying.decimals | underlying.symbol | 1 whole underlying -> confidential
cUSDC | 1                   | 6                | 6                   | USDCMock          | 1.0 cUSDC (1_000_000 conf base units)
cUSDT | 1                   | 6                | 6                   | USDTMock          | 1.0 cUSDT
cWETH | 1_000_000_000_000   | 6                | 18                  | WETHMock          | 1.0 cWETH   <-- rate = 1e12
cBRON | 1_000_000_000_000   | 6                | 18                  | BRONMock          | 1.0 cBRON
cZAMA | 1_000_000_000_000   | 6                | 18                  | ZAMAMock          | 1.0 cZAMA
ctGBP | 1_000_000_000_000   | 6                | 18                  | tGBPMock          | 1.0 ctGBP   <-- faucet RESTRICTED (Pitfall 3)
cXAUt | 1                   | 6                | 6                   | XAUtMock          | 1.0 cXAUt
```
Universal: `rate = 10^(underlyingDecimals − wrapperDecimals)`; wrapper decimals is always 6 for these mocks. Wrapping 1 whole underlying always yields exactly 1.0 confidential token — a clean end-to-end correctness assertion for the demo.

### Faucet + wrap error → readable copy (sketch)
```typescript
// Source: @zama-fhe/sdk 3.0.0 error classes (verified in .d.ts) + live faucet behavior.
import { InsufficientERC20BalanceError, ApprovalFailedError, TransactionRevertedError,
         SigningRejectedError, ZamaError } from "@zama-fhe/react-sdk";

export function toWrapError(e: unknown): string {
  if (e instanceof SigningRejectedError)       return "You declined the wallet prompt.";
  if (e instanceof InsufficientERC20BalanceError) return "Not enough underlying tokens — use the faucet first.";
  if (e instanceof ApprovalFailedError)        return "The ERC-20 approval failed — try again.";
  if (e instanceof TransactionRevertedError)   return "The wrap transaction reverted.";
  if (e instanceof ZamaError)                  return "The wrap could not be completed.";
  return "Unexpected error while wrapping.";
}
// Faucet: classify wagmi write errors on message/name — insufficient funds for gas -> "Need Sepolia ETH for gas";
// revert on tGBP or over-cap -> "This faucet is unavailable / amount too large (max 1,000,000)".
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `approve()` + `wrap()` two-tx dance | `useShield` single mutation, auto-approval + stage callbacks | SDK 3.x | One hook; the 4-stage indicator is driven by `onApprovalSubmitted`/`onShieldSubmitted`. |
| Separate faucet contract / backend drip | Public unrestricted `mint(address,uint256)` on the mock ERC-20 | Zama mocks | Faucet = one wagmi write; no deploy, no backend. |
| Hardcode 18 decimals | Read `rate()` + per-side `decimals()`; `rate = 10^(underDec−wrapDec)` | current | Correct across 6-dp and 18-dp underlyings; the WRP-02 mandate. |

**Deprecated/outdated (do NOT use here):**
- `useShield({ address })` from docs.zama.org — installed 3.0.0 uses `{ tokenAddress, wrapperAddress }`.
- Any `faucet()`/`drip()`/`claim()` guess — those selectors are ABSENT from the mock bytecode; only `mint(address,uint256)` exists.
- `fhevmjs` / `@zama-fhe/relayer-sdk` direct plumbing — unnecessary; the react hooks cover wrap, wagmi covers the faucet.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The ERC7984ERC20Wrapper mints `floor(underlyingRaw / rate)` confidential base units and refunds the `underlyingRaw % rate` remainder (OZ wrapper semantics). | Pattern 3 / WRP-02 | Low — `rate` and both decimals are verified live; the "1 whole underlying → 1.0 confidential" invariant holds for all 7 pairs, confirming the division direction. If the SDK instead expects the confidential amount as `amount`, the preview scale flips — verify on the first live wrap that decrypt == preview (the phase-gate check already does this). |
| A2 | `useShield` `mutate({ amount })` expects `amount` in **underlying** raw base units (what you're wrapping FROM), matching `parseUnits(x, underlying.decimals)`. | Pattern 2 | Medium — docs/`.d.ts` say "amount to shield in the token's smallest unit"; if it means confidential units instead, the wrap scale is off by `rate`. Verify on the first live cWETH wrap (18-dp) that 1.0 WETH → 1.0 cWETH. |
| A3 | tGBP's faucet `mint` is the only restricted one; the other 6 underlyings mint freely with a 1,000,000/call cap. | Pitfall 3 / FCT-02 | Low — USDCMock verified unrestricted live; context7 explicitly names tGBP the exception. Confirm tGBP handling with one live attempt during execute. |
| A4 | No onchain cooldown exists on the mock mints (so FCT-02 "cooldown" is not a revert to handle). | FCT-02 | Low — minimal mock bytecode (no timestamp/lastClaim state, no `paused`). If a cap-per-address exists it surfaces as a revert caught by the generic faucet error map. |
| A5 | The registry `confidentialTokenAddress` == the ERC7984ERC20Wrapper address, so `tokenAddress === wrapperAddress` for `useShield`. | Pattern 2 | Low — Phase-2 verified the confidential side exposes wrapper reads (`rate()`, `underlying()`); both resolved live from the confidential address. |

## Open Questions

1. **Does `useShield`'s `amount` mean underlying-raw or confidential-raw?**
   - What we know: `.d.ts` + docs say "amount to shield, in the token's smallest unit"; the ERC-20 balance is validated before submit (`InsufficientERC20BalanceError`), implying it's the **underlying** amount.
   - What's unclear: absolute certainty of the scale for an 18-dp underlying → 6-dp wrapper.
   - Recommendation: On the first live cWETH wrap, assert `decrypt(confidentialBalance) === previewWrap(parseUnits("1", 18), 1e12, 6).confRaw` (== `1_000_000n` == 1.0 cWETH). This is the WRP correctness gate; resolve the scale there. (A2/A1.)

2. **Best `approvalStrategy` for the demo — `"exact"` (per-wrap approval tx) vs `"max"` (one-time)?**
   - What we know: default `"exact"` costs an approval tx every wrap; `"max"` approves once.
   - Recommendation: Use `"max"` (smoother repeat wraps for a judge), or expose a toggle. Either is correct; `"exact"` makes the approve stage always visible in the 4-stage indicator, which may be desirable for the demo narrative.

3. **Faucet amount + tGBP UX.**
   - What we know: per-call cap is 1,000,000 whole tokens; tGBP is restricted.
   - Recommendation: Default the faucet to a sensible fixed amount (e.g. 1,000 whole tokens) with a clamp ≤ 1,000,000; detect tGBP by underlying address and disable/redirect its faucet with a clear message.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@zama-fhe/react-sdk` (`useShield`, `useConfidentialBalance`) | Wrap + verify | ✓ | 3.0.0 (exact) | — |
| `@zama-fhe/sdk` (error classes, `rateContract`, `TransactionResult`) | Wrap error taxonomy + rate read | ✓ | 3.0.0 (exact) | — |
| `wagmi` (`useWriteContract`, `useWaitForTransactionReceipt`, `useReadContract`, `useBalance`) | Faucet mint + rate read + gas pre-check | ✓ | ^2.19.5 | — |
| `viem` (`parseUnits`/`formatUnits`) | Decimals-safe conversion | ✓ | ^2.47.12 | — |
| cTokenMock underlying ERC-20 `mint(address,uint256)` | FCT-01 | ✓ (live, unrestricted; tGBP restricted) | selector `0x40c10f19` verified | tGBP → external faucet link |
| Wrapper `rate()` | WRP-02 | ✓ (live on all 7) | — | — |
| Public Sepolia RPC | all writes/reads | ✓ | `ethereum-sepolia-rpc.publicnode.com` | other public endpoints |
| Zama relayer (Sepolia) | wrapped-result decrypt (proof) | ✓ (external) | `relayer.testnet.zama.org/v2` | verify on live URL |
| Phase-2 `useRegistryPairs` / Phase-3 `useUserDecrypt` / Phase-1 `ChainGuard` | pair data / proof / gating | ✓ | in repo | — |
| Sepolia ETH for gas | any write | ✗ per-judge (external) | — | External Sepolia ETH faucet — surface a link (Pitfall 5) |

**Missing dependencies with no fallback:** none — faucet, `rate()`, and RPC are live and verified.
**Missing dependencies with fallback:** Sepolia ETH for gas (external faucet link); tGBP mint restriction (disable/redirect its faucet).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (+ `@vitest/coverage-v8`) — installed, configured (Phase 2/3) |
| Config file | `packages/nextjs/vitest.config.ts` |
| Quick run command | `cd packages/nextjs && npx vitest run <file>` |
| Full suite command | `cd packages/nextjs && npm run test` (`vitest run`) |

Existing pure-function tests: `lib/mergePairs.test.ts`, `lib/regroupMeta.test.ts`, `lib/tokenSymbol.test.ts`, `lib/filterPairs.test.ts`, `lib/decryptErrors.test.ts`, `lib/decryptValidate.test.ts`, `lib/formatConfidential.test.ts`. Same pattern applies: unit-test the new pure logic; wrap/faucet/decrypt integration is manual/live (needs wallet + relayer + gas).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRP-02 | `previewWrap` floor division + `belowOneUnit` (rate=1 and rate=1e12 cases) | unit (pure) | `npx vitest run lib/previewWrap.test.ts` | ❌ Wave 0 |
| WRP-02 | `previewWrap` "1 whole underlying → 1.0 confidential" for 6-dp and 18-dp | unit (pure) | `npx vitest run lib/previewWrap.test.ts -t "one whole"` | ❌ Wave 0 |
| WRP-01 | Wrap error map (rejected/approval/revert/insufficient-ERC20) → copy | unit (pure) | `npx vitest run lib/wrapErrors.test.ts` | ❌ Wave 0 |
| FCT-02 | Faucet error map (gas / cap / wrong-net / tGBP) → copy; amount clamp ≤ 1e6 | unit (pure) | `npx vitest run lib/faucetErrors.test.ts` | ❌ Wave 0 |
| FCT-01 | Faucet `mint` → underlying balance arrives | integration / manual (live + gas) | manual on live URL | ❌ manual |
| WRP-01 | approve → wrap → confirmation, 4-stage indicator progresses | integration / manual | manual on live URL | ❌ manual |
| WRP-01/02 | **Correctness proof:** wrap N → decrypt == preview | integration / manual (relayer) | manual on live URL | ❌ manual |

### Sampling Rate
- **Per task commit:** `npx vitest run <changed .test.ts>` (previewWrap + error maps — the high-value pure logic).
- **Per wave merge:** `cd packages/nextjs && npm run test` (full suite) + `npm run check-types`.
- **Phase gate:** Full suite green + a **real faucet→wrap→decrypt on the deployed URL** proving decrypt == preview for at least one 6-dp pair (cUSDC) AND one 18-dp pair (cWETH). `next build` clean.

### Wave 0 Gaps
- [ ] `lib/previewWrap.ts` + `lib/previewWrap.test.ts` — floor division, `belowOneUnit`, refund, 6-dp & 18-dp fixtures (covers WRP-02 without a chain call).
- [ ] `lib/wrapErrors.ts` + `lib/wrapErrors.test.ts` — `ZamaError` subclass → copy (covers WRP-01 messaging).
- [ ] `lib/faucetErrors.ts` + `lib/faucetErrors.test.ts` — gas/cap/network/tGBP mapping + amount clamp (covers FCT-02).
- [ ] Manual UAT checklist: faucet arrives, 4-stage indicator, wrap N → decrypt N == preview (cUSDC + cWETH) on the live URL.

*(Hook-level wrap/faucet is not unit-tested — the SDK/wagmi own the tx path; mocking would test the mock. Cover the app-authored pure logic in units; cover integration via live UAT.)*

## Security Domain

> `security_enforcement: true`, ASVS L1. This phase adds two onchain WRITE flows (public faucet mint + wrap) from the connected wallet. No app backend, no server input.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Wallet is the identity (Phase 1); no new auth. |
| V3 Session Management | reuse | Only the verification decrypt touches the FHE session (Phase-3 IndexedDB). Faucet/wrap need no session. |
| V4 Access Control | yes (external) | The faucet `mint` is intentionally public (testnet mock); the wrap is user-scoped (own wallet). ACL for the decrypt proof is relayer-enforced (Phase 3). |
| V5 Input Validation | yes | Validate/clamp the faucet amount (≤ 1,000,000, positive, numeric); validate the wrap amount (`parseUnits` with the correct decimals; reject `belowOneUnit`). Selected pair address comes from the trusted registry, not free input. |
| V6 Cryptography | reuse | FHE crypto is SDK/relayer-owned (verification decrypt only) — never hand-roll. |
| V7 Error Handling | yes | Typed error → readable copy (no raw revert strings) for both flows (FCT-02/WRP-01). |
| V14 Config | yes | Registry/mock addresses are trusted constants from Phase-2 `addresses.ts`/registry reads — not user-supplied. |

### Known Threat Patterns for onchain write flows (testnet)
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User wraps more than they hold / tiny amount lost to rounding | Tampering / DoS(self) | Pre-validate against ERC-20 balance (`InsufficientERC20BalanceError`); `belowOneUnit` warning disables Wrap (WRP-02). |
| Faucet abuse / over-mint (unbounded public mint) | Elevation / DoS | Testnet-only, intended-public mock; clamp UI amount ≤ 1,000,000/call; no mainnet exposure (out of scope). |
| Writes fired on the wrong network | Tampering | `ChainGuard` (chainId === 11155111) gates both flows before any write. |
| Opaque revert leaks confusing internals | Info Disclosure (UX) | Map every failure to human copy; never surface raw revert data. |
| Success shown before finality (wrong balance) | Integrity (UX) | Gate "done" on `useWaitForTransactionReceipt`; prove wrap via post-receipt decrypt == preview. |

**No high/critical threats** — testnet, client-only, public mock faucet by design. The load-bearing controls are input validation/clamping (amounts, decimals) and typed error handling.

## Sources

### Primary (HIGH confidence)
- **Live Sepolia `eth_call` (viem, this session 2026-07-07):** `rate()`/`decimals()`/`underlying()`/`symbol()` on all 7 wrappers + underlyings; faucet selector scan on the underlying mocks (only `mint(address,uint256)` `0x40c10f19` present); `mint` `call`-simulated from a random EOA **succeeds** (unrestricted); no `owner()`/`hasRole`/`MINTER_ROLE`/`paused` selectors. End-to-end verification of faucet mechanism + rate semantics + decimals.
- `node_modules/@zama-fhe/react-sdk/dist/index.d.ts` (installed **3.0.0**) — `useShield` config `{ tokenAddress, wrapperAddress, optimistic? }`; `useApproveUnderlying`/`useUnderlyingAllowance`/`useConfidentialIsApproved` signatures; `useConfidentialBalance` (reused). [VERIFIED]
- `node_modules/@zama-fhe/sdk/dist/esm/query/index.d.ts` (installed **3.0.0**) — `ShieldParams { amount, approvalStrategy?, to?, ...ShieldCallbacks }`, `ApproveUnderlyingParams { amount? }`, `TokenMetadata`. [VERIFIED]
- `node_modules/@zama-fhe/sdk/dist/esm/relayer-sdk.types-CGfXwKcB.d.ts` — `ShieldCallbacks { onApprovalSubmitted, onShieldSubmitted }`, `ShieldOptions`, `TransactionResult { txHash, receipt }`. [VERIFIED]
- `node_modules/@zama-fhe/sdk/dist/esm/activity-DBMyE78S.d.ts` — `Token.shield(amount, options)` doc ("Handles ERC-20 approval automatically based on approvalStrategy; default exact"), `rateContract(address)` read-config helper, `ReadonlyToken.decimals()`/`underlyingToken()`/`allowance()`. [VERIFIED]
- context7 `/websites/zama` — `useShield` API (approval auto-handled, `onApprovalSubmitted`/`onShieldSubmitted`, returns `{ txHash, receipt }`), and Sepolia addresses page: **"These mock tokens have publicly accessible minting functions with a limit of 1,000,000 tokens per call. The confidential tGBP token is an exception ... restricted minting."** [VERIFIED]
- Phase-2 `02-RESEARCH.md` + `registry/types.ts`/`abis.ts` (pair shape, both-side decimals, verified addresses); Phase-3 `03-RESEARCH.md` + `hooks/useUserDecrypt.ts`/`lib/formatConfidential.ts` (decrypt proof + decimals-safe format). [VERIFIED in repo]

### Secondary (MEDIUM confidence)
- context7 conceptual wrap/shield flow (docs show `useShield({ address })` — the later API; installed 3.0.0 uses `{ tokenAddress, wrapperAddress }`, so the **name** was corrected against on-disk types while the **behavior** (auto-approval, callbacks) was confirmed).

### Tertiary (LOW confidence)
- CLAUDE.md Feature→Hook map / "3.2.0" hook names — treated as suspect per project rule; superseded by on-disk 3.0.0 verification (e.g. config field is `tokenAddress`, not the docs' `address`).

## Metadata

**Confidence breakdown:**
- Faucet mechanism (public unrestricted `mint(address,uint256)`, 1M/call cap, tGBP exception): HIGH — live selector scan + simulate + context7.
- Wrap hook signatures + approve-in-one + stage callbacks: HIGH — on-disk 3.0.0 `.d.ts` + context7.
- Preview math (`rate = 10^(underDec−wrapDec)`, floor, below-one-unit): HIGH — verified live across all 7 pairs; direction of `amount` scaling is the one thing to confirm on the first live wrap (Open Q1/A2).
- Pitfalls: HIGH (decimals mismatch, tGBP, config drift, gas, finality — all grounded in verified facts).

**Research date:** 2026-07-07
**Valid until:** 2026-08-06 (30 days) — tied to the exact 3.0.0 pin; if the SDK is unpinned, re-verify `useShield` config field names. Onchain faucet/rate facts are stable; re-verify tGBP restriction before submission.
