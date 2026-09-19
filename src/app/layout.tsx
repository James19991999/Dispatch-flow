import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

// Plus Jakarta Sans is loaded via next/font/google in production (Vercel can
// reach fonts.googleapis.com). This build environment's network sandbox
// blocks that host, so the CSS falls back to a matching system-font stack
// (see globals.css) and the --font-plus-jakarta variable is simply unset —
// harmless either way. To enable it on deploy, uncomment below and add
// className={plusJakarta.variable} to <body>.
//
// import { Plus_Jakarta_Sans } from "next/font/google";
// const plusJakarta = Plus_Jakarta_Sans({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700", "800"],
//   variable: "--font-plus-jakarta",
// });

export const metadata: Metadata = {
  title: "DispatchFlow — Fleet Dispatch & Delivery Operations",
  description:
    "DispatchFlow is the dispatcher-first operations console for SME delivery and logistics fleets: live GPS, route optimization, SLA reporting, and customer feedback in one hub.",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
