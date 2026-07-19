"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";

export const demos: Record<string, string> = {
  "chief-of-staff-v0-scan.zip": "/results?sample=chief",
  "enterprise-analytics-agent.zip": "/results",
  "security-test-agent.zip": "/results?sample=security",
  "clean-agent-baseline.zip": "/results?sample=clean",
};

type DemoUploadProps = {
  destination?: string;
  selectedName?: string;
  onSelect: (name: string, destination: string) => void;
};

export function DemoUpload({ destination, selectedName, onSelect }: DemoUploadProps) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("Only provided sanitized demo ZIPs are accepted here.");

  useEffect(() => {
    setRunning(false);
    setStep(0);
    setComplete(false);
  }, [selectedName]);

  return <div className="upload-panel">
    {selectedName && <div className="loaded-file" role="status"><span aria-hidden="true">✓</span><strong>File loaded</strong><span>—</span><code>{selectedName}</code></div>}
    <div className="upload-row"><label className="upload-drop" htmlFor="demo-zip">
      <span className="upload-plus">＋</span>
      <span><strong>Upload a demo ZIP</strong><small>Choose one of the sanitized archives shipped with this demo</small></span>
    </label><button className="upload-scan-button" type="button" disabled={!destination || running} onClick={() => {
      setRunning(true);
      setMessage("Production Lens is reviewing the selected project…");
      let current = 0;
      const timer = window.setInterval(() => {
        current += 1;
        setStep(current);
        if (current >= 3) { window.clearInterval(timer); window.setTimeout(() => { setRunning(false); setComplete(true); setMessage("Lens run complete. Review the findings when you are ready."); }, 350); }
      }, 420);
    }}>Run Lens</button></div>
    <input id="demo-zip" className="visually-hidden" type="file" accept=".zip,application/zip" onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const destination = demos[file.name.toLowerCase()];
      if (!destination) { setMessage("That ZIP is not one of the provided demo archives. Use the local harness for custom projects."); return; }
      onSelect(file.name, destination);
      setMessage("Choose Run Lens when you are ready.");
    }} />
    {running && <div className="lens-progress" aria-live="polite">
      {['Validate archive boundaries', 'Build technology inventory', 'Evaluate readiness risks', 'Prepare evidence report'].map((label, index) => <div key={label} className={index <= step ? 'lens-step lens-step-active' : 'lens-step'}><span>{index < step ? '✓' : index === step ? '·' : '○'}</span>{label}</div>)}
    </div>}
    {complete && destination && <InPlaceScanResult destination={destination} />}
    <p className="upload-note">{message}</p>
    <div className="demo-downloads"><span>Download a provided demo ZIP:</span><a href="/demo-archives/enterprise-analytics-agent.zip" download>Enterprise Analytics</a><a href="/demo-archives/security-test-agent.zip" download>Security Test Agent</a><a href="/demo-archives/clean-agent-baseline.zip" download>Clean Agent Baseline</a></div>
  </div>;
}

const resultSummaries: Record<string, { findings: number; critical: number; high: number; medium: number }> = {
  "/results": { findings: 11, critical: 4, high: 6, medium: 1 },
  "/results?sample=security": { findings: 7, critical: 4, high: 3, medium: 0 },
  "/results?sample=clean": { findings: 0, critical: 0, high: 0, medium: 0 },
};

function InPlaceScanResult({ destination }: { destination: string }) {
  const summary = resultSummaries[destination];
  const reviewHref = `${destination}${destination.includes("?") ? "&" : "?"}view=workspace`;
  const title = summary?.findings ? `${summary.findings} findings need review` : "Your readiness report is ready";
  return <section className="scan-run-result" aria-live="polite">
    <div>
      <span className="overline">Lens run complete</span>
      <h2>{title}</h2>
      <p>Archive boundaries, technology inventory, and deterministic readiness risks have been evaluated. No repository code was executed.</p>
    </div>
    <div className="scan-run-action">
      {summary && <div className="scan-issue-counts" aria-label="Finding totals"><span><strong>{summary.critical}</strong> Critical</span><span><strong>{summary.high}</strong> High</span><span><strong>{summary.medium}</strong> Medium</span></div>}
      <Link className="scan-button review-issues-button" href={reviewHref}><span>{summary?.findings ? "Review and remediate issues" : "Review scanned code"}</span><span aria-hidden="true">→</span></Link>
    </div>
  </section>;
}
