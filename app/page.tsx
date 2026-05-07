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

  useEffect(() => {
    setMounted(true);
    const hasEntered = sessionStorage.getItem("entered");
    if (hasEntered) setEntered(true);
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
      {!entered && <EnterGate onEnter={() => setEntered(true)} />}
      <Navbar />
      <Hero />
      <WhoWeAre />
      <WhatWeDo />
      <JoinTheClub />
      <Footer />
    </main>
  );
}