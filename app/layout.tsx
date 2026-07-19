import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Production Lens",
    template: "%s · Production Lens",
  },
  description: "Evidence-backed production-readiness scanning for AI applications.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Production Lens",
    description: "See what stands between your AI agent and production.",
    images: [{ url: "/og.png", width: 1760, height: 921, alt: "Production Lens evidence-backed AI agent scan" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Production Lens",
    description: "See what stands between your AI agent and production.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<footer className="site-footer"><span>AI Helps. You Decide.</span><i /><span>Evidence-backed production readiness</span></footer></body>
    </html>
  );
}
