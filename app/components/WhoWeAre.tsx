"use client";

import { motion } from "framer-motion";

export default function WhoWeAre() {
  return (
    <section id="who-we-are" className="bg-[#F5F0E8] py-24 px-6">
      <div className="max-w-6xl mx-auto">

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[#8B1A1A] font-serif italic text-5xl md:text-6xl mb-16"
        >
          who we are
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="w-72 h-96 rounded-[50%] overflow-hidden bg-[#d4c9b8]">
              <img
                src="https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&q=80"
                alt="Women of the diaspora"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <p className="text-[#0A0A0A] text-lg leading-relaxed">
              Gyal Dem Social Club is a space for women of the Caribbean and Afro-diasporic community to gather, connect, and feel completely at home.
            </p>
            <p className="text-[#0A0A0A] text-lg leading-relaxed">
              We create and collab on experiences that center our culture: the music, the food, the conversations you actually want to have. Not a networking event. Not a brunch with a dress code. The real thing.
            </p>
            <p className="text-[#8B1A1A] text-lg font-medium leading-relaxed">
              Based in Miami. Rooted in the diaspora. Built for women who move different.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}