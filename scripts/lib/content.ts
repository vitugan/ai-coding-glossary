/**
 * Loads the dictionary from `content/` into memory. Shared by the content
 * linter, the coverage report and (later) the site.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const SOURCE_LANGUAGE = "en";

export type Term = {
  id: string;
  lang: string;
  /** Path relative to the repo root, for messages. */
  file: string;
  /** Raw file contents. */
  source: string;
  /** Parsed frontmatter, or `undefined` if missing / invalid. */
  data: Record<string, unknown> | undefined;
  frontmatterError?: string;
  body: string;
  /** 1-based line in `source` where `body` starts. */
  bodyLine: number;
};

export type Language = {
  code: string;
  file: string;
  data: Record<string, unknown> | undefined;
  error?: string;
  terms: Map<string, Term>;
  equivalents?: Equivalents;
};

export type Equivalents = {
  file: string;
  source: string;
  entries: Map<string, { value: unknown; avoid: unknown }>;
  error?: string;
};

export type Structure = {
  file: string;
  sections: { id: string; terms: string[] }[];
  error?: string;
};

export type Content = {
  structure: Structure;
  languages: Map<string, Language>;
};

export function splitFrontmatter(source: string) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { yaml: undefined, body: source, bodyLine: 1 };
  return {
    yaml: m[1]!,
    body: source.slice(m[0].length),
    bodyLine: m[0].split("\n").length,
  };
}

export function parseTerm(
  id: string,
  lang: string,
  file: string,
  source: string
): Term {
  const { yaml, body, bodyLine } = splitFrontmatter(source);
  const term: Term = {
    id,
    lang,
    file,
    source,
    data: undefined,
    body,
    bodyLine,
  };
  if (yaml === undefined) {
    term.frontmatterError = "немає frontmatter";
    return term;
  }
  try {
    const data = parse(yaml);
    if (data && typeof data === "object" && !Array.isArray(data))
      term.data = data as Record<string, unknown>;
    else term.frontmatterError = "frontmatter має бути набором полів";
  } catch (e) {
    term.frontmatterError = `невалідний YAML у frontmatter: ${(e as Error).message.split("\n")[0]}`;
  }
  return term;
}

function readYaml(path: string): { data?: unknown; error?: string } {
  try {
    return { data: parse(readFileSync(path, "utf8")) };
  } catch (e) {
    return { error: (e as Error).message.split("\n")[0] };
  }
}

export function loadContent(root = "content"): Content {
  const structureFile = join(root, "structure.yaml");
  const structure: Structure = { file: structureFile, sections: [] };
  const s = readYaml(structureFile);
  if (s.error) structure.error = s.error;
  else {
    const sections = (s.data as { sections?: unknown })?.sections;
    if (!Array.isArray(sections)) structure.error = "немає списку `sections`";
    else
      structure.sections = sections.map((sec) => ({
        id: String(sec?.id ?? ""),
        terms: Array.isArray(sec?.terms) ? sec.terms.map(String) : [],
      }));
  }

  const languages = new Map<string, Language>();
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const code = entry.name;
    const dir = join(root, code);
    const langFile = join(dir, "language.yaml");
    const l = existsSync(langFile)
      ? readYaml(langFile)
      : { error: "немає language.yaml" };
    const language: Language = {
      code,
      file: langFile,
      data: l.data as Record<string, unknown> | undefined,
      error: l.error,
      terms: new Map(),
    };

    const termsDir = join(dir, "terms");
    if (existsSync(termsDir))
      for (const name of readdirSync(termsDir)) {
        if (!name.endsWith(".md")) continue;
        const id = name.slice(0, -3);
        const file = join(termsDir, name).replace(/\\/g, "/");
        language.terms.set(
          id,
          parseTerm(id, code, file, readFileSync(join(termsDir, name), "utf8"))
        );
      }

    const eqFile = join(dir, "equivalents.yaml");
    if (existsSync(eqFile)) {
      const source = readFileSync(eqFile, "utf8");
      const eq: Equivalents = { file: eqFile, source, entries: new Map() };
      try {
        const data = parse(source) ?? {};
        for (const [key, val] of Object.entries(data as object))
          eq.entries.set(key, {
            value: (val as Record<string, unknown>)?.[code],
            avoid: (val as Record<string, unknown>)?.avoid ?? [],
          });
      } catch (e) {
        eq.error = (e as Error).message.split("\n")[0];
      }
      language.equivalents = eq;
    }

    languages.set(code, language);
  }

  return { structure, languages };
}
