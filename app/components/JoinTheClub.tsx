"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function JoinTheClub() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  // Default to membership core interest track
  const [publicChoice, setPublicChoice] = useState<"mailing" | "membership" | "ambassador">("membership");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firstName, 
          email, 
          tier: publicChoice // Sends 'mailing', 'membership', or 'ambassador' securely to Kit
        }),
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

        {/* Left — Copy Block */}
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="flex flex-col gap-6">
          <h2 className="text-[#8B1A1A] font-serif italic text-5xl md:text-6xl leading-tight">
            the room is better with you in it.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Select your path of connection. Join our community Guest List, or register to receive an official invitation dispatch to our private admittance portals for active membership paths and ambassador alignments.
          </p>
        </motion.div>

        {/* Right — Form */}
        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="flex flex-col gap-5">
          {status === "success" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <h3 className="text-white font-serif italic text-3xl">you're on the list. ✓</h3>
              <p className="text-white/60 text-base leading-relaxed">
                {publicChoice === "mailing" 
                  ? "Welcome to the Guest List. Check your inbox shortly for our community welcome dispatch."
                  : "Your invitation request has been logged. Please check your inbox within a few moments to confirm your email and receive your private portal access link."}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Public Selection Stack */}
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-xs tracking-widest uppercase">Select Your Path</label>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => setPublicChoice("mailing")} className={`p-4 text-left border text-xs uppercase tracking-wider transition-all font-semibold ${publicChoice === "mailing" ? "border-[#8B1A1A] bg-white/[0.02] text-[#8B1A1A]" : "border-white/5 bg-white/5 text-white"}`}>
                    The Guest List <span className="text-white/40 block text-[10px] font-normal normal-case mt-0.5">Join our mailing list for digital community journals and open public event notifications.</span>
                  </button>
                  <button type="button" onClick={() => setPublicChoice("membership")} className={`p-4 text-left border text-xs uppercase tracking-wider transition-all font-semibold ${publicChoice === "membership" ? "border-[#8B1A1A] bg-white/[0.02] text-[#8B1A1A]" : "border-white/5 bg-white/5 text-white"}`}>
                    Active Membership Interest <span className="text-white/40 block text-[10px] font-normal normal-case mt-0.5">Request entry to apply for our upcoming core or premium founding membership cohorts.</span>
                  </button>
                  <button type="button" onClick={() => setPublicChoice("ambassador")} className={`p-4 text-left border text-xs uppercase tracking-wider transition-all font-semibold ${publicChoice === "ambassador" ? "border-[#8B1A1A] bg-white/[0.02] text-[#8B1A1A]" : "border-white/5 bg-white/5 text-white"}`}>
                    Brand Ambassador <span className="text-white/40 block text-[10px] font-normal normal-case mt-0.5">Request entry to express localized strategic or creative ambassador alignment.</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-xs tracking-widest uppercase">First Name</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your first name" className="bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-xs tracking-widest uppercase">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors" />
              </div>

              {status === "error" && <p className="text-red-400 text-sm">Something went wrong. Contact hello@gyaldemsocialclub.com</p>}

              <button type="submit" disabled={status === "loading"} className="bg-[#8B1A1A] text-white px-8 py-4 text-sm tracking-widest uppercase font-semibold hover:bg-[#6d1414] transition-colors disabled:opacity-50">
                {status === "loading" ? "Registering..." : publicChoice === "mailing" ? "Join the Guest List" : "Request Portal Invitation"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
