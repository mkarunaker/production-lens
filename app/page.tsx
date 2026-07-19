"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoUpload, demos } from "./demo-upload";
import { ProductionLensLogo } from "./logo";

const checks = [
  ["Authorization", "User identity & access"],
  ["Sensitive data", "Exposure & logging"],
  ["Observability", "Model & tool traces"],
  ["Evaluations", "Quality regression"],
  ["Reliability", "Timeouts & retries"],
  ["Oversight", "Human review gates"],
];

const securityChecks = [
  ["Prompt injection", "Hostile instructions"],
  ["SQL injection", "Unsafe query building"],
  ["Command injection", "Shell execution"],
  ["NoSQL injection", "Operator objects"],
  ["XSS", "Unsafe HTML sinks"],
  ["Dynamic execution", "Runtime evaluation"],
];

export default function Home() {
  const [selectedName, setSelectedName] = useState<string>();
  const [destination, setDestination] = useState<string>();

  function loadDemo(name: string) {
    setSelectedName(name);
    setDestination(demos[name]);
  }

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Production Lens home">
          <span className="brand-mark" aria-hidden="true"><ProductionLensLogo /></span>
          <span>Production Lens</span>
        </Link>
        <span className="prototype-pill">OpenAI Build Week Hackathon</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="pulse" /> Static production-readiness review</div>
        <h1>See what stands between<br />your AI agent and <em>production.</em></h1>
        <p className="hero-copy">
          Production Lens identifies and helps remediate security, reliability, and
          governance risks in AI-agent repositories using five production-readiness principles.
        </p>

        <DemoUpload destination={destination} selectedName={selectedName} onSelect={(name, nextDestination) => { setSelectedName(name); setDestination(nextDestination); }} />
        <div className="projects-heading"><span className="overline">Predefined demo projects</span><span>Pick a known-safe fixture</span></div>
        <div className="project-strip"><div className="sample-card">
          <div className="sample-heading">
            <div className="repo-icon" aria-hidden="true">{"</>"}</div>
            <div>
              <span className="overline">Sample repository</span>
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
          <button className="scan-button" type="button" onClick={() => loadDemo("enterprise-analytics-agent.zip")}>
            <span>Load demo project</span>
            <span aria-hidden="true">→</span>
          </button>
          <div className="safety-note">
            <span aria-hidden="true">◇</span>
            Static analysis only. Repository code is never executed.
          </div>
        </div>

        <div className="sample-card secondary-sample">
          <div className="sample-heading">
            <div className="repo-icon security-repo-icon" aria-hidden="true">{"!"}</div>
            <div>
              <span className="overline">Adversarial repository</span>
              <h2>Security Test Agent</h2>
            </div>
            <span className="ready"><i /> Ready to scan</span>
          </div>
          <p>
            Focused inert fixtures · Seven evaluated injection findings · No code execution
          </p>
          <div className="scan-scope">
            {securityChecks.map(([title, subtitle]) => (
              <div className="scope-item" key={title}>
                <span className="scope-check security-check" aria-hidden="true">!</span>
                <span><strong>{title}</strong><small>{subtitle}</small></span>
              </div>
            ))}
          </div>
          <button className="scan-button security-scan-button" type="button" onClick={() => loadDemo("security-test-agent.zip")}>
            <span>Load security demo</span>
            <span aria-hidden="true">→</span>
          </button>
          <div className="safety-note">
            <span aria-hidden="true">◇</span>
            Intentionally vulnerable source is treated only as untrusted text.
          </div>
        </div>

        <div className="sample-card secondary-sample clean-sample">
          <div className="sample-heading"><div className="repo-icon" aria-hidden="true">✓</div><div><span className="overline">Clean baseline</span><h2>Clean Agent Baseline</h2></div><span className="ready"><i /> Ready to scan</span></div>
          <p>Minimal typed agent · locked dependencies · no external integrations · no catalog risks detected</p>
          <button className="scan-button" type="button" onClick={() => loadDemo("clean-agent-baseline.zip")}><span>Load clean baseline</span><span aria-hidden="true">→</span></button>
          <div className="safety-note"><span aria-hidden="true">◇</span> Zero findings means no matches in the current deterministic catalog—not a universal security guarantee.</div>
        </div>

        </div>
      </section>

    </main>
  );
}
