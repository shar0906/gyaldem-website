"use client";

import { useState } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingLuma, setFetchingLuma] = useState(false);

  const handleFlyerUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("event-flyers")
      .upload(fileName, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from("event-flyers")
        .getPublicUrl(data.path);
      setFlyerUrl(urlData.publicUrl);
    }
    setUploading(false);
  };

  const handleLumaFetch = async () => {
    if (!rsvpLink.includes("lu.ma") && !rsvpLink.includes("luma.com")) return;
    setFetchingLuma(true);
    try {
      const res = await fetch(`/api/admin/luma?url=${encodeURIComponent(rsvpLink)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.name && !name) setName(data.name);
        if (data.description && !description) setDescription(data.description);
        if (data.location && !location) setLocation(data.location);
        if (data.flyer_url && !flyerUrl) setFlyerUrl(data.flyer_url);
        if (data.date && !date) setDate(data.date);
      }
    } catch (e) {
      console.error(e);
    }
    setFetchingLuma(false);
  };

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
      updated_at: new Date().toISOString(),
    };
    if (event) {
      await supabase.from("events").update(payload).eq("id", event.id);
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
      <div style={{ backgroundColor: "#0A0A0A", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: "60px", objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>{event ? "Edit Event" : "Add Event"}</p>
        </div>
        <button onClick={onCancel} style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}>
          Cancel
        </button>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 32px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "32px", color: "#0A0A0A", margin: "0 0 32px" }}>
          {event ? "Edit Event" : "Add New Event"}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div>
            <label style={labelStyle}>RSVP Link</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" value={rsvpLink} onChange={(e) => setRsvpLink(e.target.value)} placeholder="https://lu.ma/..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleLumaFetch} disabled={fetchingLuma} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "12px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
                {fetchingLuma ? "Fetching..." : "Pull from Luma"}
              </button>
            </div>
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

          <div>
            <label style={labelStyle}>Flyer / Cover Image</label>
            {flyerUrl && (
              <div style={{ marginBottom: "12px" }}>
                <img src={flyerUrl} alt="Flyer preview" style={{ height: "120px", objectFit: "cover" }} />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { if (e.target.files?.[0]) handleFlyerUpload(e.target.files[0]); }}
              style={{ fontSize: "13px", fontFamily: "sans-serif", color: "rgba(10,10,10,0.6)" }}
            />
            {uploading && <p style={{ fontSize: "12px", color: "#8B1A1A", fontFamily: "sans-serif", margin: "6px 0 0" }}>Uploading...</p>}
          </div>

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