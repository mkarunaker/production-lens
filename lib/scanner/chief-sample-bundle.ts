import type { RepositoryFile } from "./types";

export const chiefSampleRepositoryName = "chief-of-staff-v0";

// Sanitized hosted fixture: credentials, tokens, virtualenvs, caches, and Git data are excluded.
export const chiefSampleFiles: RepositoryFile[] = [
  { path: "requirements.txt", content: "langgraph>=0.5.0\nlangchain-openai>=0.3.0\nfastapi>=0.115.0\n" },
  { path: "agents/orchestrator.py", content: "EXTRACT_SYSTEM_PROMPT = \"\"\"\nExtract a concise executive brief from calendar and document data.\n\"\"\"\n\ndef orchestrate(task):\n    return task\n" },
  { path: "README.md", content: "# Chief of Staff\n\nA Python AI-agent application with calendar and document tools.\n" },
];
