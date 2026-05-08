"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Event } from "../lib/supabase";
import AdminEventForm from "./AdminEventForm";
import AdminGallery from "./AdminGallery";

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"events" | "gallery" | "add" | "edit">("events");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("events").update({ status }).eq("id", id);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    fetchEvents();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("gd_admin_auth");
    window.location.reload();
  };

  const formatDate = (dateString: string, endDate?: string | null) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
    if (!endDate) return date.toLocaleDateString("en-US", options);
    const end = new Date(endDate);
    const sameMonth = date.getUTCMonth() === end.getUTCMonth() && date.getUTCFullYear() === end.getUTCFullYear();
    if (sameMonth) {
      return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
    }
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
  };

  const statusColor = (status: string) => {
    if (status === "upcoming") return "#2d6a2d";
    if (status === "past") return "rgba(10,10,10,0.4)";
    return "#8B1A1A";
  };

  if (view === "add" || view === "edit") {
    return (
      <AdminEventForm
        event={editingEvent}
        onSave={() => { setView("events"); setEditingEvent(null); fetchEvents(); }}
        onCancel={() => { setView("events"); setEditingEvent(null); }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>
      <div style={{ backgroundColor: "#0A0A0A", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: "60px", objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>Admin</p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {view === "events" && (
            <button
              onClick={() => { setEditingEvent(null); setView("add"); }}
              style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "10px 20px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
            >
              + Add Event
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ backgroundColor: "white", borderBottom: "0.5px solid rgba(10,10,10,0.15)", display: "flex" }}>
        <button
          onClick={() => setView("events")}
          style={{ background: "none", border: "none", borderBottom: view === "events" ? "2px solid #8B1A1A" : "2px solid transparent", padding: "16px 24px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", color: view === "events" ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer" }}
        >
          Events
        </button>
        <button
          onClick={() => setView("gallery")}
          style={{ background: "none", border: "none", borderBottom: view === "gallery" ? "2px solid #8B1A1A" : "2px solid transparent", padding: "16px 24px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", color: view === "gallery" ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer" }}
        >
          The Room
        </button>
      </div>

      {view === "gallery" ? (
        <AdminGallery />
      ) : (
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "40px 32px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "36px", color: "#0A0A0A", margin: "0 0 32px" }}>Events</h1>

          {loading ? (
            <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>Loading...</p>
          ) : events.length === 0 ? (
            <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>No events yet. Add your first one.</p>
          ) : (
            <div style={{ border: "0.5px solid rgba(10,10,10,0.15)" }}>
              {events.map((event, i) => (
                <div key={event.id} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 20px", borderBottom: i < events.length - 1 ? "0.5px solid rgba(10,10,10,0.15)" : "none", backgroundColor: "white" }}>
                  <div>
                    <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "16px", color: "#0A0A0A", margin: "0 0 4px" }}>{event.name}</p>
                    <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", margin: 0 }}>{formatDate(event.date, event.end_date)} · {event.location || "TBD"} · {event.event_type}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <select
                      value={event.status}
                      onChange={(e) => updateStatus(event.id, e.target.value)}
                      style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: statusColor(event.status), border: "0.5px solid rgba(10,10,10,0.2)", padding: "6px 10px", backgroundColor: "white", cursor: "pointer" }}
                    >
                      <option value="draft">Draft</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                    </select>
                    <button
                      onClick={() => { setEditingEvent(event); setView("edit"); }}
                      style={{ backgroundColor: "transparent", border: "0.5px solid rgba(10,10,10,0.2)", color: "rgba(10,10,10,0.6)", padding: "6px 14px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      style={{ backgroundColor: "transparent", border: "0.5px solid rgba(139,26,26,0.3)", color: "#8B1A1A", padding: "6px 14px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}