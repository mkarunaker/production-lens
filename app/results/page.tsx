import type { Metadata } from "next";
import Link from "next/link";
import { scanRepository } from "@/lib/scanner";
import { sampleFiles, sampleRepositoryName } from "@/lib/scanner/sample-bundle";

export const metadata: Metadata = { title: "Scan results" };

export default function ResultsPage({ searchParams }: { searchParams: Promise<{ finding?: string }> }) {
  const result = scanRepository(sampleRepositoryName, sampleFiles);
  return <Results result={result} searchParams={searchParams} />;
}

async function Results({ result, searchParams }: { result: ReturnType<typeof scanRepository>; searchParams: Promise<{ finding?: string }> }) {
  const requested = (await searchParams).finding;
  const selected = result.findings.find((finding) => finding.id === requested) ?? result.findings[0];
  const counts = {
    critical: result.findings.filter((finding) => finding.severity === "critical").length,
    high: result.findings.filter((finding) => finding.severity === "high").length,
    medium: result.findings.filter((finding) => finding.severity === "medium").length,
  };

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">PL</span><span>Production Lens</span></Link>
        <span className="prototype-pill">Static scan complete</span>
      </header>
      <div className="results-shell">
        <Link className="back-link" href="/">← Scan another project</Link>
        <div className="results-title-row">
          <div>
            <span className="overline">Scan report · bundled sample</span>
            <h1>Not ready for production</h1>
            <p>{result.repository} · {result.scannedFiles} approved files inspected · no code executed</p>
          </div>
          <div className="risk-score"><strong>{result.findings.length}</strong><span>open findings</span></div>
        </div>
        <div className="summary-grid" aria-label="Finding summary">
          <div className="summary-box"><strong>{counts.critical}</strong><span>Critical</span></div>
          <div className="summary-box"><strong>{counts.high}</strong><span>High</span></div>
          <div className="summary-box"><strong>{counts.medium}</strong><span>Medium</span></div>
          <div className="summary-box"><strong>{result.findings.filter((finding) => finding.evidence).length}</strong><span>With line evidence</span></div>
        </div>
        <div className="findings-layout">
          <section className="findings-list" aria-label="Findings">
            {result.findings.map((finding) => (
              <Link className="finding-card" href={`/results?finding=${finding.id}`} key={finding.id}>
                <div className="finding-top">
                  <div>
                    <div className="badges">
                      <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
                      <span className="category">{finding.category}</span>
                    </div>
                    <h2>{finding.title}</h2>
                    <p>{finding.explanation}</p>
                  </div>
                  {finding.evidence && <span className="evidence-chip">{finding.evidence.path}:{finding.evidence.line}</span>}
                </div>
              </Link>
            ))}
          </section>
          <aside className="detail-panel" aria-label="Selected finding details">
            <div className="detail-header">
              <span className={`badge badge-${selected.severity}`}>{selected.severity}</span>
              <h2>{selected.title}</h2>
            </div>
            <div className="detail-body">
              <div className="detail-section"><h3>Why this matters</h3><p>{selected.impact}</p></div>
              <div className="detail-section">
                <h3>Evidence</h3>
                {selected.evidence ? (
                  <div className="code-block">
                    <span className="code-location">{selected.evidence.path}:{selected.evidence.line}</span>
                    <code>{selected.evidence.code}</code>
                  </div>
                ) : <p className="empty-evidence">Repository-level absence detected; no single source line applies.</p>}
              </div>
              <div className="detail-section"><h3>Recommended remediation</h3><p>{selected.remediation}</p></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
