import type { RepositoryFile } from "./types";

export const cleanSampleRepositoryName = "clean-agent-baseline";

export const cleanSampleFiles: RepositoryFile[] = [
  {
    path: "package.json",
    content: `{"name":"clean-agent-baseline","private":true,"version":"1.0.0","scripts":{"test":"node --test"}}\n`,
  },
  {
    path: "package-lock.json",
    content: `{"name":"clean-agent-baseline","version":"1.0.0","lockfileVersion":3,"packages":{"":{"name":"clean-agent-baseline","version":"1.0.0"}}}\n`,
  },
  {
    path: "src/agent.ts",
    content: `export function answerQuestion(message: string): string {\n  const prompt = message.trim();\n  return prompt.length > 0 ? "I can help with that." : "Please ask a question.";\n}\n`,
  },
  {
    path: "src/agent.test.ts",
    content: `import { strict as assert } from "node:assert";\nimport { answerQuestion } from "./agent";\nassert.equal(answerQuestion("hello"), "I can help with that.");\n`,
  },
];
