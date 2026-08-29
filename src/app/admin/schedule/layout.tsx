import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Schedule",
  manifest: "/manifest-schedule.json",
  icons: {
    icon: "/icon-schedule-192.png",
    apple: "/apple-touch-icon-schedule.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Our Schedule",
  },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
