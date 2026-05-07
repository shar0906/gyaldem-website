"use client";

import { useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = sessionStorage.getItem("gd_admin_auth");
    if (auth === "true") setAuthenticated(true);
  }, []);

  const handleLogin = async () => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("gd_admin_auth", "true");
      setAuthenticated(true);
    } else {
      setError(true);
    }
  };

  if (!mounted) return null;

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "400px", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ maxHeight: "750px", objectFit: "contain" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "16px 0 0" }}>Admin Portal</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              style={{ backgroundColor: "rgba(255,255,255,0.05)", border: error ? "1px solid #8B1A1A" : "1px solid rgba(255,255,255,0.1)", color: "white", padding: "14px 16px", fontSize: "14px", fontFamily: "sans-serif", outline: "none", width: "100%", boxSizing: "border-box" }}
            />
            {error && <p style={{ color: "#8B1A1A", fontSize: "12px", fontFamily: "sans-serif", margin: 0 }}>Incorrect password. Try again.</p>}
            <button
              onClick={handleLogin}
              style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "14px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}