"use client";

import { useState } from "react";

export default function JoinBanner() {
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
    <section style={{ backgroundColor: "#0A0A0A", padding: "64px 24px" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(28px, 4vw, 48px)", color: "#8B1A1A", margin: 0, lineHeight: 1.2 }}>
          the room is better with you in it.
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px", fontFamily: "sans-serif", margin: 0, maxWidth: "480px" }}>
          Be the first to know about upcoming events and founding membership.
        </p>
        {status === "success" ? (
          <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "20px" }}>
            you're in the room. ✓
          </p>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "560px" }}>
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
              {status === "loading" ? "..." : "Join"}
            </button>
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