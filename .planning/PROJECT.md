# Confidential Wrapper Registry App (Zama Bounty — Season 3)

## What This Is

A production-ready web dApp that turns the Zama **Wrappers Registry** into a usable product: it surfaces every official ERC-20 ↔ ERC-7984 confidential-token wrapper pair on Sepolia, lets users wrap/unwrap tokens, decrypt any ERC-7984 balance in their wallet via the EIP-712 user-decryption flow, and claim official cTokenMock test tokens from a Sepolia faucet. Built as a submission for the **Zama Developer Program — Mainnet Season 3 Bounty Track**, targeting a top prize by combining full feature coverage with a standout, animated UI.

## Core Value

When a judge or developer connects a wallet, **every registry wrapper pair is easy to find, wrap/unwrap works correctly onchain, and any ERC-7984 balance decrypts via a correct EIP-712 flow** — reducing ecosystem fragmentation by making "use the official registry" the path of least resistance. If everything else fails, the wrap → decrypt → unwrap loop on Sepolia must work flawlessly on the live URL.

## Business Context

- **Customer**: Zama bounty judges + the broader Zama developer ecosystem (devs who'd reuse this as a reference/template)
- **Revenue model**: Bounty prize pool — 3,000 cUSDT total, up to 3 winners (1st: 1,500 / 2nd: 1,000 / 3rd: 500); exceptional single submission may take the full pool
- **Success metric**: Placing in the bounty — ideally 1st. Judged on Coverage, Correctness, Extensibility, UX, Code quality, Production-readiness.
- **Strategy notes**: Differentiate on **UX/polish** — a premium, animated experience (ERC-20 "folded into a bottle → aged → opened as ERC-7984") is the wedge to stand out from functionally-similar submissions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Table stakes (must work on live URL, Sepolia):**
- [ ] Browse registry: read the **onchain** Wrappers Registry (Sepolia) as primary source of truth; render pairs with token metadata (symbol, decimals, name, addresses on both networks)
- [ ] Hybrid registry source: also support a **local config** for custom/dev-only pairs on top of the onchain source
- [ ] Include every official cTokenMock listed in the Sepolia Wrappers Registry docs
- [ ] Wrap flow: ERC-20 approval → wrap call (ERC-20 → ERC-7984) → confirmation
- [ ] Unwrap flow: ERC-7984 → ERC-20 with correct allowance / access-control setup
- [ ] User-decryption: EIP-712 decrypt of the connected wallet's balance for **any** ERC-7984 token (not just registered ones) — paste-an-address or auto-detect
- [ ] Sepolia faucet: claim official cTokenMock test tokens so users can immediately try wrap/unwrap
- [ ] Frontend integration with the FHEVM relayer SDK / fhevmjs
- [ ] Sensible error handling: missing approvals, insufficient balance, network mismatch, unsupported tokens
- [ ] Documented process (in README, with example) for adding a new ERC-20 ↔ ERC-7984 pair

**Differentiators (the wedge to win):**
- [ ] Premium, polished UI that reads as production-grade
- [ ] Signature "wrap" animation: contract folded into a bottle → aged → opened to reveal the ERC-7984 form (ambient audio via ElevenLabs, visuals via fal.ai)
- [ ] Clean, well-typed, well-documented open-source codebase

**Submission deliverables:**
- [ ] Public open-source GitHub repo with full source + README (live URL, supported networks, registry sourcing, add-a-pair guide, deploy scripts)
- [ ] Publicly accessible live deployment where judges can use every feature on Sepolia
- [ ] 3-minute real-person pitch video (no AI-generated video/voice) showing all flows
- [ ] X thread / article introducing the project

### Out of Scope

- Mainnet write operations — bounty judging is on Sepolia; mainnet registry is read-reference only
- Custom ERC-7984 token deployment UI — the registry + faucet cover token supply for the demo
- Onchain admin registration UI for new pairs — "add a pair" will be documented via local config (simplest reliable mechanism under deadline); onchain path noted as future
- Multi-wallet / account abstraction beyond standard injected wallet (e.g. MetaMask) connect

## Context

- **Bounty**: Zama Developer Program — Mainnet Season 3, Bounty Track. Deadline **July 7th, 23:59 AOE**.
- **Ecosystem problem being solved**: devs spin up their own testnet ERC-20s + ERC-7984 wrappers instead of the official registry, fragmenting the ecosystem. This app makes the canonical pairs the easy default.
- **Key resources**: FHEVM Solidity Library, Zama Relayer SDK (+ legacy relayer SDK / fhevmjs), Confidential token wrapper docs, Registry docs, Sepolia Wrappers Registry address, Ethereum (mainnet) Wrappers Registry address.
- **Anti-hallucination rule**: all Zama/FHEVM API details (registry ABI, relayer SDK calls, EIP-712 decryption flow, ERC-7984 interface) MUST be verified against official docs via **context7 MCP** — do not rely on training data for contract/SDK specifics.
- **Asset pipeline**: animation/image/video assets generated via **fal.ai** (user drives generation on request); ambient audio via **ElevenLabs**. UI components can be scaffolded with **magic MCP**.
- **Base**: Zama's official **fhevm-react-template** (Next.js) — relayer SDK, wagmi/viem, EIP-712 decrypt wiring come pre-integrated.

## Constraints

- **Timeline**: Hard deadline July 7th 23:59 AOE — ruthless prioritization; all table-stakes features + live deploy before deep polish.
- **Tech stack**: Next.js (official fhevm-react-template), FHEVM relayer SDK / fhevmjs, wagmi/viem, TypeScript. Sepolia testnet.
- **Correctness**: EIP-712 user-decryption and wrap/unwrap must produce correct onchain results — this is a top judging axis.
- **Deployment**: Must be a publicly accessible live URL, stable enough for judges to trust. Vercel free plan preferred; fall back to own server if animation assets exceed limits.
- **Licensing/openness**: Public GitHub repo, open source.
- **Demo authenticity**: Pitch video must be a real person — no AI-generated video or voice.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Base on official fhevm-react-template (Next.js) | Fastest path — relayer SDK, wagmi/viem, EIP-712 decrypt pre-wired; less integration risk under deadline | — Pending |
| UX/animation as primary differentiator | Submissions will be functionally similar; premium animated UI is the wedge to place 1st | — Pending |
| Hybrid registry: onchain primary + local config | Bounty requires reading onchain registry as source of truth plus supporting custom pairs | — Pending |
| "Add a pair" via documented local config | Simplest reliable mechanism to satisfy the extensibility requirement under deadline | — Pending |
| Deploy to Vercel (fallback: own server) | Zero-config Next.js deploy, instant HTTPS URL for judges; server fallback if asset weight is an issue | — Pending |
| Verify all Zama/FHEVM APIs via context7 MCP | Contract ABIs & SDK flows must be exact; avoid hallucinated names/signatures | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-07 after initialization*
