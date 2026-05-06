import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gyal Dem Social Club",
  description: "Miami's social club for women of the Caribbean and Afro-diasporic community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}