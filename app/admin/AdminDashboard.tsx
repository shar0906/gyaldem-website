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
  const [showTools, setShowTools] = useState(false);

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

      {/* Header */}
      <div style={{ backgroundColor: "#0A0A0A", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: "60px", objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "8px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "-4px 0 0 4px" }}>Admin</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {view === "events" && (
            <button
              onClick={() => { setEditingEvent(null); setView("add"); }}
              style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "8px 14px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
            >
              + Add Event
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ backgroundColor: "white", borderBottom: "0.5px solid rgba(10,10,10,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: "20px" }}>
        <div style={{ display: "flex" }}>
          <button
            onClick={() => setView("events")}
            style={{ background: "none", border: "none", borderBottom: view === "events" ? "2px solid #8B1A1A" : "2px solid transparent", padding: "14px 20px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", color: view === "events" ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer" }}
          >
            Events
          </button>
          <button
            onClick={() => setView("gallery")}
            style={{ background: "none", border: "none", borderBottom: view === "gallery" ? "2px solid #8B1A1A" : "2px solid transparent", padding: "14px 20px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", color: view === "gallery" ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer" }}
          >
            The Room
          </button>
        </div>
        {/* Quick Access Tools */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowTools((v) => !v)}
            style={{ background: "none", border: "0.5px solid rgba(10,10,10,0.15)", padding: "6px 12px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: "rgba(10,10,10,0.5)", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Tools ▾
          </button>
          {showTools && (
            <div style={{ position: "absolute", right: 0, top: "100%", backgroundColor: "white", border: "0.5px solid rgba(10,10,10,0.15)", zIndex: 50, minWidth: "140px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              <a href="https://railway.com/project/5e4d2ecc-24db-406c-94ac-f52150327896/service/66890aeb-1052-47d6-81f8-f673ceb24c53?environmentId=43290ffa-474e-491f-9d99-6a19dd41e1e9" target="_blank" style={{ display: "block", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: "rgba(10,10,10,0.6)", textDecoration: "none", borderBottom: "0.5px solid rgba(10,10,10,0.08)" }}>Railway</a>
              <a href="https://app.kit.com/dashboard" target="_blank" style={{ display: "block", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: "rgba(10,10,10,0.6)", textDecoration: "none" }}>Subscribers</a>
              <a href="https://supabase.com/dashboard/project/xuobimjrtzstgwvumckt" target="_blank" style={{ display: "block", padding: "10px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: "rgba(10,10,10,0.6)", textDecoration: "none", borderBottom: "0.5px solid rgba(10,10,10,0.08)" }}>Supabase</a>
            </div>
          )}
        </div>
      </div>

      {view === "gallery" ? (
        <AdminGallery />
      ) : (
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "32px 20px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "32px", color: "#0A0A0A", margin: "0 0 24px" }}>Events</h1>

          {loading ? (
            <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>Loading...</p>
          ) : events.length === 0 ? (
            <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>No events yet.</p>
          ) : (
            <div style={{ border: "0.5px solid rgba(10,10,10,0.15)" }}>
              {events.map((event, i) => (
                <div
  key={event.id}
  style={{ padding: "14px 16px", borderBottom: i < events.length - 1 ? "0.5px solid rgba(10,10,10,0.15)" : "none", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}
>
                <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "15px", color: "#0A0A0A", margin: 0 }}>{event.name}</p>
                  <p style={{ fontSize: "11px", color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", margin: 0 }}>
                    {formatDate(event.date, event.end_date)} · {event.location || "TBD"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  <select
                    value={event.status}
                    onChange={(e) => updateStatus(event.id, e.target.value)}
                    style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: statusColor(event.status), border: "0.5px solid rgba(10,10,10,0.2)", padding: "5px 8px", backgroundColor: "white", cursor: "pointer" }}
                  >
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                  </select>
                  <button
                    onClick={() => { setEditingEvent(event); setView("edit"); }}
                    style={{ backgroundColor: "transparent", border: "0.5px solid rgba(10,10,10,0.2)", color: "rgba(10,10,10,0.6)", padding: "5px 12px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    style={{ backgroundColor: "transparent", border: "0.5px solid rgba(139,26,26,0.3)", color: "#8B1A1A", padding: "5px 12px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
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