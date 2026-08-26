import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "가계부 관리 - OurSpots",
  manifest: "/manifest-expense.json",
  icons: {
    icon: "/icon-expense-192.png",
    apple: "/apple-touch-icon-expense.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "가계부 관리",
  },
};

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
