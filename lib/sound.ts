"use client";
import { useCallback, useEffect, useRef } from "react";
export function useSound(enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      if (context.current?.state !== "closed") void context.current?.close();
    },
    [],
  );
  return useCallback(
    (kind: "click" | "error" | "unlock") => {
      if (!enabled) return;
      try {
        const Audio =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Audio) return;
        const ctx = context.current ?? new Audio();
        context.current = ctx;
        void ctx.resume().catch(() => {});
        const frequencies =
          kind === "unlock"
            ? [523.25, 659.25, 783.99, 1046.5]
            : kind === "error"
              ? [110, 87]
              : [840];
        frequencies.forEach((frequency, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start =
            ctx.currentTime + index * (kind === "unlock" ? 0.12 : 0.1);
          const duration = kind === "click" ? 0.04 : 0.2;
          osc.type = kind === "error" ? "sawtooth" : "sine";
          osc.frequency.value = frequency;
          gain.gain.setValueAtTime(kind === "error" ? 0.04 : 0.08, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
          osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
          };
        });
      } catch {
        /* Audio is an enhancement; the vault remains playable without it. */
      }
    },
    [enabled],
  );
}
