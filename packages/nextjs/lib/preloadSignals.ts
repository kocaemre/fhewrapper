"use client";

/**
 * Client-only signal bridge between the registry data layer (`useRegistryPairs`
 * via `app/page.tsx`) and the site-wide {@link Preloader}.
 *
 * The Preloader lives in `app/layout.tsx` and is intentionally DECOUPLED from
 * the registry hook (no prop-drilling, no shared provider) so it can gate on
 * "first registry settle" without importing the data layer. The registry side
 * calls {@link signalRegistrySettled} once its first load resolves; the
 * Preloader subscribes via {@link onRegistrySettled}.
 *
 * SSR-safe: the only module-scope state is a plain boolean (reset per server
 * render, persisted per client session). `window` is touched exclusively inside
 * functions, always behind a `typeof window` guard — never at module scope — so
 * this never throws `window is not defined` during the Next build/SSR pass.
 *
 * The boolean flag closes the mount race: if the registry settles BEFORE the
 * Preloader attaches its listener, `hasRegistrySettled()`/`onRegistrySettled`
 * still report the completed state immediately.
 */

const REGISTRY_SETTLED_EVENT = "cellar:registry-settled";

let registrySettled = false;

/** Fired once by the registry layer when its first load resolves (data OR error). */
export function signalRegistrySettled(): void {
  if (registrySettled) return;
  registrySettled = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REGISTRY_SETTLED_EVENT));
  }
}

/** Whether the registry has already settled (covers the pre-subscribe race). */
export function hasRegistrySettled(): boolean {
  return registrySettled;
}

/**
 * Subscribe to the first registry settle. Invokes `cb` immediately if it has
 * already happened. Returns an unsubscribe fn. No-op on the server.
 */
export function onRegistrySettled(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (registrySettled) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener(REGISTRY_SETTLED_EVENT, handler);
  return () => window.removeEventListener(REGISTRY_SETTLED_EVENT, handler);
}
