"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isExpanded = isHome && !isScrolled && !isMobile;

  const logoImg = (
    <img
      src="/gyaldem_red_wl_transparent.png"
      alt="Gyal Dem Social Club"
      style={{ height: "75px", objectFit: "cover", objectPosition: "center", marginTop: "-28px", marginBottom: "-28px" }}
    />
  );

  const desktopLinks = (
    <>
      <a href="/#who-we-are" style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>Who We Are</a>
      <a href="/#what-we-do" style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>What We Do</a>
      {/* <a href="/gallery" style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>The Room</a> */}
      <a href="/events" style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>Events</a>
      <a href="/#join" style={{ border: "1px solid #8B1A1A", color: "white", padding: "7px 18px", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>Join the Club</a>
    </>
  );

  const hamburger = (
    <button
      onClick={() => setMenuOpen(!menuOpen)}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px", padding: "4px" }}
    >
      <span style={{ display: "block", width: "24px", height: "2px", backgroundColor: "white", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 6px)" : "none" }} />
      <span style={{ display: "block", width: "24px", height: "2px", backgroundColor: "white", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
      <span style={{ display: "block", width: "24px", height: "2px", backgroundColor: "white", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -6px)" : "none" }} />
    </button>
  );

  return (
    <nav style={{ padding: "15px", position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, transition: "all 0.4s ease", backgroundColor: isExpanded ? "transparent" : "rgba(10,10,10,0.95)", backdropFilter: isExpanded ? "none" : "blur(8px)" }}>

      {isExpanded ? (
        <div>
          {/* Desktop expanded — logo centered */}
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 24px 0" }}>
            <a href="/">{logoImg}</a>
          </div>
          {/* Desktop expanded — links centered below logo */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "40px", padding: "12px 24px", borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
            {desktopLinks}
          </div>
        </div>
      ) : (
        /* Compact — logo left, links centered absolutely, hamburger right on mobile */
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 24px", position: "relative" }}>
          <a href="/" style={{ flexShrink: 0 }}>{logoImg}</a>
          {/* Desktop links centered */}
          {!isMobile && (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "32px" }}>
              {desktopLinks}
            </div>
          )}
          {/* Mobile hamburger */}
          {isMobile && hamburger}
        </div>
      )}

      {/* Mobile menu dropdown */}
      {menuOpen && isMobile && (
        <div style={{ backgroundColor: "rgba(10,10,10,0.98)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <a href="/#who-we-are" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>Who We Are</a>
          <a href="/#what-we-do" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>What We Do</a>
          <a href="/gallery" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>The Room</a>
          <a href="/events" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", fontFamily: "sans-serif" }}>Events</a>
          <a href="/#join" onClick={() => setMenuOpen(false)} style={{ border: "1px solid #8B1A1A", color: "white", padding: "12px 20px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", textAlign: "center", fontFamily: "sans-serif" }}>Join the Club</a>
        </div>
      )}
    </nav>
  );
}