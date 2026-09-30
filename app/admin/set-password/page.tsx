// app/admin/set-password/page.tsx
//
// Where invite/reset links land after app/auth/confirm/route.ts has
// already exchanged the token for a real session — so by the time this
// page runs, supabase.auth.updateUser() has an authenticated session to
// act on. Same visibility-toggle pattern as the main login.
//
// Untested draft — not run inside your repo yet.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || "Something went wrong setting your password.");
      setSubmitting(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "24px", margin: 0 }}>Set Your Password</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontFamily: "sans-serif", margin: "8px 0 0" }}>
            Choose something you'll remember — you'll use this to log back in.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full bg-white/5 border border-white/10 text-center text-white px-4 py-3 text-sm tracking-widest focus:outline-none focus:border-[#8B1A1A]"
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

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="w-full bg-white/5 border border-white/10 text-center text-white px-4 py-3 text-sm tracking-widest focus:outline-none focus:border-[#8B1A1A]"
          />

          {error && <p style={{ color: "#8B1A1A", fontSize: "12px", fontFamily: "sans-serif", margin: 0 }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "14px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Saving…" : "Set Password & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}