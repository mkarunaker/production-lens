"use client";

import { useMemo, useState } from "react";
import type { RemediationProposal } from "@/lib/remediation";
import type { Finding, RepositoryFile, ScanResult } from "@/lib/scanner/types";

type WorkspaceProps = {
  result: ScanResult;
  files: RepositoryFile[];
  proposals: RemediationProposal[];
  sample?: "security" | "chief" | "clean";
  canApply: boolean;
};

const severityOrder = ["critical", "high", "medium"] as const;

export function ResultsWorkspace({ result, files, proposals, sample, canApply }: WorkspaceProps) {
  const initialFile = files.find((file) => /(^|\/)(src|app|agent)\//.test(file.path)) ?? files[0];
  const [selected, setSelected] = useState<Finding>();
  const [activePath, setActivePath] = useState(initialFile?.path ?? "");
  const [showCaught, setShowCaught] = useState(false);
  const [showPatch, setShowPatch] = useState(false);
  const activeFile = files.find((file) => file.path === activePath) ?? initialFile;
  const proposal = selected ? proposals.find((candidate) => candidate.ruleId === selected.ruleId) : undefined;
  const caughtPaths = useMemo(() => new Set(result.findings.flatMap((finding) => finding.evidence ? [finding.evidence.path] : [])), [result.findings]);
  const visibleFiles = showCaught ? files.filter((file) => caughtPaths.has(file.path)) : files;

  function selectFinding(finding: Finding) {
    setSelected(finding);
    const remediation = proposals.find((candidate) => candidate.ruleId === finding.ruleId);
    setShowPatch(Boolean(remediation));
    setActivePath(remediation?.path ?? finding.evidence?.path ?? activePath);
  }

  function selectFile(file: RepositoryFile) {
    const finding = result.findings.find((candidate) => candidate.evidence?.path === file.path);
    if (finding) {
      selectFinding(finding);
      return;
    }
    setSelected(undefined);
    setShowPatch(false);
    setActivePath(file.path);
  }

  return (
    <section className="review-workspace" aria-label="Repository review workspace">
      <div className="workspace-toolbar">
        <div>
          <span className="overline">Repository review</span>
          <strong>{result.repository}</strong>
        </div>
        <span>{result.scannedFiles} approved files · code remains inert</span>
      </div>

      <div className="workspace-main">
        <aside className="workspace-sidebar">
          <section className="findings-rail" aria-label="Open findings by severity">
            <div className="findings-rail-title"><span>Open issues</span><strong>{result.findings.length}</strong></div>
            <div className="findings-scroll">
              {severityOrder.map((severity) => {
                const findings = result.findings.filter((finding) => finding.severity === severity);
                if (!findings.length) return null;
                return (
                  <section key={severity} className={`workspace-severity workspace-severity-${severity}`}>
                    <div className="workspace-severity-heading"><span>{severity}</span><strong>{findings.length}</strong></div>
                    <div className="workspace-finding-cards">
                      {findings.map((finding) => (
                        <button
                          className={`workspace-finding-card ${selected?.id === finding.id ? "workspace-finding-card-active" : ""}`}
                          key={finding.id}
                          onClick={() => selectFinding(finding)}
                          type="button"
                        >
                          <span>{finding.category}</span>
                          <strong>{finding.title}</strong>
                          {finding.evidence && <small>{finding.evidence.path}:{finding.evidence.line}</small>}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
          <section className="file-explorer" aria-label="Scanned files">
            <div className="explorer-heading"><span>Explorer</span><strong>{visibleFiles.length}</strong></div>
            <button className={`lens-filter ${showCaught ? "lens-filter-active" : ""}`} type="button" onClick={() => setShowCaught((value) => !value)}>
              <span aria-hidden="true">◉</span> {showCaught ? "Showing caught files" : "Caught with Lens"}
            </button>
            <p className="explorer-note">{showCaught ? "Files with finding evidence" : "All approved scanned files"}</p>
            <nav className="file-list">
              {visibleFiles.map((file) => (
                <button className={activeFile?.path === file.path ? "file-active" : ""} key={file.path} onClick={() => selectFile(file)} type="button">
                  <span className="file-status" aria-hidden="true">{caughtPaths.has(file.path) ? "!" : "·"}</span>{file.path}
                </button>
              ))}
            </nav>
          </section>
        </aside>

        <section className="code-review" aria-label="Source code">
          <div className="code-tab"><span>{activeFile?.path ?? "No approved source file"}</span>{selected?.evidence?.path === activeFile?.path && <small>Finding evidence</small>}</div>
          {activeFile ? <CodeView file={activeFile} proposal={showPatch && proposal?.path === activeFile.path ? proposal : undefined} /> : <div className="code-empty">No approved text files were available to show.</div>}
        </section>

        <aside className="remediation-panel" aria-live="polite">
          {!selected ? (
            <div className="remediation-empty">
              <span className="empty-lens" aria-hidden="true">⌕</span>
              <span className="overline">Remediation workspace</span>
              <h2>Select an issue to remediate</h2>
              <p>Choose a finding card or a flagged file to inspect its code, evidence, impact, and recommended patch without leaving this review.</p>
            </div>
          ) : (
            <div className="remediation-detail">
              <div className="remediation-title"><span className={`badge badge-${selected.severity}`}>{selected.severity}</span><span>{selected.category}</span></div>
              <h2>{selected.title}</h2>
              <section><h3>Why this matters</h3><p>{selected.impact}</p></section>
              <section><h3>Evidence</h3>{selected.evidence ? <code>{selected.evidence.path}:{selected.evidence.line}</code> : <p>Repository-level absence; no single source line applies.</p>}</section>
              <section><h3>Recommended remediation</h3><p>{selected.remediation}</p></section>
              {proposal && canApply ? (
                <>
                  <div className="suggested-fix"><strong>Suggested fix is shown in code</strong><span>{proposal.path}:{proposal.line}</span></div>
                  <div className="patch-rationale"><strong>Why this patch</strong><p>{proposal.rationale}</p></div>
                  <button className="show-patch-button" type="button" onClick={() => setShowPatch((value) => !value)}>{showPatch ? "Hide inline diff" : "Show inline diff"}<span>→</span></button>
                  <form action="/results" method="get" className="workspace-approval">
                    <input type="hidden" name="mode" value="after" />
                    <input type="hidden" name="approved" value="yes" />
                    <input type="hidden" name="rule" value={selected.ruleId} />
                    {sample && <input type="hidden" name="sample" value={sample} />}
                    <label><input type="checkbox" required /><span>I reviewed this patch and approve applying it to a disposable copy.</span></label>
                    <button className="approve-button" type="submit">Approve, apply, and rescan <span>→</span></button>
                  </form>
                </>
              ) : !canApply ? <p className="workspace-resolved">This view shows the verified result. Reset the demo to review another remediation.</p> : <p className="workspace-no-patch">This finding has no supported deterministic patch.</p>}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function CodeView({ file, proposal }: { file: RepositoryFile; proposal?: RemediationProposal }) {
  const lines = file.content.split("\n");
  const replacementStart = proposal ? file.content.indexOf(proposal.before) : -1;
  const startLine = replacementStart >= 0 ? file.content.slice(0, replacementStart).split("\n").length - 1 : -1;
  const beforeLines = proposal?.before.split("\n") ?? [];
  const afterLines = proposal?.after.split("\n") ?? [];
  return <pre className="source-code"><code>{lines.map((line, index) => {
    if (proposal && index === startLine) return <DiffLines key={`diff-${index}`} line={index + 1} before={beforeLines} after={afterLines} />;
    if (proposal && index > startLine && index < startLine + beforeLines.length) return null;
    return <span className="source-line" key={`${index}-${line}`}><i>{index + 1}</i><span>{line || " "}</span></span>;
  })}</code></pre>;
}

function DiffLines({ line, before, after }: { line: number; before: string[]; after: string[] }) {
  return <span className="inline-diff">{before.map((value, index) => <span className="source-line diff-removed" key={`before-${index}`}><i>{line + index}</i><span>− {value || " "}</span></span>)}{after.map((value, index) => <span className="source-line diff-added" key={`after-${index}`}><i>{line + index}</i><span>+ {value || " "}</span></span>)}</span>;
}
