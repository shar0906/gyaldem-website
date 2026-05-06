"use client";

import { useState, useEffect } from "react";
import EnterGate from "./components/EnterGate";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import WhoWeAre from "./components/WhoWeAre";
import WhatWeDo from "./components/WhatWeDo";
import Gallery from "./components/Gallery";
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

  if (!mounted) return null;

  return (
    <main>
      {!entered && <EnterGate onEnter={() => setEntered(true)} />}
      <Navbar />
      <Hero />
      <WhoWeAre />
      <WhatWeDo />
      <Gallery />
      <JoinTheClub />
      <Footer />
    </main>
  );
}