"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
const EVENT = "crimex:storage";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
export function useStoredState<T>(
  key: string,
  initial: T,
  validate: (value: unknown) => value is T,
) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const value = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(raw ?? "null");
      return validate(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  }, [raw, initial, validate]);
  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT));
        return true;
      } catch {
        return false;
      }
    },
    [key],
  );
  return [value, setValue] as const;
}
export const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
export const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
export const isString = (v: unknown): v is string => typeof v === "string";
