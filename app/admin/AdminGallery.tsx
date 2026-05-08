"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const categories = [
  { id: "ladies-night", label: "Ladies Night" },
  { id: "gyalentines", label: "Gyalentines" },
  { id: "community", label: "Community" },
  { id: "cultural-experiences", label: "Cultural Experiences" },
];

type GalleryPhoto = {
  id: string;
  category: string;
  file_name: string;
  caption: string | null;
  url: string;
};

export default function AdminGallery() {
  const [activeCategory, setActiveCategory] = useState("ladies-night");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const fetchPhotos = async (category: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching photos:", error);
      setPhotos([]);
    } else {
      setPhotos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos(activeCategory);
  }, [activeCategory]);

  const handleFileSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    setPendingFiles(fileArray);
    const initialCaptions: Record<string, string> = {};
    fileArray.forEach((f) => { initialCaptions[f.name] = ""; });
    setCaptions(initialCaptions);
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);

    for (const file of pendingFiles) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${activeCategory}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery-photos")
        .upload(path, file, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("gallery-photos")
          .getPublicUrl(path);

        await supabase.from("gallery_photos").insert({
          category: activeCategory,
          file_name: fileName,
          caption: captions[file.name] || null,
          url: urlData.publicUrl,
        });
      }
    }

    setPendingFiles([]);
    setCaptions({});
    await fetchPhotos(activeCategory);
    setUploading(false);
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage
      .from("gallery-photos")
      .remove([`${photo.category}/${photo.file_name}`]);
    await supabase.from("gallery_photos").delete().eq("id", photo.id);
    await fetchPhotos(activeCategory);
  };

  const handleSaveCaption = async (photo: GalleryPhoto) => {
    await supabase
      .from("gallery_photos")
      .update({ caption: editingValue || null })
      .eq("id", photo.id);
    setEditingCaption(null);
    setEditingValue("");
    await fetchPhotos(activeCategory);
  };

  const inputStyle = {
    backgroundColor: "white",
    border: "0.5px solid rgba(10,10,10,0.2)",
    color: "#0A0A0A",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "sans-serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ padding: "32px 20px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "32px", color: "#0A0A0A", margin: "0 0 24px" }}>
        The Room
      </h1>

      {/* Category tabs — horizontal scroll on mobile */}
      <div style={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" as any, marginBottom: "24px", borderBottom: "0.5px solid rgba(10,10,10,0.15)" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{ background: "none", border: "none", borderBottom: activeCategory === cat.id ? "2px solid #8B1A1A" : "2px solid transparent", padding: "12px 16px", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: activeCategory === cat.id ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer", marginBottom: "-1px", flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div style={{ border: "1px dashed rgba(139,26,26,0.4)", padding: "24px", marginBottom: "24px", backgroundColor: "rgba(139,26,26,0.02)" }}>
        <p style={{ color: "rgba(10,10,10,0.5)", fontSize: "13px", fontFamily: "sans-serif", margin: "0 0 12px" }}>
          Upload photos to <strong>{categories.find(c => c.id === activeCategory)?.label}</strong>
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); }}
          style={{ display: "none" }}
          id="gallery-upload"
        />
        <label
          htmlFor="gallery-upload"
          style={{ backgroundColor: "#8B1A1A", color: "white", padding: "10px 20px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", display: "inline-block" }}
        >
          Choose Photos
        </label>

        {/* Caption fields for pending files */}
        {pendingFiles.length > 0 && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ color: "rgba(10,10,10,0.6)", fontSize: "12px", fontFamily: "sans-serif", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Add captions (optional)
            </p>
            {pendingFiles.map((file) => (
              <div key={file.name} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ fontSize: "12px", color: "rgba(10,10,10,0.5)", fontFamily: "sans-serif", margin: 0 }}>{file.name}</p>
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={captions[file.name] || ""}
                  onChange={(e) => setCaptions({ ...captions, [file.name]: e.target.value })}
                  style={inputStyle}
                />
              </div>
            ))}
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "12px 24px", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", opacity: uploading ? 0.5 : 1, alignSelf: "flex-start" }}
            >
              {uploading ? "Uploading..." : `Upload ${pendingFiles.length} Photo${pendingFiles.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>

      {/* Photo grid */}
      {loading ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>Loading...</p>
      ) : photos.length === 0 ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>
          No photos yet. Upload some above.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#d4c9b8" }}>
                <img src={photo.url} alt={photo.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  onClick={() => handleDelete(photo)}
                  style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.7)", border: "none", color: "white", width: "26px", height: "26px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ×
                </button>
              </div>
              {editingCaption === photo.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder="Add caption..."
                    style={inputStyle}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      onClick={() => handleSaveCaption(photo)}
                      style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "4px 10px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", flex: 1 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingCaption(null); setEditingValue(""); }}
                      style={{ backgroundColor: "transparent", color: "rgba(10,10,10,0.5)", border: "0.5px solid rgba(10,10,10,0.2)", padding: "4px 10px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => { setEditingCaption(photo.id); setEditingValue(photo.caption || ""); }}
                  style={{ fontSize: "11px", color: photo.caption ? "rgba(10,10,10,0.6)" : "rgba(10,10,10,0.3)", fontFamily: "sans-serif", margin: 0, cursor: "pointer", fontStyle: photo.caption ? "normal" : "italic" }}
                >
                  {photo.caption || "Add caption..."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}