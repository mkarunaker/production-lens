import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_REMEDIATION_RULE_ID, proposeRemediation } from "@/lib/remediation";
import { scanRepository } from "@/lib/scanner";
import { sampleFiles, sampleRepositoryName } from "@/lib/scanner/sample-bundle";

export const metadata: Metadata = { title: "Review remediation" };

export default async function RemediationPage({
  searchParams,
}: {
  searchParams: Promise<{ finding?: string }>;
}) {
  const requested = (await searchParams).finding;
  const scan = scanRepository(sampleRepositoryName, sampleFiles);
  const finding = scan.findings.find((candidate) => candidate.id === requested);
  const ruleId = finding?.ruleId ?? DEMO_REMEDIATION_RULE_ID;
  const proposal = proposeRemediation(ruleId, sampleFiles);

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">PL</span><span>Production Lens</span></Link>
        <span className="prototype-pill">Disposable working copy</span>
      </header>
      <div className="remediation-shell">
        <Link className="back-link" href={`/results?finding=${finding?.id ?? ""}`}>← Back to finding</Link>
        <div className="remediation-heading">
          <span className="overline">Codex remediation proposal</span>
          <h1>Review before applying</h1>
          <p>This patch targets a disposable in-memory copy. The canonical sample is not modified and no sample code is executed.</p>
        </div>

        <section className="proposal-card">
          <div className="proposal-summary">
            <div>
              <span className="badge badge-critical">critical finding</span>
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

        <section className="approval-card">
          <div>
            <span className="overline">Deterministic validation plan</span>
            <h2>Four checks will run after approval</h2>
            <ul>
              {proposal.checks.map((check) => <li key={check}><span>✓</span>{check}</li>)}
            </ul>
          </div>
          <div className="approval-action">
            <p>Explicit approval is required before the disposable copy is changed.</p>
            <Link
              className="approve-button"
              href={`/results?mode=after&finding=${finding?.id ?? "data_sensitive_logging-1"}`}
            >
              Approve, apply, and rescan <span>→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
