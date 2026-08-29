import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Budget",
  manifest: "/manifest-expense.json",
  icons: {
    icon: "/icon-expense-192.png",
    apple: "/apple-touch-icon-expense.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Our Budget",
  },
};

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
