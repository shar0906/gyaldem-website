"use client";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#F5F0E8", padding: "64px 24px", borderTop: "1px solid rgba(139,26,26,0.2)" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto" }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px", marginBottom: "48px" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <img src="/gyaldem_red_bl_transparent.png" alt="Gyal Dem Social Club" style={{ width: "144px", objectFit: "contain" }} />
            <p style={{ color: "rgba(10,10,10,0.6)", fontSize: "14px", lineHeight: "1.6", maxWidth: "280px" }}>
              Miami's social club for women of the Caribbean and Afro-diasporic community.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Explore</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="/#who-we-are" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>Who We Are</a>
              <a href="/#what-we-do" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>What We Do</a>
              <a href="/events" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>Events</a>
              {/* <a href="/gallery" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>The Room</a> */}
              <a href="/#join" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>Join the Club</a>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Get in Touch</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="mailto:hello@gyaldemsocialclub.com" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>hello@gyaldemsocialclub.com</a>
              <a href="https://instagram.com/gyaldemsocialclub" style={{ color: "rgba(10,10,10,0.7)", fontSize: "14px", textDecoration: "none" }}>@gyaldemsocialclub</a>
            </div>
          </div>

        </div>

        <div style={{ borderTop: "1px solid rgba(139,26,26,0.2)", paddingTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "12px" }}>© 2026 Gyal Dem Social Club. All rights reserved.</p>
          <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "12px" }}>Based in Miami. Rooted in the diaspora.</p>
        </div>

      </div>
    </footer>
  );
}