"use client";

import { useAppStore } from "@/store/app-store";
import { getTranslation, type Language } from "@/lib/translations";

/**
 * Returns a translation function t(key) directly.
 * Usage: const t = useTranslation();  t("someKey")
 */
export function useTranslation(): (key: string) => string {
  const language = useAppStore((s) => s.language);

  const t = (key: string): string => {
    return getTranslation(key as Parameters<typeof getTranslation>[0], language as Language);
  };

  return t;
}
