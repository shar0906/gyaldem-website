"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function JoinTheClub() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!firstName || !email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email }),
      });

      if (res.ok) {
        setStatus("success");
        setFirstName("");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="join" className="bg-[#0A0A0A] py-24 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

        {/* Left — CTA copy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6"
        >
          <h2 className="text-[#8B1A1A] font-serif italic text-5xl md:text-6xl leading-tight">
            the room is better with you in it.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Be the first to know about upcoming events and membership announcements. Founding membership is limited — get on the list before it opens.
          </p>

          {/* Founding member badge */}
          <div className="border border-[#8B1A1A]/50 px-6 py-4 flex flex-col gap-1 max-w-sm">
            <span className="text-[#8B1A1A] text-xs tracking-widest uppercase">
              Founding Member
            </span>
            <span className="text-white text-sm leading-relaxed">
              Limited cohort. Early access to every event, exclusive member pricing, and a seat at the table from day one.
            </span>
          </div>
        </motion.div>

        {/* Right — Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col gap-5"
        >
          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <h3 className="text-white font-serif italic text-3xl">
                you're in the room.
              </h3>
              <p className="text-white/60 text-base">
                Welcome to Gyal Dem. We'll be in touch soon.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-xs tracking-widest uppercase">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                  className="bg-white/5 border border-white/10 text-white px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-xs tracking-widest uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/5 border border-white/10 text-white px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#8B1A1A] transition-colors"
                />
              </div>

              {status === "error" && (
                <p className="text-red-400 text-sm">
                  Something went wrong. Try again or email us directly at hello@gyaldemsocialclub.com
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                className="bg-[#8B1A1A] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#6d1414] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Sending..." : "Get on the List"}
              </button>

              <p className="text-white/30 text-xs">
                No spam. Just Gyal Dem.
              </p>
            </>
          )}
        </motion.div>

      </div>
    </section>
  );
}