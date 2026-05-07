import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gyal Dem Social Club",
  description: "A culturally-rooted social experience platform for women of the Afro-diasporic community. Based in Miami.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#F5F0E8" }}>
        {children}
      </body>
    </html>
  );
}