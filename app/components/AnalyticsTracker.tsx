"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if the current URL is your exact Railway staging link
    const isStaging = window.location.href.includes("gyaldem-website-production.up.railway.app");

    if (!isStaging && typeof window.gtag !== "undefined") {
      window.gtag("config", "G-VKF82M2N2V", {
        page_path: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""),
      });
    }
  }, [pathname, searchParams]);

  return null;
}
