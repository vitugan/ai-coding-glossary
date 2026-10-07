/**
 * One-off import of the dictionary from the old local clone of
 * mattpocock/dictionary-of-ai-coding into this repo's `content/` layout.
 *
 * Reads only (via `git show` at pinned commits), never writes to the old clone.
 * Delete this script after the initial import is committed.
 *
 * Usage: pnpm migrate [path-to-old-clone]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const SRC = process.argv[2] ?? "../mattpocock/dictionary-of-ai-coding";
/** Upstream commit the EN text is taken from (== `dictionary-en/`). */
const EN_COMMIT = "ed1ebed";
/** Last commit of the Ukrainian translation on `feat/translation`. */
const UK_COMMIT = "3f00eb4";

const OUT = "content";

const SECTION_IDS = [
  "model",
  "sessions",
  "tools",
  "failure-modes",
  "handoffs",
  "memory",
  "patterns-of-work",
];

/** Ukrainian labels used in the translation, normalised to markers. */
const UK_AVOID_LABELS = ["Уникайте", "Уникай", "Не варто казати"];
const UK_USAGE_LABELS = [
  "Приклад використання",
  "Приклади використання",
  "Приклади вживання",
  "Приклад",
  "Приклади",
  "Використання",
  "Практичне використання",
  "Практичне застосування",
];

type Lang = "en" | "uk";

/**
 * Hand-reviewed content fixes for the UK translation, keyed by term ID.
 * `raw` runs on the source body before any conversion; `final` runs last,
 * after links use new IDs and homoglyphs are fixed.
 */
const UK_PATCHES: Record<
  string,
  { stage: "raw" | "final"; from: string | RegExp; to: string }[]
> = {
  // Two translations of the same avoid/usage block; keep the second, cleaner one.
  "context-pointer": [
    { stage: "raw", from: /_Уникайте:_ «довідка»[\s\S]*?(?=_Не варто казати:_)/, to: "" },
  ],
  mcp: [
    { stage: "raw", from: "**Приклади використання:**", to: "_Приклади використання:_" },
  ],
  context: [{ stage: "final", from: "помилково đoánює схему", to: "навмання вгадує схему" }],
  // «харнес» → Відповідник «оболонка»
  ai: [
    { stage: "final", from: "[харнесс](./harness.md)", to: "[оболонка](./harness.md)" },
    { stage: "final", from: "[харнессі](./harness.md)", to: "[оболонці](./harness.md)" },
  ],
  "context-window": [
    { stage: "final", from: "[харнес](./harness.md) подав назад", to: "[оболонка](./harness.md) подала назад" },
  ],
  model: [
    { stage: "final", from: "це харнесс (оболонка), який оркеструє", to: "це оболонка, яка оркеструє" },
    { stage: "final", from: "[харнесі](./harness.md) (оболонці)", to: "[оболонці](./harness.md)" },
    { stage: "final", from: "харнесс (оболонка) робить", to: "оболонка робить" },
  ],
  "next-token-prediction": [
    { stage: "final", from: "[харнесс](./harness.md) витягує", to: "[оболонка](./harness.md) витягує" },
  ],
  stateless: [
    { stage: "final", from: "[харнесом](./harness.md), який зберігає", to: "[оболонкою](./harness.md), яка зберігає" },
    { stage: "final", from: "який харнесс (оболонка) завантажує", to: "який оболонка завантажує" },
  ],
};

function applyPatches(text: string, id: string, stage: "raw" | "final") {
  for (const p of UK_PATCHES[id] ?? []) {
    if (p.stage !== stage) continue;
    const next = text.replace(p.from, p.to);
    if (next === text)
      report.errors.push(`\`uk/${id}.md\`: патч не застосувався: \`${String(p.from).slice(0, 50)}\``);
    else report.patches.push(`\`uk/${id}.md\`: «${String(p.from).slice(0, 50)}» → «${p.to.slice(0, 50)}»`);
    text = next;
  }
  return text;
}
type Marker = "avoid" | "usage";

const report = {
  idTable: [] as { name: string; id: string; uk: string }[],
  errors: [] as string[],
  markerIssues: [] as string[],
  homoglyphFixes: [] as string[],
  mixedScriptLeft: [] as string[],
  forbidden: [] as string[],
  patches: [] as string[],
  unlinked: [] as string[],
  notes: [] as string[],
};

// ---------- git helpers ----------

function git(...args: string[]): string {
  return execFileSync("git", ["-C", SRC, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function show(commit: string, path: string): string {
  return git("show", `${commit}:${path}`).replace(/\r\n/g, "\n");
}

function listDir(commit: string, dir: string): string[] {
  return git("ls-tree", "--name-only", `${commit}:${dir}`)
    .split("\n")
    .filter((f) => f.endsWith(".md"));
}

// ---------- ids ----------

export function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- curriculum ----------

type Section = { title: string; items: string[] };

function parseCurriculum(md: string): Section[] {
  const sections: Section[] = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^## [^—]+—\s*(.+)$/);
    if (h) {
      sections.push({ title: h[1]!.trim(), items: [] });
      continue;
    }
    const item = line.match(/^- (.+)$/);
    if (item && sections.length) sections.at(-1)!.items.push(item[1]!.trim());
  }
  return sections;
}

// ---------- frontmatter ----------

function splitFrontmatter(src: string, file: string) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    report.errors.push(`${file}: немає frontmatter`);
    return { data: {} as Record<string, unknown>, body: src };
  }
  try {
    return { data: (parse(m[1]!) ?? {}) as Record<string, unknown>, body: m[2]! };
  } catch {
    report.notes.push(`\`${file}\`: невалідний YAML у frontmatter — розібрано построково`);
    return { data: parseLoose(m[1]!), body: m[2]! };
  }
}

/** `key: rest of line` and `  - item` lists; for frontmatter with unquoted colons. */
function parseLoose(src: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let listKey: string | undefined;
  for (const line of src.split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(item[1]!.trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2]) {
      data[kv[1]!] = kv[2].trim();
      listKey = undefined;
    } else {
      data[kv[1]!] = [];
      listKey = kv[1]!;
    }
  }
  return data;
}

function joinFrontmatter(data: Record<string, unknown>, body: string): string {
  return `---\n${stringify(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}

// ---------- links ----------

function rewriteLinks(
  body: string,
  file: string,
  nameToId: Map<string, string>
): string {
  return body.replace(
    /\[([^\]]*)\]\(\.\/([^)#]+?)(?:\.md)?(#[^)]*)?\)/g,
    (whole, label: string, target: string, hash = "") => {
      const name = decodeURIComponent(target);
      // `./AGENTS.md` means the term "AGENTS.md" (file `AGENTS.md.md`)
      const id = nameToId.get(name) ?? nameToId.get(`${name}.md`);
      if (!id) {
        report.unlinked.push(`\`${file}\`: \`${whole}\` → «${label}» (такого терміна немає)`);
        return label;
      }
      return `[${label}](./${id}.md${hash})`;
    }
  );
}

// ---------- markers ----------

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labelRe(labels: string[]) {
  const alt = [...labels]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
  // `_Label:_ rest`, `_Label_: rest`
  return new RegExp(`^_(?:${alt})(?::_|_:)\\s*(.*)$`);
}

const RE = {
  en: { avoid: labelRe(["Avoid"]), usage: labelRe(["Usage"]) },
  uk: { avoid: labelRe(UK_AVOID_LABELS), usage: labelRe(UK_USAGE_LABELS) },
};

function convertMarkers(
  body: string,
  lang: Lang,
  file: string
): { body: string; markers: Marker[] } {
  const markers: Marker[] = [];
  const out: string[] = [];
  for (const line of body.split("\n")) {
    let converted = false;
    for (const marker of ["avoid", "usage"] as const) {
      const m = line.match(RE[lang][marker]);
      if (!m) continue;
      if (markers.includes(marker)) {
        report.markerIssues.push(
          `\`${lang}/${file}\`: повторний маркер \`${marker}\`, рядок лишено як є: «${line.slice(0, 60)}…»`
        );
        break;
      }
      markers.push(marker);
      out.push(`## ${marker}`, "");
      if (m[1]) out.push(m[1]);
      converted = true;
      break;
    }
    if (!converted) out.push(line);
  }
  return { body: out.join("\n"), markers };
}

/** Checks the layout `body → ## avoid (one paragraph) → ## usage → end`. */
function checkMarkerLayout(body: string, lang: Lang, file: string) {
  const avoidAt = body.indexOf("\n## avoid\n");
  const usageAt = body.indexOf("\n## usage\n");
  if (usageAt === -1) {
    report.markerIssues.push(`\`${lang}/${file}\`: немає \`## usage\``);
    return;
  }
  if (avoidAt !== -1) {
    if (avoidAt > usageAt) {
      report.markerIssues.push(
        `\`${lang}/${file}\`: \`## avoid\` стоїть після \`## usage\``
      );
      return;
    }
    const avoidBody = body.slice(avoidAt + 10, usageAt).trim();
    const paragraphs = avoidBody.split(/\n\s*\n/).length;
    if (paragraphs > 1)
      report.markerIssues.push(
        `\`${lang}/${file}\`: у блоці \`## avoid\` ${paragraphs} абзаци — перевірити, чи все це справді «уникай»`
      );
  }
}

// ---------- mixed scripts ----------

const LATIN_TO_CYR: Record<string, string> = {
  a: "а", c: "с", e: "е", i: "і", o: "о", p: "р", x: "х", y: "у",
  A: "А", B: "В", C: "С", E: "Е", H: "Н", I: "І", K: "К", M: "М",
  O: "О", P: "Р", T: "Т", X: "Х",
};

function fixMixedScript(body: string, lang: Lang, file: string): string {
  return body.replace(/[\p{L}'’ʼ]+/gu, (word) => {
    const hasCyr = /\p{Script=Cyrillic}/u.test(word);
    const hasLat = /\p{Script=Latin}/u.test(word);
    if (!hasCyr || !hasLat) return word;
    const latin = word.match(/\p{Script=Latin}/gu)!;
    const cyrCount = word.match(/\p{Script=Cyrillic}/gu)!.length;
    if (cyrCount > latin.length && latin.every((ch) => ch in LATIN_TO_CYR)) {
      const fixed = [...word].map((ch) => LATIN_TO_CYR[ch] ?? ch).join("");
      report.homoglyphFixes.push(`\`${lang}/${file}\`: «${word}» → «${fixed}»`);
      return fixed;
    }
    report.mixedScriptLeft.push(`\`${lang}/${file}\`: «${word}»`);
    return word;
  });
}

// ---------- main ----------

function main() {
  const enSections = parseCurriculum(show(EN_COMMIT, "internal/Curriculum.md"));
  const ukSections = parseCurriculum(show(UK_COMMIT, "internal/Curriculum.md"));

  if (enSections.length !== SECTION_IDS.length)
    throw new Error(`Очікувалось ${SECTION_IDS.length} розділів, є ${enSections.length}`);
  if (ukSections.length !== enSections.length)
    throw new Error("Кількість розділів у EN і UK Curriculum різна");

  // name → id, and id → UK title, from the curricula
  const nameToId = new Map<string, string>();
  const ukTitle = new Map<string, string>();
  const structure = { sections: [] as { id: string; terms: string[] }[] };

  enSections.forEach((section, i) => {
    const uk = ukSections[i]!;
    if (uk.items.length !== section.items.length)
      report.errors.push(`Розділ ${i + 1}: різна кількість термінів у EN і UK Curriculum`);
    const ids: string[] = [];
    section.items.forEach((name, j) => {
      const id = toId(name);
      if ([...nameToId.values()].includes(id))
        report.errors.push(`Колізія ID \`${id}\``);
      nameToId.set(name, id);
      ids.push(id);

      const ukItem = uk.items[j] ?? "";
      const m = ukItem.match(/^(.+?) \((.+)\)$/);
      const [title, en] = m ? [m[1]!, m[2]!] : [ukItem, ukItem];
      if (en !== name)
        report.errors.push(`UK Curriculum: «${ukItem}» не відповідає EN «${name}»`);
      ukTitle.set(id, title);
      report.idTable.push({ name, id, uk: title });
    });
    structure.sections.push({ id: SECTION_IDS[i]!, terms: ids });
  });

  for (const p of ["en", "uk", "structure.yaml"])
    rmSync(join(OUT, p), { recursive: true, force: true });
  for (const lang of ["en", "uk"] as const)
    mkdirSync(join(OUT, lang, "terms"), { recursive: true });

  const enFiles = listDir(EN_COMMIT, "dictionary");
  const ukFiles = new Set(listDir(UK_COMMIT, "dictionary"));

  for (const file of enFiles) {
    const name = file.replace(/\.md$/, "");
    const id = nameToId.get(name);
    if (!id) {
      report.errors.push(`\`${file}\` немає в Curriculum — пропущено`);
      continue;
    }

    const sources: [Lang, string, string][] = [["en", EN_COMMIT, name]];
    if (ukFiles.has(file)) sources.push(["uk", UK_COMMIT, ukTitle.get(id)!]);
    else report.errors.push(`\`${file}\`: немає українського перекладу`);

    const markersByLang: Partial<Record<Lang, Marker[]>> = {};
    for (const [lang, commit, title] of sources) {
      const { data, body } = splitFrontmatter(
        show(commit, `dictionary/${file}`),
        `${lang}/${file}`
      );
      const { description, aliases, ...rest } = data;
      if (Object.keys(rest).length)
        report.notes.push(
          `\`${lang}/${file}\`: невідомі поля frontmatter ${Object.keys(rest).join(", ")} — збережено`
        );

      let text = lang === "uk" ? applyPatches(body, id, "raw") : body;
      text = rewriteLinks(text, `${lang}/${file}`, nameToId);
      const converted = convertMarkers(text, lang, file);
      text = converted.body;
      markersByLang[lang] = converted.markers;
      checkMarkerLayout("\n" + text, lang, file);
      text = fixMixedScript(text, lang, file);
      if (lang === "uk") text = applyPatches(text, id, "final");

      if (lang === "uk" && /харнес/iu.test(text))
        report.forbidden.push(
          `\`uk/${id}.md\`: «харнес» → треба «оболонка» у правильному відмінку`
        );

      const front = {
        title,
        description:
          typeof description === "string"
            ? fixMixedScript(description, lang, file)
            : description,
        ...(aliases ? { aliases } : {}),
        ...rest,
      };
      writeFileSync(join(OUT, lang, "terms", `${id}.md`), joinFrontmatter(front, text));
    }

    const en = markersByLang.en?.join(",");
    const uk = markersByLang.uk?.join(",");
    if (uk !== undefined && en !== uk)
      report.markerIssues.push(
        `\`${id}\`: маркери EN [${en}] ≠ UK [${uk}]`
      );
  }

  // structure + languages
  writeFileSync(join(OUT, "structure.yaml"), stringify(structure, { lineWidth: 0 }));
  const languageFile = (code: Lang, name: string, sections: Section[]) =>
    writeFileSync(
      join(OUT, code, "language.yaml"),
      stringify(
        {
          code,
          name,
          sections: Object.fromEntries(
            sections.map((s, i) => [SECTION_IDS[i]!, s.title])
          ),
        },
        { lineWidth: 0 }
      )
    );
  languageFile("en", "English", enSections);
  languageFile("uk", "Українська", ukSections);

  // equivalents seeded from UK titles
  const equivalents: Record<string, { uk: string; avoid: string[] }> = {};
  for (const { id, uk } of report.idTable)
    equivalents[id] = { uk, avoid: id === "harness" ? ["харнес"] : [] };
  writeFileSync(
    join(OUT, "uk", "equivalents.yaml"),
    "# Відповідники EN → UK і Заборонені форми. Ключ — ID терміна Словника\n" +
      "# або EN-слово, що не є терміном (prompt, commit…).\n" +
      stringify(equivalents, { lineWidth: 0 })
  );

  writeReport();
}

function writeReport() {
  const section = (title: string, items: string[], empty = "—") =>
    `## ${title} (${items.length})\n\n${items.length ? items.map((i) => `- ${i}`).join("\n") : empty}\n`;

  const md = [
    "# Звіт міграції",
    "",
    `Джерело: \`${SRC}\`, EN @ \`${EN_COMMIT}\`, UK @ \`${UK_COMMIT}\`.`,
    "Тимчасовий файл: не комітити.",
    "",
    section("Помилки (блокують імпорт)", report.errors),
    section("Маркери avoid / usage — перевірити вручну", report.markerIssues),
    section("Заборонені форми — переписати вручну", report.forbidden),
    section("Латиниця в кирилиці — виправлено автоматично", report.homoglyphFixes),
    section("Змішані слова — не виправлено, перевірити", report.mixedScriptLeft),
    section("Ручні правки тексту (UK_PATCHES у скрипті)", report.patches),
    section("Посилання на неіснуючі терміни — замінено текстом", report.unlinked),
    section("Примітки", report.notes),
    `## Таблиця ID (${report.idTable.length})\n`,
    "| EN | ID | UK |",
    "|---|---|---|",
    ...report.idTable.map((r) => `| ${r.name} | \`${r.id}\` | ${r.uk} |`),
    "",
  ].join("\n");
  writeFileSync("migration-report.md", md);
  console.log(
    `Готово: ${report.idTable.length} термінів; помилок ${report.errors.length}, ` +
      `маркери ${report.markerIssues.length}, заборонені ${report.forbidden.length}, ` +
      `виправлено ${report.homoglyphFixes.length}, змішані ${report.mixedScriptLeft.length}`
  );
}

main();
