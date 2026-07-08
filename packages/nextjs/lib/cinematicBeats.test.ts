import { BEAT_MEDIA, BEAT_SUB, BEAT_TITLES, type BeatId, beatsForStage, shouldShowOverlay } from "./cinematicBeats";
import { describe, expect, it } from "vitest";

/**
 * DIF-01 honesty lock: the wrap cinematic OVERLAYS the real Phase-4 `useWrap`
 * transaction lifecycle — it must never claim success before the tx is mined.
 *
 * `beatsForStage` is the single source of truth for which of the six engraving
 * beats (fold → insert → seal → age → pop → token) a tx-driven overlay may play
 * at a given `WrapStage`. The REVEAL beats — `pop` and `token` — are the visual
 * "it worked" payoff; they are structurally gated to `stage === "done"` (the
 * mined receipt), so the component CANNOT show success early even by mistake.
 *
 * This file is written RED-first: the reveal-gate cases prove the invariant the
 * component depends on for its honesty (07-CONTEXT decision A / threat T-07-01).
 */

const NON_DONE_STAGES = ["idle", "approving", "wrapping", "confirming", "error"] as const;
const REVEAL_BEATS: readonly BeatId[] = ["pop", "token"];

describe("beatsForStage — stage → beats mapping", () => {
  it("idle shows nothing (overlay empty before a wrap starts)", () => {
    expect(beatsForStage("idle")).toEqual([]);
  });

  it("approving plays the fold beat", () => {
    expect(beatsForStage("approving")).toEqual(["fold"]);
  });

  it("wrapping plays insert then seal (multi-beat)", () => {
    expect(beatsForStage("wrapping")).toEqual(["insert", "seal"]);
  });

  it("confirming plays the age beat (loops while the block confirms)", () => {
    expect(beatsForStage("confirming")).toEqual(["age"]);
  });

  it("done plays pop then token (the reveal)", () => {
    expect(beatsForStage("done")).toEqual(["pop", "token"]);
  });

  it("error yields to the honest error row below — no beats", () => {
    expect(beatsForStage("error")).toEqual([]);
  });
});

describe("HONEST REVEAL GATE — pop/token unreachable before the tx is mined", () => {
  it("no reveal beat appears for any non-done stage", () => {
    for (const stage of NON_DONE_STAGES) {
      const beats = beatsForStage(stage);
      for (const reveal of REVEAL_BEATS) {
        expect(beats).not.toContain(reveal);
      }
    }
  });

  it("explicitly: confirming never reveals pop or token", () => {
    expect(beatsForStage("confirming")).not.toContain("pop");
    expect(beatsForStage("confirming")).not.toContain("token");
  });

  it("explicitly: wrapping never reveals pop or token", () => {
    expect(beatsForStage("wrapping")).not.toContain("pop");
    expect(beatsForStage("wrapping")).not.toContain("token");
  });

  it("the reveal beats are reachable ONLY at stage === done", () => {
    const stagesWithReveal = (["idle", "approving", "wrapping", "confirming", "done", "error"] as const).filter(s =>
      beatsForStage(s).some(b => REVEAL_BEATS.includes(b)),
    );
    expect(stagesWithReveal).toEqual(["done"]);
  });
});

describe("shouldShowOverlay — visibility predicate (DIF-01 reduced-motion path)", () => {
  it("true for the active tx stages when motion is allowed", () => {
    for (const stage of ["approving", "wrapping", "confirming", "done"] as const) {
      expect(shouldShowOverlay(stage, false)).toBe(true);
    }
  });

  it("false for idle and error even when motion is allowed", () => {
    expect(shouldShowOverlay("idle", false)).toBe(false);
    expect(shouldShowOverlay("error", false)).toBe(false);
  });

  it("false for EVERY stage when reduced-motion is on (overlay suppressed, stage indicator carries the flow)", () => {
    for (const stage of ["idle", "approving", "wrapping", "confirming", "done", "error"] as const) {
      expect(shouldShowOverlay(stage, true)).toBe(false);
    }
  });
});

describe("BEAT_MEDIA — self-hosted same-origin paths (DIF-02 / threat T-07-03)", () => {
  const beats: BeatId[] = ["fold", "insert", "seal", "age", "pop", "token"];

  it("maps every beat to a video + poster path", () => {
    for (const beat of beats) {
      expect(BEAT_MEDIA[beat]).toBeDefined();
      expect(typeof BEAT_MEDIA[beat].video).toBe("string");
      expect(typeof BEAT_MEDIA[beat].poster).toBe("string");
    }
  });

  it("every media path is a scheme-less absolute path under /cinematic (no host, no cross-origin)", () => {
    for (const beat of beats) {
      const { video, poster } = BEAT_MEDIA[beat];
      for (const path of [video, poster]) {
        expect(path.startsWith("/cinematic/")).toBe(true);
        expect(path).not.toMatch(/^https?:/);
        expect(path).not.toMatch(/^\/\//); // no protocol-relative host
      }
    }
  });

  it("poster paths live under /cinematic/posters and videos are .mp4", () => {
    for (const beat of beats) {
      expect(BEAT_MEDIA[beat].video).toMatch(/^\/cinematic\/[^/]+\.mp4$/);
      expect(BEAT_MEDIA[beat].poster).toMatch(/^\/cinematic\/posters\/[^/]+\.png$/);
    }
  });
});

describe("BEAT_TITLES / BEAT_SUB — narrative copy rendered from data", () => {
  const beats: BeatId[] = ["fold", "insert", "seal", "age", "pop", "token"];

  it("every beat has a non-empty title and subtitle", () => {
    for (const beat of beats) {
      expect(BEAT_TITLES[beat].length).toBeGreaterThan(0);
      expect(BEAT_SUB[beat].length).toBeGreaterThan(0);
    }
  });

  it("carries the design's narrative titles", () => {
    expect(BEAT_TITLES.fold).toBe("Sealing the contract");
    expect(BEAT_TITLES.insert).toBe("Into the vessel");
    expect(BEAT_TITLES.seal).toBe("Waxed and corked");
    expect(BEAT_TITLES.age).toBe("Aging in the cellar");
    expect(BEAT_TITLES.pop).toBe("Uncorked");
    expect(BEAT_TITLES.token).toBe("Transformed");
  });
});
