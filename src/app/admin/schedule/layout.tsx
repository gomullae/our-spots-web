import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "하민이네 일정 - OurSpots",
  manifest: "/manifest-schedule.json",
  icons: {
    icon: "/icon-schedule-192.png",
    apple: "/apple-touch-icon-schedule.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "하민이네 일정",
  },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
