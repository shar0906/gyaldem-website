"use client";

import StaffHeader from "./StaffHeader";
import FlyerSlot from "./FlyerSlot";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Event } from "../lib/supabase";

export default function AdminEventForm({
  event,
  onSave,
  onCancel,
}: {
  event: Event | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(event?.name || "");
  const [date, setDate] = useState(event?.date ? event.date.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(event?.end_date ? event.end_date.slice(0, 10) : "");
  const [location, setLocation] = useState(event?.location || "");
  const [description, setDescription] = useState(event?.description || "");
  const [rsvpLink, setRsvpLink] = useState(event?.rsvp_link || "");
  const [eventType, setEventType] = useState(event?.event_type || "ladies-night");
  const [status, setStatus] = useState(event?.status || "draft");
  const [flyerUrl, setFlyerUrl] = useState(event?.flyer_url || "");
  const [flyerPosition, setFlyerPosition] = useState<string | null>(event?.flyer_position ?? null);
  const [saving, setSaving] = useState(false);
  // A Ladies Night show's entry: title, description, and flyer are shared
  // with the show both ways; date, location, and RSVP link come from it.
  const [linked, setLinked] = useState<{ id: string; series_name: string | null } | null>(null);

  useEffect(() => {
    if (!event) return;
    fetch(`/api/admin/ladies-night/event-link?event_id=${event.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLinked(d?.show ?? null))
      .catch(() => setLinked(null));
  }, [event]);

  const handleSave = async () => {
    if (!name || !date) return;
    setSaving(true);
    const toUTCNoon = (dateStr: string) => {
    if (!dateStr) return null;
      return new Date(`${dateStr}T12:00:00`).toISOString();
    };

    const payload = {
      name,
      date: toUTCNoon(date)!,
      end_date: endDate ? toUTCNoon(endDate) : null,
      location: location || null,
      description: description || null,
      rsvp_link: rsvpLink || null,
      event_type: eventType,
      status,
      flyer_url: flyerUrl || null,
      flyer_position: flyerUrl ? flyerPosition : null,
      updated_at: new Date().toISOString(),
    };
    if (event) {
      await supabase.from("events").update(payload).eq("id", event.id);
      if (linked) {
        await fetch("/api/admin/ladies-night/event-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: event.id }),
        }).catch(() => null);
      }
    } else {
      await supabase.from("events").insert(payload);
    }
    setSaving(false);
    onSave();
  };

  const inputStyle = { backgroundColor: "white", border: "0.5px solid rgba(10,10,10,0.2)", color: "#0A0A0A", padding: "12px 14px", fontSize: "14px", fontFamily: "sans-serif", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(10,10,10,0.5)", fontFamily: "sans-serif", display: "block", marginBottom: "6px" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>
      <StaffHeader
        label={event ? "Edit Event" : "Add Event"}
        right={
          <button onClick={onCancel} style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px", minHeight: 36, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}>
            Cancel
          </button>
        }
      />

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 32px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "32px", color: "#0A0A0A", margin: "0 0 32px" }}>
          {event ? "Edit Event" : "Add New Event"}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {linked && (
            <p style={{ margin: 0, padding: "12px 14px", background: "white", border: "0.5px solid rgba(10,10,10,0.15)", fontSize: 13, lineHeight: 1.5, fontFamily: "sans-serif", color: "rgba(10,10,10,0.7)" }}>
              This is a Ladies Night show{linked.series_name ? ` (${linked.series_name})` : ""}. The name, description, and flyer stay in sync with it both ways.
              The date, location, and RSVP link come from Ladies Night → Shows, so change those there.
            </p>
          )}

          <div>
            <label style={labelStyle}>RSVP Link</label>
            <input type="text" value={rsvpLink} onChange={(e) => setRsvpLink(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Event Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
                <label style={labelStyle}>Start Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
                <label style={labelStyle}>End Date <span style={{ color: "rgba(10,10,10,0.3)" }}>(optional)</span></label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
                <label style={labelStyle}>Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue, City" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Event Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as Event["event_type"])} style={inputStyle}>
                <option value="ladies-night">Ladies Night</option>
                <option value="cultural-experience">Cultural Experience</option>
                <option value="community">Community</option>
                <option value="installation">Installation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Event["status"])} style={inputStyle}>
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>

          <FlyerSlot
            label="Flyer"
            url={flyerUrl || null}
            onChange={(u) => setFlyerUrl(u ?? "")}
            position={flyerPosition}
            onPosition={setFlyerPosition}
            hint={
              (linked ? "Shared with the Ladies Night show: replacing it here replaces it there. " : "") +
              "Focal point sets which part stays in view when the Events page crops it. Saved with the event."
            }
          />

          <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
            <button onClick={handleSave} disabled={saving || !name || !date} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "14px 32px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", opacity: saving || !name || !date ? 0.5 : 1 }}>
              {saving ? "Saving..." : event ? "Save Changes" : "Add Event"}
            </button>
            <button onClick={onCancel} style={{ backgroundColor: "transparent", color: "rgba(10,10,10,0.5)", border: "0.5px solid rgba(10,10,10,0.2)", padding: "14px 24px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}>
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}