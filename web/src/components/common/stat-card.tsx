"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string } | "up" | "down";
  className?: string;
  iconBg?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, subtitle, icon, trend, className, iconBg = "bg-blue-100", onClick }: StatCardProps) {
  return (
    <div
      className={cn("bg-white rounded-xl border border-gray-200 p-5", onClick && "cursor-pointer hover:shadow-md transition-shadow", className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          {trend && typeof trend === "object" && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
          {trend && typeof trend === "string" && (
            <span className={cn("text-xs font-medium mt-1", trend === "up" ? "text-emerald-600" : "text-red-600")}>
              {trend === "up" ? "↑" : "↓"}
            </span>
          )}
        </div>
        {icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
