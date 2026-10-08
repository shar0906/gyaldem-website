// admin/StaffSection.tsx
//
// Super admins only: everyone with a staff login, their role, and whether
// they've signed in. Change a role or remove access. You can't change or
// remove yourself, and the last super admin can't be demoted or removed.

"use client";

import { useCallback, useEffect, useState } from "react";
import { FAINT, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, api, button, errorText, selectStyle } from "./ladies-night/kit";
import { formatDateTime } from "./artist/ui";

type Member = {
  email: string;
  name: string | null;
  role: string;
  last_sign_in_at: string | null;
  invited: boolean;
  has_login: boolean;
};

const ROLES: { value: string; label: string; help: string }[] = [
  { value: "super_admin", label: "Super admin", help: "Everything, including technical tools and staff" },
  { value: "admin", label: "Admin", help: "Everything except technical tools and staff management" },
  { value: "artist", label: "Artist", help: "Their own Propose, Profile, and Results" },
  { value: "door", label: "Door", help: "Check-in on show night" },
  { value: "host", label: "Host", help: "Bingo caller on show night" },
];
const LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

const ERRORS: Record<string, string> = {
  last_super_admin: "That's the only super admin. Make someone else a super admin first.",
  own_account: "You can't change or remove your own account.",
};

export default function StaffSection() {
  const [staff, setStaff] = useState<Member[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ staff: Member[]; me: string; error?: string }>("/api/admin/staff/members");
    if (!res.ok) return setLoadError(errorText(res.data));
    setStaff(res.data.staff);
    setMe(res.data.me);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(m: Member, role: string) {
    if (role === m.role) return;
    const who = m.name ?? m.email;
    const elevating = role === "super_admin" || role === "admin";
    if (!confirm(`Change ${who} from ${LABEL[m.role]} to ${LABEL[role]}?${elevating ? " They'll be able to manage everything that role allows." : ""}`)) return;
    setBusy(m.email);
    setNotice(null);
    const res = await api<{ error?: string }>("/api/admin/staff/members", { method: "PATCH", body: { email: m.email, role } });
    setBusy(null);
    if (!res.ok) return setNotice({ tone: "error", text: ERRORS[res.data.error ?? ""] ?? errorText(res.data) });
    setNotice({ tone: "ok", text: `${who} is now ${LABEL[role] === "Admin" ? "an" : "a"} ${LABEL[role]}.` });
    load();
  }

  async function remove(m: Member) {
    const who = m.name ?? m.email;
    if (!confirm(`Remove ${who}'s access? Their login will stop opening any staff screen right away.${m.role === "artist" ? " Their artist profile is deactivated; past shows and results stay." : ""}`)) return;
    setBusy(m.email);
    setNotice(null);
    const res = await api<{ error?: string }>("/api/admin/staff/members", { method: "DELETE", body: { email: m.email } });
    setBusy(null);
    if (!res.ok) return setNotice({ tone: "error", text: ERRORS[res.data.error ?? ""] ?? errorText(res.data) });
    setNotice({ tone: "ok", text: `${who} no longer has access. To bring them back, invite them again from Staff Tools.` });
    load();
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "32px 20px" }}>
        <H1>Staff</H1>
        <Notice tone="error">{loadError}</Notice>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1152, margin: "0 auto", padding: "32px 20px 60px", fontFamily: "sans-serif" }}>
      <style>{`
        .ln-staff-row{ display:grid; grid-template-columns:minmax(0,1.4fr) 200px minmax(0,1fr) 140px; gap:16px; align-items:center; padding:14px 20px; border-bottom:${LINE}; }
        @media (max-width: 860px){ .ln-staff-row{ grid-template-columns:1fr; gap:8px; } .ln-staff-head{ display:none !important; } }
      `}</style>
      <H1>Staff</H1>
      <p style={{ margin: "-8px 0 18px", fontSize: 14, color: MUTED, maxWidth: 720 }}>
        Everyone with a staff login. Invite new people from <b>Tools → Staff Tools</b>. Only super admins see this page.
      </p>
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}

      {!staff ? (
        <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={PANEL}>
          <div className="ln-staff-row ln-staff-head" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED, padding: "12px 20px" }}>
            <span>Person</span>
            <span>Role</span>
            <span>Last signed in</span>
            <span />
          </div>
          {staff.map((m) => {
            const self = m.email === me;
            return (
              <div key={m.email} className="ln-staff-row" style={{ opacity: busy === m.email ? 0.5 : 1 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>
                    {m.name ?? m.email.split("@")[0]} {self && <span style={{ fontFamily: "sans-serif", fontStyle: "normal", fontSize: 11, color: MUTED }}>(you)</span>}
                  </span>
                  <span style={{ fontSize: 13, color: MUTED, overflowWrap: "anywhere" }}>{m.email}</span>
                </span>
                <span>
                  <label htmlFor={`role-${m.email}`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Role for {m.email}</label>
                  <select
                    id={`role-${m.email}`}
                    value={m.role}
                    disabled={self || busy !== null}
                    onChange={(e) => changeRole(m, e.target.value)}
                    title={self ? "You can't change your own role" : ROLES.find((r) => r.value === m.role)?.help}
                    style={{ ...selectStyle, opacity: self ? 0.6 : 1, cursor: self ? "default" : "pointer" }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </span>
                <span style={{ fontSize: 13 }}>
                  {m.last_sign_in_at ? (
                    formatDateTime(m.last_sign_in_at)
                  ) : m.invited ? (
                    <span style={{ color: RED }}>Invited, hasn&apos;t signed in yet</span>
                  ) : (
                    <span style={{ color: FAINT }}>No login yet</span>
                  )}
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  {!self && (
                    <button onClick={() => remove(m)} disabled={busy !== null} style={{ ...button("quiet", busy === null), color: RED }}>
                      Remove access
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...PANEL, padding: "16px 20px", marginTop: 18, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
        <b style={{ color: GREEN }}>Built-in safeguards:</b> nobody can change or remove their own account, and the last super admin can never be
        demoted or removed. To hand over super admin, make someone else a super admin first.
      </div>
    </div>
  );
}
