"use client";

import { motion } from "framer-motion";

const photos = [
  { src: "/entergate_background.jpg", label: "Ladies Night" },
  { src: "/entergate_background.jpg", label: "Gyalentines" },
  { src: "/entergate_background.jpg", label: "Community" },
  { src: "/entergate_background.jpg", label: "Ladies Night" },
  { src: "/entergate_background.jpg", label: "Cultural Experience" },
  { src: "/entergate_background.jpg", label: "Community" },
];

export default function Gallery() {
  return (
    <section id="gallery" className="bg-[#F5F0E8] py-20 px-6">
      <div className="max-w-6xl mx-auto">

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[#8B1A1A] font-serif italic text-5xl md:text-6xl mb-14"
        >
          in the room: gyal dem gallery
        </motion.h2>

        <div className="columns-2 md:columns-3 gap-4 space-y-4">
          {photos.map((photo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative break-inside-avoid overflow-hidden group"
            >
              <img
                src={photo.src}
                alt={photo.label}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end p-4">
                <span className="text-white text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {photo.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}