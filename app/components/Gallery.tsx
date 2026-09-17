"use client";

import { useState } from "react";

type Photo = { url: string; caption: string | null };

// Pillar structure for display grouping only — none of these category ids
// change, so no Supabase migration is needed for existing photos. The two
// new pillars (Salons, Balance) point at brand-new, currently-empty
// category slugs; they simply won't render until photos exist there.
const pillars = [
  {
    id: "gatherings",
    label: "The Gatherings",
    categories: [
      { id: "ladies-night", label: "Ladies Night" },
      { id: "gyalentines", label: "Gyalentines" },
      { id: "cultural-experiences", label: "Cultural Experiences" },
    ],
  },
  {
    id: "salons",
    label: "The Salons",
    categories: [{ id: "the-salons", label: "The Salons" }],
  },
  {
    id: "balance",
    label: "The Balance",
    categories: [{ id: "the-balance", label: "The Balance" }],
  },
  {
    id: "community",
    label: "Our Community",
    categories: [{ id: "community", label: "Our Community" }],
  },
];

const FALLBACK_COVER = "/entergate_background.jpg";

export default function Gallery({ initialPhotos = {} }: { initialPhotos?: Record<string, Photo[]> }) {
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const photos = initialPhotos;

  // Attach photo counts to every pillar, then only show pillars that have
  // at least one photo somewhere inside them.
  const pillarsWithData = pillars.map((pillar) => {
    const categoriesWithPhotos = pillar.categories.map((c) => ({
      ...c,
      photos: photos[c.id] || [],
    }));
    const total = categoriesWithPhotos.reduce((sum, c) => sum + c.photos.length, 0);
    return { ...pillar, categories: categoriesWithPhotos, total };
  });

  const visiblePillars = pillarsWithData.filter((pillar) => pillar.total > 0);
  const activePillarData = pillarsWithData.find((p) => p.id === activePillar);
  const subcategoriesWithPhotos = activePillarData?.categories.filter((c) => c.photos.length > 0) || [];

  // If only one subcategory has photos, show it directly with no tab picker.
  // Otherwise, show whichever subcategory tab is selected.
  const displayedCategory =
    subcategoriesWithPhotos.length === 1
      ? subcategoriesWithPhotos[0]
      : subcategoriesWithPhotos.find((c) => c.id === activeSubcategory);

  const openPillar = (pillarId: string) => {
    setActivePillar(pillarId);
    setActiveSubcategory(null);
  };

  const closeModal = () => {
    setActivePillar(null);
    setActiveSubcategory(null);
  };

  return (
    <section id="gallery" style={{ backgroundColor: "#F5F0E8", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }} className="gallery-grid">
          {visiblePillars.map((pillar) => {
            const cover = pillar.categories.find((c) => c.photos.length > 0)?.photos[0]?.url || FALLBACK_COVER;
            return (
              <div
                key={pillar.id}
                onClick={() => openPillar(pillar.id)}
                style={{ position: "relative", cursor: "pointer", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#d4c9b8" }}
              >
                <img
                  src={cover}
                  alt={pillar.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
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
            );
          })}
        </div>
      </div>

      {activePillarData && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.95)", zIndex: 100, overflowY: "auto", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: subcategoriesWithPhotos.length > 1 ? "20px" : "32px" }}>
              <h3 style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "36px", margin: 0 }}>
                {activePillarData.label}
              </h3>
              <button onClick={closeModal} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "white", width: "44px", height: "44px", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ×
              </button>
            </div>

            {/* Subcategory tabs — only shown when a pillar has more than one populated subcategory */}
            {subcategoriesWithPhotos.length > 1 && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "32px", flexWrap: "wrap" }}>
                {subcategoriesWithPhotos.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubcategory(sub.id)}
                    style={{
                      background: "none",
                      border: "1px solid",
                      borderColor: activeSubcategory === sub.id ? "#8B1A1A" : "rgba(255,255,255,0.3)",
                      color: activeSubcategory === sub.id ? "#8B1A1A" : "white",
                      padding: "8px 16px",
                      fontSize: "11px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontFamily: "sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {displayedCategory ? (
              <div style={{ columns: "2 300px", gap: "12px" }}>
                {displayedCategory.photos.map((photo, i) => (
                  <div key={i} style={{ breakInside: "avoid", marginBottom: "12px" }}>
                    <img src={photo.url} alt={photo.caption || (displayedCategory.label + " " + (i + 1))} style={{ width: "100%", display: "block" }} />
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