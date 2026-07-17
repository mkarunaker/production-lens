import Link from "next/link";

const checks = [
  ["Authorization", "User identity & access"],
  ["Sensitive data", "Exposure & logging"],
  ["Observability", "Model & tool traces"],
  ["Evaluations", "Quality regression"],
  ["Reliability", "Timeouts & retries"],
  ["Oversight", "Human review gates"],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Production Lens home">
          <span className="brand-mark" aria-hidden="true">PL</span>
          <span>Production Lens</span>
        </Link>
        <span className="prototype-pill">Hackathon prototype</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="pulse" /> Static production-readiness review</div>
        <h1>See what stands between<br />your AI agent and <em>production.</em></h1>
        <p className="hero-copy">
          Production Lens inspects repository evidence—not promises—to surface
          the security, reliability, and governance gaps that matter most.
        </p>

        <div className="sample-card">
          <div className="sample-heading">
            <div className="repo-icon" aria-hidden="true">{"</>"}</div>
            <div>
              <span className="overline">Bundled sample repository</span>
              <h2>Enterprise Analytics Agent</h2>
            </div>
            <span className="ready"><i /> Ready to scan</span>
          </div>
          <p>
            Browser chat · SQLite analytics · Mock CRM · Deterministic model
          </p>
          <div className="scan-scope">
            {checks.map(([title, subtitle]) => (
              <div className="scope-item" key={title}>
                <span className="scope-check" aria-hidden="true">✓</span>
                <span><strong>{title}</strong><small>{subtitle}</small></span>
              </div>
            ))}
          </div>
          <Link className="scan-button" href="/results">
            <span>Scan sample project</span>
            <span aria-hidden="true">→</span>
          </Link>
          <div className="safety-note">
            <span aria-hidden="true">◇</span>
            Static analysis only. Repository code is never executed.
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <span>Deterministic rules</span><i />
        <span>Evidence-backed findings</span><i />
        <span>Local sample only</span>
      </footer>
    </main>
  );
}
