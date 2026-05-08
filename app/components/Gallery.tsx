"use client";

import { useState, useEffect } from "react";

const categoryMeta = [
  { id: "ladies-night", label: "Ladies Night", cover: "/entergate_background.jpg" },
  { id: "gyalentines", label: "Gyalentines", cover: "/entergate_background.jpg" },
  { id: "community", label: "Community", cover: "/entergate_background.jpg" },
  { id: "cultural-experiences", label: "Cultural Experiences", cover: "/entergate_background.jpg" },
];

type Photo = { url: string; caption: string | null };

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => setPhotos(data))
      .catch(() => {});
  }, []);

  const active = categoryMeta.find((c) => c.id === activeCategory);

  return (
    <section id="gallery" style={{ backgroundColor: "#F5F0E8", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }} className="gallery-grid">
          {categoryMeta.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{ position: "relative", cursor: "pointer", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#d4c9b8" }}
            >
              <img
                src={photos[cat.id]?.[0]?.url || cat.cover}
                alt={cat.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)", display: "flex", alignItems: "flex-end", padding: "20px" }}>
                <div>
                  <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "22px", margin: 0 }}>{cat.label}</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", margin: "4px 0 0", fontFamily: "sans-serif" }}>
                    {photos[cat.id]?.length > 0 ? `${photos[cat.id].length} photos` : "View Gallery"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {activeCategory && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.95)", zIndex: 100, overflowY: "auto", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveCategory(null); }}
        >
          <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
              <h3 style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "36px", margin: 0 }}>
                {active?.label}
              </h3>
              <button onClick={() => setActiveCategory(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "white", width: "44px", height: "44px", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ×
              </button>
            </div>
            {photos[activeCategory]?.length > 0 ? (
              <div style={{ columns: "2 300px", gap: "12px" }}>
                {photos[activeCategory].map((photo, i) => (
                  <div key={i} style={{ breakInside: "avoid", marginBottom: "12px" }}>
                    <img src={photo.url} alt={photo.caption || (active?.label + " " + (i + 1))} style={{ width: "100%", display: "block" }} />
                    {photo.caption && (
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "sans-serif", margin: "6px 0 0", fontStyle: "italic" }}>
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
                  Photos coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .gallery-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}