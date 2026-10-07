/**
 * Content rules. Each issue blocks a PR. Messages are for contributors who
 * don't know the project: say what is wrong and how to fix it.
 */
import { SOURCE_LANGUAGE, type Content, type Term } from "./content.ts";

export type Issue = {
  file: string;
  line?: number;
  message: string;
  hint?: string;
};

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TERM_FIELDS = {
  required: ["title", "description"],
  optional: ["aliases"],
};
const INTRO_FIELDS = { required: ["title", "tagline"], optional: [] };
const MARKERS = ["avoid", "usage"] as const;

export function lint(content: Content): Issue[] {
  const issues: Issue[] = [];
  const source = content.languages.get(SOURCE_LANGUAGE);

  // --- structure ---
  const { structure } = content;
  if (structure.error)
    issues.push({
      file: structure.file,
      message: `не вдалося прочитати: ${structure.error}`,
    });
  const placed = new Map<string, string>();
  for (const section of structure.sections) {
    if (!ID_RE.test(section.id))
      issues.push({
        file: structure.file,
        message: `некоректний ID розділу «${section.id}»`,
        hint: "ID — англійський kebab-case, наприклад `failure-modes`",
      });
    for (const id of section.terms) {
      if (placed.has(id))
        issues.push({
          file: structure.file,
          message: `термін \`${id}\` згадано двічі (розділи \`${placed.get(id)}\` і \`${section.id}\`)`,
          hint: "кожен термін має бути рівно в одному розділі",
        });
      placed.set(id, section.id);
      if (source && !source.terms.has(id))
        issues.push({
          file: structure.file,
          message: `термін \`${id}\` є в розділі \`${section.id}\`, але файлу \`content/en/terms/${id}.md\` немає`,
          hint: "створіть EN-файл або приберіть ID зі structure.yaml",
        });
    }
  }

  if (!source) {
    issues.push({
      file: `content/${SOURCE_LANGUAGE}`,
      message: "немає Основної мови (EN)",
    });
    return issues;
  }
  for (const id of source.terms.keys())
    if (!placed.has(id))
      issues.push({
        file: `content/en/terms/${id}.md`,
        message: "термін не входить у жоден розділ",
        hint: "додайте його ID до потрібного розділу в content/structure.yaml",
      });

  // --- languages ---
  for (const language of content.languages.values()) {
    const { code } = language;

    if (language.error)
      issues.push({
        file: language.file,
        message: `не вдалося прочитати: ${language.error}`,
      });
    else {
      const data = language.data ?? {};
      if (data.code !== code)
        issues.push({
          file: language.file,
          message: `\`code\` має дорівнювати назві теки («${code}»)`,
        });
      if (typeof data.name !== "string" || !data.name.trim())
        issues.push({
          file: language.file,
          message: "немає `name` — назви мови її ж мовою",
        });
      const titles = (data.sections ?? {}) as Record<string, unknown>;
      for (const section of structure.sections)
        if (typeof titles[section.id] !== "string")
          issues.push({
            file: language.file,
            message: `немає назви розділу \`${section.id}\``,
            hint: `додайте \`${section.id}: <назва>\` у \`sections\``,
          });
    }

    for (const term of language.terms.values()) {
      if (!ID_RE.test(term.id))
        issues.push({
          file: term.file,
          message: `некоректне ім'я файлу «${term.id}.md»`,
          hint: "ім'я файлу — англійський kebab-case: `context-window.md`",
        });
      if (code !== SOURCE_LANGUAGE && !source.terms.has(term.id))
        issues.push({
          file: term.file,
          message: "Переклад без EN-версії",
          hint: `спершу додайте content/en/terms/${term.id}.md — EN є Основною мовою`,
        });
      issues.push(...lintFrontmatter(term, TERM_FIELDS));
      issues.push(...lintMarkers(term));
      issues.push(...lintLinks(term, language.terms, "./"));
      issues.push(...lintMixedScript(term));
    }

    if (language.intro) {
      issues.push(...lintFrontmatter(language.intro, INTRO_FIELDS));
      issues.push(...lintLinks(language.intro, language.terms, "./terms/"));
      issues.push(...lintMixedScript(language.intro));
    } else if (code === SOURCE_LANGUAGE)
      issues.push({
        file: `content/${code}/intro.md`,
        message: "немає вступу для головної сторінки",
        hint: "створіть intro.md з полями `title` і `tagline` та текстом вступу",
      });

    if (language.equivalents) issues.push(...lintEquivalents(language));
  }

  return issues;
}

// ---------- frontmatter ----------

function lintFrontmatter(
  term: Term,
  fields: { required: string[]; optional: string[] }
): Issue[] {
  if (term.frontmatterError)
    return [
      {
        file: term.file,
        line: 1,
        message: term.frontmatterError,
        hint: 'значення з двокрапкою беріть у лапки: `description: "…: …"`',
      },
    ];
  const issues: Issue[] = [];
  const data = term.data!;
  const allowed = new Set([...fields.required, ...fields.optional]);
  for (const key of fields.required)
    if (typeof data[key] !== "string" || !(data[key] as string).trim())
      issues.push({
        file: term.file,
        line: 1,
        message: `немає поля \`${key}\``,
      });
  for (const key of Object.keys(data))
    if (!allowed.has(key))
      issues.push({
        file: term.file,
        line: 1,
        message: `невідоме поле \`${key}\``,
        hint: `дозволені поля: ${[...allowed].join(", ")}`,
      });
  if (
    data.aliases !== undefined &&
    !(
      Array.isArray(data.aliases) &&
      data.aliases.every((a) => typeof a === "string")
    )
  )
    issues.push({
      file: term.file,
      line: 1,
      message: "`aliases` має бути списком рядків",
    });
  return issues;
}

// ---------- body helpers ----------

/** Body lines with their 1-based file line numbers, code blocks blanked. */
function bodyLines(term: Term) {
  let inFence = false;
  return term.body.split("\n").map((raw, i) => {
    const line = term.bodyLine + i;
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      return { line, text: "", raw };
    }
    return { line, text: inFence ? "" : raw.replace(/`[^`]*`/g, ""), raw };
  });
}

// ---------- markers ----------

function lintMarkers(term: Term): Issue[] {
  const issues: Issue[] = [];
  const found: { marker: string; line: number }[] = [];
  for (const { line, text } of bodyLines(term)) {
    const h = text.match(/^(#{1,6})\s*(.*?)\s*$/);
    if (!h) continue;
    const name = h[2]!;
    if (h[1] === "##" && (MARKERS as readonly string[]).includes(name)) {
      found.push({ marker: name, line });
      continue;
    }
    const lower = name.toLowerCase();
    issues.push({
      file: term.file,
      line,
      message: `заголовок «${text.trim()}» не дозволено`,
      hint: (MARKERS as readonly string[]).includes(lower)
        ? `пишіть рівно \`## ${lower}\` — малими літерами, англійською`
        : "у терміні дозволені лише маркери `## avoid` і `## usage`; підписи мовою сайту підставляються автоматично",
    });
  }

  const usage = found.filter((f) => f.marker === "usage");
  const avoid = found.filter((f) => f.marker === "avoid");
  if (usage.length === 0)
    issues.push({
      file: term.file,
      message: "немає маркера `## usage`",
      hint: "додайте в кінці `## usage` і приклад вживання терміна",
    });
  for (const dup of [...usage.slice(1), ...avoid.slice(1)])
    issues.push({
      file: term.file,
      line: dup.line,
      message: `маркер \`## ${dup.marker}\` повторюється`,
    });
  if (avoid[0] && usage[0] && avoid[0].line > usage[0].line)
    issues.push({
      file: term.file,
      line: avoid[0].line,
      message: "`## avoid` має стояти перед `## usage`",
    });
  return issues;
}

// ---------- links ----------

/** `prefix` is how the file reaches term files: `./` from a term, `./terms/` from intro.md. */
function lintLinks(
  term: Term,
  siblings: Map<string, Term>,
  prefix: string
): Issue[] {
  const escaped = prefix.replace(/[./]/g, "\\$&");
  const relRe = new RegExp(`^${escaped}([a-z0-9-]+)\\.md(#.*)?$`);
  const issues: Issue[] = [];
  for (const { line, text } of bodyLines(term))
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1]!;
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const rel = target.match(relRe);
      if (!rel) {
        issues.push({
          file: term.file,
          line,
          message: `посилання \`${target}\` у неправильному форматі`,
          hint: `на термін посилайтеся як \`${prefix}term-id.md\``,
        });
        continue;
      }
      if (!siblings.has(rel[1]!))
        issues.push({
          file: term.file,
          line,
          message: `посилання на неіснуючий термін \`${target}\``,
          hint: `немає файлу content/${term.lang}/terms/${rel[1]}.md`,
        });
    }
  return issues;
}

// ---------- mixed scripts ----------

/** Words that mix Latin and Cyrillic letters. Hyphens split words. */
export function findMixedScriptWords(text: string): string[] {
  const words = text.match(/[\p{L}\p{M}'’ʼ]+/gu) ?? [];
  return words.filter(
    (w) => /\p{Script=Cyrillic}/u.test(w) && /\p{Script=Latin}/u.test(w)
  );
}

function lintMixedScript(term: Term): Issue[] {
  const issues: Issue[] = [];
  const check = (text: string, line: number) => {
    for (const word of findMixedScriptWords(text))
      issues.push({
        file: term.file,
        line,
        message: `слово «${word}» змішує латиницю й кирилицю`,
        hint: "найчастіше це латинська літера-двійник (a, c, e, i, o, p, x, y) у кириличному слові",
      });
  };
  const fm = term.source
    .slice(0, term.source.length - term.body.length)
    .split("\n");
  fm.forEach((text, i) => check(text, i + 1));
  for (const { line, text } of bodyLines(term))
    check(text.replace(/\]\([^)]*\)/g, "]"), line);
  return issues;
}

// ---------- equivalents ----------

/** Up to two trailing vowels / й / ь: «агентний» → «агентн», «оболонка» → «оболонк». */
const STEM_ENDINGS = /[аяоеєиіїуюйь]{1,2}$/u;

/**
 * Regex that matches an avoided form in any inflection: each word of the form
 * is reduced to a stem (trailing vowel / й / ь dropped) and may take an ending
 * of up to 3 letters — enough for Ukrainian case endings (-ами, -ові, -ою),
 * short enough that «запит» does not match «запитання».
 */
export function avoidedFormRegex(form: string): RegExp {
  const words = form.trim().toLowerCase().split(/\s+/);
  const parts = words.map((w) => {
    const stem = w.length > 3 ? w.replace(STEM_ENDINGS, "") : w;
    return stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\p{L}{0,3}";
  });
  return new RegExp(
    `(?<![\\p{L}'’ʼ])${parts.join("\\s+")}(?![\\p{L}'’ʼ])`,
    "giu"
  );
}

function lintEquivalents(language: import("./content.ts").Language): Issue[] {
  const eq = language.equivalents!;
  const issues: Issue[] = [];
  if (eq.error)
    return [{ file: eq.file, message: `не вдалося прочитати: ${eq.error}` }];

  const lineOf = (key: string) =>
    eq.source.split("\n").findIndex((l) => l.startsWith(`${key}:`)) + 1 ||
    undefined;

  const rules: { key: string; form: string; re: RegExp; preferred: string }[] =
    [];
  for (const [key, { value, avoid }] of eq.entries) {
    if (typeof value !== "string" || !value.trim()) {
      issues.push({
        file: eq.file,
        line: lineOf(key),
        message: `\`${key}\`: немає поля \`${language.code}\` з Відповідником`,
      });
      continue;
    }
    if (!Array.isArray(avoid) || !avoid.every((a) => typeof a === "string")) {
      issues.push({
        file: eq.file,
        line: lineOf(key),
        message: `\`${key}\`: \`avoid\` має бути списком рядків`,
      });
      continue;
    }
    for (const form of avoid)
      rules.push({ key, form, re: avoidedFormRegex(form), preferred: value });

    const term = language.terms.get(key);
    const title = term?.data?.title;
    if (
      typeof title === "string" &&
      title.trim().toLowerCase() !== value.trim().toLowerCase()
    )
      issues.push({
        file: term!.file,
        line: 1,
        message: `\`title\` «${title}» не збігається з Відповідником «${value}»`,
        hint: `змініть title або Відповідник у ${eq.file.replace(/\\/g, "/")}`,
      });
  }

  const texts = [...language.terms.values()];
  if (language.intro) texts.push(language.intro);
  for (const term of texts) {
    const lines = [
      { line: 1, text: String(term.data?.description ?? "") },
      ...bodyLines(term),
    ];
    for (const { line, text } of lines) {
      const plain = text.replace(/\]\([^)]*\)/g, "]");
      for (const rule of rules)
        for (const m of plain.matchAll(rule.re))
          issues.push({
            file: term.file,
            line,
            message: `«${m[0]}» — Заборонена форма для \`${rule.key}\``,
            hint: `використовуйте Відповідник «${rule.preferred}» у потрібному відмінку`,
          });
    }
  }
  return issues;
}
