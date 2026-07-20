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

const industrySignals = [
  { stat: "42%", label: "of committed code is AI-generated or AI-assisted; Sonar projects 65% by 2027.", source: "Sonar survey, 2026", href: "https://www.sonarsource.com/blog/state-of-code-developer-survey-report-the-current-reality-of-ai-coding/" },
  { stat: "96%", label: "of Sonar survey respondents do not fully trust AI-generated code; only 48% always verify before committing.", source: "Sonar survey, 2026", href: "https://www.sonarsource.com/blog/state-of-code-developer-survey-report-the-current-reality-of-ai-coding/" },
  { stat: "45%", label: "of model-generation tasks introduced a known security flaw in Veracode’s Spring 2026 controlled evaluation.", source: "Veracode evaluation, 2026", href: "https://www.veracode.com/blog/spring-2026-genai-code-security/" },
  { stat: "10×", label: "more security findings in Apiiro’s Fortune 50 enterprise sample; AI-assisted developers also produced 3–4× more commits.", source: "Apiiro study, 2025", href: "https://apiiro.com/blog/4x-velocity-10x-vulnerabilities-ai-coding-assistants-are-shipping-more-risks/" },
  { stat: "107%", label: "increase in mean open-source vulnerabilities per audited codebase in Black Duck’s 2026 OSSRA data.", source: "Black Duck OSSRA, 2026", href: "https://www.blackduck.com/blog/open-source-trends-ossra-report.html" },
  { stat: "92%", label: "report governance challenges with AI-generated code; 80% say adoption outpaced policy development.", source: "GitLab / Harris Poll, 2026", href: "https://about.gitlab.com/press/releases/2026-06-23-gitlab-research-reveals-organizations-are-generating-ai-code-faster-than-they-can-control-it/" },
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
          Principles-based, evidence-backed review across security, reliability, governance,
          and selected OWASP, CWE, and NIST-aligned checks.
        </p>

        <details className="industry-signals">
          <summary><span><span className="overline">Why it matters</span><strong>AI writes more code. Verification has not caught up.</strong></span><span className="industry-expand">Explore the industry signals <i aria-hidden="true">↓</i></span></summary>
          <div className="industry-signals-body">
            <div className="industry-signal-grid">
              {industrySignals.map((signal) => <a className="industry-signal" href={signal.href} key={signal.source} rel="noreferrer" target="_blank"><strong>{signal.stat}</strong><span>{signal.label}</span><small>{signal.source} ↗</small></a>)}
            </div>
          </div>
        </details>

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
