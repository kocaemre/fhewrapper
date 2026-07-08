---
phase: 07-polish-animation-submission
type: manual-uat
status: pending
deferred: true
when: end-of-project (single manual session before final submission)
url: https://fhewrapper-nextjs.vercel.app/
repo: https://github.com/kocaemre/fhewrapper
requirements: [SUB-01, SUB-04, SUB-05]
resolves: "The outward / human-only submission acts (flip repo public, record the real-person pitch video, publish the X thread) plus the single end-of-project live-URL verification pass — none of which can or should be done autonomously"
---

# Phase 7 — Deferred Submission + Live-URL Verification (USER-OWNED)

Everything here is **outward, human-only, or hard-to-reverse** — a public reveal, a real-person
video, a social post, and wallet/relayer-dependent live checks. Under the floor-it directive these
were **intentionally deferred to the user** and are NOT done autonomously. The autonomous docs work
(SUB-02 README) is already committed; run this single session when you are ready to submit.

**Automated gates already green at phase close** (so you only run the human/live items below):
`check-types` exit 0, `next build` emits every route (`/`, `/faucet`, `/wrap`, `/unwrap`, `/decrypt`),
full `vitest` suite green (130 passed). The exact-`3.0.0` SDK pin is guarded by
`packages/nextjs/scripts/check-pins.mjs`.

Mark each `[ ]` → `[x]` and fill results.

## 0. Preconditions

- [ ] Latest commit deployed to the live URL (Phase-1 GitHub → Vercel pipeline; Root Directory `packages/nextjs`, `NEXT_PUBLIC_IPFS_BUILD` unset).
- [ ] `crossOriginIsolated === true` on load (the shell surfaces it).
- [ ] MetaMask connected on **Sepolia** (chain id `11155111`) via the ChainGuard/connect flow.
- [ ] Wallet holds some Sepolia ETH for gas and a wrapped confidential balance in at least one registry pair (or run a wrap first, which also exercises the cinematic).
- [ ] **Secret pre-check (gates SUB-01 below):** no secret / real `.env` / private key is tracked in git. Run a secret scan and confirm it is GREEN before making the repo public — see SUB-01.

## SUB-01 — Flip the repository to PUBLIC (hard-to-reverse)

The repo `github.com/kocaemre/fhewrapper` is private. Making it public exposes **every tracked file
forever** — so this is gated on a clean secret scan.

- [ ] **Secret scan is green.** Run `gitleaks detect --source . --no-banner` (or confirm the CI gitleaks job is green) and verify **zero findings**. Also eyeball: no `.env` / `.env.local` is tracked (`git ls-files | grep -E '\.env'` returns nothing but `.env.example`), and the README documents only env var **names** (e.g. `NEXT_PUBLIC_ALCHEMY_API_KEY`), never values.
- [ ] With the scan green, flip the repo public **when ready**:
  ```bash
  gh repo edit kocaemre/fhewrapper --visibility public
  ```
- [ ] Confirm the repo loads for a logged-out visitor and the LICENSE (BSD-3-Clause-Clear) is present.
- Result: _______________________________________________

## SUB-04 — Record the 3-minute REAL-PERSON pitch video

The bounty **forbids AI-generated video or voice** — it must be a real person on camera/mic. Keep it
to ~3 minutes on the live URL. Suggested shot list / script beats (the full loop the judges want):

1. **Intro (real person, ~15s)** — who you are, one line on the problem (registry fragmentation) and the pitch (make "use the official registry" the path of least resistance).
2. **Browse** — the registry grid reading live onchain; show search + a valid/revoked badge + copy an address.
3. **Faucet** — claim an underlying ERC-20 (e.g. USDC) and show the success toast + Etherscan link.
4. **Wrap** — wrap the ERC-20 → ERC-7984; let the **cinematic play on the real tx** and land on success only at the mined tx.
5. **Decrypt** — user-decrypt the new confidential balance (blur → reveal) via the EIP-712 permit.
6. **Unwrap** — unwrap back to ERC-20; narrate the honest pending → finalize wait and show success only when the ERC-20 arrives.
7. **Decrypt an out-of-registry ERC-7984** — paste an arbitrary ERC-7984 address and decrypt it (and/or show the graceful "no ACL access" case).
8. **Add-a-pair** — show `registry/pairs.config.ts` and explain the one-object overlay (onchain-wins dedup).
9. **Close** — the live URL on screen.

- [ ] Video recorded (real person, no AI voice/video), ≤ ~3 min, covers browse → faucet → wrap → decrypt → unwrap → decrypt-out-of-registry → add-a-pair.
- [ ] Uploaded and the link is ready for the submission.
- Result: _______________________________________________

## SUB-05 — Publish the X thread / article

- [ ] Write and publish an X thread (or article) introducing The Cellar Registry — the problem, the live URL, the wrap→decrypt→unwrap loop, and the confidential-token angle.
- [ ] Include the live URL and (once SUB-01 is done) the public repo link.
- [ ] Link saved for the submission form.
- Result: _______________________________________________

## Live-URL verification pass (the single end-of-project manual session)

Run every check on the **live deployed URL**, not localhost — the real relayer under COEP
`require-corp` is the gate. This consolidates the deferred Phase-7 checks; the earlier phases' UATs
(`03-UAT.md` decrypt, `04-UAT.md` faucet/wrap, `05-UAT.md` unwrap, `06-UAT.md` error/status) cover the
per-flow depth — run those too if not yet done. Key Phase-7 items:

### Cinematic honesty (DIF-01)

- [ ] The wrap cinematic plays on a **REAL** wrap (fold → insert → seal → age → pop → token), driven by the tx lifecycle — it does **not** show a fake success before the tx mines; the "opened as ERC-7984" reveal lands only at the mined tx.
- [ ] The cinematic is **skippable** (Esc / a Skip control) and skipping does not break the wrap.
- [ ] Under `prefers-reduced-motion: reduce` it degrades (no heavy motion) while the wrap still completes.
- Result: _______________________________________________

### Ambient audio (DIF-02)

- [ ] Audio does **not** autoplay on load (browser gesture policy respected).
- [ ] It unlocks and loops after a user gesture (unmute); muting stops it cleanly.
- Result: _______________________________________________

### Media under COEP `require-corp` (DIF-02 / FND-04)

- [ ] All `/cinematic/*.mp4` and `/audio/cellar-ambient.mp3` load (self-hosted) with **no** COEP/CORP console errors.
- [ ] `crossOriginIsolated === true` **stays true** with the media loaded (media did not break isolation).
- Result: _______________________________________________

### Full loop end-to-end

- [ ] The complete **wrap → decrypt → unwrap** loop completes on the live URL: wrap succeeds, the confidential balance decrypts, and the unwrap finalizes with the ERC-20 arriving back.
- Result: _______________________________________________

## Notes / anomalies

_Record anything that read awkwardly, any missing toast/explorer link, any COEP console error, and any
moment the cinematic or async wait felt dishonest or like a hang:_

_______________________________________________
