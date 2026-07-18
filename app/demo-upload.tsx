"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const demos: Record<string, string> = {
  "chief-of-staff-v0-scan.zip": "/results?sample=chief",
  "enterprise-analytics-agent.zip": "/results",
  "security-test-agent.zip": "/results?sample=security",
};

export function DemoUpload() {
  const router = useRouter();
  const [message, setMessage] = useState("Only bundled sanitized demo ZIPs are accepted here.");
  return <div className="upload-panel">
    <label className="upload-drop" htmlFor="demo-zip">
      <span className="upload-plus">＋</span>
      <span><strong>Upload a demo ZIP</strong><small>Choose one of the sanitized archives shipped with this demo</small></span>
      <span className="upload-action">Choose file →</span>
    </label>
    <input id="demo-zip" className="visually-hidden" type="file" accept=".zip,application/zip" onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const destination = demos[file.name.toLowerCase()];
      if (!destination) { setMessage("That ZIP is not one of the bundled demo archives. Use the local harness for custom projects."); return; }
      setMessage(`Loaded ${file.name}. Opening the deterministic hosted scan…`);
      router.push(destination);
    }} />
    <p className="upload-note">{message}</p>
  </div>;
}
