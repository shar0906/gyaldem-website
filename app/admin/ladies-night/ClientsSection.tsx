// admin/ladies-night/ClientsSection.tsx
//
// Clients: who presents a series (e.g. Where's Jeanie). Their brand logo
// sits in the footer of their series' pages next to the venue and Gyal
// Dem, and their contact email gets the recap after each show.

"use client";

import { useCallback, useEffect, useState } from "react";
import ImageSlot from "./ImageSlot";
import { FAINT, Field, H1, LINE, MUTED, Notice, PANEL, api, button, errorText, inputStyle } from "./kit";

type Client = {
  id: string;
  name: string;
  instagram_handle: string | null;
  website_url: string | null;
  logo_url: string | null;
  contact_email: string | null;
  active: boolean;
  series: string[];
};
type Form = { name: string; instagram_handle: string; website_url: string; contact_email: string };

export default function ClientsSection() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ clients: Client[] }>("/api/admin/ladies-night/clients");
    if (!res.ok) return setLoadError(errorText(res.data as unknown as { error?: string }));
    setClients(res.data.clients);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) return <div><H1>Clients</H1><Notice tone="error">{loadError}</Notice></div>;
  if (!clients) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;
  const current = clients.find((c) => c.id === editing) ?? null;

  return (
    <div>
      <style>{`
        .ln-client-row{ display:grid; grid-template-columns:110px minmax(0,1.3fr) minmax(0,1fr) auto; gap:16px; align-items:center; padding:14px 20px; border-bottom:${LINE}; }
        @media (max-width: 860px){ .ln-client-row{ grid-template-columns:1fr; gap:6px; } .ln-client-head{ display:none !important; } }
      `}</style>
      <H1 action={<button onClick={() => setEditing(editing === "new" ? null : "new")} style={button("primary")}>{editing === "new" ? "Close" : "+ Add client"}</button>}>Clients</H1>
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      {editing === "new" && (
        <ClientForm
          client={null}
          onSaved={(text) => {
            setEditing(null);
            setNotice({ tone: "ok", text });
            load();
          }}
        />
      )}
      <div style={PANEL}>
        <div className="ln-client-row ln-client-head" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED, padding: "12px 20px" }}>
          <span>Logo</span><span>Client</span><span>Series</span><span />
        </div>
        {clients.length === 0 && <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>No clients yet.</p>}
        {clients.map((c) => (
          <div key={c.id} className="ln-client-row" style={{ opacity: c.active ? 1 : 0.55 }}>
            <span style={{ width: 90, height: 44, background: c.logo_url ? `center / contain no-repeat url("${c.logo_url}"), #2A1416` : "#EFE8DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: FAINT }}>
              {!c.logo_url && "No logo"}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: MUTED }}>{c.contact_email ?? "No recap email yet"}</span>
            </span>
            <span style={{ fontSize: 13 }}>{c.series.length ? c.series.join(", ") : <span style={{ color: FAINT }}>None</span>}</span>
            <span style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(editing === c.id ? null : c.id)} style={button("quiet")}>{editing === c.id ? "Close" : "Edit"}</button>
            </span>
          </div>
        ))}
      </div>
      {current && (
        <ClientForm
          key={current.id}
          client={current}
          onSaved={(text) => {
            setNotice({ tone: "ok", text });
            load();
          }}
          onLogo={load}
        />
      )}
    </div>
  );
}

function ClientForm({ client, onSaved, onLogo }: { client: Client | null; onSaved: (text: string) => void; onLogo?: () => void }) {
  const [form, setForm] = useState<Form>({
    name: client?.name ?? "",
    instagram_handle: client?.instagram_handle ?? "",
    website_url: client?.website_url ?? "",
    contact_email: client?.contact_email ?? "",
  });
  const [logo, setLogo] = useState<string | null>(client?.logo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      name: form.name,
      instagram_handle: form.instagram_handle || null,
      website_url: form.website_url || null,
      contact_email: form.contact_email || null,
    };
    const res = client
      ? await api<{ error?: string; field?: string; message?: string }>(`/api/admin/ladies-night/clients/${client.id}`, { method: "PATCH", body })
      : await api<{ error?: string; field?: string; message?: string }>("/api/admin/ladies-night/clients", { method: "POST", body });
    setBusy(false);
    if (!res.ok) return setError({ field: res.data.field, text: errorText(res.data) });
    onSaved(client ? `${form.name} is saved.` : `${form.name} added. Edit it to upload their logo.`);
  }

  const err = (f: string) => (error?.field === f ? <Notice tone="error">{error.text}</Notice> : null);
  return (
    <div style={{ ...PANEL, padding: 24, margin: "18px 0", display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 24 }}>{client ? `Edit ${client.name}` : "Add a client"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Field id="cl-name" label="Name">
          <input id="cl-name" value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} style={inputStyle} />
        </Field>
        <Field id="cl-email" label="Recap email" hint="Gets the numbers after each of their shows.">
          <input id="cl-email" type="email" value={form.contact_email} maxLength={254} onChange={(e) => set("contact_email", e.target.value.trim())} placeholder="pleaseladiesnight@gyaldemsocialclub.com" style={inputStyle} />
        </Field>
        <Field id="cl-web" label="Website" hint="Their footer logo links here.">
          <input id="cl-web" value={form.website_url} maxLength={300} onChange={(e) => set("website_url", e.target.value.trim())} placeholder="https://" style={inputStyle} />
        </Field>
        <Field id="cl-ig" label="Instagram (without @)" hint="Used for the logo link when there's no website.">
          <input id="cl-ig" value={form.instagram_handle} maxLength={31} onChange={(e) => set("instagram_handle", e.target.value.replace(/^@/, ""))} style={inputStyle} />
        </Field>
      </div>
      {err("name")}{err("contact_email")}{err("website_url")}{err("instagram_handle")}
      <div style={{ paddingTop: 14, borderTop: LINE }}>
        {client ? (
          <ImageSlot
            label="Brand logo"
            url={logo}
            uploadUrl={`/api/admin/ladies-night/clients/${client.id}/upload`}
            hint="Their own logo (not an event logo), white on transparent. Sits in the footer."
            onSaved={async (u) => {
              const res = await api(`/api/admin/ladies-night/clients/${client.id}`, { method: "PATCH", body: { logo_url: u } });
              if (!res.ok) return false;
              setLogo(u);
              onLogo?.();
              return true;
            }}
          />
        ) : (
          <span style={{ fontSize: 12, color: MUTED }}>Save the client first, then upload their logo.</span>
        )}
      </div>
      <div>
        <button onClick={save} disabled={busy || !form.name.trim()} style={button("primary", !busy && !!form.name.trim())}>
          {busy ? "Saving…" : client ? "Save changes" : "Add client"}
        </button>
      </div>
      {error && !error.field && <Notice tone="error">{error.text}</Notice>}
    </div>
  );
}
