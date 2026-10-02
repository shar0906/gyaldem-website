"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const pillars = [
  {
    label: "The Gatherings",
    id: "gatherings",
    tagline: "where the night finds its reason.",
    categories: [
      { id: "cultural-experiences", label: "Cultural Experiences" },
      { id: "gyalentines", label: "Gyalentines" },
      { id: "ladies-night", label: "Ladies Night" },
    ],
  },
  {
    label: "The Salons",
    id: "salons",
    tagline: "where culture and conversation collide.",
    categories: [{ id: "the-salons", label: "The Salons" }],
  },
  {
    label: "The Balance",
    id: "balance",
    tagline: "where the focus is about the whole.",
    categories: [{ id: "the-balance", label: "The Balance" }],
  },
  {
    label: "Our Community",
    id: "community",
    tagline: "because without it, what are we?",
    categories: [{ id: "community", label: "Our Community" }],
  },
];

const categoryToPillar: Record<string, string> = {
  "cultural-experiences": "gatherings",
  "gyalentines": "gatherings",
  "ladies-night": "gatherings",
  "the-salons": "salons",
  "the-balance": "balance",
  "community": "community",
};

const pillarCategories: Record<string, string[]> = {
  gatherings: ["cultural-experiences", "gyalentines", "ladies-night"],
  salons: ["the-salons"],
  balance: ["the-balance"],
  community: ["community"],
};

const categories = pillars.flatMap((p) => p.categories);

type GalleryPhoto = {
  id: string;
  category: string;
  file_name: string;
  caption: string | null;
  url: string;
  external_link: string | null;
  external_link_label: string | null;
  is_cover: boolean;
  cover_position: string | null;
};

function GDLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "48px 0" }}>
      <div style={{ position: "relative", width: "40px", height: "40px" }}>
        <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(139,26,26,0.15)", borderTop: "2px solid #8B1A1A", borderRadius: "50%", animation: "gd-spin 0.8s linear infinite" }} />
      </div>
      <p style={{ color: "rgba(10,10,10,0.4)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: 0 }}>Loading</p>
      <style>{`@keyframes gd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FocalPointPicker({ photo, pillarLabel, pillarTagline, onSave, onCancel }: {
  photo: GalleryPhoto;
  pillarLabel: string;
  pillarTagline: string;
  onSave: (position: string) => void;
  onCancel: () => void;
}) {
  const [position, setPosition] = useState(photo.cover_position || "50% 50%");
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const parsePosition = (pos: string) => {
    const parts = pos.split(" ");
    return { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 };
  };

  const { x, y } = parsePosition(position);

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setPosition(`${Math.round(xPct)}% ${Math.round(yPct)}%`);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ backgroundColor: "#0A0A0A", maxWidth: "680px", width: "100%", border: "0.5px solid rgba(255,255,255,0.1)", maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ padding: "20px 24px", borderBottom: "0.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "18px", margin: "0 0 2px" }}>Set Focal Point</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", fontSize: "11px", margin: 0 }}>Click or drag to set the focus of the hero crop</p>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "white", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div
          ref={imgRef}
          style={{ position: "relative", cursor: "crosshair", userSelect: "none" }}
          onMouseDown={(e) => { setIsDragging(true); handleInteraction(e); }}
          onMouseMove={(e) => { if (isDragging) handleInteraction(e); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={(e) => { setIsDragging(true); handleInteraction(e); }}
          onTouchMove={(e) => { if (isDragging) handleInteraction(e); }}
          onTouchEnd={() => setIsDragging(false)}
        >
          <img src={photo.url} alt="Set focal point" draggable={false} style={{ width: "100%", display: "block", maxHeight: "380px", objectFit: "contain", backgroundColor: "#111" }} />
          <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
            <div style={{ position: "relative", width: "28px", height: "28px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid white", backgroundColor: "rgba(139,26,26,0.8)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "2px", height: "36px", backgroundColor: "rgba(255,255,255,0.6)", marginTop: "-18px" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "36px", height: "2px", backgroundColor: "rgba(255,255,255,0.6)", marginLeft: "-18px" }} />
            </div>
          </div>
          <div style={{ position: "absolute", top: "8px", right: "8px", backgroundColor: "rgba(0,0,0,0.7)", padding: "4px 8px" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", fontFamily: "sans-serif", margin: 0, letterSpacing: "0.1em" }}>{position}</p>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 10px" }}>Hero preview</p>
          <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
            <img src={photo.url} alt="Hero preview" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,10,10,0.1) 0%, rgba(10,10,10,0.82) 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px" }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px", letterSpacing: "0.4em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 4px" }}>The Room</p>
              <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "22px", margin: "0 0 3px", lineHeight: 1.1 }}>{pillarLabel}</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "13px", margin: 0 }}>{pillarTagline}</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "0.5px solid rgba(255,255,255,0.1)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(255,255,255,0.15)", padding: "10px 20px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(position)} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "10px 20px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}>Set as Cover</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminGallery() {
  const [activeCategory, setActiveCategory] = useState("ladies-night");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [hasLinks, setHasLinks] = useState<Record<string, boolean>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [replacingPhoto, setReplacingPhoto] = useState<string | null>(null);
  const [focalPickerPhoto, setFocalPickerPhoto] = useState<GalleryPhoto | null>(null);

  const fetchPhotos = async (category: string) => {
    setLoading(true);
    const { data, error } = await supabase.from("gallery_photos").select("*").eq("category", category).order("created_at", { ascending: false });
    if (error) { console.error(error); setPhotos([]); }
    else setPhotos(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPhotos(activeCategory); }, [activeCategory]);

  const handleFileSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    setPendingFiles(fileArray);
    const init: Record<string, string> = {};
    const initBool: Record<string, boolean> = {};
    fileArray.forEach((f) => { init[f.name] = ""; initBool[f.name] = false; });
    setCaptions(init); setHasLinks(initBool); setLinks(init); setLinkLabels(init);
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    for (const file of pendingFiles) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${activeCategory}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("gallery-photos").upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(path);
        await supabase.from("gallery_photos").insert({
          category: activeCategory,
          file_name: fileName,
          caption: captions[file.name] || null,
          url: urlData.publicUrl,
          external_link: hasLinks[file.name] ? (links[file.name] || null) : null,
          external_link_label: hasLinks[file.name] ? (linkLabels[file.name] || "View Full Gallery →") : null,
          is_cover: false,
          cover_position: "50% 50%",
        });
      }
    }
    setPendingFiles([]); setCaptions({}); setHasLinks({}); setLinks({}); setLinkLabels({});
    await fetchPhotos(activeCategory);
    setUploading(false);
  };

  const handleSetCover = async (photo: GalleryPhoto, position: string) => {
    const pillarId = categoryToPillar[photo.category];
    const siblingCategories = pillarCategories[pillarId] || [];
    await supabase.from("gallery_photos").update({ is_cover: false }).in("category", siblingCategories);
    await supabase.from("gallery_photos").update({ is_cover: true, cover_position: position }).eq("id", photo.id);
    setFocalPickerPhoto(null);
    await fetchPhotos(activeCategory);
  };

  const handleReplacePhoto = async (photo: GalleryPhoto, file: File) => {
    setReplacingPhoto(photo.id);
    await supabase.storage.from("gallery-photos").remove([`${photo.category}/${photo.file_name}`]);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${photo.category}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("gallery-photos").upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(path);
      await supabase.from("gallery_photos").update({ file_name: fileName, url: urlData.publicUrl }).eq("id", photo.id);
    }
    await fetchPhotos(activeCategory);
    setReplacingPhoto(null);
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("gallery-photos").remove([`${photo.category}/${photo.file_name}`]);
    await supabase.from("gallery_photos").delete().eq("id", photo.id);
    await fetchPhotos(activeCategory);
  };

  const handleSaveCaption = async (photo: GalleryPhoto) => {
    await supabase.from("gallery_photos").update({ caption: editingValue || null }).eq("id", photo.id);
    setEditingCaption(null); setEditingValue("");
    await fetchPhotos(activeCategory);
  };

  const getPillarForCategory = (categoryId: string) => {
    const pillarId = categoryToPillar[categoryId];
    return pillars.find(p => p.id === pillarId);
  };

  const inputStyle = { backgroundColor: "white", border: "0.5px solid rgba(10,10,10,0.2)", color: "#0A0A0A", padding: "8px 12px", fontSize: "13px", fontFamily: "sans-serif", outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ padding: "32px 20px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "32px", color: "#0A0A0A", margin: "0 0 24px" }}>The Room</h1>

      <div style={{ marginBottom: "24px" }}>
        {pillars.map((pillar) => (
          <div key={pillar.label} style={{ marginBottom: "12px" }}>
            <p style={{ color: "rgba(10,10,10,0.35)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 4px" }}>{pillar.label}</p>
            <div style={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" as any, borderBottom: "0.5px solid rgba(10,10,10,0.15)" }}>
              {pillar.categories.map((cat) => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ background: "none", border: "none", borderBottom: activeCategory === cat.id ? "2px solid #8B1A1A" : "2px solid transparent", padding: "12px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: activeCategory === cat.id ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer", marginBottom: "-1px", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px dashed rgba(139,26,26,0.4)", padding: "24px", marginBottom: "24px", backgroundColor: "rgba(139,26,26,0.02)" }}>
        <p style={{ color: "rgba(10,10,10,0.5)", fontSize: "13px", fontFamily: "sans-serif", margin: "0 0 12px" }}>
          Upload photos to <strong>{categories.find(c => c.id === activeCategory)?.label}</strong>
        </p>
        <input type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); }} style={{ display: "none" }} id="gallery-upload" />
        <label htmlFor="gallery-upload" style={{ backgroundColor: "#8B1A1A", color: "white", padding: "10px 20px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", display: "inline-block" }}>Choose Photos</label>

        {pendingFiles.length > 0 && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ color: "rgba(10,10,10,0.6)", fontSize: "12px", fontFamily: "sans-serif", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>Configure photos before uploading</p>
            {pendingFiles.map((file) => (
              <div key={file.name} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", backgroundColor: "white", border: "0.5px solid rgba(10,10,10,0.1)" }}>
                <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.5)", fontFamily: "sans-serif", margin: 0 }}>{file.name}</p>
                <input type="text" placeholder="Caption (optional)" value={captions[file.name] || ""} onChange={(e) => setCaptions({ ...captions, [file.name]: e.target.value })} style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <p style={{ fontSize: "12px", fontFamily: "sans-serif", color: "rgba(10,10,10,0.6)", margin: 0 }}>Links to external gallery?</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setHasLinks({ ...hasLinks, [file.name]: true })} style={{ padding: "5px 14px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", backgroundColor: hasLinks[file.name] ? "#8B1A1A" : "white", color: hasLinks[file.name] ? "white" : "rgba(10,10,10,0.5)", border: "0.5px solid rgba(10,10,10,0.2)" }}>Yes</button>
                    <button onClick={() => setHasLinks({ ...hasLinks, [file.name]: false })} style={{ padding: "5px 14px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", backgroundColor: !hasLinks[file.name] ? "#8B1A1A" : "white", color: !hasLinks[file.name] ? "white" : "rgba(10,10,10,0.5)", border: "0.5px solid rgba(10,10,10,0.2)" }}>No</button>
                  </div>
                </div>
                {hasLinks[file.name] && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input type="text" placeholder="External gallery URL (https://...)" value={links[file.name] || ""} onChange={(e) => setLinks({ ...links, [file.name]: e.target.value })} style={inputStyle} />
                    <input type="text" placeholder='Link label — defaults to "View Full Gallery →"' value={linkLabels[file.name] || ""} onChange={(e) => setLinkLabels({ ...linkLabels, [file.name]: e.target.value })} style={inputStyle} />
                  </div>
                )}
              </div>
            ))}
            <button onClick={handleUpload} disabled={uploading} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "12px 24px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", opacity: uploading ? 0.5 : 1, alignSelf: "flex-start" }}>
              {uploading ? "Uploading..." : `Upload ${pendingFiles.length} Photo${pendingFiles.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>

      {loading ? <GDLoader /> : photos.length === 0 ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>No photos yet. Upload some above.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#d4c9b8" }}>
                {replacingPhoto === photo.id ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#d4c9b8" }}><GDLoader /></div>
                ) : (
                  <img src={photo.url} alt={photo.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                {photo.is_cover && (
                  <div style={{ position: "absolute", bottom: "6px", left: "6px", backgroundColor: "#8B1A1A", padding: "2px 6px" }}>
                    <span style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", color: "white" }}>Cover</span>
                  </div>
                )}
                {photo.external_link && (
                  <div style={{ position: "absolute", top: "6px", left: "6px", backgroundColor: "#0A0A0A", padding: "2px 6px" }}>
                    <span style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", color: "white" }}>Link</span>
                  </div>
                )}
                <button
                  onClick={() => setFocalPickerPhoto(photo)}
                  title={photo.is_cover ? "Edit focal point" : "Set as pillar cover"}
                  style={{ position: "absolute", top: "6px", right: "62px", background: photo.is_cover ? "#8B1A1A" : "rgba(0,0,0,0.7)", border: "none", color: "white", width: "26px", height: "26px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >★</button>
                <div style={{ position: "absolute", top: "6px", right: "34px" }}>
                  <input type="file" accept="image/*" id={`replace-${photo.id}`} style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleReplacePhoto(photo, e.target.files[0]); }} />
                  <label htmlFor={`replace-${photo.id}`} style={{ background: "rgba(0,0,0,0.7)", border: "none", color: "white", width: "26px", height: "26px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center" }} title="Replace photo">✎</label>
                </div>
                <button onClick={() => handleDelete(photo)} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.7)", border: "none", color: "white", width: "26px", height: "26px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
              {editingCaption === photo.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} placeholder="Add caption..." style={inputStyle} autoFocus />
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => handleSaveCaption(photo)} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "4px 10px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", flex: 1 }}>Save</button>
                    <button onClick={() => { setEditingCaption(null); setEditingValue(""); }} style={{ backgroundColor: "transparent", color: "rgba(10,10,10,0.5)", border: "0.5px solid rgba(10,10,10,0.2)", padding: "4px 10px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <p onClick={() => { setEditingCaption(photo.id); setEditingValue(photo.caption || ""); }} style={{ fontSize: "11px", color: photo.caption ? "rgba(10,10,10,0.6)" : "rgba(10,10,10,0.3)", fontFamily: "sans-serif", margin: 0, cursor: "pointer", fontStyle: photo.caption ? "normal" : "italic" }}>
                    {photo.caption || "Add caption..."}
                  </p>
                  {photo.external_link && (
                    <p style={{ fontSize: "10px", color: "#8B1A1A", fontFamily: "sans-serif", margin: 0 }}>{photo.external_link_label || "View Full Gallery →"}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {focalPickerPhoto && (() => {
        const pillar = getPillarForCategory(focalPickerPhoto.category);
        return (
          <FocalPointPicker
            photo={focalPickerPhoto}
            pillarLabel={pillar?.label || ""}
            pillarTagline={pillar?.tagline || ""}
            onSave={(position) => handleSetCover(focalPickerPhoto, position)}
            onCancel={() => setFocalPickerPhoto(null)}
          />
        );
      })()}
    </div>
  );
}