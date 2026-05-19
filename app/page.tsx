"use client";

import { useState, useEffect } from "react";
import EnterGate from "./components/EnterGate";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import WhoWeAre from "./components/WhoWeAre";
import WhatWeDo from "./components/WhatWeDo";
import JoinTheClub from "./components/JoinTheClub";
import Footer from "./components/Footer";

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    const hasEntered = sessionStorage.getItem("entered");
    const hasHash = window.location.hash.length > 0;

    // Check cookie set by other pages
    const hasCookie = document.cookie.includes("gd_entered=true");

    if (hasEntered || hasHash || hasCookie) {
      setEntered(true);
      setShowGate(false);
      if (hasHash) sessionStorage.setItem("entered", "true");
    } else {
      setShowGate(true);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const hash = window.location.hash;
    if (!hash) return;
    const attemptScroll = (attempts = 0) => {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else if (attempts < 10) {
        setTimeout(() => attemptScroll(attempts + 1), 150);
      }
    };
    attemptScroll();
  }, [mounted, entered]);

  if (!mounted) return null;

  return (
    <main>
      {showGate && !entered && (
        <EnterGate onEnter={() => {
          setEntered(true);
          setShowGate(false);
          sessionStorage.setItem("entered", "true");
          document.cookie = "gd_entered=true; path=/; max-age=86400";
        }} />
      )}
      <Navbar />
      <Hero />
      <WhoWeAre />
      <WhatWeDo />
      <JoinTheClub />
      <Footer />
    </main>
  );
}