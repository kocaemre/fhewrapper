"use client";

import type { ReactNode } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";

/**
 * ChainGuard — Sepolia network gate (FND-02).
 *
 * RainbowKit alone does not flag a wrong network here: the template's wagmi
 * config auto-adds mainnet (for ENS) and hardhat, so an explicit chain-id gate
 * is required. The Sepolia chain id is derived from the imported `sepolia`
 * chain object (`sepolia.id === 11155111`) — never a bare numeric literal.
 *
 * States:
 * - Not connected            -> render the RainbowKit connect button.
 * - Connected, wrong network -> render a "switch to Sepolia" prompt (disabled
 *                               while pending) and WITHHOLD `children`.
 * - Connected, on Sepolia    -> render `children` (the guarded content).
 *
 * Presentation-light by design (Phase 7 themes it).
 */
export function ChainGuard({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    return <RainbowKitCustomConnectButton />;
  }

  if (chainId !== sepolia.id) {
    return (
      <button disabled={isPending} onClick={() => switchChain({ chainId: sepolia.id })}>
        {isPending ? "Switching…" : "Wrong network — switch to Sepolia"}
      </button>
    );
  }

  return <>{children}</>;
}
