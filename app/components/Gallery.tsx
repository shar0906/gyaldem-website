"use client";

import { useState } from "react";

type Photo = {
  url: string;
  caption: string | null;
  external_link: string | null;
  external_link_label: string | null;
  is_cover: boolean;
  cover_position: string | null;
};

const pillars = [
  {
    id: "gatherings",
    label: "The Gatherings",
    tagline: "where the night finds its reason.",
    categories: [
      { id: "cultural-experiences", label: "Cultural Experiences" },
      { id: "gyalentines", label: "Gyalentines" },
      { id: "ladies-night", label: "Ladies Night" },
    ],
  },
  {
    id: "salons",
    label: "The Salons",
    tagline: "where culture and conversation collide.",
    categories: [{ id: "the-salons", label: "The Salons" }],
  },
  {
    id: "balance",
    label: "The Balance",
    tagline: "where the focus is about the whole.",
    categories: [{ id: "the-balance", label: "The Balance" }],
  },
  {
    id: "community",
    label: "Our Community",
    tagline: "because without it, what are we?",
    categories: [{ id: "community", label: "Our Community" }],
  },
];

const FALLBACK_COVER = "/entergate_background.jpg";

export default function Gallery({ initialPhotos = {} }: { initialPhotos?: Record<string, Photo[]> }) {
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const photos = initialPhotos;

  const pillarsWithData = pillars.map((pillar) => {
    const categoriesWithPhotos = pillar.categories.map((c) => ({
      ...c,
      photos: photos[c.id] || [],
    }));
    const total = categoriesWithPhotos.reduce((sum, c) => sum + c.photos.length, 0);
    const coverPhoto = categoriesWithPhotos
      .flatMap((c) => c.photos)
      .find((p) => p.is_cover);
    const fallbackPhoto = categoriesWithPhotos.find((c) => c.photos.length > 0)?.photos[0];
    const heroUrl = coverPhoto?.url || fallbackPhoto?.url || FALLBACK_COVER;
    const heroPosition = coverPhoto?.cover_position || "50% 50%";
    return { ...pillar, categories: categoriesWithPhotos, total, heroUrl, heroPosition };
  });

  const visiblePillars = pillarsWithData.filter((pillar) => pillar.total > 0);
  const activePillarData = pillarsWithData.find((p) => p.id === activePillar);
  const subcategoriesWithPhotos = activePillarData?.categories.filter((c) => c.photos.length > 0) || [];

const displayedCategory =
  subcategoriesWithPhotos.length === 1
    ? subcategoriesWithPhotos[0]
    : subcategoriesWithPhotos.find((c) => c.id === activeSubcategory) || subcategoriesWithPhotos[0];

const openPillar = (pillarId: string) => {
  document.body.style.overflow = "hidden";
  setActivePillar(pillarId);
  setActiveSubcategory(null);
  setModalLoading(true);
  setTimeout(() => setModalLoading(false), 800);
};

const closeModal = () => {
  document.body.style.overflow = "";
  setActivePillar(null);
  setActiveSubcategory(null);
  setModalLoading(false);
};

  return (
    <section id="gallery" style={{ backgroundColor: "#F5F0E8", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }} className="gallery-grid">
          {visiblePillars.map((pillar) => (
            <div
              key={pillar.id}
              onClick={() => openPillar(pillar.id)}
              style={{ position: "relative", cursor: "pointer", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#d4c9b8" }}
            >
              <img
                src={pillar.heroUrl}
                alt={pillar.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pillar.heroPosition, transition: "transform 0.5s ease" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)", display: "flex", alignItems: "flex-end", padding: "20px" }}>
                <div>
                  <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "22px", margin: 0 }}>{pillar.label}</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", margin: "4px 0 0", fontFamily: "sans-serif" }}>
                    {pillar.total} photo{pillar.total !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activePillarData && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "#0A0A0A", zIndex: 100, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          {/* Direction 01 — Editorial Hero */}
          <div style={{ position: "relative", height: "50vh", minHeight: "320px", overflow: "hidden" }}>
            <img
              src={activePillarData.heroUrl}
              alt={activePillarData.label}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: activePillarData.heroPosition || "50% 50%" }}
            />
            
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.75) 100%)" }} />

            {/* Close button */}
            <button
              onClick={closeModal}
              style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "white", width: "44px", height: "44px", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
            >
              ×
            </button>

            {/* Hero text */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", letterSpacing: "0.4em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 8px" }}>
                The Room
              </p>
              <h2 style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(32px, 5vw, 56px)", margin: "0 0 8px", lineHeight: 1.1 }}>
                {activePillarData.label}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(14px, 2vw, 18px)", margin: 0 }}>
                {activePillarData.tagline}
              </p>
            </div>
          </div>

          {/* Content area */}
          <div style={{ backgroundColor: "#0A0A0A", padding: "32px" }}>
            <div style={{ maxWidth: "1152px", margin: "0 auto" }}>

              {/* Subcategory tabs */}
              {subcategoriesWithPhotos.length > 1 && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "32px", flexWrap: "wrap" }}>
                  {subcategoriesWithPhotos.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setModalLoading(true);
                        setActiveSubcategory(sub.id);
                        setTimeout(() => setModalLoading(false), 2000);
                      }}
                      style={{ background: "none", border: "1px solid", borderColor: activeSubcategory === sub.id ? "#8B1A1A" : "rgba(255,255,255,0.2)", color: activeSubcategory === sub.id ? "#8B1A1A" : "rgba(255,255,255,0.6)", padding: "8px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}

              {modalLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "80px 0" }}>
                  <div style={{ position: "relative", width: "40px", height: "40px" }}>
                    <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #8B1A1A", borderRadius: "50%", animation: "gd-spin 0.8s linear infinite" }} />
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>Loading</p>
                </div>
              ) : displayedCategory ? (
                <div style={{ columns: "2 300px", gap: "12px" }}>
                  {displayedCategory.photos.map((photo, i) => (
                    <div
                      key={i}
                      style={{ breakInside: "avoid", marginBottom: "12px", position: "relative", cursor: photo.external_link ? "pointer" : "default", backgroundColor: "#000", minHeight: "200px" }}
                      onClick={() => { if (photo.external_link) window.open(photo.external_link, "_blank"); }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || (displayedCategory.label + " " + (i + 1))}
                        style={{ width: "100%", display: "block", opacity: 0, transition: "opacity 0.4s ease" }}
                        onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1"; }}
                      />

                      {photo.external_link && (
                        <div
                          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.5)";
                            const span = e.currentTarget.querySelector("span") as HTMLElement;
                            if (span) span.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0)";
                            const span = e.currentTarget.querySelector("span") as HTMLElement;
                            if (span) span.style.opacity = "0";
                          }}
                        >
                          <span style={{ color: "white", fontFamily: "sans-serif", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0, transition: "opacity 0.3s ease", borderBottom: "1px solid white", paddingBottom: "2px" }}>
                            {photo.external_link_label || "View Full Gallery →"}
                          </span>
                        </div>
                      )}

                      {photo.caption && (
                        <div style={{ marginTop: "6px" }}>
                          {photo.caption.split(" | ").map((line, idx) => (
                            <p key={idx} style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "sans-serif", margin: "0 0 2px", fontStyle: "italic" }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 0" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
                    {subcategoriesWithPhotos.length > 1 ? "Pick a category above" : "Photos coming soon"}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gd-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .gallery-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}