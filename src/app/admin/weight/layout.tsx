import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Weight",
  manifest: "/manifest-weight.json",
  icons: {
    icon: "/icon-weight-192.png",
    apple: "/apple-touch-icon-weight.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Weight",
  },
};

export default function WeightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
