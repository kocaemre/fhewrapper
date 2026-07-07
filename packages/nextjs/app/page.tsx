"use client";

import { useEffect, useState } from "react";
import { ChainGuard } from "~~/components/ChainGuard";

/**
 * Walking-skeleton runtime-ready shell (FND-02 / FND-03).
 *
 * The FHE-counter demo has been stripped. This page proves the thinnest slice:
 * the client-only FHE provider tree (inherited from app/layout.tsx ->
 * DappWrapperWithProviders) mounts, and the page is cross-origin isolated.
 *
 * `ChainGuard` owns the connect + Sepolia-gate states; only when connected AND
 * on Sepolia does the guarded status content render. `crossOriginIsolated` is
 * read after mount (via effect) so the value is accurate client-side without an
 * SSR hydration mismatch — the FND-04 pass condition is verified live in Plan 03.
 */
export default function Home() {
  const [isolated, setIsolated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsolated(typeof window !== "undefined" && window.crossOriginIsolated);
  }, []);

  return (
    <div className="flex flex-col gap-8 items-center w-full px-3 md:px-0">
      <div className="max-w-6xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Confidential Wrapper Registry</h1>
        <p className="text-gray-600 mb-6">Walking-skeleton runtime shell</p>
        <ChainGuard>
          <div>FHE runtime shell ready · crossOriginIsolated: {isolated === null ? "…" : String(isolated)}</div>
        </ChainGuard>
      </div>
    </div>
  );
}
