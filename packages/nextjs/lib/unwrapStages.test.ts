import { type UnwrapStage, isUnwrapSuccess, nextUnwrapStage } from "./unwrapStages";
import { describe, expect, it } from "vitest";

/**
 * UNW-02 honest-success lock — the phase's central judged behavior.
 *
 * The two-transaction, oracle-decrypted, app-submitted finalize must report
 * success ONLY when the ERC-20 actually arrives (the finalize-tx receipt →
 * `resolved` event → `finalized` stage). Submitting the burn, waiting on the
 * oracle, or submitting the finalize tx are all explicitly NOT success — this
 * is the "no optimistic success" guarantee. The reducer is PURE, so the
 * correctness is provable in-phase (the live tx path is proven in 05-UAT).
 */
describe("nextUnwrapStage", () => {
  it("advances the happy path idle → requesting → decrypting → finalizing → finalized", () => {
    let stage: UnwrapStage = "idle";
    stage = nextUnwrapStage(stage, "start");
    expect(stage).toBe("requesting");
    stage = nextUnwrapStage(stage, "unwrap-submitted");
    expect(stage).toBe("requesting"); // submitting the burn is NOT progress past requesting
    stage = nextUnwrapStage(stage, "finalizing");
    expect(stage).toBe("decrypting"); // explicit oracle-wait state (Pitfall 2)
    stage = nextUnwrapStage(stage, "finalize-submitted");
    expect(stage).toBe("finalizing"); // finalize tx in flight — still NOT success
    stage = nextUnwrapStage(stage, "resolved");
    expect(stage).toBe("finalized"); // finalize-tx receipt — the ONLY success point
  });

  it("keeps `requesting` on `unwrap-submitted` (submitting the burn is not success)", () => {
    expect(nextUnwrapStage("requesting", "unwrap-submitted")).toBe("requesting");
  });

  it("maps `finalizing` → decrypting (oracle wait) and `finalize-submitted` → finalizing", () => {
    expect(nextUnwrapStage("requesting", "finalizing")).toBe("decrypting");
    expect(nextUnwrapStage("decrypting", "finalize-submitted")).toBe("finalizing");
  });

  it("routes an `error` event from any stage to `error`", () => {
    expect(nextUnwrapStage("idle", "error")).toBe("error");
    expect(nextUnwrapStage("requesting", "error")).toBe("error");
    expect(nextUnwrapStage("decrypting", "error")).toBe("error");
    expect(nextUnwrapStage("finalizing", "error")).toBe("error");
  });

  it("returns to `idle` on `reset`", () => {
    expect(nextUnwrapStage("error", "reset")).toBe("idle");
    expect(nextUnwrapStage("finalized", "reset")).toBe("idle");
  });
});

describe("isUnwrapSuccess", () => {
  it("is TRUE only at `finalized` (UNW-02 no-optimistic-success)", () => {
    expect(isUnwrapSuccess("finalized")).toBe(true);
  });

  it("is FALSE at every non-finalized stage", () => {
    for (const stage of ["idle", "requesting", "decrypting", "finalizing", "error"] as const) {
      expect(isUnwrapSuccess(stage)).toBe(false);
    }
  });
});
