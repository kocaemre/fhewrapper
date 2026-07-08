import { browserPendingStorage } from "./pendingUnshield";
import { describe, expect, it } from "vitest";

/**
 * Pending-unshield persistence shim (never-strand-funds; Pitfall 3).
 *
 * The unit target is ONLY the `GenericStorage` shim round-trip — the SDK
 * `savePendingUnshield`/`loadPendingUnshield`/`clearPendingUnshield` helpers are
 * SDK-owned and exercised live in 05-UAT. The vitest env is `node` (no
 * `window`/`localStorage`), so these tests also prove the in-memory fallback
 * degrades safely rather than throwing.
 */
describe("browserPendingStorage", () => {
  it("round-trips set → get", async () => {
    await browserPendingStorage.set("k1", "value-1");
    expect(await browserPendingStorage.get<string>("k1")).toBe("value-1");
  });

  it("returns null after delete and for an absent key", async () => {
    await browserPendingStorage.set("k2", "value-2");
    await browserPendingStorage.delete("k2");
    expect(await browserPendingStorage.get("k2")).toBeNull();
    expect(await browserPendingStorage.get("never-set")).toBeNull();
  });

  it("JSON-serializes so a Hex tx-hash string survives a round-trip unchanged", async () => {
    const hash = "0xabc123def4567890abc123def4567890abc123def4567890abc123def4567890";
    await browserPendingStorage.set("tx", hash);
    expect(await browserPendingStorage.get<string>("tx")).toBe(hash);
  });

  it("does not throw when localStorage is unavailable (in-memory fallback)", async () => {
    // In the node env there is no localStorage — every op must resolve, not throw.
    await expect(browserPendingStorage.set("safe", "ok")).resolves.toBeUndefined();
    await expect(browserPendingStorage.get("safe")).resolves.toBe("ok");
    await expect(browserPendingStorage.delete("safe")).resolves.toBeUndefined();
    await expect(browserPendingStorage.get("safe")).resolves.toBeNull();
  });
});
