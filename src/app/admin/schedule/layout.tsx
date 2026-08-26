import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "일정 관리 - OurSpots",
  manifest: "/manifest-schedule.json",
  icons: {
    icon: "/icon-schedule-192.png",
    apple: "/apple-touch-icon-schedule.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "일정 관리",
  },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
