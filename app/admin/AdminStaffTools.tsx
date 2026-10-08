// AdminStaffTools.tsx  (same folder as AdminDashboard.tsx)
//
// A small modal: Invite Staff, plus Sync Staff Metadata for super admins.
// Admins can invite artist, door, and host logins; super admins any role.
// (Older note:) Sync Staff Metadata (one click) and Invite Staff, with
// all four roles. Artists can also be invited from Ladies Night > Artists.

"use client";

import { useState } from "react";

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modalStyle: React.CSSProperties = { backgroundColor: "white", width: "100%", maxWidth: "440px", padding: "28px", fontFamily: "sans-serif" };
const labelStyle: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(10,10,10,0.5)", display: "block", marginBottom: "6px" };
const inputStyle: React.CSSProperties = { width: "100%", border: "0.5px solid rgba(10,10,10,0.2)", padding: "10px 12px", fontSize: "13px", outline: "none", marginBottom: "14px" };
const btnPrimary: React.CSSProperties = { backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { backgroundColor: "transparent", border: "0.5px solid rgba(10,10,10,0.2)", color: "rgba(10,10,10,0.6)", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" };

type Role = "super_admin" | "admin" | "artist" | "door" | "host";
const ROLE_HELP: Record<Role, string> = {
  super_admin: "Everything admins have, plus technical tools and managing staff.",
  admin: "Shows, artists, guests, results, events, and The Room. Can invite artist, door, and host logins.",
  artist: "Their own Propose, Profile, and Results. Creates their artist profile.",
  door: "Only the check-in screen on show night.",
  host: "Only the bingo caller on show night.",
};
const INVITE_ERRORS: Record<string, string> = {
  bad_email: "Check the email address.",
  bad_role: "Pick a role.",
  rate_limited: "Too many emails sent this hour. Try again in a little while.",
  unauthorized: "Your login expired. Refresh and sign in again.",
  forbidden_role: "Only a super admin can invite admins.",
  protected_account: "That email belongs to an admin. Only a super admin can change it.",
  own_role: "You can't change your own role.",
  last_super_admin: "That's the last super admin, so their role can't change.",
};

export default function AdminStaffTools({ onClose, isSuper = false }: { onClose: () => void; isSuper?: boolean }) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("artist");
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
        setInviteMessage(INVITE_ERRORS[data.error] ?? (data.error === "email_failed" ? `The email didn't send: ${data.message}` : "Something went wrong sending the invite."));
      } else {
        setInviteMessage(
          data.email_sent === "reset"
            ? `Invited ${email.trim()}. They already had a login, so they got a password-reset email.`
            : `Invited ${email.trim()}.`
        );
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

        {isSuper && (
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
        )}

        <div>
          <p style={labelStyle}>Invite Staff</p>

          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="name@example.com" />

          <label style={labelStyle}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="First name" />

          <label style={labelStyle}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...inputStyle, cursor: "pointer", marginBottom: "6px" }}>
            <option value="artist">Artist</option>
            <option value="door">Door (check-in only)</option>
            <option value="host">Host (bingo only)</option>
            {isSuper && <option value="admin">Admin</option>}
            {isSuper && <option value="super_admin">Super admin</option>}
          </select>
          <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.5)", margin: "0 0 14px" }}>{ROLE_HELP[role]}</p>

          <button onClick={sendInvite} disabled={inviting} style={btnPrimary}>
            {inviting ? "Sending…" : "Send Invite"}
          </button>
          {inviteMessage && <p style={{ fontSize: "12px", color: inviteMessage.startsWith("Invited") ? "#2d6a2d" : "#8B1A1A", margin: "10px 0 0" }}>{inviteMessage}</p>}
        </div>
      </div>
    </div>
  );
}