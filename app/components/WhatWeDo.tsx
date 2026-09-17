"use client";

import { motion } from "framer-motion";

const cards = [
  {
    title: "the gatherings",
    description: "Game nights, dinners, pop-ups, and monthly evenings built around community ritual — good music, real conversation, and a room full of women who show up fully, no performing required.",
  },
  {
    title: "the salons",
    description: "Smaller, immersive gatherings for real talk — the conversations and connections that don't happen on a dance floor.",
  },
  {
    title: "the balance",
    description: "Financial workshops, mental health support, and moments to reset — real substance behind the party, the things that carry us outside of the room.",
  },
  {
    title: "our community",
    description: "Our community doesn't just attend — they amplify. Creatives, founders, tastemakers, and culturally fluent women who are influential within their circles.",
  },
];

export default function WhatWeDo() {
  return (
    <section id="what-we-do" style={{ width: "100%" }}>

      <div style={{ position: "relative", height: "50vh", width: "100%", overflow: "hidden" }}>
        <div
          style={{ position: "absolute", inset: 0, backgroundImage: "url('/gyaldem_whatwedo.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
        <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: "0 32px 40px 32px" }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(36px, 5vw, 64px)", margin: 0 }}
          >
            gather. vibe. belong.
          </motion.h2>
        </div>
      </div>

      <div style={{ backgroundColor: "#F5F0E8", padding: "80px 24px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ color: "#8B1A1A", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(32px, 4vw, 52px)", marginBottom: "56px" }}
          >
            what we do
          </motion.h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px" }}
className="what-we-do-grid">
            {cards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                style={{ display: "flex", flexDirection: "column", gap: "14px", borderTop: "0.5px solid rgba(139,26,26,0.4)", paddingTop: "24px" }}
              >
                <h4 style={{ color: "#8B1A1A", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "22px", margin: 0 }}>
                  {card.title}
                </h4>
                <p style={{ color: "rgba(10,10,10,0.75)", fontSize: "15px", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif" }}>
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: cards.length * 0.15 }}
            style={{ marginTop: "64px", borderTop: "0.5px solid rgba(139,26,26,0.4)", paddingTop: "32px" }}
          >
            <h4 style={{ color: "#8B1A1A", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "22px", margin: "0 0 14px 0" }}>
              what's next
            </h4>
            <p style={{ color: "rgba(10,10,10,0.75)", fontSize: "15px", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif", maxWidth: "640px" }}>
              A home base is coming. More than a calendar of gatherings — a place.
            </p>
          </motion.div>

        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) {
          .what-we-do-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px !important;
          }
        }
        @media (max-width: 768px) {
          .what-we-do-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </section>
  );
}