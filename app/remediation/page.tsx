import type { Metadata } from "next";
import Link from "next/link";
import { proposeRemediation } from "@/lib/remediation";
import { scanRepository } from "@/lib/scanner";
import { sampleFiles, sampleRepositoryName } from "@/lib/scanner/sample-bundle";
import { securitySampleFiles, securitySampleRepositoryName } from "@/lib/scanner/security-sample-bundle";

export const metadata: Metadata = { title: "Review remediation" };

export default async function RemediationPage({
  searchParams,
}: {
  searchParams: Promise<{ finding?: string; sample?: string }>;
}) {
  const params = await searchParams;
  const isSecuritySample = params.sample === "security";
  const repositoryName = isSecuritySample ? securitySampleRepositoryName : sampleRepositoryName;
  const repositoryFiles = isSecuritySample ? securitySampleFiles : sampleFiles;
  const requested = params.finding;
  const scan = scanRepository(repositoryName, repositoryFiles);
  const finding = scan.findings.find((candidate) => candidate.id === requested);
  if (!finding) throw new Error("Requested finding is missing.");
  const proposal = proposeRemediation(finding.ruleId, repositoryFiles);
  const sampleQuery = isSecuritySample ? "sample=security&" : "";

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">PL</span><span>Production Lens</span></Link>
        <span className="prototype-pill">Disposable working copy</span>
      </header>
      <div className="remediation-shell">
        <Link className="back-link" href={`/results?${sampleQuery}finding=${finding.id}`}>← Back to finding</Link>
        <div className="remediation-heading">
          <span className="overline">Codex remediation proposal</span>
          <h1>Review before applying</h1>
          <p>This patch targets a disposable in-memory copy. The canonical sample is not modified and no sample code is executed.</p>
        </div>

        <section className="proposal-card">
          <div className="proposal-summary">
            <div>
              <span className={`badge badge-${finding.severity}`}>{finding.severity} finding</span>
              <h2>{proposal.title}</h2>
              <p>{proposal.rationale}</p>
            </div>
            <span className="evidence-chip">{proposal.path}:{proposal.line}</span>
          </div>
          <div className="diff" aria-label="Proposed code change">
            <div className="diff-line diff-removed"><span>−</span><code>{proposal.before}</code></div>
            <div className="diff-line diff-added"><span>+</span><code>{proposal.after}</code></div>
          </div>
        </section>

        <section className="remediation-options" aria-label="Remediation options">
          <span className="overline">Choose an outcome</span>
          <h2>How should Production Lens proceed?</h2>
          <div className="option-grid">
            {proposal.options.map((option) => (
              <article className={`option-card ${option.changesCode ? "option-recommended" : ""}`} key={option.id}>
                <strong>{option.label}</strong>
                <p>{option.description}</p>
                {option.changesCode
                  ? <span>Recommended</span>
                  : <Link href={`/results?${sampleQuery}finding=${finding.id}`}>Keep finding open</Link>}
              </article>
            ))}
          </div>
        </section>

        <section className="principles-card">
          <div className="principles-heading">
            <div>
              <span className="overline">Principles-based release readiness</span>
              <h2>Evidence to review before approval</h2>
            </div>
            <span className="review-count">5 principles</span>
          </div>
          <div className="principles-grid">
            {proposal.principles.map((principle, index) => (
              <article className="principle-item" key={principle.name}>
                <span className="principle-number">{index + 1}</span>
                <div>
                  <div className="principle-title">
                    <h3>{principle.name}</h3>
                    <span className={`principle-status status-${principle.status}`}>
                      {principle.status === "review" ? "Needs human review" : principle.status === "verify" ? "Verify after patch" : "Boundary enforced"}
                    </span>
                  </div>
                  <p>{principle.evidence}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="residual-risk">
            <strong>Residual risk</strong>
            <p>This prototype does not persist approver identity or approval history. Durable accountability and authorization remain required before arbitrary repository remediation.</p>
          </div>
        </section>

        <section className="approval-card">
          <div>
            <span className="overline">Deterministic validation plan</span>
            <h2>Four checks will run after approval</h2>
            <ul>
              {proposal.checks.map((check) => <li key={check}><span>✓</span>{check}</li>)}
            </ul>
          </div>
          <div className="approval-action">
            <form action="/results" method="get">
              <input type="hidden" name="mode" value="after" />
              <input type="hidden" name="approved" value="yes" />
              <input type="hidden" name="rule" value={finding.ruleId} />
              {isSecuritySample && <input type="hidden" name="sample" value="security" />}
              <label className="approval-confirmation">
                <input type="checkbox" required />
                <span>I reviewed the patch, evidence, validation plan, and residual risk. I approve applying this change to the disposable copy.</span>
              </label>
              <button className="approve-button" type="submit">
                Approve, apply, and rescan <span>→</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
