# Pitfalls Research

**Domain:** Zama FHEVM confidential-token dApp (ERC-20 ↔ ERC-7984 Wrappers Registry, relayer SDK, Next.js/Sepolia)
**Researched:** 2026-07-07
**Confidence:** HIGH for SDK/contract flows (grounded in official Zama + OpenZeppelin docs via context7); MEDIUM for Next.js/Vercel header specifics (well-known WASM pattern, docs page moved).

> **Deadline reality:** Every pitfall below is tagged with a demo-impact. The ones marked 🔴 DEMO-KILLER are the ones that make the live URL fail in front of judges — treat them as blocking before any polish work.

---

## Critical Pitfalls

### Pitfall 1: 🔴 DEMO-KILLER — Relayer SDK crashes under Next.js SSR (`window is not defined` / WASM on server)

**What goes wrong:**
The app builds locally but the Vercel build or first page load throws `window is not defined`, `ReferenceError: self is not defined`, or a WASM instantiation error. The whole route 500s and judges see a blank/error page.

**Why it happens:**
`createInstance({ ...SepoliaConfig, network: window.ethereum })` and `initSDK()` (which loads the TFHE WASM) reference browser-only globals (`window`, `WebAssembly`, `SharedArrayBuffer`). Next.js App Router renders components on the server by default, so any top-level import or module-scope call to the SDK executes during SSR/prerender and crashes. The browser entrypoint is `@zama-fhe/relayer-sdk/bundle`, not the node build.

**How to avoid:**
- Confine all SDK usage to Client Components (`'use client'`) and load it lazily. Never call `initSDK()`/`createInstance()` at module scope.
- Use `next/dynamic` with `{ ssr: false }` for the provider/component that owns the FHEVM instance, or gate calls behind a `useEffect` + `typeof window !== 'undefined'` check.
- Import from `@zama-fhe/relayer-sdk/bundle` for the browser. Call `await initSDK()` (loads WASM) BEFORE `createInstance()` — order matters; `createInstance` will fail if WASM isn't loaded.
- Keep the instance in a single React context/provider created once after mount, not per-render.

**Warning signs:**
`window is not defined` in `next build`, hydration mismatch warnings, or WASM 404s in the network tab. If it works with `next dev` but fails on `next build`/Vercel, this is almost always it.

**Phase to address:** Deploy + relayer-SDK integration (earliest — wire the client-only provider before any feature).

---

### Pitfall 2: 🔴 DEMO-KILLER — Missing COOP/COEP headers → SharedArrayBuffer/WASM blocked on the live URL

**What goes wrong:**
Everything works on `localhost` but on the deployed Vercel URL, `initSDK()` or encryption silently fails / throws because `SharedArrayBuffer` is undefined. Encryption and decryption never complete; buttons spin forever.

**Why it happens:**
The TFHE WASM uses `SharedArrayBuffer`, which browsers only expose when the document is **cross-origin isolated**. That requires two response headers on the HTML document:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)
`localhost` is often more permissive, hiding the problem until deploy.

**How to avoid:**
- Set the headers in `next.config.js` via the `headers()` function for all routes (or `vercel.json` `headers`). Verify `crossOriginIsolated === true` in the browser console on the live URL.
- Note: `require-corp` will block cross-origin subresources (images, audio from fal.ai/ElevenLabs CDNs, external RPC iframe widgets) unless they send `Cross-Origin-Resource-Policy` or you use `credentialless`. Plan asset hosting accordingly (self-host generated assets, or use `COEP: credentialless`).
- Confirm the WASM `.wasm` asset is actually served (not 404) with correct MIME `application/wasm`.

**Warning signs:**
`ReferenceError: SharedArrayBuffer is not defined`, `crossOriginIsolated` is `false` in console, encryption hangs only on deployed URL, or fal.ai/ElevenLabs assets suddenly fail to load after adding headers.

**Phase to address:** Deploy (must be validated on the real Vercel URL, not just localhost).

---

### Pitfall 3: 🔴 DEMO-KILLER — Decrypting a handle the wallet has NO ACL permission for

**What goes wrong:**
User pastes a token address (or auto-detects a balance), signs the EIP-712 message, and `userDecrypt` throws or returns nothing — even though the balance is clearly non-zero. Judges test the headline "decrypt any ERC-7984 balance" feature and it fails.

**Why it happens:**
On FHEVM you can only user-decrypt a ciphertext handle if the ACL has an entry `isAllowed(handle, userAddress) == true`. A well-behaved ERC-7984 grants the balance owner persistent access via `FHE.allow(balanceHandle, owner)` on every balance-changing op. But:
- Some tokens only granted `allowTransient` (transaction-scoped) — the permission is gone after the tx, so later decryption fails.
- The current on-chain balance handle changes on every transfer; you must decrypt the **latest** handle returned by `confidentialBalanceOf`, not a stale one you cached.
- A freshly wrapped/received balance where the contract forgot to `allow` the recipient is undecryptable by design.

**How to avoid:**
- Always read the **current** handle via the token's `confidentialBalanceOf(user)` (or equivalent view) immediately before decrypting; never reuse an old handle.
- Handle the "not permitted" case explicitly in the UI: catch the failure and show "This balance hasn't granted your wallet decryption access" rather than a spinner.
- For the "any token" feature, expect some tokens to be undecryptable and message that clearly — this is correct behavior, not a bug.

**Warning signs:**
`userDecrypt` rejects with an authorization/ACL error, works for registry cTokenMocks but fails for arbitrary tokens, or works right after your own wrap but not for tokens received another way.

**Phase to address:** Decrypt.

---

### Pitfall 4: 🔴 DEMO-KILLER — EIP-712 user-decryption signed/assembled wrong

**What goes wrong:**
`userDecrypt` rejects with a signature/verification error even though the wallet has ACL access. The decrypt flow never works.

**Why it happens:**
The user-decryption call has a precise, easy-to-break contract (verified against official relayer-sdk docs):
- The signature must be over **exactly** the `UserDecryptRequestVerification` type — passing the full `eip712.types` (which includes `EIP712Domain`) to `signTypedData` breaks it. Pass only `{ UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }`.
- `userDecrypt` expects the signature **with the `0x` stripped**: `signature.replace('0x', '')`. Passing the raw `0x…` signature fails.
- The `startTimeStamp` and `durationDays` used in `createEIP712` must be the **same values** passed to `userDecrypt`, and both are strings. A mismatch (e.g. regenerating the timestamp between calls) invalidates the signature.
- `contractAddresses` in the EIP-712 and the `handleContractPairs` contract addresses must be consistent and correctly checksummed.
- The request must be used within the `durationDays` window starting at `startTimeStamp`.

**How to avoid:**
Follow the canonical sequence exactly and compute the timestamp once:
```ts
const keypair = instance.generateKeypair();
const startTimeStamp = Math.floor(Date.now() / 1000).toString();
const durationDays = '10';
const contractAddresses = [contractAddress];
const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
const signature = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message,
);
const result = await instance.userDecrypt(
  [{ handle, contractAddress }],
  keypair.privateKey, keypair.publicKey,
  signature.replace('0x', ''),
  contractAddresses, signer.address,
  startTimeStamp, durationDays,
);
const value = result[handle];
```
Wrap this in one function so the timestamp/duration/keypair can't drift between the sign and the call.

**Warning signs:**
Signature-verification/invalid-signature errors from the relayer, works intermittently (timestamp drift), or fails only after you refactored the sign and decrypt into separate handlers.

**Phase to address:** Decrypt.

---

### Pitfall 5: 🔴 DEMO-KILLER — Unwrap treated as synchronous; ACL approval to the wrapper missing

**What goes wrong:**
The unwrap button "succeeds" (tx mines) but the user never receives ERC-20 tokens, or `unwrap` reverts outright. The wrap→decrypt→unwrap loop — the one flow the project says MUST work — breaks at the last step.

**Why it happens:**
ERC-7984→ERC-20 unwrap is a **two-step async flow**, not a single call (verified against OpenZeppelin `ERC7984ERC20Wrapper`):
1. `unwrap(from, to, encryptedAmount, inputProof)` burns the confidential amount and creates a decryption request via Zama's Gateway.
2. `finalizeUnwrap(burntAmount, burntAmountCleartext, decryptionProof)` runs **after** the gateway returns the cleartext and actually releases the ERC-20.
Additionally, per the docs: **"The caller must already be approved by ACL for the given amount."** If you don't grant the wrapper ACL access to the encrypted amount (either via the `inputProof` variant or an explicit `FHE.allow`/operator approval), `unwrap` reverts. Also the caller must be `from` or an approved ERC-7984 operator.

**How to avoid:**
- Model unwrap as pending → finalized in the UI. Don't mark it done at step 1; poll/listen for the finalize (or the ERC-20 `Transfer`) before showing success.
- Use the `unwrap(from, to, externalEuint64 encryptedAmount, bytes inputProof)` variant so the `inputProof` grants the wrapper ACL approval for the amount, OR set the wrapper as operator / call the ACL-approving path first.
- Ensure `to`/`from` and operator approvals are correct (caller is `from` or approved operator).

**Warning signs:**
`unwrap` reverts with an ACL/authorization error; tx succeeds but ERC-20 balance never increases; UI shows "done" while funds are still pending gateway decryption.

**Phase to address:** Wrap/Unwrap.

---

### Pitfall 6: 🔴 DEMO-KILLER — Wrap without ERC-20 approval, or losing dust to the rate rounding

**What goes wrong:**
`wrap` reverts (no allowance), or the user wraps `1000` units and the confidential balance shows a different-than-expected number, or small amounts wrap to **zero** and appear to vanish.

**Why it happens:**
`wrap(to, amount)` does `SafeERC20.safeTransferFrom(underlying, msg.sender, wrapper, amount - amount % rate())` then mints `(amount / rate())` as `euint64`. Two traps:
- It needs an ERC-20 `approve(wrapper, amount)` first — the classic approve-then-wrap ordering. Without it, `safeTransferFrom` reverts.
- The amount is **rounded down to the nearest multiple of `rate()`**. If `rate()` is 1000 and the user wraps 999, `amount % rate()` = 999 → they mint 0 and the transfer amount is 0. Dust below one confidential unit is silently dropped.

**How to avoid:**
- Always sequence: check allowance → `approve` if needed → `wrap`. Surface the approval as an explicit UI step (or use permit if supported).
- Read `rate()` and `decimals()` from the wrapper on-chain and show the user the effective wrappable amount (round down in the UI so the preview matches the result). Warn when the entered amount is below `rate()`.
- Consider approving the exact rounded amount to avoid leftover allowance.

**Warning signs:**
`ERC20InsufficientAllowance`/`safeTransferFrom` reverts, confidential balance smaller than expected, "I wrapped but nothing happened" for small amounts.

**Phase to address:** Wrap/Unwrap.

---

### Pitfall 7: 🔴 DEMO-KILLER — Decimals / rate mismatch between ERC-20 and ERC-7984

**What goes wrong:**
The UI shows wildly wrong balances (off by 1000x or 10^12), the wrap preview doesn't match the resulting confidential balance, and unwrap returns the wrong ERC-20 amount in the display.

**Why it happens:**
Three different scales are in play: the ERC-20's `decimals()` (often 18), the wrapper's `rate()` (e.g. 1000 = 1000 ERC-20 base units per 1 confidential unit), and the ERC-7984's `decimals()` (**recommended 6**). Confidential amounts are `euint64`, so they must fit in 64 bits — you cannot naively reuse 18-decimal math. Converting between the two without accounting for `rate()` AND both decimals produces garbage.

**How to avoid:**
- Never hardcode 18. Read `decimals()` from the ERC-20, `rate()` and `decimals()` from the wrapper, per pair, on-chain.
- Confidential unit ↔ ERC-20 base unit conversion: `erc20BaseUnits = confidentialUnits * rate()`. Format for display using the respective decimals.
- Validate that wrapped amounts fit in `uint64` (euint64) — huge 18-decimal amounts can overflow the confidential type.

**Warning signs:**
Balances off by powers of 10, wrap preview ≠ post-wrap decrypted balance, unwrap credits the wrong ERC-20 amount.

**Phase to address:** Wrap/Unwrap + Registry-read (metadata) + UI (formatting).

---

### Pitfall 8: 🔴 DEMO-KILLER — Hardcoding addresses instead of reading the on-chain registry / wrong network

**What goes wrong:**
Judges connect on Sepolia and see the wrong pairs, missing cTokenMocks, or "unsupported token" for tokens that should work — because addresses were copy-pasted and drifted, or the app is silently pointed at the wrong chain. The bounty explicitly requires reading the **on-chain** Wrappers Registry as source of truth.

**Why it happens:**
Under deadline pressure it's tempting to bake a static address list. Registry contents change; a stale list fails the "read on-chain registry" requirement and can miss official cTokenMocks. Separately, if the injected wallet is on Mainnet or another testnet, reads hit the wrong contracts and return empty/garbage.

**How to avoid:**
- Read pairs from the on-chain Sepolia Wrappers Registry contract at runtime as the primary source; layer the local config on top (hybrid, as specified) rather than replacing it.
- Only the Registry **address** and chain id are constants; everything else (pairs, token metadata) comes from chain calls. Verify against the official Sepolia registry address from Zama docs.
- Gate the whole app on `chainId === 11155111` (Sepolia); if not, show a "switch network" prompt and disable actions.
- Include every official cTokenMock the registry lists — enumerate from chain, don't curate by hand.

**Warning signs:**
Empty pair list on a fresh wallet, missing known cTokenMocks, features that only work on your dev machine's cached list, reads returning `0x` on a non-Sepolia network.

**Phase to address:** Registry-read (with network-guard in UI).

---

### Pitfall 9: DEMO-KILLER-adjacent — Wrong / unpinned SDK network config & relayer endpoint

**What goes wrong:**
`createInstance` connects but every encryption/decryption call fails, or public-key fetch times out, because the ACL/KMS/relayer addresses or `relayerUrl`/`gatewayChainId` don't match the current Sepolia deployment.

**Why it happens:**
`SepoliaConfig` bundles the correct contract addresses and `relayerUrl` for the SDK version. Hand-rolling the full manual config (aclContractAddress, kmsContractAddress, inputVerifierContractAddress, verifyingContractAddressDecryption, relayerUrl, gatewayChainId=10901, chainId=11155111) invites a stale/typo'd address. Zama also rotates testnet infra periodically, so a mismatched SDK version vs. deployed contracts breaks things.

**How to avoid:**
- Prefer `{ ...SepoliaConfig, network: window.ethereum }` and pin a known-good `@zama-fhe/relayer-sdk` version. Don't hand-assemble the manual config unless required.
- Pin the exact SDK version in `package.json` (no `^`) so a fresh Vercel build can't pull a breaking release the night before judging.
- If public-key fetch is slow/rate-limited, cache the instance and avoid re-creating it per action.

**Warning signs:**
Instance creates but encrypt/decrypt 4xx/5xx from relayer, public-key fetch hangs, works one day and breaks after a reinstall/redeploy.

**Phase to address:** Relayer-SDK integration + Deploy.

---

### Pitfall 10: Handle vs. ciphertext vs. cleartext confusion

**What goes wrong:**
Code passes an encrypted **input** (from `createEncryptedInput`) where a **handle** is expected, or tries to `userDecrypt` an input proof, or displays a `bytes32` handle as if it were the value.

**Why it happens:**
FHEVM has several distinct objects that all look like opaque bytes: encrypted **inputs + proofs** (produced client-side for writes, via `createEncryptedInput().add64().encrypt()`), on-chain **handles** (`bytes32`/`euintX`, references to ciphertext, used for reads/decryption), and **cleartext** values (the decrypted result). Mixing them silently fails.

**How to avoid:**
- Writes (wrap/unwrap amounts): build with `createEncryptedInput(contract, user)`, `.add64(BigInt(x))`, `.encrypt()` → pass `handles[0]` + `inputProof` to the contract.
- Reads (show a balance): get the `bytes32` handle from a view function, feed to `userDecrypt`.
- Name variables clearly (`handle`, `encryptedInput`, `inputProof`, `clear`) to avoid cross-wiring.

**Warning signs:**
Type errors between `externalEuint64`/`bytes32`, "invalid handle" from relayer, decrypt returns undefined for a value you just encrypted client-side.

**Phase to address:** Wrap/Unwrap + Decrypt.

---

### Pitfall 11: Faucet — claiming cTokenMock fails or leaves user unable to wrap

**What goes wrong:**
The faucet button reverts (rate-limited, already-claimed, or wrong mock address), or gives tokens the wrapper doesn't accept, so the wrap demo can't even start.

**Why it happens:**
cTokenMock faucet functions often have per-address cooldowns or caps; a second claim reverts. If the faucet hands out a token that isn't the ERC-20 underlying of a registry wrapper, the user can't wrap it. Users also frequently lack Sepolia ETH for gas.

**How to avoid:**
- Only faucet the official cTokenMock ERC-20s that are the `underlying()` of a registry wrapper. Verify the mint/claim function name and signature against the registry docs (don't guess).
- Handle "already claimed / cooldown" gracefully in the UI (show remaining balance, disable button) instead of surfacing a raw revert.
- Prominently link a Sepolia ETH faucet — no gas = no demo. Detect zero ETH balance and warn.

**Warning signs:**
Faucet reverts on second click, wrapped token "unsupported", txs fail with out-of-gas / insufficient funds.

**Phase to address:** Faucet.

---

### Pitfall 12: Encrypted input bound to the wrong contract/user address

**What goes wrong:**
Wrap/unwrap reverts on proof verification even though amounts look right.

**Why it happens:**
`createEncryptedInput(contractAddress, userAddress)` cryptographically binds the encrypted input + proof to that specific contract and caller. If you reuse an input across contracts, pass the wrapper address where the token is expected (or vice versa), or sign as a different address than `userAddress`, the input-verifier rejects it.

**How to avoid:**
- Create the encrypted input with the exact contract that will consume it and the exact connected wallet address for that transaction.
- Never cache/reuse an encrypted input across actions or accounts; regenerate per call.

**Warning signs:**
Input-verification/proof reverts, works for one contract but not another, fails after switching accounts.

**Phase to address:** Wrap/Unwrap.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode registry pairs/addresses instead of on-chain read | Fast to ship the list UI | Fails the explicit "read on-chain registry" bounty requirement; drifts; misses cTokenMocks | Never for judged features; OK only as the *local-config layer* on top of on-chain reads |
| Recreate FhevmInstance on every action | Simpler code | Repeated WASM init + public-key fetch = slow, rate-limit risk, laggy demo | Never — cache in a provider |
| Skip approval-state check, always send `approve` | Fewer branches | Extra tx + wallet popup every wrap; worse UX; wasted Sepolia ETH | MVP only if allowance-read is flaky |
| Mark unwrap "done" at step 1 (skip finalize tracking) | Simpler UI state | Users think funds arrived when they haven't; looks broken to judges | Never for the headline loop |
| Loose SDK version (`^`) | Auto-updates | A breaking SDK release can brick the pre-judging redeploy | Never before a deadline — pin exact |
| `COEP: credentialless` to unblock external assets | fal.ai/ElevenLabs assets load | Subtle cross-origin behavior differences | Acceptable; verify SharedArrayBuffer still works |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| relayer-sdk in Next.js | Importing/initializing at module scope or in a Server Component | `'use client'` + `next/dynamic({ssr:false})`; `await initSDK()` before `createInstance()`; import from `/bundle` |
| Vercel deploy | Only testing localhost; no COOP/COEP headers | Set `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` in `next.config`/`vercel.json`; verify `crossOriginIsolated` on live URL |
| ERC-7984 wrapper | Wrap without `approve`; ignore `rate()` rounding | Read allowance + `rate()`/`decimals()` on-chain; approve then wrap; round preview down |
| Unwrap | Treat as one synchronous call; forget ACL approval to wrapper | Two-step (unwrap → finalizeUnwrap); grant wrapper ACL via `inputProof` variant/operator; UI pending state |
| User-decryption | Sign full `eip712.types`; keep `0x` on signature; timestamp drift | Sign only `UserDecryptRequestVerification`; `signature.replace('0x','')`; compute timestamp/duration once |
| Wallet/chain | Assume Sepolia | Guard `chainId===11155111`; prompt switch; disable actions off-network |
| cTokenMock faucet | Guess claim fn; ignore cooldown; no ETH check | Verify claim signature vs docs; handle cooldown; warn on zero Sepolia ETH |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-running `initSDK()`/`createInstance()` per interaction | Multi-second lag before each encrypt/decrypt; relayer rate-limits | Init once in a context/provider; memoize the instance | Immediately on a live demo with a few clicks |
| Decrypting many balances eagerly on page load | Slow first paint; N signature prompts; relayer throttling | Decrypt on-demand per token (button), batch handles in one `userDecrypt` call | As soon as the registry lists several tokens |
| Serving large fal.ai/ElevenLabs assets under `require-corp` | Assets blocked or huge bundle; slow load on Vercel | Self-host + set CORP header, or lazy-load; keep hero animation off critical path | On judge's first (uncached) load |
| Polling for unwrap finalize with tight interval | RPC rate limits | Reasonable backoff or event listener on finalize/Transfer | During the unwrap demo |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Assuming a decrypted balance is "private to the UI" | Cleartext logged/exposed; defeats confidentiality story | Never console.log cleartext in prod; treat `userDecrypt` results as sensitive |
| Trusting client-side amount without on-chain rounding awareness | User loses dust unknowingly | Show exact wrappable amount from `rate()` before signing |
| Reusing keypair/signature across sessions or sharing publicKey misuse | Decryption request replay/confusion | Generate a fresh keypair per decrypt session; scope signature to timestamp+duration |
| Leaving manual SDK config with stale KMS/ACL addresses | Silent connection to wrong infra | Use `SepoliaConfig`; pin SDK version |
| No network guard | User signs/sends on wrong chain, funds/tx wasted | Hard chain-id gate before any write |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No approval step surfaced before wrap | Confusing double wallet popup or silent revert | Explicit "Approve then Wrap" two-state button with status |
| Unwrap shows success before finalize | User thinks ERC-20 arrived; it hasn't | Pending → Finalized states; wait for finalizeUnwrap/Transfer |
| Raw revert strings shown to judges | Looks broken/unpolished | Map known errors (allowance, ACL, cooldown, wrong network, insufficient balance, unsupported token) to friendly messages — the bounty explicitly judges this |
| No network-mismatch handling | Blank pages / failed reads on wrong chain | Detect + prompt "Switch to Sepolia", disable actions |
| Decrypt spinner with no "no ACL access" path | Infinite spinner on undecryptable tokens | Catch and explain: "This token hasn't granted your wallet access" |
| No Sepolia ETH guidance | User can't pay gas, demo dead-ends | Detect zero ETH, link a faucet |
| Wrong decimal formatting | Scary 10^18 numbers | Format with correct decimals + rate per pair |

## "Looks Done But Isn't" Checklist

- [ ] **Relayer SDK:** Works on `next dev` but verify it survives `next build` AND the live Vercel URL (SSR + COOP/COEP).
- [ ] **crossOriginIsolated:** Confirm `crossOriginIsolated === true` in console on the deployed URL, not just localhost.
- [ ] **Wrap:** Preview amount equals post-wrap decrypted balance (rate rounding accounted for); approval step present.
- [ ] **Unwrap:** ERC-20 balance actually increases after `finalizeUnwrap`, not just after `unwrap`; ACL approval to wrapper in place.
- [ ] **Decrypt:** Works for a token you did NOT wrap yourself (real "any ERC-7984" coverage), and gracefully fails on a no-ACL token.
- [ ] **EIP-712:** Signature strips `0x`; only `UserDecryptRequestVerification` signed; timestamp/duration identical between sign and `userDecrypt`.
- [ ] **Registry:** Pair list comes from on-chain reads on a fresh wallet/incognito, and includes every official cTokenMock.
- [ ] **Network:** App behaves correctly (guards, prompts) when wallet is on Mainnet/another testnet.
- [ ] **Faucet:** Second claim / cooldown handled; user has a path to Sepolia ETH.
- [ ] **SDK version:** Pinned exactly; a clean `npm ci` + fresh deploy still works.
- [ ] **Assets:** fal.ai/ElevenLabs media still load after COOP/COEP headers are enabled.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSR crash / `window is not defined` | LOW | Wrap SDK usage in `'use client'` + `dynamic({ssr:false})`; move init into `useEffect` |
| Missing COOP/COEP on live URL | LOW | Add headers in `next.config`/`vercel.json`, redeploy, verify `crossOriginIsolated` |
| userDecrypt signature errors | LOW | Re-check: strip `0x`, sign only `UserDecryptRequestVerification`, single timestamp |
| Unwrap funds "stuck" | MEDIUM | Ensure ACL approval to wrapper; call/await `finalizeUnwrap`; add pending-state tracking |
| Stale/hardcoded registry list | MEDIUM | Replace static list with on-chain registry read; keep local config as overlay |
| Breaking SDK auto-update pre-judging | MEDIUM | Pin exact prior version, `npm ci`, redeploy; test the full loop |
| Decimals/rate math wrong | MEDIUM | Centralize conversion using on-chain `rate()`+`decimals()`; unit-test the formatter |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SSR/WASM crash (#1) | Relayer-SDK integration / Deploy | `next build` + live URL load clean; instance created only client-side |
| COOP/COEP headers (#2) | Deploy | `crossOriginIsolated===true` on Vercel URL; encrypt works remotely |
| No ACL permission on decrypt (#3) | Decrypt | Decrypt succeeds for owned balances; graceful message for no-ACL tokens |
| EIP-712 assembled wrong (#4) | Decrypt | Successful `userDecrypt` returning correct cleartext repeatedly |
| Unwrap async + ACL (#5) | Wrap/Unwrap | ERC-20 credited only after finalize; no reverts |
| Wrap approval + dust (#6) | Wrap/Unwrap | Approve→wrap works; small-amount and preview behavior correct |
| Decimals/rate mismatch (#7) | Wrap/Unwrap + Registry-read + UI | Preview == decrypted result; on-chain `rate()`/`decimals()` used |
| Hardcoded registry / wrong network (#8) | Registry-read + UI network guard | Fresh-wallet on-chain list; chain-id gate works |
| Wrong SDK/relayer config (#9) | Relayer-SDK integration / Deploy | `SepoliaConfig` used; pinned version; encrypt/decrypt round-trip |
| Handle/ciphertext confusion (#10) | Wrap/Unwrap + Decrypt | Clear var naming; input vs handle paths tested |
| Faucet cooldown/wrong token (#11) | Faucet | Claim works, cooldown handled, faucet token is a registry underlying |
| Encrypted input mis-bound (#12) | Wrap/Unwrap | Input created per-contract/per-user; proofs verify |

## Sources

- Zama Relayer SDK docs (via context7 `/zama-ai/relayer-sdk`): `initSDK`/`createInstance`/`SepoliaConfig`, full user-decryption flow (`generateKeypair`, `createEIP712`, `signTypedData` with `UserDecryptRequestVerification`, `userDecrypt` params, `signature.replace('0x','')`). HIGH confidence (official).
- Zama FHEVM docs (via context7 `/zama-ai/fhevm`): ACL model — `FHE.allow`/`allowThis`/`allowTransient`/`allowForDecryption`/`isAllowed`; only ACL-permitted addresses can user-decrypt a handle. HIGH confidence (official).
- OpenZeppelin Confidential Contracts (via context7 `/websites/openzeppelin_confidential-contracts`): `ERC7984ERC20Wrapper.wrap` (rate rounding, `safeTransferFrom`), `unwrap`/`finalizeUnwrap` async flow, "caller must already be approved by ACL for the given amount," `rate()`/`decimals()` (recommended 6). HIGH confidence (official).
- COOP/COEP + `SharedArrayBuffer` requirement for TFHE WASM: browser cross-origin-isolation standard + community/Wasmer/Vercel deployment notes. MEDIUM confidence (well-established pattern; exact Zama init page had moved at research time).
- Project context: `.planning/PROJECT.md` (Zama Season 3 bounty, Sepolia, fhevm-react-template, judged on Correctness/Production-readiness/UX).

---
*Pitfalls research for: Zama FHEVM confidential-token dApp (Wrappers Registry)*
*Researched: 2026-07-07*
