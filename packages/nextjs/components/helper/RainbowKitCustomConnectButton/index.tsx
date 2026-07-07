"use client";

// @refresh reset
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address } from "viem";
import { useTargetNetwork } from "~~/hooks/helper/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/helper";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const blockExplorerAddressLink = account
          ? getBlockExplorerAddressLink(targetNetwork, account.address)
          : undefined;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button
                    // Cellar Registry primary CTA: the `--block` inverse fill (dark ink /
                    // cream label in parchment; cream / dark label in cellar) from the
                    // design (.dc.html connect button), with a soft rounded radius.
                    className="cursor-pointer font-semibold transition-transform hover:-translate-x-px hover:-translate-y-px"
                    style={{
                      border: "2px solid var(--line)",
                      background: "var(--block)",
                      color: "var(--block-fg)",
                      padding: "10px 20px",
                      borderRadius: "9px",
                      fontFamily: "var(--font-gelasio), Georgia, serif",
                      fontSize: "15px",
                      boxShadow: "var(--shadow)",
                    }}
                    onClick={openConnectModal}
                    type="button"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return <WrongNetworkDropdown />;
              }

              return (
                <>
                  <div className="flex flex-col items-center mr-1 text-[color:var(--ink)]">
                    <Balance address={account.address as Address} className="min-h-0 h-auto" />
                    <span className="text-xs text-[color:var(--muted)]">{chain.name}</span>
                  </div>
                  <AddressInfoDropdown
                    address={account.address as Address}
                    displayName={account.displayName}
                    ensAvatar={account.ensAvatar}
                    blockExplorerAddressLink={blockExplorerAddressLink}
                  />
                </>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
