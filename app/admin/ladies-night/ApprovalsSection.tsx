// admin/ladies-night/ApprovalsSection.tsx
//
// Artist profile changes waiting for review: what changed, a preview of
// the ballot after approval, and approve / edit then approve / reject.

"use client";

import { useCallback, useEffect, useState } from "react";
import { BallotPreview, GatePreview, PreviewProfile } from "../../components/ln/PhonePreview";
import { BIO_MAX, colorProblem } from "../../lib/ln/profile-rules";
import { formatDateTime } from "../artist/ui";
import { FAINT, Field, GREEN, H1, INK, LINE, MUTED, Notice, PANEL, RED, api, button, errorText, inputStyle } from "./kit";

type Profile = PreviewProfile;
type Pending = Profile & {
  id: string;
  artist_id: string;
  submitted_by: string;
  submitted_at: string;
  live: (Profile & { approved_at: string | null }) | null;
};

const FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "display_name", label: "Name" },
  { key: "bio", label: "Bio" },
  { key: "instagram_handle", label: "Instagram" },
  { key: "website_url", label: "Website" },
  { key: "photo_url", label: "Profile photo" },
  { key: "cover_url", label: "Cover photo" },
  { key: "logo_url", label: "Logo" },
  { key: "primary_color", label: "Primary color" },
  { key: "accent_color", label: "Accent color" },
];

export default function ApprovalsSection({ onChange }: { onChange?: () => void }) {
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ pending: Pending[] }>("/api/admin/ladies-night/approvals");
    if (!res.ok) {
      setLoadError(errorText(res.data as { error?: string }));
      return;
    }
    setPending(res.data.pending);
    setSelectedId((cur) => (cur && res.data.pending.some((p) => p.id === cur) ? cur : res.data.pending[0]?.id ?? null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = pending?.find((p) => p.id === selectedId) ?? null;
  useEffect(() => {
    setEditing(null);
    setNote("");
  }, [selectedId]);

  async function decide(action: "approve" | "reject") {
    if (!current) return;
    if (action === "approve" && editing) {
      const problem = colorProblem(editing.primary_color ?? "", editing.accent_color ?? "");
      if (problem) {
        setNotice({ tone: "error", text: problem });
        return;
      }
    }
    setBusy(action);
    setNotice(null);
    const body = action === "reject" ? { action, note } : editing ? { action, edits: editing } : { action };
    const res = await api<{ error?: string; message?: string }>(`/api/admin/ladies-night/approvals/${current.id}`, { method: "POST", body });
    setBusy(null);
    if (!res.ok) {
      setNotice({
        tone: "error",
        text: res.data.error === "not_pending" ? "The artist sent a newer version, or someone already reviewed this. Refreshing." : errorText(res.data),
      });
      await load();
      return;
    }
    const name = current.display_name;
    setNotice({ tone: "ok", text: action === "approve" ? `${name}'s profile is live.` : `Sent back to ${name}${note ? " with your note" : ""}.` });
    await load();
    onChange?.();
  }

  if (loadError) {
    return (
      <div>
        <H1>Approvals</H1>
        <Notice tone="error">{loadError}</Notice>
      </div>
    );
  }
  if (!pending) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;

  const proposed: Profile | null = current ? editing ?? current : null;

  return (
    <div>
      <style>{`
        .ln-approvals{ display:grid; grid-template-columns:240px minmax(0,1fr); gap:24px; align-items:start; }
        .ln-approval-body{ display:grid; grid-template-columns:minmax(0,1fr) auto; gap:24px; align-items:start; }
        @media (max-width: 1100px){ .ln-approval-body{ grid-template-columns:1fr; } }
        @media (max-width: 760px){ .ln-approvals{ grid-template-columns:1fr; } }
      `}</style>
      <H1>Approvals</H1>
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}

      {pending.length === 0 ? (
        <div style={{ ...PANEL, padding: 24, fontSize: 14, color: MUTED }}>Nothing waiting. When an artist submits profile changes, they show up here.</div>
      ) : (
        <div className="ln-approvals">
          <nav aria-label="Waiting for review" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                aria-current={p.id === selectedId}
                style={{ ...PANEL, border: p.id === selectedId ? `1px solid ${RED}` : PANEL.border, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", color: INK, fontFamily: "sans-serif" }}
              >
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>{p.display_name}</span>
                <span style={{ fontSize: 12, color: MUTED }}>{p.live?.approved_at ? changedSummary(p) : "First profile, not public yet"}</span>
                <span style={{ fontSize: 11, color: FAINT }}>Submitted {formatDateTime(p.submitted_at)}</span>
              </button>
            ))}
          </nav>

          {current && proposed && (
            <div style={{ ...PANEL, padding: 24 }}>
              <h2 style={{ margin: "0 0 4px", fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 26 }}>{current.display_name}&apos;s changes</h2>
              <p style={{ margin: "0 0 18px", fontSize: 12, color: MUTED }}>
                {current.live?.approved_at ? "Their live profile stays as it is until you approve." : "Nothing is public until you approve."}
              </p>

              <div className="ln-approval-body">
                <div>
                  {editing ? (
                    <EditForm value={editing} onChange={setEditing} />
                  ) : (
                    <dl style={{ margin: 0 }}>
                      {FIELDS.filter((f) => !current.live?.approved_at || (current.live?.[f.key] ?? null) !== (current[f.key] ?? null)).map((f) => (
                        <div key={f.key} style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: 14, padding: "12px 0", borderTop: LINE }}>
                          <dt style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: RED, paddingTop: 2 }}>{f.label}</dt>
                          <dd style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                            <Diff field={f.key} before={current.live?.approved_at ? current.live?.[f.key] ?? null : null} after={current[f.key] ?? null} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {!editing && colorProblem(current.primary_color ?? "", current.accent_color ?? "") === null && (
                    <p style={{ fontSize: 12, color: GREEN, margin: "10px 0 0" }}>Colors pass the contrast check.</p>
                  )}

                  <div style={{ marginTop: 20 }}>
                    <Field id="a-note" label={`Note to ${current.display_name} (sent if you reject)`}>
                      <textarea id="a-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should they change?" style={{ ...inputStyle, resize: "vertical" }} />
                    </Field>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                    <button onClick={() => decide("approve")} disabled={busy !== null} style={button("primary", busy === null)}>
                      {busy === "approve" ? "Approving…" : editing ? "Approve with my edits" : "Approve"}
                    </button>
                    {editing ? (
                      <button onClick={() => setEditing(null)} disabled={busy !== null} style={button("secondary", busy === null)}>Cancel edits</button>
                    ) : (
                      <button onClick={() => setEditing({ ...current })} disabled={busy !== null} style={button("secondary", busy === null)}>Edit, then approve</button>
                    )}
                    <button onClick={() => decide("reject")} disabled={busy !== null} style={button("quiet", busy === null)}>
                      {busy === "reject" ? "Sending…" : "Reject"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  <span style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED }}>After approval</span>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                    <BallotPreview profile={proposed} />
                    <GatePreview profile={proposed} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function changedSummary(p: Pending): string {
  const changed = FIELDS.filter((f) => (p.live?.[f.key] ?? null) !== (p[f.key] ?? null)).map((f) => f.label.toLowerCase());
  if (!changed.length) return "No visible changes";
  const joined = changed.length > 2 ? `${changed.slice(0, 2).join(", ")}, +${changed.length - 2} more` : changed.join(", ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

function Diff({ field, before, after }: { field: keyof Profile; before: string | null; after: string | null }) {
  if (field === "logo_url") {
    const box = (url: string | null, highlight: boolean) => (
      <span style={{ display: "inline-block", width: 96, height: 48, background: url ? `center / contain no-repeat url("${url}"), #1a1a1a` : "#E8E1D6", outline: highlight ? `2px solid ${RED}` : "none", opacity: highlight ? 1 : 0.5 }} />
    );
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {before !== null && (<>{box(before, false)}<span style={{ color: FAINT }}>→</span></>)}
        {after ? box(after, true) : <span style={{ color: MUTED }}>Removed</span>}
      </span>
    );
  }
  if (field === "photo_url" || field === "cover_url") {
    const tall = field === "cover_url";
    const box = (url: string | null, highlight: boolean) => (
      <span
        style={{
          display: "inline-block",
          width: tall ? 54 : 56,
          height: tall ? 96 : 56,
          borderRadius: tall ? 0 : 999,
          background: url ? `center / cover no-repeat url("${url}")` : "#E8E1D6",
          outline: highlight ? `2px solid ${RED}` : "none",
          opacity: highlight ? 1 : 0.5,
        }}
      />
    );
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {before !== null && (
          <>
            {box(before, false)}
            <span style={{ color: FAINT }}>→</span>
          </>
        )}
        {after ? box(after, true) : <span style={{ color: MUTED }}>Removed</span>}
      </span>
    );
  }
  if (field === "primary_color" || field === "accent_color") {
    const sw = (c: string | null) => <span style={{ display: "inline-block", width: 18, height: 18, background: c ?? "transparent", border: "0.5px solid rgba(10,10,10,0.2)", verticalAlign: "middle" }} />;
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {before !== null && (
          <>
            {sw(before)} <span style={{ color: MUTED }}>{before}</span> <span style={{ color: FAINT }}>→</span>
          </>
        )}
        {sw(after)} <span>{after}</span>
      </span>
    );
  }
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {before !== null && before !== "" && <span style={{ color: MUTED, textDecoration: "line-through", overflowWrap: "anywhere" }}>{field === "instagram_handle" ? `@${before}` : before}</span>}
      <span style={{ overflowWrap: "anywhere" }}>{after ? (field === "instagram_handle" ? `@${after}` : after) : <span style={{ color: MUTED }}>Removed</span>}</span>
    </span>
  );
}

function EditForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = (k: keyof Profile, v: string) => onChange({ ...value, [k]: v });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 12, borderTop: LINE }}>
      <Field id="e-name" label="Name">
        <input id="e-name" value={value.display_name} maxLength={80} onChange={(e) => set("display_name", e.target.value)} style={inputStyle} />
      </Field>
      <Field id="e-ig" label="Instagram (without @)">
        <input id="e-ig" value={value.instagram_handle ?? ""} maxLength={30} onChange={(e) => set("instagram_handle", e.target.value.replace(/^@/, ""))} style={inputStyle} />
      </Field>
      <Field id="e-web" label="Website (https://, optional)">
        <input id="e-web" value={value.website_url ?? ""} maxLength={300} onChange={(e) => set("website_url", e.target.value.trim())} style={inputStyle} />
      </Field>
      <Field id="e-bio" label={`Bio (${(value.bio ?? "").length}/${BIO_MAX})`}>
        <textarea id="e-bio" rows={4} maxLength={BIO_MAX} value={value.bio ?? ""} onChange={(e) => set("bio", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field id="e-primary" label="Primary color">
          <input id="e-primary" type="color" value={(value.primary_color ?? "#6E1420").toLowerCase()} onChange={(e) => set("primary_color", e.target.value.toUpperCase())} style={{ ...inputStyle, padding: 2, height: 44 }} />
        </Field>
        <Field id="e-accent" label="Accent color">
          <input id="e-accent" type="color" value={(value.accent_color ?? "#C81E3A").toLowerCase()} onChange={(e) => set("accent_color", e.target.value.toUpperCase())} style={{ ...inputStyle, padding: 2, height: 44 }} />
        </Field>
      </div>
      {(() => {
        const problem = colorProblem(value.primary_color ?? "", value.accent_color ?? "");
        return problem ? <Notice tone="error">{problem}</Notice> : <span style={{ fontSize: 12, color: GREEN }}>Colors pass the contrast check.</span>;
      })()}
      <span style={{ fontSize: 12, color: MUTED }}>Photos and logo can be changed from the Artists screen after approving.</span>
    </div>
  );
}
