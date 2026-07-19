import type { Metadata } from "next";
import Link from "next/link";
import { applyRemediation, hasRemediation, proposeRemediation, validateRemediation } from "@/lib/remediation";
import { scanRepository } from "@/lib/scanner";
import { sampleFiles, sampleRepositoryName } from "@/lib/scanner/sample-bundle";
import { securitySampleFiles, securitySampleRepositoryName } from "@/lib/scanner/security-sample-bundle";
import { chiefSampleFiles, chiefSampleRepositoryName } from "@/lib/scanner/chief-sample-bundle";
import { cleanSampleFiles, cleanSampleRepositoryName } from "@/lib/scanner/clean-sample-bundle";
import { ProductionLensLogo } from "@/app/logo";
import { ResultsWorkspace } from "@/app/results/workspace";

export const metadata: Metadata = { title: "Scan results" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ finding?: string; mode?: string; approved?: string; sample?: string; rule?: string; view?: string }> }) {
  const params = await searchParams;
  const isSecuritySample = params.sample === "security";
  const isChiefSample = params.sample === "chief";
  const isCleanSample = params.sample === "clean";
  const repositoryName = isSecuritySample ? securitySampleRepositoryName : isChiefSample ? chiefSampleRepositoryName : isCleanSample ? cleanSampleRepositoryName : sampleRepositoryName;
  const repositoryFiles = isSecuritySample ? securitySampleFiles : isChiefSample ? chiefSampleFiles : isCleanSample ? cleanSampleFiles : sampleFiles;
  const baseline = scanRepository(repositoryName, repositoryFiles);
  const remediationRuleId = params.rule && baseline.findings.some((finding) => finding.ruleId === params.rule) && hasRemediation(params.rule)
    ? params.rule
    : undefined;
  const isAfter = params.mode === "after" && params.approved === "yes" && Boolean(remediationRuleId);
  const files = isAfter ? applyRemediation(remediationRuleId!, repositoryFiles) : repositoryFiles;
  const result = scanRepository(repositoryName, files);
  const comparison = isAfter ? validateRemediation(baseline, result, remediationRuleId!) : undefined;
  const proposal = remediationRuleId ? proposeRemediation(remediationRuleId, repositoryFiles) : undefined;
  const proposals = baseline.findings.filter((finding) => hasRemediation(finding.ruleId)).map((finding) => proposeRemediation(finding.ruleId, repositoryFiles));
  const resolvedTitle = remediationRuleId
    ? baseline.findings.find((finding) => finding.ruleId === remediationRuleId)?.title
    : undefined;
  return <Results result={result} files={files} proposals={proposals} params={params} comparison={comparison} proposal={proposal} isSecuritySample={isSecuritySample} isChiefSample={isChiefSample} isCleanSample={isCleanSample} resolvedTitle={resolvedTitle} />;
}

function Results({
  result,
  files,
  proposals,
  params,
  comparison,
  proposal,
  isSecuritySample,
  isChiefSample,
  isCleanSample,
  resolvedTitle,
}: {
  result: ReturnType<typeof scanRepository>;
  files: typeof sampleFiles;
  proposals: ReturnType<typeof proposeRemediation>[];
  params: { finding?: string; mode?: string; approved?: string; sample?: string; rule?: string; view?: string };
  comparison?: ReturnType<typeof validateRemediation>;
  proposal?: ReturnType<typeof proposeRemediation>;
  isSecuritySample: boolean;
  isChiefSample: boolean;
  isCleanSample: boolean;
  resolvedTitle?: string;
}) {
  const patchText = proposal
    ? `--- a/${proposal.path}\n+++ b/${proposal.path}\n@@ -${proposal.line},1 +${proposal.line},1 @@\n-${proposal.before}\n+${proposal.after}\n`
    : "";
  const sampleQuery = isSecuritySample ? "sample=security&" : isChiefSample ? "sample=chief&" : isCleanSample ? "sample=clean&" : "";
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
  const workspaceHref = `/results?${sampleQuery}view=workspace`;
  const showWorkspace = params.view === "workspace" || Boolean(comparison);

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><ProductionLensLogo /></span><span>Production Lens</span></Link>
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
              {proposal && <div className="verification-diff"><span>{proposal.path}:{proposal.line}</span><code className="diff-removed">− {proposal.before}</code><code className="diff-added">+ {proposal.after}</code></div>}
              {proposal && <a className="patch-download" href={`data:text/plain;charset=utf-8,${encodeURIComponent(patchText)}`} download={`production-lens-${proposal.ruleId}.patch`}>Download reviewable patch ↓</a>}
            </div>
            <Link href={isSecuritySample ? "/results?sample=security" : "/results"}>Reset demo</Link>
          </section>
        )}
        <div className="results-title-row">
          <div>
          <span className="overline">Scan report · {isSecuritySample ? "security test project" : isChiefSample ? "Chief of Staff demo ZIP" : isCleanSample ? "clean baseline" : "bundled sample"}</span>
            <h1>{comparison ? "One risk resolved" : result.findings.length === 0 ? "No catalog risks found" : "Not ready for production"}</h1>
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
        {result.findings.length === 0 && <section className="clean-result" aria-label="Clean baseline result"><span className="clean-result-mark">✓</span><div><span className="overline">Catalog review complete</span><h2>No evaluated risks found</h2><p>This baseline matched none of Production Lens’s current deterministic rules. It is a positive signal, not a universal security guarantee.</p></div></section>}
        {showWorkspace ? (
          <ResultsWorkspace result={result} files={files} proposals={proposals} sample={isSecuritySample ? "security" : isChiefSample ? "chief" : isCleanSample ? "clean" : undefined} canApply={!comparison} />
        ) : (
          <section className="scan-decision" aria-label="Scan next steps">
            <div className="scan-complete-steps">
              <span className="overline">Lens run complete</span>
              <h2>Review is ready</h2>
              <p>Production Lens completed a deterministic, code-inert review of the loaded archive.</p>
              <ol>
                <li><span>✓</span><div><strong>Archive boundaries validated</strong><small>Approved files only; repository code was not executed.</small></div></li>
                <li><span>✓</span><div><strong>Technology inventory built</strong><small>Supported languages, data stores, and capabilities were identified.</small></div></li>
                <li><span>✓</span><div><strong>Readiness risks evaluated</strong><small>Evidence and recommended remediations are ready for review.</small></div></li>
              </ol>
            </div>
            <aside className="scan-issues-next">
              <span className="overline">Open issues</span>
              <h2>{result.findings.length} findings need review</h2>
              <div className="scan-issue-counts"><span><strong>{counts.critical}</strong> Critical</span><span><strong>{counts.high}</strong> High</span><span><strong>{counts.medium}</strong> Medium</span></div>
              {result.findings.length ? <Link className="scan-button review-issues-button" href={workspaceHref}><span>Review and remediate issues</span><span aria-hidden="true">→</span></Link> : <Link className="scan-button review-issues-button" href={workspaceHref}><span>Review scanned code</span><span aria-hidden="true">→</span></Link>}
              <p>Continue only when you are ready to inspect code and suggested changes.</p>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
