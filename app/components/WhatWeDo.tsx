"use client";

import { motion } from "framer-motion";

const cards = [
  {
    title: "ladies nights",
    description:
      "Monthly hosted evenings curated for the culture. Good music, themed bingo, intentional conversation, and a room full of women you actually want to know.",
  },
  {
    title: "cultural experiences",
    description:
      "From pop-ups to private events, we build moments rooted in Caribbean and Afro-diasporic identity. Every event is curated with intention — the details are what make the difference.",
  },
  {
    title: "our community",
    description:
      "Gyal Dem is not just events. It's a network, a sisterhood, and a social home for women who've always known the room was better when they were in it.",
  },
];

export default function WhatWeDo() {
  return (
    <section id="what-we-do" className="w-full">

      {/* Full bleed image banner */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=1600&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex items-end justify-start px-8 md:px-16 pb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-white font-serif italic text-5xl md:text-7xl"
          >
            gather. vibe. belong.
          </motion.h2>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-[#F5F0E8] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[#8B1A1A] font-serif italic text-4xl md:text-5xl mb-14"
          >
            what we do
          </motion.h3>

          <div className="grid md:grid-cols-3 gap-8">
            {cards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex flex-col gap-4 border-t border-[#8B1A1A]/30 pt-6"
              >
                <h4 className="text-[#8B1A1A] font-serif italic text-2xl">
                  {card.title}
                </h4>
                <p className="text-[#0A0A0A]/80 text-base leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}