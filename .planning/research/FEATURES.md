# Feature Research

**Domain:** Zama FHEVM "Confidential Wrapper Registry" dApp (ERC-20 ↔ ERC-7984, Sepolia) — bounty submission
**Researched:** 2026-07-07
**Confidence:** HIGH (flows verified against official Zama docs via context7 + docs.zama.org; faucet claim function name is MEDIUM — verify against deployed mock ABI)

---

## Verified Zama Mechanics (grounding for every feature below)

All flows confirmed against `/zama-ai/fhevm`, `/zama-ai/relayer-sdk` (context7) and `docs.zama.org`. Do **not** deviate from these.

**Wrap (ERC-20 → ERC-7984)** — public amount in:
1. `underlyingERC20.approve(wrapperAddress, amount)` — amount in the **underlying token's decimals**.
2. `wrapper.wrap(to, amount)` — mints confidential balance to `to`. Amounts are **rounded down** and excess refunded due to decimal conversion (underlying decimals → wrapper's confidential decimals, typically 6). `to` cannot be zero address.
- Result: `to`'s ERC-7984 balance is now an encrypted handle they can decrypt.

**Unwrap (ERC-7984 → ERC-20) — asynchronous, TWO steps** (this is the hardest flow):
1. **Request:** build an encrypted input client-side with the relayer SDK (`createEncryptedInput(...).add64(amount).encrypt()` → `handles[0]`, `inputProof`), then call `wrapper.unwrap(from, to, encryptedAmount, inputProof)`. `msg.sender` must be `from` **or an approved operator** (`wrapper.setOperator(operator, validUntil)`). This **burns** the encrypted amount and emits `UnwrapRequested` carrying an encrypted `burntAmount` handle. Underlying tokens are NOT yet transferred.
2. **Finalize:** the `burntAmount` must be **publicly decrypted** (relayer public-decryption) to yield `cleartextAmount` + `decryptionProof`, then `wrapper.finalizeUnwrap(burntAmount, cleartextAmount, decryptionProof)` sends the underlying ERC-20 to `to`. Finalization may be driven by an oracle/relayer callback, but the app must **track request → wait for decryption → surface completion** (the balance/underlying doesn't update instantly).

**User-decryption (EIP-712) — read your own ERC-7984 balance, works for ANY ERC-7984:**
1. `const keypair = instance.generateKeypair()` (NaCl keypair).
2. `const extraData = await instance.getExtraData()`.
3. `const eip712 = instance.createEIP712(keypair.publicKey, [contractAddress], startTimestamp, durationDays, extraData)`.
4. `signature = await signer.signTypedData(eip712.domain, { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }, eip712.message)` — the user signs a **UserDecryptRequestVerification** typed message (authorizes their pubkey to receive re-encrypted plaintext for those contracts, for a duration).
5. Fetch the ciphertext handle: `handle = await token.confidentialBalanceOf(user)` (a bytes32 handle).
6. `instance.userDecrypt([{ handle, contractAddress }], keypair.privateKey, keypair.publicKey, signature.replace('0x',''), [contractAddress], signer.address, startTimestamp, durationDays, extraData)` → returns `{ [handle]: plaintext }`.
- **Requires ACL permission** on the handle. ERC-7984 grants the balance holder `allow` on their own balance, so a wallet can always decrypt **its own** balance of any ERC-7984 token — registry-listed or not. This is why "decrypt any token" is feasible.

**Registry read (Sepolia source of truth):**
- Sepolia Wrappers Registry: **`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`**. Mainnet (read-reference only): `0xeb5015fF021DB115aCe010f23F55C2591059bBA0`.
- Enumerate pairs: `getTokenConfidentialTokenPairsLength()`, `getTokenConfidentialTokenPairs()` (all, incl. revoked), `getTokenConfidentialTokenPairsSlice(fromIndex, toIndex)`, `getTokenConfidentialTokenPair(index)`. Lookup: `getConfidentialTokenAddress(erc20)` → `(isValid, confidentialToken)`.
- Struct `TokenWrapperPair { address tokenAddress; address confidentialTokenAddress; bool isValid }`.
- **Important:** the registry stores only **addresses + isValid** — it does NOT store symbol/decimals/name. Token **metadata must be read from the token contracts** (`name()/symbol()/decimals()` on the ERC-20; `name()/symbol()` on the ERC-7984). Plan a metadata-resolution layer. Filter out `isValid == false` (revoked) pairs.

**Official cTokenMocks on Sepolia (7 pairs) — must all surface:**

| Confidential (ERC-7984) | Symbol | Wrapper Address | Underlying ERC-20 |
|---|---|---|---|
| Confidential USDC (Mock) | cUSDCMock | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | cUSDTMock | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | cWETHMock | `0x46208622DA27d91db4f0393733C8BA082ed83158` | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | cBRONMock | `0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891` | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | cZAMAMock | `0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB` | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | ctGBPMock | `0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC` | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | cXAUtMock | `0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7` | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

**Faucet:** users claim the **underlying ERC-20 mock** (publicly mintable/claimable) so they can then wrap. The exact function (`mint(to,amount)` vs `claim()` / `faucet()`) is **MEDIUM confidence — read the deployed mock ABI on Sepolia to confirm** before wiring the button. Once they hold the underlying ERC-20, the standard wrap path applies.

---

## Feature Landscape

### Table Stakes (Bounty REQUIRES — missing any = disqualifying gap)

Each row maps to a bounty requirement. Complexity S/M/L.

| Feature | Bounty req satisfied | Why expected | Complexity | Notes |
|---|---|---|---|---|
| Wallet connect + Sepolia network detection/switch | Coverage / UX | Nothing works without a connected wallet on the right chain | **S** | wagmi injected connector; prompt `wallet_switchEthereumChain`. Foundation for all writes. |
| Relayer SDK / fhevmjs bootstrap (encrypted inputs, user-decrypt, public-decrypt) | Correctness | Wrap-input, unwrap-input, and decryption all route through it | **M** | Pre-wired in `fhevm-react-template`. Initialize instance once, share via provider/hook. Foundation. |
| Browse registry — read **onchain** Sepolia registry as source of truth | "Browse registry" | Core value; judged on Coverage | **M** | `getTokenConfidentialTokenPairsLength()` + `...Slice`/`...Pairs`; filter `isValid`. Do NOT hardcode the 7 as the only source. |
| Token metadata resolution layer | "render pairs with symbol, decimals, name, addresses on both networks" | Registry stores only addresses+isValid | **S–M** | Multicall `name/symbol/decimals` on ERC-20 + ERC-7984. Cache. Map Sepolia→mainnet counterpart addresses for the "both networks" display. |
| Hybrid registry: onchain primary + local config overlay | "Hybrid registry source" | Bounty explicitly asks for custom/dev pairs on top of onchain | **S** | Merge a typed local `pairs.config.ts` with onchain results; de-dupe by address; label source. |
| Surface all 7 official cTokenMocks | "Include every official cTokenMock" | Coverage is a judging axis | **S** | Falls out of the onchain read; add a test asserting all 7 wrapper addresses appear. |
| Wrap flow: approve → wrap → confirmation | "Wrap flow" | Core loop | **M** | 2 txs (approve then `wrap(to,amount)`); show decimal rounding note; refresh confidential balance after. |
| Unwrap flow: encrypted input → `unwrap` → `finalizeUnwrap` | "Unwrap flow with correct ACL setup" | Core loop; hardest correctness axis | **L** | Async 2-step (see grounding). Build encrypted input via SDK; track `UnwrapRequested`; wait for public decryption; surface finalize/completion. Handle "pending decryption" state. |
| User-decryption (EIP-712) of connected wallet's balance for **any** ERC-7984 | "User-decryption for any token — paste/auto-detect" | Correctness axis; distinctive requirement | **L** | Full generateKeypair→createEIP712→signTypedData→userDecrypt path. Paste-an-address input + auto-detect from registry pairs. Cache signature for duration to avoid re-signing per read. |
| Sepolia faucet: claim official cTokenMock test tokens | "Sepolia faucet" | Judges/users need tokens to try flows | **M** | Claim underlying ERC-20 mock (verify claim fn name against ABI), then user can wrap. Show balance before/after. |
| Error handling: missing approval, insufficient balance, network mismatch, unsupported/unregistered token | "Sensible error handling" | UX + production-readiness axes | **M** | Pre-flight checks + typed error mapping (user-rejected, revert reason, wrong chain). Distinct from polish differentiator below. |
| Documented "add a new pair" process (README + example) | "Documented process for adding a pair" | Extensibility axis | **S** | Document the local-config path with a concrete worked example (add a fake pair end-to-end). |

### Differentiators (the wedge to place 1st)

Submissions will be functionally similar; these are where you win. Aligns with PROJECT.md Core Value (UX/polish).

| Feature | Value proposition | Complexity | Notes |
|---|---|---|---|
| Signature "wrap" animation (contract folded → bottle → aged → opened as ERC-7984) | The memorable wedge; makes a dry registry feel like a product | **L** | fal.ai visuals + ElevenLabs ambient audio. **Gate behind the real tx state** so it also communicates progress, not just decoration. Must degrade gracefully / be skippable (perf, Vercel asset limits). |
| Decrypt-any-token UX (paste any ERC-7984 address OR auto-detect wallet holdings) with reveal micro-interaction | Shows off the FHE "aha" moment; goes beyond registry-only | **M** | Table-stake underneath, but the polished reveal (blurred → decrypts in place) is the differentiator. Handle non-ERC-7984 / no-ACL gracefully. |
| Polished status system: toasts, tx stages, explorer links, optimistic + reconciled balances | Reads as production-grade; directly hits UX + production-readiness axes | **S–M** | Especially valuable for the async unwrap "pending decryption" state — turn a confusing wait into a clear progress UI. |
| Registry browser polish: search/filter, per-pair cards, valid/revoked badges, both-network address display, copy buttons | Coverage becomes pleasant to explore | **M** | Empty/loading/error states for every list. |
| Clean, well-typed, documented codebase (reusable hooks: `useWrap`, `useUnwrap`, `useUserDecrypt`, `useRegistry`) | Code-quality axis + makes it a reusable ecosystem template (the bounty's stated goal) | **M** | This is itself a judging axis; treat as a feature, not an afterthought. |
| Rock-solid live deploy (stable RPC, error boundaries, works cold for a judge) | Production-readiness axis; "if all else fails the loop must work on the live URL" | **M** | Vercel; own RPC key w/ fallback; guard against relayer/network flakiness. |

### Anti-Features (deliberately DO NOT build)

| Feature | Why tempting | Why problematic (under deadline) | Do instead |
|---|---|---|---|
| Mainnet write operations (wrap/unwrap on mainnet) | "Full coverage" | Bounty judged on Sepolia; real funds + risk; out of scope in PROJECT.md | Mainnet is **read-only reference** (show pairs/addresses only) |
| Custom ERC-7984 token deployment UI | "Let users make their own" | Huge surface, contract deploys, distracts from core loop; registry+faucet already supply tokens | Rely on the 7 cTokenMocks + faucet |
| Onchain admin registration UI (`registerConfidentialToken`) for new pairs | "True extensibility" | Requires registry admin rights/permissions; fragile; deadline risk | Satisfy extensibility via **documented local-config** add-a-pair path (PROJECT.md decision) |
| Multi-wallet / account abstraction / WalletConnect matrix | "Broader support" | Integration cost; judges use MetaMask on Sepolia | Standard injected connector (MetaMask) only |
| Custom indexer / backend to track confidential balances | "Faster reads" | Confidential balances are per-user ACL-gated; an indexer can't decrypt them anyway; ops burden | Direct RPC reads + client-side user-decrypt on demand |
| Re-sign EIP-712 on every balance read | "Simple" | Terrible UX (wallet popup spam); each unwrap read would re-prompt | Sign once, cache signature+keypair for `durationDays`; reuse across reads |
| AI-generated pitch video / voice | "Faster to produce" | **Bounty explicitly forbids** AI-generated video/voice | Real-person 3-min screen walkthrough |
| Real-time websocket balance streaming / auto-decrypt-all-on-load | "Live feel" | Auto-decrypting everything spams signatures and defeats privacy UX; complexity w/o value | Decrypt on explicit user action; poll tx receipts only where needed |

---

## Feature Dependencies

```
Wallet connect + Sepolia switch
   └──requires──> Relayer SDK bootstrap
                     ├──requires──> Registry read (onchain)
                     │                 ├──requires──> Token metadata resolution
                     │                 └──enhanced-by──> Hybrid local-config overlay
                     │                                     └──enables──> Add-a-pair docs
                     ├──requires──> Wrap flow (approve → wrap)
                     │                 └──requires──> Faucet (to have underlying tokens)
                     ├──requires──> Unwrap flow (encrypted input → unwrap → finalizeUnwrap)
                     └──requires──> User-decryption (EIP-712)  [needed to SEE wrap/unwrap results]

Wrap animation ──enhances/gated-by──> Wrap flow tx state
Decrypt reveal UX ──enhances──> User-decryption
Status/toast system ──enhances──> Wrap flow, Unwrap flow (esp. async pending state)
Error handling ──wraps──> every write flow
Reusable hooks ──underlie──> all flows (build first, polish later)
```

### Dependency Notes
- **Everything requires Relayer SDK bootstrap + wallet/Sepolia:** encrypted inputs (wrap unneeded—wrap is public; unwrap needs it), user-decrypt, and public-decrypt all route through the instance.
- **User-decryption is a prerequisite to *demonstrating* wrap/unwrap:** without it a wrapped balance is an opaque handle. Build decrypt early — it unblocks verifying every other flow.
- **Faucet precedes wrap in the demo path:** a cold judge needs tokens first. Order the UX flow: connect → faucet → wrap → decrypt → unwrap.
- **Unwrap's async finalize needs the status system** to not look broken during the decryption wait.
- **Hybrid config enables the add-a-pair extensibility requirement** — same code path judges will read about in the README.

---

## MVP Definition

### Launch With (v1 — the non-negotiable loop on the live URL)
- [ ] Wallet connect + Sepolia detection/switch — nothing works otherwise
- [ ] Relayer SDK bootstrap — foundation for inputs + decryption
- [ ] Onchain registry read + metadata + all 7 cTokenMocks surfaced — Coverage axis
- [ ] Faucet claim — so the loop is self-serve for a judge
- [ ] Wrap (approve → wrap → confirm) — half the core loop
- [ ] User-decryption (EIP-712) for any ERC-7984 — Correctness axis + makes results visible
- [ ] Unwrap (encrypted input → unwrap → finalize, with pending state) — hardest, but required
- [ ] Baseline error handling (approval/balance/network/unsupported)
- [ ] Hybrid local-config overlay + README add-a-pair guide — Extensibility axis
- [ ] Public live deploy (Vercel) — production-readiness gate

### Add After Core Works (polish pass — the differentiators)
- [ ] Signature wrap animation (bottle) — trigger only after the loop is verified; must be skippable
- [ ] Polished status/toast/tx-stage system with explorer links
- [ ] Registry browser search/filter, badges, both-network display, copy buttons
- [ ] Decrypt reveal micro-interaction
- [ ] Codebase cleanup: extract reusable typed hooks, README depth, deploy scripts

### Future / Out of Scope (do not touch under deadline)
- [ ] Onchain `registerConfidentialToken` admin UI — documented as future path only
- [ ] Mainnet writes, custom token deployment, multi-wallet/AA — see Anti-Features

---

## Feature Prioritization Matrix

| Feature | User/Judge Value | Impl Cost | Priority |
|---|---|---|---|
| Wallet + Sepolia switch | HIGH | LOW | P1 |
| Relayer SDK bootstrap | HIGH | MEDIUM | P1 |
| Onchain registry read + metadata (all 7 mocks) | HIGH | MEDIUM | P1 |
| Faucet claim | HIGH | MEDIUM | P1 |
| Wrap flow | HIGH | MEDIUM | P1 |
| User-decryption (EIP-712) | HIGH | HIGH | P1 |
| Unwrap flow (async finalize) | HIGH | HIGH | P1 |
| Error handling (baseline) | HIGH | MEDIUM | P1 |
| Hybrid config + add-a-pair docs | MEDIUM | LOW | P1 |
| Live deploy | HIGH | MEDIUM | P1 |
| Wrap animation (bottle) | HIGH (wedge) | HIGH | P2 |
| Status/toast/tx-stage system | HIGH | LOW–MED | P2 |
| Registry browser polish | MEDIUM | MEDIUM | P2 |
| Decrypt reveal UX | MEDIUM | MEDIUM | P2 |
| Reusable typed hooks / code polish | HIGH (code-quality axis) | MEDIUM | P2 |
| Onchain admin registration UI | LOW | HIGH | P3 (defer) |

**Key:** P1 = must ship (table stakes / live-URL loop). P2 = the differentiators that win. P3 = defer.

---

## Competitor Feature Analysis

Competition = other bounty submissions (functionally near-identical by design). Observed prior-art reference: community "Riser" Sepolia ERC-7984 app.

| Feature | Typical submission | Our approach (edge) |
|---|---|---|
| Registry listing | Hardcode the mocks | Read onchain registry (Coverage) + hybrid config (Extensibility) + metadata resolution |
| Wrap/unwrap | Basic buttons, unclear async unwrap | Explicit tx-stage UI incl. unwrap "pending decryption" state (Correctness reads as trustworthy) |
| Decrypt | Registry tokens only | Any ERC-7984 via paste/auto-detect, cached signature |
| UX | Standard dashboard | Signature bottle animation + reveal interactions (the wedge) |
| Code | Working but ad hoc | Typed reusable hooks + real README/add-a-pair guide (Code-quality + Extensibility axes) |

---

## Sources

- `/zama-ai/fhevm` (context7): confidential-wrapper docs — `wrap`, `unwrap`, `finalizeUnwrap`, `setOperator`; registry read functions + `TokenWrapperPair` struct — HIGH
- `/zama-ai/relayer-sdk` (context7): user-decryption flow — `generateKeypair`, `getExtraData`, `createEIP712` (UserDecryptRequestVerification), `signTypedData`, `userDecrypt` — HIGH
- docs.zama.org — Sepolia addresses page: registry `0x2f07…128e` + 7 cTokenMock pairs (addresses/symbols); wrapper-registry page (read functions, struct) — HIGH
- zama.org bounty post (Season 3): required features + 6 judging axes + prize split — HIGH
- Faucet claim function name — MEDIUM (verify against deployed mock ERC-20 ABI on Sepolia before wiring)

---
*Feature research for: Zama Confidential Wrapper Registry dApp (Sepolia bounty)*
*Researched: 2026-07-07*
