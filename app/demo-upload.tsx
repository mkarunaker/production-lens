"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const demos: Record<string, string> = {
  "chief-of-staff-v0-scan.zip": "/results?sample=chief",
  "enterprise-analytics-agent.zip": "/results",
  "security-test-agent.zip": "/results?sample=security",
  "clean-agent-baseline.zip": "/results?sample=clean",
};

export function DemoUpload() {
  const router = useRouter();
  const [destination, setDestination] = useState<string>();
  const [selectedName, setSelectedName] = useState<string>();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("Only provided sanitized demo ZIPs are accepted here.");
  return <div className="upload-panel">
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
        if (current >= 3) { window.clearInterval(timer); window.setTimeout(() => router.push(destination!), 350); }
      }, 420);
    }}>Run Lens</button></div>
    <input id="demo-zip" className="visually-hidden" type="file" accept=".zip,application/zip" onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const destination = demos[file.name.toLowerCase()];
      if (!destination) { setDestination(undefined); setSelectedName(undefined); setMessage("That ZIP is not one of the provided demo archives. Use the local harness for custom projects."); return; }
      setDestination(destination);
      setSelectedName(file.name);
      setMessage("Choose Scan selected project when you are ready.");
    }} />
    {running && <div className="lens-progress" aria-live="polite">
      {['Validate archive boundaries', 'Build technology inventory', 'Evaluate readiness risks', 'Prepare evidence report'].map((label, index) => <div key={label} className={index <= step ? 'lens-step lens-step-active' : 'lens-step'}><span>{index < step ? '✓' : index === step ? '·' : '○'}</span>{label}</div>)}
    </div>}
    <p className="upload-note">{selectedName ? `${selectedName} is ready to scan. ` : ""}{message}</p>
    <div className="demo-downloads"><span>Download a provided demo ZIP:</span><a href="/demo-archives/enterprise-analytics-agent.zip" download>Enterprise Analytics</a><a href="/demo-archives/security-test-agent.zip" download>Security Test Agent</a><a href="/demo-archives/clean-agent-baseline.zip" download>Clean Agent Baseline</a></div>
  </div>;
}
