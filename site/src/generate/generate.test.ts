import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  generate,
  rewriteTermLinks,
  transformMarkers,
  type Ui,
} from "./generate.ts";

const labels = { avoid: "Уникайте", usage: "Приклад" } as Ui;

describe("rewriteTermLinks", () => {
  it("points term links at sibling pages", () => {
    expect(rewriteTermLinks("[м](./model.md) [a](./ai.md#x)", "term")).toBe(
      "[м](../model/) [a](../ai/#x)"
    );
  });

  it("resolves intro links relative to the language home", () => {
    expect(rewriteTermLinks("[м](./terms/model.md)", "home")).toBe(
      "[м](model/)"
    );
  });

  it("leaves external links alone", () => {
    expect(rewriteTermLinks("[x](https://x.com)", "term")).toBe(
      "[x](https://x.com)"
    );
  });
});

describe("transformMarkers", () => {
  it("turns avoid into an aside and usage into a dialogue", () => {
    const out = transformMarkers(
      "Text.\n\n## avoid\n\n«memory» — no.\n\n## usage\n\n«Q?»\n\n«A.»\n",
      labels
    );
    expect(out).toBe(
      "Text.\n\n:::caution[Уникайте]\n«memory» — no.\n:::\n\n" +
        '## Приклад\n\n<div class="dialogue">\n\n«Q?»\n\n«A.»\n\n</div>\n'
    );
  });

  it("works without avoid", () => {
    expect(transformMarkers("Text.\n\n## usage\n\n«Q?»", labels)).toBe(
      'Text.\n\n## Приклад\n\n<div class="dialogue">\n\n«Q?»\n\n</div>\n'
    );
  });
});

describe("generate", () => {
  const out = mkdtempSync(join(tmpdir(), "glossary-"));
  const repo = "https://github.com/o/r";
  generate({
    contentDir: fileURLToPath(new URL("../../../content", import.meta.url)),
    outDir: join(out, "docs"),
    uiDir: join(out, "ui"),
    repo,
  });
  const read = (p: string) => readFileSync(join(out, "docs", p), "utf8");

  it("adds the EN name to translations", () => {
    expect(read("uk/context-window.md")).toContain(
      '<p class="term-meta"><span lang="en">EN: Context window</span></p>'
    );
  });

  it("writes edit links to the source file", () => {
    expect(read("uk/context-window.md")).toContain(
      `editUrl: ${repo}/edit/main/content/uk/terms/context-window.md`
    );
  });

  it("builds a splash home with a card per section", () => {
    const home = read("uk/index.mdx");
    expect(home).toContain("template: splash");
    expect(home.match(/<Card /g)).toHaveLength(7);
    expect(home).toContain('<Card title="1. Модель">');
  });

  it("writes UI labels for components", () => {
    const ui = JSON.parse(readFileSync(join(out, "ui", "ui.json"), "utf8"));
    expect(ui.uk.translate).toBe("Перекласти цей термін");
  });
});
