"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Howl } from "howler";

const MONO = "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace";

/** Self-hosted, same-origin ambient loop. Same-origin is required under the live
 *  COEP `require-corp` isolation — a cross-origin src would silently drop
 *  `crossOriginIsolated` and break the FHE WASM worker (DIF-02, 07-CONTEXT dec. B). */
const AUDIO_SRC = "/audio/cellar-ambient.mp3";
const AMBIENT_VOLUME = 0.35;

/**
 * Ambient cellar audio control (DIF-02).
 *
 * Autoplay is BLOCKED by browser policy until a user gesture, and we default to
 * a respectful MUTED state so no judge is ambushed by sound. The `Howl` is
 * constructed lazily in a ref (never at module scope → SSR-safe) on the first
 * unmute. A one-time first-gesture listener primes Howler's audio context so the
 * loop starts smoothly on unmute even under strict autoplay policy — but nothing
 * plays until the user explicitly opts in. Everything is torn down on unmount.
 */
export const AmbientAudio = () => {
  // muted === true is the initial, respectful default: silent until opt-in.
  const [muted, setMuted] = useState(true);
  const howlRef = useRef<Howl | null>(null);
  const primedRef = useRef(false);

  // Lazily create the Howl (client-only). Safe to call repeatedly.
  const ensureHowl = useCallback((): Howl => {
    if (!howlRef.current) {
      howlRef.current = new Howl({
        src: [AUDIO_SRC],
        loop: true,
        html5: true,
        volume: AMBIENT_VOLUME,
        preload: false,
      });
    }
    return howlRef.current;
  }, []);

  // Prime Howler's audio context on the first user gesture so the loop can start
  // smoothly on unmute — but keep it silent (muted default) until the user opts in.
  useEffect(() => {
    const prime = () => {
      if (primedRef.current) return;
      primedRef.current = true;
      // Constructing the Howl within the gesture handler unlocks the audio context.
      ensureHowl();
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [ensureHowl]);

  // Unmount cleanup: stop and free the Howl instance.
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
    };
  }, []);

  const toggle = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      const howl = ensureHowl();
      if (next) {
        // Muting: pause the loop so we're not decoding audio in the background.
        howl.pause();
      } else {
        // Unmuting: (re)start the loop from a gesture-unlocked context.
        howl.volume(AMBIENT_VOLUME);
        if (!howl.playing()) howl.play();
      }
      return next;
    });
  }, [ensureHowl]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? "Unmute cellar ambient audio" : "Mute cellar ambient audio"}
      title={muted ? "Play cellar ambience" : "Mute cellar ambience"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: muted ? "var(--muted)" : "var(--red)",
        background: "transparent",
        border: `1px solid ${muted ? "var(--muted)" : "var(--red)"}`,
        borderRadius: 3,
        padding: "5px 9px",
        cursor: "pointer",
        transition: "color 0.12s, border-color 0.12s",
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 13 }}>
        {muted ? "🔇" : "🔊"}
      </span>
      <span>{muted ? "Silent" : "Cellar"}</span>
    </button>
  );
};

export default AmbientAudio;
