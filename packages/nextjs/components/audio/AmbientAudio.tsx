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
 * DEFAULT-ON: the loop is meant to be playing from the moment the browser allows.
 * AUTOPLAY CAVEAT — browsers BLOCK audio playback until the page has received a
 * user gesture (click/keypress), so a bare `.play()` on mount is typically
 * rejected. We therefore do both: (1) attempt `.play()` on mount (works if the
 * user already interacted, e.g. clicked through the preloader), and (2) register a
 * one-time first-gesture listener that starts the loop the instant a gesture
 * arrives if the mount attempt was blocked. State defaults to UNMUTED; the visible
 * toggle now turns the ambience OFF. The `Howl` is built lazily in a ref (never at
 * module scope → SSR-safe) and torn down on unmount.
 */
export const AmbientAudio = () => {
  // muted === false is the initial default: ambience ON as soon as the browser allows.
  const [muted, setMuted] = useState(false);
  const howlRef = useRef<Howl | null>(null);
  // Mirrors `muted` for the gesture handler (avoids stale-closure reads).
  const mutedRef = useRef(false);

  // Lazily create the Howl (client-only). Safe to call repeatedly.
  const ensureHowl = useCallback((): Howl => {
    if (!howlRef.current) {
      howlRef.current = new Howl({
        src: [AUDIO_SRC],
        loop: true,
        html5: true,
        volume: AMBIENT_VOLUME,
        preload: true,
      });
    }
    return howlRef.current;
  }, []);

  const startIfWanted = useCallback(() => {
    if (mutedRef.current) return;
    const howl = ensureHowl();
    howl.volume(AMBIENT_VOLUME);
    if (!howl.playing()) howl.play();
  }, [ensureHowl]);

  // Try to start on mount (works only if a gesture already happened), then fall
  // back to a one-time first-gesture listener for the common autoplay-blocked case.
  useEffect(() => {
    startIfWanted();

    const onGesture = () => {
      startIfWanted();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [startIfWanted]);

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
      mutedRef.current = next;
      const howl = ensureHowl();
      if (next) {
        // Muting: pause the loop so we're not decoding audio in the background.
        howl.pause();
      } else {
        // Unmuting: (re)start the loop from a (now gesture-unlocked) context.
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
