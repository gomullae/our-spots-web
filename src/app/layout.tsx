import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ourspots.life"),
  title: "Our Spots",
  description: "우리가 함께 만드는 장소 지도",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Our Spots",
  },
  openGraph: {
    title: "Our Spots",
    description: "우리가 함께 만드는 장소 지도",
    url: "https://ourspots.life",
    siteName: "Our Spots",
    images: [{ url: "/icon-512x512.png", width: 512, height: 512 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Our Spots",
    description: "우리가 함께 만드는 장소 지도",
    images: ["/icon-512x512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MVRTP8KL5V"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MVRTP8KL5V');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifKR.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
