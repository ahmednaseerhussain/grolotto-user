"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RewardsScreen() {
  const router = useRouter();
  useEffect(() => { router.replace("/player/dashboard"); }, [router]);
  return null;
}
