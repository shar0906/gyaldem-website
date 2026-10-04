"use client";

// Google Analytics, production domain only.
//
// Uses an allowlist instead of a blocklist: GA loads only when the site is
// opened on gyaldemsocialclub.com. Railway URLs (any of them), localhost,
// and preview domains never load the tag at all, so nothing can be sent.
//
// Page views: GA4's Enhanced measurement tracks Next.js client-side
// navigation on its own ("Page changes based on browser history events"),
// so there's no separate route tracker. Having both would count every
// page twice.

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = "G-VKF82M2N2V";
const TRACKED_HOSTS = ["gyaldemsocialclub.com", "www.gyaldemsocialclub.com"];

export default function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(TRACKED_HOSTS.includes(window.location.hostname));
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}