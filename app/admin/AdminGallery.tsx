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
  name: string;
  url: string;
  category: string;
};

export default function AdminGallery() {
  const [activeCategory, setActiveCategory] = useState("ladies-night");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = async (category: string) => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("gallery-photos")
      .list(category, { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error("Error fetching photos:", error);
      setPhotos([]);
      setLoading(false);
      return;
    }

    const photoList = (data || [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => ({
        name: f.name,
        category,
        url: supabase.storage
          .from("gallery-photos")
          .getPublicUrl(`${category}/${f.name}`).data.publicUrl,
      }));

    setPhotos(photoList);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos(activeCategory);
  }, [activeCategory]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const uploads = Array.from(files);

    for (const file of uploads) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await supabase.storage
        .from("gallery-photos")
        .upload(`${activeCategory}/${fileName}`, file, { upsert: true });
    }

    await fetchPhotos(activeCategory);
    setUploading(false);
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!confirm(`Delete this photo?`)) return;
    await supabase.storage
      .from("gallery-photos")
      .remove([`${photo.category}/${photo.name}`]);
    await fetchPhotos(activeCategory);
  };

  return (
    <div style={{ padding: "40px 32px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "36px", color: "#0A0A0A", margin: "0 0 32px" }}>
        The Room
      </h1>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "32px", borderBottom: "0.5px solid rgba(10,10,10,0.15)" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{ background: "none", border: "none", borderBottom: activeCategory === cat.id ? "2px solid #8B1A1A" : "2px solid transparent", padding: "12px 20px", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "sans-serif", color: activeCategory === cat.id ? "#8B1A1A" : "rgba(10,10,10,0.5)", cursor: "pointer", marginBottom: "-1px" }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div style={{ border: "1px dashed rgba(139,26,26,0.4)", padding: "32px", textAlign: "center", marginBottom: "32px", backgroundColor: "rgba(139,26,26,0.02)" }}>
        <p style={{ color: "rgba(10,10,10,0.5)", fontSize: "13px", fontFamily: "sans-serif", margin: "0 0 16px" }}>
          Upload photos to <strong>{categories.find(c => c.id === activeCategory)?.label}</strong>
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => { if (e.target.files) handleUpload(e.target.files); }}
          style={{ display: "none" }}
          id="gallery-upload"
        />
        <label
          htmlFor="gallery-upload"
          style={{ backgroundColor: "#8B1A1A", color: "white", padding: "12px 24px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer", display: "inline-block" }}
        >
          {uploading ? "Uploading..." : "Choose Photos"}
        </label>
        {uploading && (
          <p style={{ color: "#8B1A1A", fontSize: "12px", fontFamily: "sans-serif", margin: "12px 0 0" }}>
            Uploading — please wait...
          </p>
        )}
      </div>

      {/* Photo grid */}
      {loading ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>Loading...</p>
      ) : photos.length === 0 ? (
        <p style={{ color: "rgba(10,10,10,0.4)", fontFamily: "sans-serif", fontSize: "14px" }}>
          No photos yet in {categories.find(c => c.id === activeCategory)?.label}. Upload some above.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {photos.map((photo) => (
            <div key={photo.name} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#d4c9b8" }}>
              <img src={photo.url} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => handleDelete(photo)}
                style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.7)", border: "none", color: "white", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}