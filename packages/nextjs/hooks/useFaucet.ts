"use client";

import { type Address, parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { clampFaucetAmount } from "~~/lib/faucetErrors";
import { erc20MintAbi } from "~~/registry/abis";

/**
 * useFaucet — the FCT-01 claim engine (04-RESEARCH Pattern 1).
 *
 * A thin wagmi write over the cTokenMock underlying ERC-20's public
 * `mint(to, amount)`. NO SDK, NO FHE — the mint is a plain unrestricted ERC-20
 * write (except tGBP, handled at the UI via `toFaucetError({ restricted })`).
 *
 * Success is the RECEIPT, never the submit (04-RESEARCH Pitfall 6):
 * `useWaitForTransactionReceipt` keyed on the returned `txHash` drives
 * `confirming`/`isSuccess`. The amount is clamped (`clampFaucetAmount` ≤
 * 1,000,000, T-04-01) then scaled by the token's own decimals via
 * `parseUnits` — never hardcode 18 (04-RESEARCH Pitfall 1).
 */
export function useFaucet() {
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  /**
   * Mint `whole` (clamped) test tokens of `underlying` to `to`, scaling by the
   * token's `decimals`. Returns the submitted tx hash. Throws on wallet
   * rejection / revert — the caller classifies via `toFaucetError`.
   */
  async function claim(underlying: Address, to: Address, whole: string | number, decimals: number) {
    const amount = parseUnits(String(clampFaucetAmount(whole)), decimals);
    return writeContractAsync({
      address: underlying,
      abi: erc20MintAbi,
      functionName: "mint",
      args: [to, amount],
    });
  }

  return { claim, txHash, isPending, confirming, isSuccess, error };
}
