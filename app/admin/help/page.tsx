// app/admin/help/page.tsx
//
// The staff manual at /admin/help. Shows the sections the signed-in role
// can read, with a contents list (a sidebar on desktop, a collapsible list
// on phones). Admins can unlock the Technical section by re-entering
// their password; it stays unlocked until the page is closed.

"use client";

import { useEffect, useState } from "react";
import StaffHeader from "../StaffHeader";

type Section = { id: string; title: string; html: string; toc: { id: string; text: string }[] };
type Manual = { role: string; sections: Section[]; technical: boolean };

const RED = "#8B1A1A";
const INK = "#0A0A0A";
const MUTED = "rgba(10,10,10,0.55)";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", artist: "Artist", door: "Door", host: "Host" };

export default function HelpPage() {
  const [manual, setManual] = useState<Manual | null>(null);
  const [state, setState] = useState<"loading" | "signed_out" | "error" | "ready">("loading");
  const [technical, setTechnical] = useState<Section | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/manual", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return setState("signed_out");
        if (!res.ok) throw new Error();
        setManual(await res.json());
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, []);

  // Jump to a heading in the address bar (e.g. /admin/help#admin-shows) once loaded.
  useEffect(() => {
    if (state === "ready" && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [state]);

  const sections = manual ? [...manual.sections, ...(technical ? [technical] : [])] : [];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", color: INK, fontFamily: "sans-serif" }}>
      <style>{CSS}</style>
      <StaffHeader
        label={manual ? `Help · ${ROLE_LABEL[manual.role] ?? ""}` : "Help"}
        showHelp={false}
        right={
          <a href="/admin" style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none" }}>
            Back to dashboard
          </a>
        }
      />

      {state === "loading" && <p style={{ padding: 32, color: MUTED }}>Loading the manual…</p>}
      {state === "error" && <p style={{ padding: 32, color: RED }}>Couldn&apos;t load the manual. Refresh to try again.</p>}
      {state === "signed_out" && (
        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          <p style={{ margin: 0 }}>Sign in to read the manual.</p>
          <a href="/admin" style={{ background: RED, color: "#fff", padding: "11px 16px", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none" }}>Sign in</a>
        </div>
      )}

      {state === "ready" && manual && (
        <div className="ln-help">
          <nav className="ln-help-nav" aria-label="Contents">
            <details open>
              <summary>Contents</summary>
              {sections.map((s) => (
                <div key={s.id} style={{ marginBottom: 14 }}>
                  <a href={`#${s.id}`} className="ln-help-nav-section">{s.title}</a>
                  {s.toc.map((t) => (
                    <a key={t.id} href={`#${t.id}`} className="ln-help-nav-item">{t.text}</a>
                  ))}
                </div>
              ))}
              {manual.technical && !technical && <a href="#technical" className="ln-help-nav-section">Technical</a>}
            </details>
          </nav>

          <main className="ln-help-main">
            {sections.map((s) => (
              <article key={s.id} id={s.id} className="ln-md" dangerouslySetInnerHTML={{ __html: s.html }} />
            ))}
            {manual.technical && !technical && <Unlock onUnlocked={setTechnical} />}
          </main>
        </div>
      )}
    </div>
  );
}

function Unlock({ onUnlocked }: { onUnlocked: (s: Section) => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manual/technical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUnlocked(data.section);
        setTimeout(() => document.getElementById("technical")?.scrollIntoView(), 50);
        return;
      }
      setError(
        res.status === 429
          ? "Too many tries. Wait 10 minutes and try again."
          : data.error === "wrong_password"
            ? "That password didn't match."
            : "Couldn't unlock it. Try again."
      );
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setBusy(false);
  }

  return (
    <section id="technical" style={{ background: "#fff", border: "0.5px solid rgba(10,10,10,0.15)", padding: 24, marginTop: 16 }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 30, margin: "0 0 6px" }}>Technical 🔒</h1>
      <p style={{ margin: "0 0 16px", color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
        Settings, payments, scheduled jobs, and troubleshooting. Re-enter your login password to open it.
      </p>
      <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label htmlFor="ln-tech-pw" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Your password</label>
        <input
          id="ln-tech-pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          style={{ minHeight: 42, minWidth: 240, border: "0.5px solid rgba(10,10,10,0.3)", padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" disabled={!password || busy} style={{ background: RED, color: "#fff", border: 0, padding: "12px 18px", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", opacity: !password || busy ? 0.5 : 1 }}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
      {error && <p role="alert" style={{ margin: "10px 0 0", color: RED, fontSize: 13 }}>{error}</p>}
    </section>
  );
}

const CSS = `
  .ln-help { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 40px; max-width: 1180px; margin: 0 auto; padding: 32px 20px 80px; }
  .ln-help-nav { position: sticky; top: 20px; align-self: start; max-height: calc(100vh - 40px); overflow-y: auto; }
  .ln-help-nav summary { list-style: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${RED}; margin-bottom: 14px; cursor: default; }
  .ln-help-nav summary::-webkit-details-marker { display: none; }
  .ln-help-nav-section { display: block; font-family: Georgia, serif; font-style: italic; font-size: 17px; color: ${INK}; text-decoration: none; margin-bottom: 6px; }
  .ln-help-nav-item { display: block; font-size: 13px; color: ${MUTED}; text-decoration: none; padding: 4px 0 4px 10px; border-left: 1px solid rgba(10,10,10,0.12); }
  .ln-help-nav a:hover { color: ${RED}; }
  .ln-help-main { min-width: 0; }

  .ln-md { background: #fff; border: 0.5px solid rgba(10,10,10,0.15); padding: 28px 32px; margin-bottom: 24px; font-size: 15px; line-height: 1.65; scroll-margin-top: 16px; }
  .ln-md :where(h1, h2, h3) { scroll-margin-top: 16px; }
  .ln-md h1 { font-family: Georgia, serif; font-style: italic; font-weight: 400; font-size: 32px; line-height: 1.15; margin: 0 0 12px; }
  .ln-md h2 { font-family: Georgia, serif; font-style: italic; font-weight: 400; font-size: 24px; margin: 36px 0 10px; padding-top: 22px; border-top: 0.5px solid rgba(10,10,10,0.12); }
  .ln-md h3 { font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: ${RED}; margin: 26px 0 8px; }
  .ln-md p { margin: 0 0 12px; }
  .ln-md ul, .ln-md ol { margin: 0 0 14px; padding-left: 22px; }
  .ln-md ul { list-style: disc; }
  .ln-md ol { list-style: decimal; }
  .ln-md li { margin: 4px 0; }
  .ln-md li::marker { color: ${RED}; }
  .ln-md a { color: ${RED}; }
  .ln-md code { font-family: Menlo, Consolas, monospace; font-size: 0.86em; background: #F3EDE3; padding: 1px 5px; overflow-wrap: anywhere; }
  .ln-md pre { background: #0A0A0A; color: #F5F0E8; padding: 14px 16px; overflow-x: auto; margin: 0 0 14px; }
  .ln-md pre code { background: none; padding: 0; color: inherit; font-size: 13px; }
  .ln-md blockquote { margin: 0 0 14px; padding: 10px 14px; border-left: 3px solid ${RED}; background: #FAF6EF; }
  .ln-table { overflow-x: auto; margin: 0 0 16px; }
  .ln-md table { border-collapse: collapse; width: 100%; font-size: 14px; }
  .ln-md th { text-align: left; font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: ${MUTED}; font-weight: 600; padding: 8px 10px; border-bottom: 1px solid rgba(10,10,10,0.15); }
  .ln-md td { padding: 9px 10px; border-bottom: 0.5px solid rgba(10,10,10,0.1); vertical-align: top; }

  @media (max-width: 860px) {
    .ln-help { grid-template-columns: 1fr; gap: 16px; padding: 16px 12px 60px; }
    .ln-help-nav { position: static; max-height: none; background: #fff; border: 0.5px solid rgba(10,10,10,0.15); padding: 14px 16px; }
    .ln-help-nav summary { cursor: pointer; margin: 0; }
    .ln-help-nav details[open] summary { margin-bottom: 14px; }
    .ln-md { padding: 20px 16px; font-size: 15px; }
    .ln-md h1 { font-size: 27px; }
  }
`;
