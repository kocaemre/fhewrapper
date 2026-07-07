/**
 * Minimal, hand-written ABIs — anti-hallucination compliant (CONTEXT decision A).
 *
 * Transcribed VERBATIM from 02-RESEARCH.md "Code Examples", whose signatures
 * were verified end-to-end via THREE agreeing sources:
 *   - Zama docs (context7 /websites/zama, wrapper-registry.md)
 *   - GitHub zama-ai/protocol-apps ConfidentialTokenWrappersRegistry.sol
 *   - a live Sepolia eth_call (2026-07-07)
 * Do NOT invent selectors — guessed function names silently return 0x and break.
 */

/** ConfidentialTokenWrappersRegistry (Sepolia 0x2f0750…128e). */
export const registryAbi = [
  {
    type: "function",
    name: "getTokenConfidentialTokenPairs",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getTokenConfidentialTokenPairsLength",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getTokenConfidentialTokenPairsSlice",
    stateMutability: "view",
    inputs: [
      { name: "fromIndex", type: "uint256" },
      { name: "toIndex", type: "uint256" },
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getConfidentialTokenAddress",
    stateMutability: "view",
    inputs: [{ name: "tokenAddress", type: "address" }],
    outputs: [{ type: "bool" }, { type: "address" }],
  },
  {
    type: "function",
    name: "isConfidentialTokenValid",
    stateMutability: "view",
    inputs: [{ name: "confidentialTokenAddress", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

/**
 * ERC-20 / ERC-7984 metadata fragment. Verified live: BOTH the underlying
 * ERC-20 and the confidential ERC-7984 wrapper expose these.
 */
export const erc20MetadataAbi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;
