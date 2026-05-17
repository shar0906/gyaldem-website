"use client";

import { useState } from "react";
import type { Event } from "../lib/supabase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JoinBanner from "../components/JoinBanner";
import SetEntered from "../components/SetEntered";

export default function EventsClient({
  upcoming,
  past,
}: {
  upcoming: Event[];
  past: Event[];
}) {
  const [activeInstallation, setActiveInstallation] = useState<Event | null>(null);

  const formatDate = (dateString: string, endDateString?: string | null) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" };
    if (!endDateString) return date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
    const endDate = new Date(endDateString);
    const sameMonth = date.getUTCMonth() === endDate.getUTCMonth() && date.getUTCFullYear() === endDate.getUTCFullYear();
    if (sameMonth) {
      return `${date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}–${endDate.getUTCDate()}, ${endDate.getUTCFullYear()}`;
    }
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
  };

  const eventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "ladies-night": "Ladies Night",
      "cultural-experience": "Cultural Experience",
      community: "Community",
      installation: "Installation",
      other: "Event",
    };
    return labels[type] || "Event";
  };

  return (
    <main style={{ backgroundColor: "#F5F0E8", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ paddingTop: "80px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "48px 24px 24px", borderBottom: "0.5px solid rgba(10,10,10,0.15)", marginBottom: "48px" }}>
          <p style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 8px" }}>
            {upcoming.length > 0 ? `${upcoming.length} upcoming` : "No upcoming events"}
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(40px, 6vw, 72px)", color: "#0A0A0A", margin: 0, lineHeight: 1 }}>
            the events.
          </h1>
        </div>

        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>

          {upcoming.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "64px", border: "0.5px solid rgba(10,10,10,0.15)" }}>
              {upcoming.map((event, i) => (
                <div key={event.id} style={{ borderRight: i % 2 === 0 ? "0.5px solid rgba(10,10,10,0.15)" : "none", borderBottom: "0.5px solid rgba(10,10,10,0.15)", padding: "32px" }}>
                  <div style={{ backgroundColor: "#d4c9b8", height: "260px", marginBottom: "20px", overflow: "hidden", position: "relative" }}>
                    {event.flyer_url ? (
                      <img src={event.flyer_url} alt={event.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ color: "rgba(10,10,10,0.3)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Flyer coming soon</p>
                      </div>
                    )}
                    <div style={{ position: "absolute", top: "16px", left: "16px" }}>
                      <span style={{ backgroundColor: "#8B1A1A", color: "white", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", padding: "4px 10px", fontFamily: "sans-serif" }}>
                        {eventTypeLabel(event.event_type)}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 6px" }}>
                    {formatDate(event.date, event.end_date)}{event.location ? ` · ${event.location}` : ""}
                  </p>
                  <h2 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "26px", color: "#0A0A0A", margin: "0 0 10px", lineHeight: 1.2 }}>
                    {event.name}
                  </h2>
                  {event.description && (
                    <p style={{ fontSize: "13px", color: "rgba(10,10,10,0.6)", fontFamily: "sans-serif", lineHeight: 1.6, margin: "0 0 20px" }}>
                      {event.description}
                    </p>
                  )}
                  {event.event_type === "installation" ? (
                    <span onClick={() => setActiveInstallation(event)} style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#0A0A0A", fontFamily: "sans-serif", borderBottom: "1px solid #8B1A1A", paddingBottom: "2px", cursor: "pointer" }}>
                      Learn More →
                    </span>
                  ) : event.rsvp_link ? (
                    <a href={event.rsvp_link} style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#0A0A0A", fontFamily: "sans-serif", textDecoration: "none", borderBottom: "1px solid #8B1A1A", paddingBottom: "2px" }}>RSVP →</a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "80px 0", textAlign: "center", marginBottom: "64px" }}>
              <p style={{ color: "rgba(10,10,10,0.3)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
                No upcoming events — check back soon
              </p>
            </div>
          )}

          {past.length > 0 && (
            <div style={{ marginBottom: "80px" }}>
              <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 24px" }}>
                Past Events
              </p>
              {past.map((event) => (
                <div key={event.id} style={{ borderTop: "0.5px solid rgba(10,10,10,0.15)" }}>
                  <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <div style={{ width: "80px", height: "80px", backgroundColor: "#d4c9b8", flexShrink: 0, overflow: "hidden" }}>
                        {event.flyer_url && (
                          <img src={event.flyer_url} alt={event.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "11px", letterSpacing: "0.15em", fontFamily: "sans-serif", margin: "0 0 4px" }}>
                          {formatDate(event.date, event.end_date)}
                        </p>
                        <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "18px", color: "#0A0A0A", margin: "0 0 4px", lineHeight: 1.3 }}>
                          {event.name}
                        </p>
                        <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.5)", fontFamily: "sans-serif", margin: 0 }}>
                          {eventTypeLabel(event.event_type)}{event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                    </div>
                    {event.event_type === "installation" ? (
                      <span
                        onClick={() => setActiveInstallation(event)}
                        style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#0A0A0A", fontFamily: "sans-serif", borderBottom: "1px solid #8B1A1A", paddingBottom: "2px", cursor: "pointer", alignSelf: "flex-start" }}
                      >
                        View Activation →
                      </span>
                    ) : event.rsvp_link ? (
                      <a href={event.rsvp_link} style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#0A0A0A", fontFamily: "sans-serif", textDecoration: "none", borderBottom: "1px solid #8B1A1A", paddingBottom: "2px", alignSelf: "flex-start" }}>View Event →</a>
                    ) : null}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: "0.5px solid rgba(10,10,10,0.15)" }} />
            </div>
          )}

        </div>
      </div>

      <JoinBanner />
      <Footer />

      {/* Installation Modal */}
      {activeInstallation && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveInstallation(null); }}
        >
          <div style={{ backgroundColor: "#F5F0E8", maxWidth: "680px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ flexShrink: 0 }}>
              {activeInstallation.flyer_url && (
                <div style={{ height: "260px", overflow: "hidden" }}>
                  <img src={activeInstallation.flyer_url} alt={activeInstallation.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ padding: "20px 32px 0" }}>
                <p style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>
                  Installation · {formatDate(activeInstallation.date, activeInstallation.end_date)}{activeInstallation.location ? ` · ${activeInstallation.location}` : ""}
                </p>
              </div>
            </div>
            <div style={{ overflowY: "auto", padding: "16px 32px 32px", flex: 1 }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "28px", color: "#0A0A0A", margin: "0 0 16px", lineHeight: 1.2 }}>
                {activeInstallation.name}
              </h2>
              {activeInstallation.description && (
                <p style={{ fontSize: "15px", color: "rgba(10,10,10,0.7)", fontFamily: "sans-serif", lineHeight: 1.7, margin: 0 }}>
                  {activeInstallation.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveInstallation(null)}
              style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: "32px", height: "32px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    <SetEntered />
    </main>
  );
}