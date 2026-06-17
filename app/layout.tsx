import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Gyal Dem Social Club",
  description: "A culturally-rooted social experience platform for women of the Afro-diasporic community. Based in Miami.",
  openGraph: {
    title: "Gyal Dem Social Club",
    description: "A culturally-rooted social experience platform for women of the Afro-diasporic community. Based in Miami.",
    url: "https://gyaldemsocialclub.com",
    siteName: "Gyal Dem Social Club",
    images: [
      {
        url: "/entergate_background.jpg",
        width: 1200,
        height: 630,
        alt: "Gyal Dem Social Club",
      },
    ],
    type: "website",
  },
  icons: {
    icon: "/gyaldem_red_bl_transparent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-536819950"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VKF82M2N2V');
          `}
        </Script>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#F5F0E8" }}>
        {children}
      </body>
    </html>
  );
}