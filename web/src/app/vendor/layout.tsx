"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { VendorSidebar, VendorBottomNav } from "@/components/layout/vendor-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { vendorAPI } from "@/lib/api/vendor";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const user = useAppStore((s) => s.user);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

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
  const isPendingRoute = pathname === "/vendor/pending";

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "vendor") {
      router.replace("/player/dashboard");
      return;
    }

    // Check vendor approval status
    let cancelled = false;
    (async () => {
      try {
        const profile = await vendorAPI.getMyProfile();
        if (cancelled) return;
        const approved = profile.status === "approved" || profile.status === "active";
        setIsApproved(approved);
        setApprovalChecked(true);
        if (!approved && !isPendingRoute) {
          router.replace("/vendor/pending");
        } else if (approved && isPendingRoute) {
          router.replace("/vendor/dashboard");
        }
      } catch {
        if (cancelled) return;
        setApprovalChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, router, ready, pathname, isPendingRoute]);

  if (!ready || !isAuthenticated || !user || user.role !== "vendor" || !approvalChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Pending/rejected/suspended vendors only see the pending page (without sidebar/bottom nav)
  if (!isApproved) {
    if (!isPendingRoute) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
        </div>
      );
    }
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <VendorSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        <VendorBottomNav />
      </div>
    </div>
  );
}
