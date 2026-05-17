import JoinBanner from "../components/JoinBanner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Gallery from "../components/Gallery";
import SetEntered from "../components/SetEntered";

export default function GalleryPage() {
  return (
    <main style={{ backgroundColor: "#F5F0E8", minHeight: "100vh" }}>
      <SetEntered />
      <Navbar />
      <div style={{ paddingTop: "80px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "48px 24px 16px", borderBottom: "0.5px solid rgba(10,10,10,0.15)" }}>
          <p style={{ color: "#8B1A1A", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "0 0 8px" }}>Gallery</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "clamp(40px, 6vw, 72px)", color: "#0A0A0A", margin: 0, lineHeight: 1 }}>the room.</h1>
        </div>
        <Gallery />
      </div>
      <JoinBanner/>
      <Footer />
    </main>
  );
}