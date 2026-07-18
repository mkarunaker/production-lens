import type { Metadata } from "next";
import Link from "next/link";
import { applyRemediation, hasRemediation, validateRemediation } from "@/lib/remediation";
import { scanRepository } from "@/lib/scanner";
import { sampleFiles, sampleRepositoryName } from "@/lib/scanner/sample-bundle";
import { securitySampleFiles, securitySampleRepositoryName } from "@/lib/scanner/security-sample-bundle";

export const metadata: Metadata = { title: "Scan results" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ finding?: string; mode?: string; approved?: string; sample?: string; rule?: string }> }) {
  const params = await searchParams;
  const isSecuritySample = params.sample === "security";
  const repositoryName = isSecuritySample ? securitySampleRepositoryName : sampleRepositoryName;
  const repositoryFiles = isSecuritySample ? securitySampleFiles : sampleFiles;
  const baseline = scanRepository(repositoryName, repositoryFiles);
  const remediationRuleId = params.rule && baseline.findings.some((finding) => finding.ruleId === params.rule) && hasRemediation(params.rule)
    ? params.rule
    : undefined;
  const isAfter = params.mode === "after" && params.approved === "yes" && Boolean(remediationRuleId);
  const files = isAfter ? applyRemediation(remediationRuleId!, repositoryFiles) : repositoryFiles;
  const result = scanRepository(repositoryName, files);
  const comparison = isAfter ? validateRemediation(baseline, result, remediationRuleId!) : undefined;
  const resolvedTitle = remediationRuleId
    ? baseline.findings.find((finding) => finding.ruleId === remediationRuleId)?.title
    : undefined;
  return <Results result={result} params={params} comparison={comparison} isSecuritySample={isSecuritySample} resolvedTitle={resolvedTitle} />;
}

function Results({
  result,
  params,
  comparison,
  isSecuritySample,
  resolvedTitle,
}: {
  result: ReturnType<typeof scanRepository>;
  params: { finding?: string; mode?: string; approved?: string; sample?: string; rule?: string };
  comparison?: ReturnType<typeof validateRemediation>;
  isSecuritySample: boolean;
  resolvedTitle?: string;
}) {
  const selected = result.findings.find((finding) => finding.id === params.finding) ?? result.findings[0];
  const sampleQuery = isSecuritySample ? "sample=security&" : "";
  const queryPrefix = comparison
    ? `${sampleQuery}mode=after&approved=yes&rule=${params.rule}&`
    : sampleQuery;
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
        {comparison && (
          <section className="success-banner" aria-label="Remediation result">
            <div className="success-mark">✓</div>
            <div>
              <span className="overline">Remediation verified</span>
              <h2>{resolvedTitle ?? "Selected risk"} resolved</h2>
              <p>{comparison.beforeCount} → {comparison.afterCount} open findings · no new findings introduced · explicit demo approval completed · canonical sample unchanged</p>
            </div>
            <Link href={isSecuritySample ? "/results?sample=security" : "/results"}>Reset demo</Link>
          </section>
        )}
        <div className="results-title-row">
          <div>
            <span className="overline">Scan report · {isSecuritySample ? "security test project" : "bundled sample"}</span>
            <h1>{comparison ? "One risk resolved" : "Not ready for production"}</h1>
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
              <Link className="finding-card" href={`/results?${queryPrefix}finding=${finding.id}`} key={finding.id}>
                <div className="finding-top">
                  <div>
                    <div className="badges">
                      <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
                      <span className="category">{finding.category}</span>
                    </div>
                    <h2>{finding.title}</h2>
                    <p>{finding.explanation}</p>
                    <div className="finding-principles" aria-label="Release-readiness principles">
                      {finding.principles.map((principle) => (
                        <span key={principle.name}>{principle.name}</span>
                      ))}
                    </div>
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
                <h3>Release-readiness principles</h3>
                <div className="detail-principles">
                  {selected.principles.map((principle) => (
                    <div key={principle.name}>
                      <strong>{principle.name}</strong>
                      <p>{principle.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
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
              {!comparison && hasRemediation(selected.ruleId) && (
                <Link className="remediate-button" href={`/remediation?${sampleQuery}finding=${selected.id}`}>
                  Review remediation options <span>→</span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
