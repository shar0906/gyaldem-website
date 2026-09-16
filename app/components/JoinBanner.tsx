"use client";

import { useState } from "react";

export default function JoinBanner() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  // Aligned with public routing choices: defaults to core membership track
  const [publicChoice, setPublicChoice] = useState<"membership" | "ambassador" | "mailing">("membership");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;

    setStatus("loading");
    try {
      // DYNAMIC TARGET LOGIC: Route to /api/apply if they select an active registration tier
      const targetApiRoute = publicChoice === "mailing" ? "/api/subscribe" : "/api/apply";

      const res = await fetch(targetApiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firstName, 
          email, 
          tier: publicChoice // Sends 'mailing', 'membership', or 'ambassador' securely
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
    <section style={{ backgroundColor: "#0A0A0A", padding: "64px 24px" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(28px, 4vw, 48px)", color: "#8B1A1A", margin: 0, lineHeight: 1.2 }}>
          the room is better with you in it.
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px", fontFamily: "sans-serif", margin: 0, maxWidth: "480px" }}>
          Select your path of connection and receive an official portal invitation dispatch.
        </p>
        
        {status === "success" ? (
          <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "18px", maxWidth: "480px", lineHeight: 1.5 }}>
            {publicChoice === "mailing"
              ? "you're on the list. ✓ Welcome to the Guest List."
              : "request logged. ✓ Please check your inbox within a few moments to unlock private portal access."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%", maxWidth: "720px" }}>
            
            {/* High-Level 3 Option Selection Grid */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              <button 
                  type="button"
                  onClick={() => setPublicChoice("mailing")}
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    padding: "12px", 
                    backgroundColor: "rgba(255,255,255,0.02)", 
                    border: publicChoice === "mailing" ? "1px solid #8B1A1A" : "1px solid rgba(255,255,255,0.05)", 
                    cursor: "pointer", 
                    flex: 1, 
                    minWidth: "180px", 
                    transition: "all 0.2s ease" 
                  }}
                >
                  <span style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: publicChoice === "mailing" ? "#8B1A1A" : "white", fontFamily: "sans-serif", fontWeight: "bold" }}>
                    The Guest List
                  </span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", marginTop: "4px" }}>
                    General digital journals
                  </span>
              </button>

              <button 
                type="button"
                onClick={() => setPublicChoice("membership")}
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  padding: "12px", 
                  backgroundColor: "rgba(255,255,255,0.02)", 
                  border: publicChoice === "membership" ? "1px solid #8B1A1A" : "1px solid rgba(255,255,255,0.05)", 
                  cursor: "pointer", 
                  flex: 1, 
                  minWidth: "180px", 
                  transition: "all 0.2s ease" 
                }}
              >
                <span style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: publicChoice === "membership" ? "#8B1A1A" : "white", fontFamily: "sans-serif", fontWeight: "bold" }}>
                  Membership Interest
                </span>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", marginTop: "4px" }}>
                  Core & Premium tracks
                </span>
              </button>

              <button 
                type="button"
                onClick={() => setPublicChoice("ambassador")}
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  padding: "12px", 
                  backgroundColor: "rgba(255,255,255,0.02)", 
                  border: publicChoice === "ambassador" ? "1px solid #8B1A1A" : "1px solid rgba(255,255,255,0.05)", 
                  cursor: "pointer", 
                  flex: 1, 
                  minWidth: "180px", 
                  transition: "all 0.2s ease" 
                }}
              >
                <span style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: publicChoice === "ambassador" ? "#8B1A1A" : "white", fontFamily: "sans-serif", fontWeight: "bold" }}>
                  Ambassador Track
                </span>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", marginTop: "4px" }}>
                  Creative advocate alignments
                </span>
              </button>
            </div>

            {/* Inputs Container */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px 16px", fontSize: "14px", fontFamily: "sans-serif", outline: "none", flex: 1, minWidth: "140px" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px 16px", fontSize: "14px", fontFamily: "sans-serif", outline: "none", flex: 2, minWidth: "200px" }}
              />
              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "12px 24px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {status === "loading" ? "..." : publicChoice === "mailing" ? "Join List" : "Request Access"}
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontFamily: "sans-serif", margin: 0 }}>
            Something went wrong. Email us at hello@gyaldemsocialclub.com
          </p>
        )}
      </div>
    </section>
  );
}
