"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { PlayerSidebar, PlayerBottomNav } from "@/components/layout/player-sidebar";
import { TopNav } from "@/components/layout/top-nav";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const user = useAppStore((s) => s.user);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  // Safety timeout — if Zustand rehydration never fires, force it after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAppStore.getState()._hasHydrated) {
        useAppStore.setState({ _hasHydrated: true });
      }
      setHydrationTimedOut(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const ready = hasHydrated || hydrationTimedOut;

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
    } else if (user.role !== "player") {
      router.replace("/vendor/dashboard");
    }
  }, [isAuthenticated, user, router, ready]);

  if (!ready || !isAuthenticated || !user || user.role !== "player") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <PlayerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        <PlayerBottomNav />
      </div>
    </div>
  );
}
