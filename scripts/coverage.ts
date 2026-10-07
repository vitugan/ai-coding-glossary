/** Per-language translation coverage. Informational, never fails. */
import { appendFileSync } from "node:fs";
import { loadContent, SOURCE_LANGUAGE } from "./lib/content.ts";

const content = loadContent();
const source = content.languages.get(SOURCE_LANGUAGE);
const ids = [...(source?.terms.keys() ?? [])];

const rows: string[] = [];
const details: string[] = [];
for (const language of content.languages.values()) {
  if (language.code === SOURCE_LANGUAGE) continue;
  const missing = ids.filter((id) => !language.terms.has(id));
  const done = ids.length - missing.length;
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 100;
  rows.push(`| ${language.code} | ${done} / ${ids.length} | ${pct}% |`);
  if (missing.length)
    details.push(
      `**${language.code}** — не перекладено: ${missing.map((id) => `\`${id}\``).join(", ")}`
    );
}

const md = [
  "### Покриття перекладами",
  "",
  "| Мова | Перекладено | % |",
  "|---|---|---|",
  ...rows,
  "",
  ...details,
  "",
].join("\n");

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
