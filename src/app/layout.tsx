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
  // manifest*.json의 theme_color(JSON)만으로는 부족함 — iOS(특히 26.1~)가 PWA 상태바 색을 정확히
  // 읽으려면 <meta name="theme-color"> 태그가 HTML head에 직접 있어야 함(2026-09-28 확인). 이게
  // 없어서 상태바 영역 색이 흰 배경과 안 맞아 흐릿하게 섞여 보였음. 다른 페이지(admin/*)는 이
  // viewport를 따로 오버라이드하지 않아 그대로 상속받음
  themeColor: "#ffffff",
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
    // black-translucent로 시도했다가 원복(2026-09-28) — 진짜 원인은 상태바 스타일이 아니라
    // manifest*.json의 theme_color가 진한 남색(#1E293B)으로, 흰 배경 앱과 안 맞아서 PWA 홈 화면
    // 실행 시 상태바 영역이 흐릿하게 섞여 보이는 문제였음(theme_color를 #ffffff로 맞춤). default가
    // 흰 배경+검정 상태바 텍스트 조합엔 표준적으로 맞는 짝
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
