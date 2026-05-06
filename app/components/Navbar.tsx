"use client";

import { useState, useEffect } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, transition: "all 0.3s ease", backgroundColor: isScrolled ? "rgba(10,10,10,0.9)" : "transparent", backdropFilter: isScrolled ? "blur(8px)" : "none", padding: isScrolled ? "12px 0" : "20px 0" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        <a href="#hero">
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem Social Club" style={{ height: "140px", width: "220px", objectFit: "cover", objectPosition: "center", marginTop: "-28px", marginBottom: "-28px" }} />
        </a>

        <div className="hidden md:flex" style={{ alignItems: "center", gap: "32px" }}>
          <a href="#who-we-are" style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>Who We Are</a>
          <a href="#what-we-do" style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>What We Do</a>
          <a href="#gallery" style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>Gallery</a>
          <a href="#join" style={{ border: "1px solid #8B1A1A", color: "white", padding: "8px 20px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>Join the Club</a>
        </div>

        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px", padding: "4px" }}>
          <span style={{ display: "block", width: "24px", height: "2px", backgroundColor: "white", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 6px)" : "none" }} />
          <span style={{ display: "block", width: "24px", height: "2px", backgroundColor: "white", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: "block", width: "24px", height: "2px", backgroundColor: "white", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -6px)" : "none" }} />
        </button>
      </div>

      {menuOpen && (
        <div style={{ backgroundColor: "rgba(10,10,10,0.95)", backdropFilter: "blur(8px)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <a href="#who-we-are" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>Who We Are</a>
          <a href="#what-we-do" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>What We Do</a>
          <a href="#gallery" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>Gallery</a>
          <a href="#join" onClick={() => setMenuOpen(false)} style={{ border: "1px solid #8B1A1A", color: "white", padding: "12px 20px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>Join the Club</a>
        </div>
      )}
    </nav>
  );
}