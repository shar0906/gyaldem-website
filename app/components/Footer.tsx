"use client";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#F5F0E8", padding: "64px 24px", borderTop: "1px solid rgba(139,26,26,0.2)" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto" }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px", marginBottom: "48px" }} className="footer-grid">

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <img src="/gyaldem_red_bl_transparent.png" alt="Gyal Dem Social Club" style={{ width: "144px", objectFit: "contain" }} />
            <p style={{ color: "rgba(10,10,10,0.6)", fontSize: "14px", lineHeight: "1.6", maxWidth: "280px", fontFamily: "sans-serif" }}>
              Miami's social club for women of the Caribbean and Afro-diasporic community.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>Explore</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="/#who-we-are" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif" }}>Who We Are</a>
              <a href="/#what-we-do" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif" }}>What We Do</a>
              <a href="/events" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif" }}>Events</a>
              {/* <a href="/gallery" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif" }}>The Room</a> */}
              <a href="/#join" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif" }}>Join the Club</a>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>Get in Touch</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="mailto:hello@gyaldemsocialclub.com" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                hello@gyaldemsocialclub.com
              </a>
              <a href="https://instagram.com/gyaldemsocialclub" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                @gyaldemsocialclub
              </a>
            </div>
          </div>

        </div>

        <div style={{ borderTop: "1px solid rgba(139,26,26,0.2)", paddingTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "12px", fontFamily: "sans-serif", margin: 0 }}>© 2026 Gyal Dem Social Club. All rights reserved.</p>
          <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "12px", fontFamily: "sans-serif", margin: 0 }}>Based in Miami. Rooted in the diaspora.</p>
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </footer>
  );
}