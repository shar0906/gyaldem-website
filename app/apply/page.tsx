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
                    Membership | Founding Cohort | Ambassador Portal
                </p>
                <div className="h-[1px] w-12 bg-[#8B1A1A]/40 mx-auto mt-2" />
            </div>

            {/* Refined Context Copy */}
            <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
              This portal is strictly gated. Access is reserved exclusively for those seeking core Membership, the Founding Cohort, or expressing interest in Brand Ambassadorship. Please enter your passcode to unlock.
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
                  Invalid passcode. Please verify your credentials or contact the collective.
                </p>
              )}
              <button
                type="submit"
                className="bg-[#8B1A1A] text-white px-8 py-3.5 text-xs tracking-widest uppercase font-medium hover:bg-[#6d1414] transition-colors"
              >
                Request Admittance
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
              <h1 className="font-serif italic text-4xl md:text-5xl text-[#8B1A1A] tracking-wide">The Collective Portal</h1>
              <p className="text-white/50 text-xs uppercase tracking-widest">An Invitation to Intentional Kinship</p>
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
                    Thank you for completing your profile with such intention. Over the coming weeks, our founding committee will review submissions by hand and finalize our first seasonal cohort blocks. If selected, you will receive a formal invitation code via email to lock in your lifetime tier patronage and secure your seat at our private inaugural assemblies and partner events.
                    </p>
                    <p className="text-[#8B1A1A] font-mono text-xs tracking-widest uppercase mt-4">
                    In Stewardship // @GyalDemSocialClub
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
                  setStatus("loading");
                  try {
                    const res = await fetch("/api/subscribe", {
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
                        <label className="text-white/40 text-xs tracking-widest uppercase">Select Path of Belonging</label>
                        <div className="flex flex-col gap-3">
                            
                            {/* Track 1: Collective Patron */}
                            <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tier: "collective" })}
                            className={`p-4 text-left transition-all ${
                                formData.tier === "collective" ? "border border-[#8B1A1A] bg-white/[0.02]" : "border border-white/5 bg-white/5"
                            }`}
                            >
                            <span className={`text-xs uppercase tracking-wider block font-bold ${formData.tier === "collective" ? "text-[#8B1A1A]" : "text-white"}`}>
                                Collective Patron (Core Membership)
                            </span>
                            <span className="text-white/40 text-[11px] block mt-1">Priority track for our upcoming core membership rollout with dues. Includes seasonal assembly invitations and members-only ticket tiers.</span>
                            </button>

                            {/* Track 2: Founding Cohort */}
                            <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tier: "founding" })}
                            className={`p-4 text-left transition-all ${
                                formData.tier === "founding" ? "border border-[#8B1A1A] bg-white/[0.02]" : "border border-white/5 bg-white/5"
                            }`}
                            >
                            <span className={`text-xs uppercase tracking-wider block font-bold ${formData.tier === "founding" ? "text-[#8B1A1A]" : "text-white"}`}>
                                Founding Cohort (Premium Membership)
                            </span>
                            <span className="text-white/40 text-[11px] block mt-1">Our signature membership tier. Guaranteed seasonal rates, private quarterly board dinners, and exclusive partner events.</span>
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
                                Brand Ambassador Interest
                            </span>
                            <span className="text-white/40 text-[11px] block mt-1">Express interest in championing our sisterhood, driving cultural strategy, and co-curating space.</span>
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
                          <input type="text" value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} placeholder="e.g. Design District" className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-[#8B1A1A]" />
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button type="button" onClick={() => setStep(2)} disabled={!formData.firstName || !formData.email} className="bg-[#8B1A1A] text-white px-8 py-3 text-xs uppercase tracking-widest disabled:opacity-40">Continue</button>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">How do you spend your days?</label>
                          <textarea rows={2} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-[#8B1A1A] resize-none" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">What does intentional sisterhood mean to you?</label>
                          <textarea rows={2} value={formData.diasporaConcept} onChange={(e) => setFormData({ ...formData, diasporaConcept: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-[#8B1A1A] resize-none" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-white/40 text-xs uppercase">What are you looking to unlearn or release here?</label>
                          <textarea rows={2} value={formData.releaseIntent} onChange={(e) => setFormData({ ...formData, releaseIntent: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 text-sm focus:outline-none focus:border-[#8B1A1A] resize-none" />
                        </div>

                        <div className="pt-4 flex justify-between">
                          <button type="button" onClick={() => setStep(1)} className="border border-white/10 px-6 py-3 text-xs uppercase">Back</button>
                          <button type="button" onClick={() => setStep(3)} className="bg-[#8B1A1A] text-white px-8 py-3 text-xs uppercase">Continue</button>
                        </div>
                      </motion.div>
                    )}
                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex flex-col gap-3">
                          <label className="text-white/40 text-xs uppercase">Which programming pillars resonate most?</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { id: "Epicurean Salons", desc: "Intimate culinary talks" },
                              { id: "Cultural Activations", desc: "Private gallery views" },
                              { id: "Restorative Assemblies", desc: "Immersive wellness setups" },
                              { id: "Intellectual Symposiums", desc: "Professional workshops" },
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

                        <div className="border border-[#8B1A1A]/30 p-4 bg-[#8B1A1A]/5 flex flex-col gap-1 text-[11px] text-white/60">
                          <span className="uppercase text-[#8B1A1A] font-bold tracking-widest">The Gyal Dem Covenant</span>
                          <p>Belonging requires a commitment to mutual care, absolute privacy, and active presence.</p>
                        </div>

                        {status === "error" && <p className="text-red-400 text-xs">Error mapping profile data. Reach hello@gyaldemsocialclub.com</p>}

                        <div className="pt-4 flex justify-between items-center">
                          <button type="button" onClick={() => setStep(2)} disabled={status === "loading"} className="border border-white/10 px-6 py-3 text-xs uppercase disabled:opacity-40">Back</button>
                          <button type="submit" disabled={status === "loading"} className="bg-[#8B1A1A] text-white px-10 py-3 text-xs uppercase tracking-widest font-medium disabled:opacity-40">
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
