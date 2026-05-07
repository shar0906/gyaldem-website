"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative h-screen w-full flex items-center justify-center overflow-hidden"
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Background image — swap src with your real photo later */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/gyaldem_main_header.jpg')`,
        }}
      />

      {/* Content */}
      <div className="relative z-20 text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white/70 tracking-widest uppercase text-sm mb-4"
        >
          Miami's Social Club
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white font-serif italic text-6xl md:text-8xl leading-tight mb-6"
          style={{
            WebkitTextStroke: "2px white",
            textShadow: "3px 3px 0px #8B1A1A, -1px -1px 0px #8B1A1A, 1px -1px 0px #8B1A1A, -1px 1px 0px #8B1A1A",
            color: "white",
          }}
        >
          for the gyal dem.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-10"
        >
          A space for women of the Caribbean and Afro-diasporic community to gather, connect, and feel completely at home.
        </motion.p>

        <motion.a
          href="#join"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="inline-block bg-[#8B1A1A] text-white px-10 py-4 text-sm tracking-widest uppercase hover:bg-[#6d1414] transition-colors"
        >
          Join the Club
        </motion.a>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span className="text-white/50 text-xs tracking-widest uppercase">scroll</span>
        <div className="w-px h-8 bg-white/30" />
      </motion.div>
    </section>
  );
}