# Requirements: Confidential Wrapper Registry App (Zama Bounty S3)

**Defined:** 2026-07-07
**Core Value:** The wrap → decrypt → unwrap loop works flawlessly on a live Sepolia URL — every official registry pair easy to find, wrap/unwrap correct onchain, any ERC-7984 balance decryptable via a correct EIP-712 flow.

## v1 Requirements

Requirements for the bounty submission. Each maps to a roadmap phase. Every table-stakes item is mandated by the bounty — missing any is a disqualifying gap.

### Foundation & Deploy

- [x] **FND-01**: App boots from the official `fhevm-react-template` (Next.js App Router, wagmi/viem, RainbowKit) pinned to `@zama-fhe/sdk`/`@zama-fhe/react-sdk` ^3.2.0
- [x] **FND-02**: User can connect an injected wallet (MetaMask) and the app detects/prompts a switch to Sepolia (chain-id guard)
- [x] **FND-03**: FHE SDK is initialized client-only (`initSDK()` → `createInstance`/`ZamaProvider`) behind a memoized provider — no SSR/module-scope init
- [x] **FND-04**: A publicly accessible live deployment exists where `crossOriginIsolated === true` (COOP/COEP headers set) — verified on the real URL, not localhost

### Registry Browse

- [ ] **REG-01**: App reads the **onchain** Sepolia Wrappers Registry (`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`) as source of truth (never hardcoded pairs)
- [ ] **REG-02**: Revoked pairs are filtered client-side via `isValid`
- [ ] **REG-03**: Token metadata (symbol, decimals, name) is resolved from the token contracts (multicall) since the registry stores only addresses + isValid
- [ ] **REG-04**: All 7 official cTokenMocks (cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP, cXAUt) surface in the UI
- [ ] **REG-05**: Hybrid sourcing — a local config (`registry/pairs.config.ts`) overlays custom/dev pairs, deduped by confidential-token address (onchain wins on conflict)
- [ ] **REG-06**: Each pair card shows both-network addresses, symbol/name/decimals, and valid/revoked status
- [ ] **REG-07**: README documents the add-a-pair process with a concrete example (local config mechanism)

### User-Decryption (EIP-712)

- [ ] **DEC-01**: User can decrypt the connected wallet's balance for any ERC-7984 token via the EIP-712 user-decryption flow
- [ ] **DEC-02**: Decryption works for tokens **outside** the registry (paste-an-address and/or auto-detect)
- [ ] **DEC-03**: EIP-712 payload is assembled correctly (sign only `UserDecryptRequestVerification`, consistent timestamp/duration), signature cached for its validity window
- [ ] **DEC-04**: The "no ACL access" case is detected and messaged gracefully (some arbitrary tokens are undecryptable by design)

### Faucet (Sepolia)

- [ ] **FCT-01**: User can claim the official cTokenMock underlying ERC-20 test tokens from the app
- [ ] **FCT-02**: Faucet handles cooldown, insufficient-ETH, and wrong-network cases gracefully

### Wrap

- [ ] **WRP-01**: User can wrap a registry ERC-20 into its ERC-7984 equivalent (approve → wrap → confirmation)
- [ ] **WRP-02**: Wrap reads `rate()` + `decimals()` per pair onchain and previews the resulting amount (rounds down; warns below one confidential unit) — never hardcodes 18 decimals

### Unwrap

- [ ] **UNW-01**: User can unwrap an ERC-7984 back to its ERC-20 (encrypted input → unwrap) with correct wrapper ACL / allowance setup
- [ ] **UNW-02**: The two-step async flow is modeled — an explicit pending→finalized state; success shown only when the ERC-20 actually arrives (`finalizeUnwrap` completion)

### UX & Error Handling

- [ ] **UX-01**: Typed, human-readable error handling for missing approvals, insufficient balance, network mismatch, unsupported tokens, ACL denial, and faucet cooldown
- [ ] **UX-02**: Status system — toasts, transaction-stage indicators, and block-explorer links across every write flow
- [ ] **UX-03**: The async unwrap "pending decryption" wait is presented as production-grade UX, not a silent hang

### Differentiator & Polish

- [ ] **DIF-01**: Signature "wrap" animation (contract → folded into bottle → aged → opened as ERC-7984), driven by real tx lifecycle, skippable
- [ ] **DIF-02**: Animation/audio assets (fal.ai video, ElevenLabs ambient audio) are **self-hosted in `/public`** (COEP `require-corp` blocks cross-origin media)
- [ ] **DIF-03**: Decrypt-any-token reveal micro-interaction (blurred → decrypts in place)
- [ ] **DIF-04**: Registry browser polish — search/filter, valid/revoked badges, copy buttons
- [ ] **DIF-05**: Clean, well-typed, reusable hooks (`useRegistry`, `useWrap`, `useUnwrap`, `useUserDecrypt`) — a code-quality judging axis

### Submission Deliverables

- [ ] **SUB-01**: Public, open-source GitHub repository with full source code
- [ ] **SUB-02**: README covers live URL, supported networks, how the registry is sourced, how to add a new pair, and deployment scripts
- [ ] **SUB-03**: Publicly accessible live deployment where judges can use every feature on Sepolia
- [ ] **SUB-04**: 3-minute real-person pitch video (no AI-generated video/voice) showing browse → faucet → wrap → decrypt → unwrap → decrypt an arbitrary out-of-registry ERC-7984, plus how a new pair is added
- [ ] **SUB-05**: A thread or article published on X introducing the project

## v2 Requirements

Deferred — acknowledged but not in the current roadmap.

### Extensibility

- **EXT-01**: Onchain admin UI to call `registerConfidentialToken` for adding pairs (vs documented local config)
- **EXT-02**: Live react-three-fiber 3D bottle scene (vs pre-rendered fal.ai video)
- **EXT-03**: Multi-wallet / account-abstraction connect support

## Out of Scope

Explicitly excluded to prevent scope creep.

| Feature                             | Reason                                                         |
| ----------------------------------- | -------------------------------------------------------------- |
| Mainnet write operations            | Judging is on Sepolia; mainnet registry is read-only reference |
| Custom ERC-7984 token deployment UI | Registry + faucet cover token supply for the demo              |
| AI-generated pitch video / voice    | Bounty explicitly forbids it — real-person pitch only          |
| Custom onchain indexer / backend    | App is client-only; onchain is the source of record            |

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| FND-01      | Phase 1 | Complete |
| FND-02      | Phase 1 | Complete |
| FND-03      | Phase 1 | Complete |
| FND-04      | Phase 1 | Complete |
| REG-01      | Phase 2 | Pending  |
| REG-02      | Phase 2 | Pending  |
| REG-03      | Phase 2 | Pending  |
| REG-04      | Phase 2 | Pending  |
| REG-05      | Phase 2 | Pending  |
| REG-06      | Phase 2 | Pending  |
| REG-07      | Phase 2 | Pending  |
| DEC-01      | Phase 3 | Pending  |
| DEC-02      | Phase 3 | Pending  |
| DEC-03      | Phase 3 | Pending  |
| DEC-04      | Phase 3 | Pending  |
| FCT-01      | Phase 4 | Pending  |
| FCT-02      | Phase 4 | Pending  |
| WRP-01      | Phase 4 | Pending  |
| WRP-02      | Phase 4 | Pending  |
| UNW-01      | Phase 5 | Pending  |
| UNW-02      | Phase 5 | Pending  |
| UX-01       | Phase 6 | Pending  |
| UX-02       | Phase 6 | Pending  |
| UX-03       | Phase 6 | Pending  |
| DIF-01      | Phase 7 | Pending  |
| DIF-02      | Phase 7 | Pending  |
| DIF-03      | Phase 7 | Pending  |
| DIF-04      | Phase 7 | Pending  |
| DIF-05      | Phase 7 | Pending  |
| SUB-01      | Phase 7 | Pending  |
| SUB-02      | Phase 7 | Pending  |
| SUB-03      | Phase 1 | Pending  |
| SUB-04      | Phase 7 | Pending  |
| SUB-05      | Phase 7 | Pending  |

**Coverage:**

- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

> Note: an earlier coverage summary stated "33 total" — recounted at roadmap creation, the distinct v1 requirement IDs number 34 (FND×4, REG×7, DEC×4, FCT×2, WRP×2, UNW×2, UX×3, DIF×5, SUB×5). All 34 are mapped to exactly one phase; the corrected count is 34/34.

---

_Requirements defined: 2026-07-07_
_Last updated: 2026-07-07 after roadmap creation (traceability confirmed, coverage recount 33 → 34)_
