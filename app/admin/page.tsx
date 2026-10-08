// app/admin/page.tsx  (or wherever your current AdminPage.tsx lives)
//
// Replaces the single shared-password gate with real per-person login.
// Same dark visual treatment as before — the mechanism underneath is
// what changed, not the look.
//
// Flow: sign in with Supabase Auth -> ask /api/admin/role who they are
// -> branch on role: admin gets AdminDashboard, artist gets the artist
// dashboard (Propose, Profile, Results), door and host get their screens.
//
// Needs: npm i @supabase/ssr @supabase/supabase-js (already installed)
// Env: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
//

"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import AdminDashboard from "./AdminDashboard";
import ArtistDashboard from "./artist/ArtistDashboard";
import DoorCheckIn from "./showtime/DoorCheckIn";
import HostBingo from "./showtime/HostBingo";

type StaffRole = "super_admin" | "admin" | "artist" | "door" | "host";
type StaffUser = { email: string; role: StaffRole };

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // On load: is there already a valid session (e.g. a refresh), and if
  // so, are they actually staff?
  useEffect(() => {
    setMounted(true);

    (async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setChecking(false);
        return;
      }

      const res = await fetch("/api/admin/role");
      if (res.ok) {
        setStaffUser(await res.json());
      } else {
        // Signed in but not staff (or session is stale) — don't leave
        // them in limbo, clear it and show the login form.
        await supabase.auth.signOut();
      }
      setChecking(false);
    })();
  }, []);

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError("That email and password didn't match.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/admin/role");
    if (!res.ok) {
      // Valid login, but not on the ln_staff allowlist.
      await supabase.auth.signOut();
      setError("That account isn't authorized for admin access.");
      setSubmitting(false);
      return;
    }

    setStaffUser(await res.json());
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await supabaseBrowser().auth.signOut();
    setStaffUser(null);
    setEmail("");
    setPassword("");
  };

  if (!mounted || checking) return null;

  if (staffUser?.role === "admin" || staffUser?.role === "super_admin") {
    // Admins can also open the show-night screens: /admin?screen=checkin
    // or /admin?screen=bingo (linked from the Ladies Night menu).
    const screen = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("screen") : null;
    if (screen === "checkin") return <DoorCheckIn onLogout={handleLogout} />;
    if (screen === "bingo") return <HostBingo onLogout={handleLogout} />;
    return <AdminDashboard onLogout={handleLogout} isSuper={staffUser.role === "super_admin"} />;
  }

  if (staffUser?.role === "artist") {
    return <ArtistDashboard email={staffUser.email} onLogout={handleLogout} />;
  }

  if (staffUser?.role === "door") return <DoorCheckIn onLogout={handleLogout} />;
  if (staffUser?.role === "host") return <HostBingo onLogout={handleLogout} />;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ maxHeight: "750px", objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "16px 0 0" }}>Admin Portal</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            className={`w-full bg-white/5 border text-center text-white px-4 py-3 text-sm tracking-widest focus:outline-none transition-colors ${
              error ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#8B1A1A]"
            }`}
          />
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              className={`w-full bg-white/5 border text-center text-white px-4 py-3 text-sm tracking-widest focus:outline-none transition-colors ${
                error ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#8B1A1A]"
              }`}
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", fontFamily: "sans-serif" }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {error && <p style={{ color: "#8B1A1A", fontSize: "12px", fontFamily: "sans-serif", margin: 0 }}>{error}</p>}
          <button
            onClick={handleLogin}
            disabled={submitting}
            style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "14px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Signing in…" : "Enter"}
          </button>
        </div>
      </div>
    </div>
  );
}