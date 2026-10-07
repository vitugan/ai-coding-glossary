/**
 * Turns the repo's `content/` into Starlight pages under `src/content/docs/`.
 * The generated tree is a build artifact (gitignored): edit `content/`, not it.
 *
 * - terms: markers → caution aside + dialogue, `./x.md` → `../x/`,
 *   "EN: … · also: …" line on translations
 * - `<lang>/index.mdx`: splash home from `intro.md` + section cards
 * - `<lang>/equivalents.md`: translation glossary (or, for EN, an index of them)
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import {
  loadContent,
  SOURCE_LANGUAGE,
  type Content,
  type Language,
  type Term,
} from "../../../scripts/lib/content.ts";

export type Ui = Record<
  | "avoid"
  | "usage"
  | "also"
  | "start"
  | "contents"
  | "equivalents"
  | "equivalentsIntro"
  | "translate"
  | "report"
  | "attribution",
  string
> & { equivalentsColumns?: string[] };

export function ui(content: Content, lang: string): Ui {
  const own = content.languages.get(lang)?.data?.ui ?? {};
  const fallback = content.languages.get(SOURCE_LANGUAGE)?.data?.ui ?? {};
  return { ...(fallback as Ui), ...(own as Partial<Ui>) };
}

export function languageName(content: Content, lang: string): string {
  return String(content.languages.get(lang)?.data?.name ?? lang);
}

export function sectionTitle(content: Content, lang: string, id: string) {
  const titles = (l: string) =>
    (content.languages.get(l)?.data?.sections ?? {}) as Record<string, string>;
  return titles(lang)[id] ?? titles(SOURCE_LANGUAGE)[id] ?? id;
}

/** The term in `lang`, or its EN version when there is no translation. */
function termIn(content: Content, lang: string, id: string): Term | undefined {
  return (
    content.languages.get(lang)?.terms.get(id) ??
    content.languages.get(SOURCE_LANGUAGE)?.terms.get(id)
  );
}

const title = (t: Term | undefined) => String(t?.data?.title ?? t?.id ?? "");

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- body transforms ----------

/** `./x.md#h` → `../x/#h` (a term page lives at `/<lang>/<id>/`). */
export function rewriteTermLinks(body: string, from: "term" | "home") {
  const prefix = from === "term" ? "\\./" : "\\./terms/";
  const target = from === "term" ? "../" : "";
  return body.replace(
    new RegExp(`\\]\\(${prefix}([a-z0-9-]+)\\.md(#[^)]*)?\\)`, "g"),
    (_, id: string, hash = "") => `](${target}${id}/${hash})`
  );
}

/** `## avoid` → caution aside; `## usage` → heading + dialogue block. */
export function transformMarkers(body: string, labels: Ui): string {
  const usageAt = body.search(/^## usage\s*$/m);
  let main = usageAt === -1 ? body : body.slice(0, usageAt);
  const usage =
    usageAt === -1 ? "" : body.slice(usageAt).replace(/^## usage\s*$/m, "");

  main = main.replace(
    /^## avoid\s*$([\s\S]*)$/m,
    (_, avoid: string) => `:::caution[${labels.avoid}]\n${avoid.trim()}\n:::\n`
  );

  if (!usage.trim()) return main.trim() + "\n";
  return (
    `${main.trim()}\n\n## ${labels.usage}\n\n` +
    `<div class="dialogue">\n\n${usage.trim()}\n\n</div>\n`
  );
}

function termMeta(content: Content, term: Term, labels: Ui): string {
  const parts: string[] = [];
  if (term.lang !== SOURCE_LANGUAGE) {
    const en = content.languages.get(SOURCE_LANGUAGE)?.terms.get(term.id);
    if (en)
      parts.push(
        `<span lang="en">${SOURCE_LANGUAGE.toUpperCase()}: ${escapeHtml(title(en))}</span>`
      );
  }
  const aliases = term.data?.aliases;
  if (Array.isArray(aliases) && aliases.length)
    parts.push(
      `${labels.also}: ${aliases.map((a) => escapeHtml(String(a))).join(", ")}`
    );
  // Always present on term pages: the theme styles the paragraph after it as the lead.
  return `<p class="term-meta">${parts.join(" · ")}</p>\n\n`;
}

// ---------- pages ----------

type Page = { path: string; data: Record<string, unknown>; body: string };

/**
 * For an EN term: GitHub "new file" links that open a translation pre-filled
 * with the EN text, for each language that lacks one. Shown on fallback pages.
 */
function translateUrls(content: Content, term: Term, repo: string) {
  if (term.lang !== SOURCE_LANGUAGE) return undefined;
  const urls: Record<string, string> = {};
  for (const l of content.languages.values())
    if (l.code !== SOURCE_LANGUAGE && !l.terms.has(term.id))
      urls[l.code] =
        `${repo}/new/main/content/${l.code}/terms` +
        `?filename=${term.id}.md&value=${encodeURIComponent(term.source)}`;
  return Object.keys(urls).length ? urls : undefined;
}

function termPage(content: Content, term: Term, repo: string): Page {
  const labels = ui(content, term.lang);
  const body = transformMarkers(rewriteTermLinks(term.body, "term"), labels);
  const translate = translateUrls(content, term, repo);
  return {
    path: `${term.lang}/${term.id}.md`,
    data: {
      title: title(term),
      description: term.data?.description,
      tableOfContents: false,
      editUrl: `${repo}/edit/main/content/${term.lang}/terms/${term.id}.md`,
      term: { id: term.id, ...(translate ? { translate } : {}) },
    },
    body: termMeta(content, term, labels) + body,
  };
}

function homePage(content: Content, language: Language): Page | undefined {
  const intro = language.intro;
  if (!intro) return undefined;
  const lang = language.code;
  const labels = ui(content, lang);
  const first = content.structure.sections[0]?.terms[0];

  const cards = content.structure.sections.map((section, i) => {
    const links = section.terms
      .map((id) => `[${title(termIn(content, lang, id))}](${id}/)`)
      .join(" · ");
    const heading = `${i + 1}. ${sectionTitle(content, lang, section.id)}`;
    return `<Card title=${JSON.stringify(heading)}>\n\n${links}\n\n</Card>`;
  });

  return {
    path: `${lang}/index.mdx`,
    data: {
      title: intro.data?.title,
      description: intro.data?.tagline,
      template: "splash",
      editUrl: false,
      hero: {
        title: intro.data?.title,
        tagline: intro.data?.tagline,
        actions: first
          ? [
              {
                text: labels.start.replace(
                  "{term}",
                  title(termIn(content, lang, first))
                ),
                link: `${first}/`,
                icon: "right-arrow",
              },
            ]
          : [],
      },
    },
    body: [
      "import { Card, CardGrid } from '@astrojs/starlight/components';",
      "",
      rewriteTermLinks(intro.body, "home").trim(),
      "",
      `## ${labels.contents}`,
      "",
      "<CardGrid>",
      ...cards,
      "</CardGrid>",
      "",
    ].join("\n"),
  };
}

function equivalentsPage(
  content: Content,
  language: Language,
  repo: string
): Page | undefined {
  const lang = language.code;
  const labels = ui(content, lang);

  if (lang === SOURCE_LANGUAGE) {
    const others = [...content.languages.values()].filter((l) => l.equivalents);
    return {
      path: `${lang}/equivalents.md`,
      data: {
        title: labels.equivalents,
        tableOfContents: false,
        editUrl: false,
      },
      body:
        `${labels.equivalentsIntro}\n\n` +
        others
          .map(
            (l) =>
              `- [${languageName(content, l.code)}](../../${l.code}/equivalents/)`
          )
          .join("\n") +
        "\n",
    };
  }

  const eq = language.equivalents;
  if (!eq) return undefined;
  const [colEn, colLang, colAvoid] = labels.equivalentsColumns ?? [
    "English",
    languageName(content, lang),
    labels.avoid,
  ];
  const cell = (s: string) => s.replace(/\|/g, "\\|");
  const rows = [...eq.entries]
    .map(([key, { value, avoid }]) => {
      const en = content.languages.get(SOURCE_LANGUAGE)?.terms.get(key);
      const enCell = en ? title(en) : key;
      const own = String(value ?? "");
      const ownCell =
        language.terms.has(key) || en
          ? `[${cell(own)}](../${key}/)`
          : cell(own);
      const avoidCell = Array.isArray(avoid)
        ? avoid.map(String).map(cell).join(", ")
        : "";
      return {
        sort: enCell.toLowerCase(),
        row: `| ${cell(enCell)} | ${ownCell} | ${avoidCell} |`,
      };
    })
    .sort((a, b) => a.sort.localeCompare(b.sort));

  return {
    path: `${lang}/equivalents.md`,
    data: {
      title: labels.equivalents,
      tableOfContents: false,
      editUrl: `${repo}/edit/main/content/${lang}/equivalents.yaml`,
    },
    body: [
      labels.equivalentsIntro,
      "",
      `| ${colEn} | ${colLang} | ${colAvoid} |`,
      "|---|---|---|",
      ...rows.map((r) => r.row),
      "",
    ].join("\n"),
  };
}

// ---------- entry point ----------

export function generate({
  contentDir,
  outDir,
  uiDir,
  repo,
}: {
  contentDir: string;
  /** Starlight docs collection, e.g. `src/content/docs`. */
  outDir: string;
  /** Where `ui.json` (labels for component overrides) goes. */
  uiDir: string;
  repo: string;
}): Content {
  const content = loadContent(contentDir);
  const pages: Page[] = [];
  for (const language of content.languages.values()) {
    for (const term of language.terms.values())
      pages.push(termPage(content, term, repo));
    const home = homePage(content, language);
    if (home) pages.push(home);
    const eq = equivalentsPage(content, language, repo);
    if (eq) pages.push(eq);
  }

  rmSync(outDir, { recursive: true, force: true });
  for (const page of pages) {
    const file = join(outDir, page.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      `---\n${stringify(page.data, { lineWidth: 0 })}---\n\n${page.body}`
    );
  }

  // UI labels for the overridden Starlight components.
  mkdirSync(uiDir, { recursive: true });
  writeFileSync(
    join(uiDir, "ui.json"),
    JSON.stringify(
      Object.fromEntries(
        [...content.languages.keys()].map((l) => [l, ui(content, l)])
      ),
      null,
      2
    )
  );
  return content;
}
