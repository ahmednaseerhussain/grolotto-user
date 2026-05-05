"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

/**
 * Logs the user out after `timeoutMs` milliseconds of inactivity.
 * Listens to mouse/keyboard/touch/scroll events on window. The timer is
 * reset whenever the tab becomes visible after being hidden so a backgrounded
 * tab doesn't auto-logout instantly.
 *
 * Hook is a no-op when the user is not authenticated.
 */
export function useInactivityLogout(timeoutMs: number = 180_000) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === "undefined") return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          useAppStore.getState().logout();
        } catch { /* ignore */ }
        router.replace("/login");
      }, timeoutMs);
    };

    const onActivity = () => reset();
    const onVisibility = () => {
      if (document.visibilityState === "visible") reset();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibility);

    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity)
      );
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, router, timeoutMs]);
}
