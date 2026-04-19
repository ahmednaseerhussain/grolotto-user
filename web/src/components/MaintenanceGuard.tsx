"use client";

import { useEffect, useState } from "react";
import { Construction, RefreshCw } from "lucide-react";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handler = () => setMaintenance(true);
    window.addEventListener("grolotto:maintenance", handler);
    return () => window.removeEventListener("grolotto:maintenance", handler);
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://grolotto-user-wk3b.onrender.com/api";
      const res = await fetch(`${API_BASE}/settings/public`);
      if (res.ok) {
        setMaintenance(false);
      }
    } catch {
      // still down
    } finally {
      setChecking(false);
    }
  };

  if (maintenance) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-amber-500">
        <div className="text-center px-8 max-w-md">
          <Construction className="mx-auto h-20 w-20 text-white" />
          <h1 className="mt-6 text-3xl font-bold text-white">Under Maintenance</h1>
          <p className="mt-3 text-amber-50 text-lg leading-relaxed">
            We&apos;re improving GroLotto for you. Please check back in a few minutes.
          </p>
          <button
            onClick={handleRetry}
            disabled={checking}
            className="mt-8 inline-flex items-center gap-2 bg-white text-amber-600 font-semibold px-8 py-3 rounded-xl hover:bg-amber-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-5 w-5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
