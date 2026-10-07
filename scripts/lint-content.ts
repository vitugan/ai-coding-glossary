/** Blocks on any content rule violation. Usage: pnpm lint:content [content-dir] */
import { loadContent } from "./lib/content.ts";
import { lint, type Issue } from "./lib/lint.ts";

const issues = lint(loadContent(process.argv[2]));
const ci = !!process.env.GITHUB_ACTIONS;

const where = (i: Issue) =>
  `${i.file.replace(/\\/g, "/")}${i.line ? `:${i.line}` : ""}`;

for (const issue of issues) {
  const text = issue.hint ? `${issue.message} — ${issue.hint}` : issue.message;
  if (ci)
    console.log(
      `::error file=${issue.file.replace(/\\/g, "/")}${issue.line ? `,line=${issue.line}` : ""}::${text}`
    );
  console.log(`${where(issue)} — ${text}`);
}

if (issues.length) {
  console.error(`\n✗ ${issues.length} помилок у вмісті`);
  process.exit(1);
}
console.log("✓ вміст без помилок");
