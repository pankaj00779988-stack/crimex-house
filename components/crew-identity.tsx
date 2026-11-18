"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export interface CrewIdentity {
  handle: string;
  verified: boolean;
}
export const CREW_SESSION_EVENT = "crimex:session-changed";
export const CREW_SESSION_KEY = "crimex:session-event";
const IdentityContext = createContext<{
  account: CrewIdentity | null;
  loading: boolean;
}>({ account: null, loading: false });

// Only an invalidation signal crosses tabs. Never persist an account or token.
export function notifyCrewSessionChanged() {
  window.dispatchEvent(new Event(CREW_SESSION_EVENT));
  try {
    localStorage.setItem(CREW_SESSION_KEY, `${Date.now()}:${Math.random()}`);
  } catch {
    // The current tab still updates when browser storage is unavailable.
  }
}

export function CrewIdentityProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<CrewIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const pending = useRef<AbortController | null>(null);
  const path = usePathname();
  const refresh = useCallback(() => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      if (pending.current === controller && !controller.signal.aborted) {
        controller.abort();
        setAccount(null);
        setLoading(false);
      }
    }, 6000);
    void fetch("/api/crew/identity", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Identity unavailable");
        const data = await res.json();
        if (!controller.signal.aborted) setAccount(data.account ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAccount(null);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    const storage = (event: StorageEvent) => {
      if (event.key === CREW_SESSION_KEY) refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(CREW_SESSION_EVENT, refresh);
    window.addEventListener("storage", storage);
    return () => {
      window.clearTimeout(timer);
      pending.current?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener(CREW_SESSION_EVENT, refresh);
      window.removeEventListener("storage", storage);
    };
  }, [refresh, path]);
  return (
    <IdentityContext.Provider value={{ account, loading }}>
      {children}
    </IdentityContext.Provider>
  );
}
export const useCrewIdentity = () => useContext(IdentityContext);
