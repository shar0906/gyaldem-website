// AdminLadiesNight.tsx  (same folder as AdminDashboard.tsx, AdminGallery.tsx, etc.)
//
// Admin-only Ladies Night tab: shows the current event's ballot, split
// into what artist has proposed (draft) and what's live for voting
// (published). Publishing is a single bulk action for the whole batch,
// gated at 10 songs minimum — not a per-song button.
//
// Untested draft — not run inside your repo yet.

"use client";

import { useState, useEffect } from "react";

const MIN_SONGS_TO_PUBLISH = 10;

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  voting_opens_at: string;
  voting_closes_at: string;
};

type SongRow = {
  song_id: string;
  status: "draft" | "published";
  sort_order: number;
  proposed_by: string | null;
  published_by: string | null;
  published_at: string | null;
  votes: number;
  ln_repertoire: {
    title: string;
    artist: string;
    category: string | null;
    artwork_url: string | null;
  };
};

export default function AdminLadiesNight() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  // ---- Create Next Event ----
  const [preview, setPreview] = useState<{
    previous_event_date: string;
    next_event_date: string;
    voting_opens_at: string;
    voting_closes_at: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const loadPreview = async () => {
    setPreviewLoading(true);
    setCreateMessage(null);
    const res = await fetch("/api/admin/ladies-night/next-event-preview");
    if (res.ok) {
      setPreview(await res.json());
    } else {
      setPreview(null);
      setCreateMessage("Couldn't compute a preview — check the terminal for details.");
    }
    setPreviewLoading(false);
  };

  const confirmCreate = async () => {
    if (!preview) return;
    setCreating(true);
    const res = await fetch("/api/admin/ladies-night/create-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_date: preview.next_event_date }),
    });
    if (res.ok) {
      setCreateMessage(`Created — ${preview.next_event_date}, added as draft.`);
      setPreview(null);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateMessage(data.error === "no_existing_event"
        ? "No existing event found to count forward from."
        : "Something went wrong creating the event.");
    }
    setCreating(false);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ladies-night/overview");
    if (res.ok) {
      const data = await res.json();
      setEvent(data.event);
      setSongs(data.songs);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const publishBallot = async () => {
    if (!event) return;
    setPublishing(true);
    setPublishMessage(null);

    const res = await fetch("/api/admin/ladies-night/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: event.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setPublishMessage(
        data.error === "not_enough_songs"
          ? `Need at least ${data.need} songs — only ${data.have} proposed so far.`
          : "Something went wrong publishing the ballot."
      );
    } else {
      setPublishMessage(
        data.event_published
          ? `Published ${data.published} songs — event is now live on the site.`
          : `Published ${data.published} songs.`
      );
      await load();
    }

    setPublishing(false);
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
    });

  const formatDateOnly = (ymd: string) =>
    new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    });

  const createNextEventPanel = (
    <div style={{ border: "1px solid rgba(10,10,10,0.15)", backgroundColor: "#F5F0E8", padding: "18px 20px", marginBottom: "28px" }}>
      <h2 style={{ fontFamily: "sans-serif", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(10,10,10,0.5)", margin: "0 0 12px" }}>
        Create Next Event
      </h2>

      {!preview ? (
        <button
          onClick={loadPreview}
          disabled={previewLoading}
          style={{ backgroundColor: "transparent", border: "0.5px solid rgba(10,10,10,0.3)", color: "rgba(10,10,10,0.7)", padding: "8px 14px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: previewLoading ? "default" : "pointer" }}
        >
          {previewLoading ? "Calculating…" : "Preview Next Cycle"}
        </button>
      ) : (
        <div>
          <p style={{ fontFamily: "sans-serif", fontSize: "13px", color: "#0A0A0A", margin: "0 0 4px" }}>
            Next show: <strong>{formatDateOnly(preview.next_event_date)}</strong>
          </p>
          <p style={{ fontFamily: "sans-serif", fontSize: "12px", color: "rgba(10,10,10,0.6)", margin: "0 0 14px" }}>
            Voting: {formatDateTime(preview.voting_opens_at)} → {formatDateTime(preview.voting_closes_at)}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={confirmCreate}
              disabled={creating}
              style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "8px 14px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: creating ? "default" : "pointer" }}
            >
              {creating ? "Creating…" : "Confirm & Create (Draft)"}
            </button>
            <button
              onClick={() => setPreview(null)}
              disabled={creating}
              style={{ backgroundColor: "transparent", border: "0.5px solid rgba(10,10,10,0.3)", color: "rgba(10,10,10,0.6)", padding: "8px 14px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: creating ? "default" : "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {createMessage && (
        <p style={{ fontFamily: "sans-serif", fontSize: "12px", color: createMessage.startsWith("Created") ? "#2d6a2d" : "#8B1A1A", margin: "12px 0 0" }}>
          {createMessage}
        </p>
      )}
    </div>
  );

  if (loading) {
    return <p style={{ padding: "32px 20px", color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>Loading…</p>;
  }

  if (!event) {
    return (
      <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "32px 20px" }}>
        {createNextEventPanel}
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>No events yet.</p>
      </div>
    );
  }

  const drafts = songs.filter((s) => s.status === "draft");
  const published = songs.filter((s) => s.status === "published");
  const canPublish = drafts.length >= MIN_SONGS_TO_PUBLISH;

  const row = (s: SongRow) => (
    <div
      key={s.song_id}
      style={{ padding: "14px 16px", borderBottom: "0.5px solid rgba(10,10,10,0.15)", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}
    >
      <div style={{ flex: 1, minWidth: "200px" }}>
        <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "15px", color: "#0A0A0A", margin: 0 }}>
          {s.ln_repertoire.title} — {s.ln_repertoire.artist}
        </p>
        <p style={{ fontSize: "11px", color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", margin: "2px 0 0" }}>
          {s.ln_repertoire.category ?? "uncategorized"} · proposed by {s.proposed_by ?? "unknown"}
          {s.status === "published" && ` · ${s.votes} vote${s.votes === 1 ? "" : "s"}`}
        </p>
      </div>
      <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: s.status === "published" ? "#2d6a2d" : "rgba(10,10,10,0.4)" }}>
        {s.status === "published" ? "Live" : "Draft"}
      </span>
    </div>
  );

  return (
    <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "32px 20px" }}>
      {createNextEventPanel}

      <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "32px", color: "#0A0A0A", margin: "0 0 4px" }}>{event.title}</h1>
      <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.5)", fontFamily: "sans-serif", margin: "0 0 24px" }}>
        Voting: {formatDateTime(event.voting_opens_at)} → {formatDateTime(event.voting_closes_at)}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", margin: "0 0 10px" }}>
        <h2 style={{ fontFamily: "sans-serif", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(10,10,10,0.5)", margin: 0 }}>
          Proposed by Kay ({drafts.length})
        </h2>
        <button
          onClick={publishBallot}
          disabled={!canPublish || publishing}
          title={!canPublish ? `Needs at least ${MIN_SONGS_TO_PUBLISH} proposed songs (has ${drafts.length})` : undefined}
          style={{ backgroundColor: canPublish ? "#8B1A1A" : "rgba(10,10,10,0.15)", color: canPublish ? "white" : "rgba(10,10,10,0.4)", border: "none", padding: "8px 14px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: canPublish && !publishing ? "pointer" : "default" }}
        >
          {publishing ? "Publishing…" : `Publish Ballot (${drafts.length}/${MIN_SONGS_TO_PUBLISH})`}
        </button>
      </div>

      {publishMessage && (
        <p style={{ fontSize: "12px", fontFamily: "sans-serif", color: publishMessage.startsWith("Need") || publishMessage.startsWith("Something") ? "#8B1A1A" : "#2d6a2d", margin: "0 0 14px" }}>
          {publishMessage}
        </p>
      )}

      {drafts.length === 0 ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "13px", marginBottom: "24px" }}>Nothing proposed yet.</p>
      ) : (
        <div style={{ border: "0.5px solid rgba(10,10,10,0.15)", marginBottom: "24px" }}>{drafts.map(row)}</div>
      )}

      <h2 style={{ fontFamily: "sans-serif", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(10,10,10,0.5)", margin: "0 0 10px" }}>
        Live on the ballot ({published.length})
      </h2>
      {published.length === 0 ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "13px" }}>Nothing published yet.</p>
      ) : (
        <div style={{ border: "0.5px solid rgba(10,10,10,0.15)" }}>{published.map(row)}</div>
      )}
    </div>
  );
}