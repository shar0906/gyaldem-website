// AdminStaffTools.tsx  (same folder as AdminDashboard.tsx)
//
// A small modal with two buttons/forms that replace the console
// commands entirely — Sync Staff Metadata (one click) and Invite Staff
// (a real form). No more hand-typing fetch() calls.
//
// Untested draft — not run inside your repo yet.

"use client";

import { useState } from "react";

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modalStyle: React.CSSProperties = { backgroundColor: "white", width: "100%", maxWidth: "440px", padding: "28px", fontFamily: "sans-serif" };
const labelStyle: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(10,10,10,0.5)", display: "block", marginBottom: "6px" };
const inputStyle: React.CSSProperties = { width: "100%", border: "0.5px solid rgba(10,10,10,0.2)", padding: "10px 12px", fontSize: "13px", outline: "none", marginBottom: "14px" };
const btnPrimary: React.CSSProperties = { backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { backgroundColor: "transparent", border: "0.5px solid rgba(10,10,10,0.2)", color: "rgba(10,10,10,0.6)", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" };

export default function AdminStaffTools({ onClose }: { onClose: () => void }) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "artist">("artist");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const runSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/staff/sync-staff-metadata", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage("Something went wrong — check the terminal.");
      } else {
        const summary = (data.results ?? []).map((r: { email: string; status: string }) => `${r.email}: ${r.status}`).join(", ");
        setSyncMessage(summary || "No staff rows found.");
      }
    } catch {
      setSyncMessage("Request failed — check your connection.");
    }
    setSyncing(false);
  };

  const sendInvite = async () => {
    if (!email.trim()) {
      setInviteMessage("Email is required.");
      return;
    }
    setInviting(true);
    setInviteMessage(null);
    try {
      const res = await fetch("/api/admin/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMessage(data.detail || "Something went wrong sending the invite.");
      } else {
        setInviteMessage(`Invited ${email.trim()}.`);
        setEmail("");
        setName("");
        setRole("artist");
      }
    } catch {
      setInviteMessage("Request failed — check your connection.");
    }
    setInviting(false);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "20px", margin: 0, color: "#0A0A0A" }}>Staff Tools</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "rgba(10,10,10,0.5)" }}>×</button>
        </div>

        <div style={{ marginBottom: "28px", paddingBottom: "24px", borderBottom: "0.5px solid rgba(10,10,10,0.15)" }}>
          <p style={labelStyle}>Sync Staff Metadata</p>
          <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.5)", margin: "0 0 10px" }}>
            Pushes name + role from ln_staff into each person's Supabase Auth profile.
          </p>
          <button onClick={runSync} disabled={syncing} style={btnSecondary}>
            {syncing ? "Syncing…" : "Run Sync"}
          </button>
          {syncMessage && <p style={{ fontSize: "12px", color: "#2d6a2d", margin: "10px 0 0" }}>{syncMessage}</p>}
        </div>

        <div>
          <p style={labelStyle}>Invite Staff</p>

          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="name@example.com" />

          <label style={labelStyle}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="First name" />

          <label style={labelStyle}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "artist")} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="artist">Artist</option>
            <option value="admin">Admin</option>
          </select>

          <button onClick={sendInvite} disabled={inviting} style={btnPrimary}>
            {inviting ? "Sending…" : "Send Invite"}
          </button>
          {inviteMessage && <p style={{ fontSize: "12px", color: inviteMessage.startsWith("Invited") ? "#2d6a2d" : "#8B1A1A", margin: "10px 0 0" }}>{inviteMessage}</p>}
        </div>
      </div>
    </div>
  );
}