"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FormState = {
  firstName: string;
  email: string;
  tier: "mailing" | "collective" | "founding" | "ambassador";
  neighborhood: string;
  bio: string;
  diasporaConcept: string;
  releaseIntent: string;
  pillars: string[];
  agreedToUnderstanding: boolean;
};


export default function ApplyPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = useState<FormState>({
    firstName: "",
    email: "",
    tier: "founding",
    neighborhood: "",
    bio: "",
    diasporaConcept: "",
    releaseIntent: "",
    pillars: [],
    agreedToUnderstanding: false,
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const INVITATION_CODE = "DIASPORA2026";
    if (password === INVITATION_CODE) {
      setPasswordError(false);
      setIsAuthenticated(true);
    } else {
      setPasswordError(true);
    }
  };

  const handlePillarToggle = (pillar: string) => {
    setFormData((prev) => ({
      ...prev,
      pillars: prev.pillars.includes(pillar)
        ? prev.pillars.filter((p) => p !== pillar)
        : [...prev.pillars, pillar],
    }));
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white py-24 px-6 flex flex-col items-center justify-center font-sans">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="password-gate"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mx-auto text-center flex flex-col gap-8"
          >
            <div className="flex flex-col gap-3">
                <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ maxHeight: "750px", objectFit: "contain", maxWidth: "400px"}} />
                {/* Refined Subtitle covering all three streams */}
                <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-widest font-semibold max-w-sm mx-auto leading-relaxed">
                    Membership · Founding Circle · Ambassador Application
                </p>
                <div className="h-[1px] w-12 bg-[#8B1A1A]/40 mx-auto mt-2" />
            </div>

            {/* Refined Context Copy */}
            <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
              You're here because you confirmed your interest — nice. Enter the code from your email to start your application.
            </p>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Passcode"
                className={`w-full bg-white/5 border text-center text-white px-4 py-3 text-sm tracking-widest focus:outline-none transition-colors ${
                  passwordError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#8B1A1A]"
                }`}
              />
              {passwordError && (
                <p className="text-red-500 text-xs font-medium">
                  That code didn't match. Double check your email, or reach out at hello@gyaldemsocialclub.com.
                </p>
              )}
              <button
                type="submit"
                className="bg-[#8B1A1A] text-white px-8 py-3.5 text-xs tracking-widest uppercase font-medium hover:bg-[#6d1414] transition-colors"
              >
                Start Application
              </button>
            </form>
          </motion.div>
        ) : (      
        <motion.div
            key="application-portal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto flex flex-col gap-12"
          >
            <div className="text-center flex flex-col gap-4">
              <h1 className="font-serif italic text-4xl md:text-5xl text-[#8B1A1A] tracking-wide">Apply to Gyal Dem</h1>
              <p className="text-white/50 text-xs uppercase tracking-widest">Real connection, real culture — let's see if it's a match.</p>
              <div className="h-[1px] w-12 bg-[#8B1A1A]/40 mx-auto mt-2" />
            </div>

            {status === "success" ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12 flex flex-col gap-4"
                >
                    <h2 className="font-serif italic text-3xl text-white">
                    your application is in the room.
                    </h2>
                    <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
                    We read every application with care — and we keep our cohorts small on purpose, so it takes a little time. Keep an eye on your inbox. If it's a match, you'll hear from us soon.
                    </p>
                    <p className="text-[#8B1A1A] font-mono text-xs tracking-widest uppercase mt-4">
                    Talk soon | <a href="https://www.instragram.com/gyaldemsocialclub">@GyalDemSocialClub</a>
                    </p>
                </motion.div>
            ) : (
              <div className="bg-white/[0.01] border border-white/5 p-8 md:p-12 relative">
                <div className="flex gap-2 mb-10 justify-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-[2px] w-8 transition-all ${step >= i ? "bg-[#8B1A1A]" : "bg-white/10"}`} />
                  ))}
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();

                  // Hard guard: block submission unless we're actually on the
                  // final step with every required field present. This protects
                  // against implicit form submission (e.g. pressing Enter in a
                  // text input on an earlier step), which bypasses the
                  // step-navigation buttons' disabled state entirely.
                  const isComplete =
                    step === 3 &&
                    formData.firstName.trim() &&
                    formData.email.trim() &&
                    formData.neighborhood.trim() &&
                    formData.bio.trim() &&
                    formData.diasporaConcept.trim() &&
                    formData.releaseIntent.trim() &&
                    formData.pillars.length > 0 &&
                    formData.agreedToUnderstanding;

                  if (!isComplete) {
                    // Nudge them to wherever the form actually is incomplete
                    // rather than silently doing nothing.
                    if (!formData.firstName.trim() || !formData.email.trim() || !formData.neighborhood.trim()) {
                      setStep(1);
                    } else if (!formData.bio.trim() || !formData.diasporaConcept.trim() || !formData.releaseIntent.trim()) {
                      setStep(2);
                    } else {
                      setStep(3);
                    }
                    return;
                  }

                  setStatus("loading");
                  try {
                    const res = await fetch("/api/apply", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(formData),
                    });
                    if (res.ok) setStatus("success");
                    else setStatus("error");
                  } catch { setStatus("error"); }
                }} className="space-y-8">
                  
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex flex-col gap-2">
                        <label className="text-white/40 text-xs tracking-widest uppercase">Which path fits you?</label>
                        <div className="flex flex-col gap-3">
                            
                            {/* Track 1: General Membership */}
                            <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tier: "collective" })}
                            className={`p-4 text-left transition-all ${
                                formData.tier === "collective" ? "border border-[#8B1A1A] bg-white/[0.02]" : "border border-white/5 bg-white/5"
                            }`}
                            >
                            <span className={`text-xs uppercase tracking-wider block font-bold ${formData.tier === "collective" ? "text-[#8B1A1A]" : "text-white"}`}>
                                General Membership
                            </span>
                            <span className="text-white/40 text-[11px] block mt-1">In on the regular. Priority on tickets, invites to the gatherings.</span>
                            </button>

                            {/* Track 2: Founding Circle */}
                            <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tier: "founding" })}
                            className={`p-4 text-left transition-all ${
                                formData.tier === "founding" ? "border border-[#8B1A1A] bg-white/[0.02]" : "border border-white/5 bg-white/5"
                            }`}
                            >
                            <span className={`text-xs uppercase tracking-wider block font-bold ${formData.tier === "founding" ? "text-[#8B1A1A]" : "text-white"}`}>
                                Founding Circle
                            </span>
                            <span className="text-white/40 text-[11px] block mt-1">Our inner tier. First on everything, a seat at the table as we build what's next.</span>
                            </button>

                            {/* Track 3: Brand Ambassador */}
                            <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tier: "ambassador" })}
                            className={`p-4 text-left transition-all ${
                                formData.tier === "ambassador" ? "border border-[#8B1A1A] bg-white/[0.02]" : "border border-white/5 bg-white/5"
                            }`}
                            >
                            <span className={`text-xs uppercase tracking-wider block font-bold ${formData.tier === "ambassador" ? "text-[#8B1A1A]" : "text-white"}`}>
                                Brand Ambassador
                            </span>
                            <span className="text-white/40 text-[11px] block mt-1">You're already putting us on in your circle — let's make it official.</span>
                            </button>

                        </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">First Name</label>
                          <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-[#8B1A1A]" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">Email Address</label>
                          <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-[#8B1A1A]" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">Miami Location</label>
                          <input type="text" required value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} placeholder="e.g. Design District" className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-[#8B1A1A]" />
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button type="button" onClick={() => setStep(2)} disabled={!formData.firstName.trim() || !formData.email.trim() || !formData.neighborhood.trim()} className="bg-[#8B1A1A] text-white px-8 py-3 text-xs uppercase tracking-widest disabled:opacity-40">Continue</button>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">How do you spend your days?</label>
                          <textarea required rows={2} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-[#8B1A1A] resize-none" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">What does sisterhood look like for you right now?</label>
                          <textarea required rows={2} value={formData.diasporaConcept} onChange={(e) => setFormData({ ...formData, diasporaConcept: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-[#8B1A1A] resize-none" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">What are you hoping to find here that Miami's been missing?</label>
                          <textarea required rows={2} value={formData.releaseIntent} onChange={(e) => setFormData({ ...formData, releaseIntent: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-[#8B1A1A] resize-none" />
                        </div>

                        <div className="pt-4 flex justify-between">
                          <button type="button" onClick={() => setStep(1)} className="border border-white/10 px-6 py-3 text-xs uppercase">Back</button>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            disabled={!formData.bio.trim() || !formData.diasporaConcept.trim() || !formData.releaseIntent.trim()}
                            className="bg-[#8B1A1A] text-white px-8 py-3 text-xs uppercase disabled:opacity-40"
                          >
                            Continue
                          </button>
                        </div>
                      </motion.div>
                    )}
                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex flex-col gap-3">
                          <label className="text-white/40 text-xs uppercase">Which of these pulls you in most?</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { id: "The Gatherings", desc: "Game nights, dinners, and monthly evenings" },
                              { id: "The Salons", desc: "Smaller, real-talk conversations" },
                              { id: "The Balance", desc: "Financial workshops, mental health, moments to reset" },
                              { id: "Our Community", desc: "Creatives, founders, tastemakers building together" },
                            ].map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handlePillarToggle(item.id)}
                                className={`p-4 text-left border transition-all ${
                                  formData.pillars.includes(item.id) ? "bg-[#8B1A1A]/10 border-[#8B1A1A]" : "bg-white/5 border-white/5"
                                }`}
                              >
                                <span className="text-xs uppercase tracking-wider block font-medium">{item.id}</span>
                                <span className="text-white/40 text-[11px] block mt-0.5">{item.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border border-[#8B1A1A]/30 p-4 bg-[#8B1A1A]/5 flex flex-col gap-3 text-[11px] text-white/60">
                          <div className="flex flex-col gap-1">
                            <span className="uppercase text-[#8B1A1A] font-bold tracking-widest">The Understanding</span>
                            <p>This is a space we protect. Show up for each other, respect what's shared in the room, and bring your real self. That's it — that's the whole ask.</p>
                          </div>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              required
                              checked={formData.agreedToUnderstanding}
                              onChange={(e) => setFormData({ ...formData, agreedToUnderstanding: e.target.checked })}
                              className="mt-0.5 accent-[#8B1A1A]"
                            />
                            <span className="text-white/70 text-[11px] leading-relaxed">
                              I agree to this — that's the room I'm signing up for.
                            </span>
                          </label>
                        </div>

                        {status === "error" && <p className="text-red-400 text-xs">Something went wrong. Email us at hello@gyaldemsocialclub.com</p>}
                        {formData.pillars.length === 0 && (
                          <p className="text-white/30 text-[11px]">Pick at least one to continue.</p>
                        )}

                        <div className="pt-4 flex justify-between items-center">
                          <button type="button" onClick={() => setStep(2)} disabled={status === "loading"} className="border border-white/10 px-6 py-3 text-xs uppercase disabled:opacity-40">Back</button>
                          <button type="submit" disabled={status === "loading" || formData.pillars.length === 0 || !formData.agreedToUnderstanding} className="bg-[#8B1A1A] text-white px-10 py-3 text-xs uppercase tracking-widest font-medium disabled:opacity-40">
                            {status === "loading" ? "Submitting..." : "Submit Application"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}