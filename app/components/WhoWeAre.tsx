"use client";

import { motion } from "framer-motion";

export default function WhoWeAre() {
  return (
    <section id="who-we-are" style={{ backgroundColor: "#F5F0E8", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ color: "#8B1A1A", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(36px, 5vw, 60px)", marginBottom: "64px" }}
        >
          who we are
        </motion.h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}
className="who-we-are-grid">

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ display: "flex", justifyContent: "center" }}
          >
            <div style={{ width: "300px", height: "380px", borderRadius: "50% 50% 50% 50%", overflow: "hidden", backgroundColor: "#d4c9b8" }}>
              <img
                src="/gyaldem_whoweare.jpg"
                alt="Women of the diaspora"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <p style={{ color: "#0A0A0A", fontSize: "18px", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif" }}>
              Gyal Dem Social Club is a Miami-based women's cultural collective, co-founded by two brand leaders at the intersection of experience strategy and community building. We created what the city was missing.
            </p>
            <p style={{ color: "#0A0A0A", fontSize: "18px", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif" }}>
              We are not a party brand. We are not a networking group. We are a culturally rooted social platform operating at the intersection of sisterhood, celebration, and intentional community — designed for women of the Afro-diasporic community.
            </p>
            <p style={{ color: "#8B1A1A", fontSize: "17px", fontWeight: 500, lineHeight: 1.6, margin: 0, fontFamily: "sans-serif" }}>
              Cultural salon. Party with purpose. Community without the stiffness.
            </p>
            <p style={{ color: "rgba(10,10,10,0.6)", fontSize: "15px", lineHeight: 1.6, margin: 0, fontFamily: "sans-serif" }}>
              Based in Miami. Rooted in the diaspora. Built for women who move different.
            </p>
          </motion.div>

        </div>
      </div>
      <style>{`
          @media (max-width: 768px) {
            .who-we-are-grid {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
          }
        `}
      </style>
    </section>
  );
}