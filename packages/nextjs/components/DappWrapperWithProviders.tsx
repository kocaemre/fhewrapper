"use client";

import { useEffect, useMemo, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { IndexedDBStorage, RelayerWeb, SepoliaConfig, type ZamaSDKEvent } from "@zama-fhe/sdk";
import { RelayerCleartext, hardhatCleartextConfig } from "@zama-fhe/sdk/cleartext";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider, useChainId } from "wagmi";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/helper";
import { SideMotifs } from "~~/components/registry/SideMotifs";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
// Swap to `@zama-fhe/react-sdk/wagmi` once a patched stable ships — the fix
// is already in the alpha track (≥ 3.0.0-alpha.16). See wagmiSigner.ts.
import { WagmiSigner } from "~~/services/web3/wagmiSigner";

// Module-scoped — the signer, keypair store and session store are chain-agnostic
// and there's no reason to rebuild them on chain change. IndexedDBStorage lets
// the keypair + EIP-712 session survive page reloads, matching Zama's hosted
// app patterns.
const signer = new WagmiSigner({ config: wagmiConfig });
const storage = new IndexedDBStorage("KeypairStore", 1);
const sessionStorage = new IndexedDBStorage("SignatureStore", 1);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Swap RelayerCleartext for local anvil (31337), RelayerWeb for real networks.
// Rebuild on chain change so the right transport/worker is in place.
const ZamaRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const chainId = useChainId();

  const relayer = useMemo(() => {
    if (chainId === 31337) {
      return new RelayerCleartext(hardhatCleartextConfig);
    }
    return new RelayerWeb({
      getChainId: () => signer.getChainId(),
      transports: {
        [SepoliaConfig.chainId]: SepoliaConfig,
      },
    });
  }, [chainId]);

  useEffect(() => {
    return () => {
      relayer.terminate();
    };
  }, [relayer]);

  function dispatchEvent(event: ZamaSDKEvent) {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }

  return (
    <ZamaProvider
      relayer={relayer}
      signer={signer}
      storage={storage}
      sessionStorage={sessionStorage}
      onEvent={dispatchEvent}
    >
      {children}
    </ZamaProvider>
  );
};

export const DappWrapperWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ZamaRuntimeProvider>
            <ProgressBar height="3px" color="#2299dd" />
            <div className={`flex flex-col min-h-screen`}>
              <Header />
              {/* Shared content shell for EVERY route. `relative` + `overflowX:clip`
                  is the page-root positioning wrapper the SideMotifs need: the
                  gutter strips are `position:absolute; top:0; bottom:0`, so this
                  makes them span the full content height and scroll with the page
                  on all routes (home/faucet/decrypt/wrap/unwrap) — no per-page
                  mount. The inner `relative z-[1]` wrapper lifts page content above
                  the z-index:0 motifs (which underlap the centered content). */}
              <main className="relative flex flex-col flex-1" style={{ overflowX: "clip" }}>
                <SideMotifs />
                <div className="relative z-[1] flex flex-col flex-1">{children}</div>
              </main>
            </div>
            <Toaster />
          </ZamaRuntimeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
