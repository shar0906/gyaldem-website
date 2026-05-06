"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnterGate({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const handleEnter = () => {
    setLeaving(true);
    setTimeout(() => {
      sessionStorage.setItem("entered", "true");
      onEnter();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="gate"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{
            backgroundImage: "url('/entergate_background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark overlay — mirrors the Canva warmth */}
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-white/10" />

          {/* Warm amber vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(20,10,5,0.6) 100%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-2">

            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                className="w-full flex justify-center px-6"
            >
              <img
                src="/gyaldem_red_wl_transparent.png"
                alt="Gyal Dem Social Club"
                className="w-[500px] md:w-[700px] object-cover drop-shadow-2xl"
              />
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="w-16 h-px bg-white/40"
            />

            {/* Enter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.3 }}
              className="flex flex-col items-center gap-3 cursor-pointer group"
              onClick={handleEnter}
            >
              <span className="text-white/80 font-serif italic text-xl tracking-[0.3em] group-hover:text-white transition-colors duration-300">
                enter
              </span>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-px h-6 bg-white/40"
              />
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}