import type { Metadata } from "next";
import Link from "next/link";
import { applyRemediation, hasRemediation, validateRemediation } from "@/lib/remediation";
import { scanRepository } from "@/lib/scanner";
import { sampleFiles, sampleRepositoryName } from "@/lib/scanner/sample-bundle";
import { securitySampleFiles, securitySampleRepositoryName } from "@/lib/scanner/security-sample-bundle";
import { chiefSampleFiles, chiefSampleRepositoryName } from "@/lib/scanner/chief-sample-bundle";

export const metadata: Metadata = { title: "Scan results" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ finding?: string; mode?: string; approved?: string; sample?: string; rule?: string }> }) {
  const params = await searchParams;
  const isSecuritySample = params.sample === "security";
  const isChiefSample = params.sample === "chief";
  const repositoryName = isSecuritySample ? securitySampleRepositoryName : isChiefSample ? chiefSampleRepositoryName : sampleRepositoryName;
  const repositoryFiles = isSecuritySample ? securitySampleFiles : isChiefSample ? chiefSampleFiles : sampleFiles;
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
  return <Results result={result} params={params} comparison={comparison} isSecuritySample={isSecuritySample} isChiefSample={isChiefSample} resolvedTitle={resolvedTitle} />;
}

function Results({
  result,
  params,
  comparison,
  isSecuritySample,
  isChiefSample,
  resolvedTitle,
}: {
  result: ReturnType<typeof scanRepository>;
  params: { finding?: string; mode?: string; approved?: string; sample?: string; rule?: string };
  comparison?: ReturnType<typeof validateRemediation>;
  isSecuritySample: boolean;
  isChiefSample: boolean;
  resolvedTitle?: string;
}) {
  const principleLabels: Record<string, string> = {
    "Own it": "Accountability & review",
    "Prove it": "Tests & evidence",
    "Contain it": "Limit the blast radius",
    "Trace and reverse it": "Audit & rollback",
    "Break the lethal trifecta": "Separate sensitive capabilities",
  };
  const selected = result.findings.find((finding) => finding.id === params.finding) ?? result.findings[0];
  const sampleQuery = isSecuritySample ? "sample=security&" : isChiefSample ? "sample=chief&" : "";
  const queryPrefix = comparison
    ? `${sampleQuery}mode=after&approved=yes&rule=${params.rule}&`
    : sampleQuery;
  const counts = {
    critical: result.findings.filter((finding) => finding.severity === "critical").length,
    high: result.findings.filter((finding) => finding.severity === "high").length,
    medium: result.findings.filter((finding) => finding.severity === "medium").length,
  };
  const stateLabels = {
    finding: "Finding",
    passed: "Passed check",
    implemented_unverified: "Implemented, not verified",
    documented_only: "Documented only",
    needs_review: "Needs review",
    not_applicable: "Not applicable",
  } as const;
  const stateCounts = Object.fromEntries(
    Object.keys(stateLabels).map((state) => [state, result.checks.filter((check) => check.state === state).length]),
  ) as Record<keyof typeof stateLabels, number>;
  const inventoryItems = [
    ...result.inventory.languages,
    ...result.inventory.frameworks,
    ...result.inventory.dataStores,
    ...result.inventory.capabilities,
  ];
  const severityGroups = (["critical", "high", "medium"] as const).map((severity) => ({
    severity,
    findings: result.findings.filter((finding) => finding.severity === severity),
  })).filter((group) => group.findings.length > 0);

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
            <span className="overline">Scan report · {isSecuritySample ? "security test project" : isChiefSample ? "Chief of Staff demo ZIP" : "bundled sample"}</span>
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
        <details className="applicability-panel">
          <summary className="applicability-heading" id="applicability-title">
            <div>
              <span className="overline">Code-first applicability</span>
              <h2 id="applicability-title">What Production Lens evaluated</h2>
              <p>Code, configuration, and tests drive conclusions. Documentation provides context but cannot prove a control.</p>
            </div>
            <div className="inventory-chips" aria-label="Detected technology inventory">
              {inventoryItems.length
                ? inventoryItems.map((item) => <span key={item}>{item}</span>)
                : <span>No supported technology detected</span>}
            </div>
            <div className="state-summary state-summary-visible" aria-label="Evaluation state counts">
              {(Object.keys(stateLabels) as (keyof typeof stateLabels)[]).map((state) => (
                <div key={state}><strong>{stateCounts[state]}</strong><span>{stateLabels[state]}</span></div>
              ))}
            </div>
          </summary>
          <div className="assessment-grid">
            {result.checks.map((check) => (
              <article className={`assessment assessment-${check.state}`} key={check.ruleId}>
                <div>
                  <span className="assessment-state">{stateLabels[check.state]}</span>
                  <strong>{check.title}</strong>
                </div>
                <p>{check.reason}</p>
                {check.evidence && <code>{check.evidence.path}:{check.evidence.line}</code>}
              </article>
            ))}
          </div>
        </details>
        <div className="findings-layout">
          <section className="findings-list" aria-label="Findings">
            {severityGroups.map((group) => <section className="severity-group" key={group.severity}>
              <div className="severity-heading"><h2>{group.severity}</h2><span>{group.findings.length} {group.findings.length === 1 ? "finding" : "findings"}</span></div>
              <div className="severity-grid">{group.findings.map((finding) => (
                <Link className="finding-card" href={`/results?${queryPrefix}finding=${finding.id}`} key={finding.id}>
                  <div className="badges"><span className={`badge badge-${finding.severity}`}>{finding.severity}</span><span className="category">{finding.category}</span></div>
                  <h2>{finding.title}</h2>
                  {finding.evidence && <span className="evidence-chip">{finding.evidence.path}:{finding.evidence.line}</span>}
                </Link>
              ))}</div>
            </section>)}
          </section>
          <aside className="detail-panel" aria-label="Selected finding details">
            <div className="detail-header">
              <span className={`badge badge-${selected.severity}`}>{selected.severity}</span>
              <h2>{selected.title}</h2>
            </div>
            <div className="detail-body">
              <details className="detail-section" open><summary><h3>Why this matters</h3></summary><p>{selected.impact}</p></details>
              <details className="detail-section"><summary><h3>Readiness lens</h3></summary>
                <div className="detail-principles">
                  {selected.principles.map((principle) => (
                    <div key={principle.name}>
                      <strong>{principleLabels[principle.name] ?? principle.name}</strong>
                      <span className="principle-canonical">{principle.name}</span>
                      <p>{principle.reason}</p>
                    </div>
                  ))}
                </div>
              </details>
              <details className="detail-section" open><summary><h3>Evidence</h3></summary>
                {selected.evidence ? (
                  <div className="code-block">
                    <span className="code-location">{selected.evidence.path}:{selected.evidence.line}</span>
                    <code>{selected.evidence.code}</code>
                  </div>
                ) : <p className="empty-evidence">Repository-level absence detected; no single source line applies.</p>}
              </details>
              <details className="detail-section" open><summary><h3>Recommended remediation</h3></summary><p>{selected.remediation}</p></details>
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
