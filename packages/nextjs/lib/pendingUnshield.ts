import {
  type Address,
  type GenericStorage,
  type Hex,
  clearPendingUnshield,
  loadPendingUnshield,
  savePendingUnshield,
} from "@zama-fhe/react-sdk";

/**
 * Pending-unshield persistence (never-strand-funds; Pitfall 3 / RESEARCH
 * "never strand funds").
 *
 * A confidential unwrap burns the balance in tx #1 and only mints the ERC-20 in
 * the app-submitted finalize tx #2. If the tab closes between the two, the burn
 * is done but the tokens have not arrived — the record of the unfinalized
 * unwrap MUST survive so `useResumeUnshield({ unwrapTxHash })` can finish it.
 *
 * Rather than plumb the ZamaProvider's IndexedDB store into a component, we
 * supply a thin `GenericStorage`-shaped shim (verified shape:
 *   get<T>(key): Promise<T|null>; set<T>(key, value): Promise<void>; delete(key): Promise<void>
 * ) backed by `localStorage` with a module-level in-memory `Map` fallback for
 * SSR / unavailable-storage. This keeps the MVP thin while still using the
 * verified SDK save/load/clear helpers (re-exported by `@zama-fhe/react-sdk`).
 */

/** In-memory fallback so the shim degrades safely under SSR / no localStorage. */
const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // localStorage access can throw (privacy mode, disabled) — fall through.
  }
  return memory.has(key) ? (memory.get(key) as string) : null;
}

function writeRaw(key: string, raw: string): void {
  memory.set(key, raw);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, raw);
    }
  } catch {
    // Best-effort persistence; the in-memory copy is authoritative this session.
  }
}

function removeRaw(key: string): void {
  memory.delete(key);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore — the in-memory copy is already cleared.
  }
}

/**
 * A `GenericStorage` implementation the SDK persistence helpers can write to.
 * Values are JSON-serialized so structured values (and Hex strings) round-trip.
 */
export const browserPendingStorage: GenericStorage = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = readRaw(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T = unknown>(key: string, value: T): Promise<void> {
    writeRaw(key, JSON.stringify(value));
  },
  async delete(key: string): Promise<void> {
    removeRaw(key);
  },
};

/** Persist the burned-but-unfinalized unwrap tx hash for `wrapperAddress`. */
export function rememberPendingUnwrap(wrapperAddress: Address, unwrapTxHash: Hex): Promise<void> {
  return savePendingUnshield(browserPendingStorage, wrapperAddress, unwrapTxHash);
}

/** Read the pending unwrap tx hash for `wrapperAddress`, or `null` if none. */
export function readPendingUnwrap(wrapperAddress: Address): Promise<Hex | null> {
  return loadPendingUnshield(browserPendingStorage, wrapperAddress);
}

/** Clear the pending record once the finalize tx has resolved. */
export function forgetPendingUnwrap(wrapperAddress: Address): Promise<void> {
  return clearPendingUnshield(browserPendingStorage, wrapperAddress);
}
