"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { onRegistrySettled } from "~~/lib/preloadSignals";

/**
 * Site-wide branded PRELOADER for The Cellar Registry.
 *
 * Renders `children` normally and lays a full-screen, on-brand cover OVER them
 * until the critical assets have decoded and the registry's first data has
 * settled (or a hard timeout elapses). The app therefore mounts and fetches
 * BEHIND the cover, and when we lift it the fully-populated site is revealed at
 * once — no empty→populate flash.
 *
 * Design idiom is the LOCKED Cellar Registry aesthetic (02-UI-SPEC): parchment/
 * cellar themes via CSS vars, Gelasio serif wordmark + JetBrains Mono chrome,
 * hard "letterpress" copperplate feel. Motion is CSS/`motion`-driven and
 * lightweight — deliberately NOT a generic spinner and NOT a video.
 *
 * Accessibility: honours `prefers-reduced-motion` — reduced users get a static
 * wordmark and a plain cross-fade (no ink-draw, no looping pulse).
 *
 * SSR-safe: `'use client'`, the cover renders in server HTML (so it covers on
 * first paint with no flash), but all `window`/timer/image work runs in effects.
 * The provider tree and Phase-1 crossOriginIsolated (COOP/COEP) are untouched —
 * this is a pure visual overlay wrapped OUTSIDE the FHE providers.
 */

/** Minimum time the cover stays up so it never flashes on fast loads. */
const MIN_DISPLAY_MS = 800;
/** Hard cap: a slow public Sepolia RPC (or a stuck asset) must never trap the user. */
const MAX_DISPLAY_MS = 3800;

/**
 * The critical assets gated behind the cover, as a typed list so the set is
 * easy to extend.
 *
 * ── PHASE 7 EXTENSION POINT ─────────────────────────────────────────────────
 * Phase 7 adds the wrap-cinematic video(s) + ambient audio. Append them here:
 *
 *   { kind: "video", src: "/cinematic/wrap.webm" }   // preload via <video
 *       preload="auto"> or fetch(); decodes lazily, so gate on `canplaythrough`
 *       if you need it paint-ready.
 *
 *   { kind: "audio", src: "/audio/ambient.mp3" }      // audio may be FETCHED
 *       here to warm the cache, but it can only PLAY after a user gesture —
 *       browser autoplay policy blocks sound until the user interacts. Wire the
 *       actual `.play()` to the first click/keypress, NOT to this preload gate,
 *       or the gate will hang waiting on a sound that can't start.
 *
 * `preloadAsset()` below only knows how to decode images today; add a
 * `case "video"` / `case "audio"` branch there when those kinds land.
 */
type PreloadAsset =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string } // reserved for Phase 7
  | { kind: "audio"; src: string }; // reserved for Phase 7 (fetch-only; play on gesture)

const TOKEN_ICONS = ["cbron", "ctgbp", "cusdc", "cusdt", "cweth", "cxaut", "czama"] as const;

const CRITICAL_ASSETS: PreloadAsset[] = [
  { kind: "image", src: "/01-hero.png" }, // RegistryHero engraving (same-origin, COEP require-corp)
  ...TOKEN_ICONS.map(name => ({ kind: "image" as const, src: `/icons/${name}.png` })),
  // Phase 7: warm ONLY the first wrap-cinematic beat so the opening plays
  // instantly on a real wrap — without gating the cover on all six videos.
  { kind: "video", src: "/cinematic/01-fold.mp4" },
];

/**
 * Fully load AND decode an image so the reveal has no decode jank. Never
 * rejects — a missing/broken asset resolves rather than trapping the gate.
 */
function preloadImage(src: string): Promise<void> {
  return new Promise<void>(resolve => {
    const img = new Image();
    img.src = src;
    const done = () => resolve();
    if (typeof img.decode === "function") {
      img.decode().then(done, done);
    } else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

/**
 * Warm a video's first frames so it can paint without a stall. Loads metadata +
 * enough data to play through, resolving on `canplaythrough` OR `error` — it
 * NEVER rejects, so a missing/slow beat can't trap the cover (mirrors
 * `preloadImage`). Same-origin `/cinematic` media keeps COEP require-corp intact.
 */
function preloadVideo(src: string): Promise<void> {
  return new Promise<void>(resolve => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true; // honoured by iOS Safari for inline preload
    const done = () => resolve();
    video.oncanplaythrough = done;
    video.onerror = done;
    video.src = src;
    video.load();
  });
}

/** Preload one asset. Images decode; the first cinematic beat warms via <video>. */
function preloadAsset(asset: PreloadAsset): Promise<void> {
  switch (asset.kind) {
    case "image":
      return preloadImage(asset.src);
    case "video":
      return preloadVideo(asset.src);
    // case "audio": return prefetch(asset.src);        // Phase 7 (no autoplay)
    default:
      return Promise.resolve();
  }
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function Preloader({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Rich motion runs only after hydration and only when motion is allowed —
  // this also avoids any SSR/client animation-state hydration mismatch.
  const animate = mounted && !reduceMotion;

  useEffect(() => {
    setMounted(true);
  }, []);

  // The gate. Runs once on the client: decode critical images, wait for the
  // registry's first settle (or the hard cap), enforce the min display, then lift.
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    const imagesReady = Promise.all(CRITICAL_ASSETS.map(preloadAsset));

    const registryReady = new Promise<void>(resolve => {
      onRegistrySettled(resolve);
    });

    // Ideal path: everything decoded AND registry settled.
    const critical = Promise.all([imagesReady, registryReady]);
    // Hard fallback: never wait past MAX even if the RPC or an asset stalls.
    const hardCap = sleep(MAX_DISPLAY_MS);

    Promise.race([critical, hardCap]).then(async () => {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_DISPLAY_MS) await sleep(MIN_DISPLAY_MS - elapsed);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Lock scroll while the cover is up (guarded to client via `mounted`).
  useEffect(() => {
    if (!mounted) return;
    if (ready) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted, ready]);

  return (
    <>
      {children}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="cellar-preloader"
            aria-hidden={ready}
            role="status"
            aria-label="Loading The Cellar Registry"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.35 : 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 22,
              background: "var(--bg)",
              color: "var(--ink)",
              // Subtle engraved paper grain via layered gradients (no external asset).
              backgroundImage: "radial-gradient(120% 120% at 50% 0%, var(--panel) 0%, var(--bg) 60%)",
              pointerEvents: ready ? "none" : "auto",
            }}
          >
            {/* Eyebrow — mono, letterpressed */}
            <motion.div
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={animate ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--blue)",
              }}
            >
              ■ Zama FHEVM · Sepolia
            </motion.div>

            {/* Wordmark — Gelasio serif with an ink-draw underline sweep */}
            <div style={{ position: "relative", padding: "0 4px", textAlign: "center" }}>
              <motion.h1
                initial={animate ? { opacity: 0, y: 10 } : false}
                animate={animate ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: "var(--font-gelasio), Georgia, serif",
                  fontWeight: 600,
                  fontSize: "clamp(30px, 6vw, 60px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  color: "var(--ink)",
                }}
              >
                The <em style={{ fontWeight: 500, color: "var(--red)" }}>Cellar</em> Registry
              </motion.h1>
              {/* Underline draw: copperplate rule that sweeps in left→right. */}
              <motion.div
                initial={animate ? { scaleX: 0 } : false}
                animate={animate ? { scaleX: 1 } : undefined}
                transition={{ duration: 0.9, delay: 0.35, ease: [0.65, 0, 0.35, 1] }}
                style={{
                  transformOrigin: "left center",
                  height: 2,
                  marginTop: 10,
                  background: "var(--line)",
                  // Reduced-motion: render the rule fully drawn, no sweep.
                  transform: animate ? undefined : "scaleX(1)",
                }}
              />
            </div>

            {/* Looping inkPulse motif — a wax-seal dot that breathes. Static when reduced. */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
              <motion.span
                animate={animate ? { opacity: [0.35, 1, 0.35], scale: [1, 1.18, 1] } : undefined}
                transition={animate ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--red)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--faint)",
                }}
              >
                Uncorking the cellar
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
