import type { Metadata } from "next";
import Script from 'next/script'
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

        {process.env.NODE_ENV === 'production' && 
          (
            <>
              <Script
                src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
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
            </>
          )
        }
      </body>
    </html>
  );
}