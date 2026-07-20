import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Production Lens",
    template: "%s · Production Lens",
  },
  description: "Identify and help remediate security, reliability, and governance risks in AI-agent repositories.",
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
      <body>{children}<footer className="site-footer">
        <div className="site-footer-line">
          <span>AI Helps. You Decide.</span><i /><span>Evidence-backed production readiness</span><i />
          <details className="footer-principles">
            <summary>Guiding principles <b aria-hidden="true">↓</b></summary>
            <div className="footer-principles-panel">
              <p><strong>Own it</strong><span>Clear accountability and review.</span></p>
              <p><strong>Prove it</strong><span>Tests and evidence before release.</span></p>
              <p><strong>Contain it</strong><span>Limit the blast radius.</span></p>
              <p><strong>Trace and reverse it</strong><span>Audit evidence and rollback.</span></p>
              <p><strong>Break the lethal trifecta</strong><span>Separate private data, untrusted content, and consequential action.</span></p>
            </div>
          </details>
        </div>
      </footer></body>
    </html>
  );
}
