// admin/showtime/useLiveData.ts
//
// Keeps a show-night screen in sync with the server: refreshes every
// couple of seconds, pauses while the phone screen is off or the tab is
// hidden, and catches up the moment it's visible again. `online` turns
// false after a failed refresh, so screens can show "Reconnecting…" and
// hold off actions that depend on fresh data.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useLiveData<T>(url: string, intervalMs = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [online, setOnline] = useState(true);
  const [authError, setAuthError] = useState(false);
  const inFlight = useRef(false);
  const urlRef = useRef(url);
  urlRef.current = url;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(urlRef.current, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
      } else if (!res.ok) {
        setOnline(false);
      } else {
        setData((await res.json()) as T);
        setOnline(true);
      }
    } catch {
      setOnline(false);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      refresh();
      timer = setInterval(refresh, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", refresh);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", refresh);
    };
  }, [refresh, intervalMs]);

  return { data, setData, online, authError, refresh };
}
