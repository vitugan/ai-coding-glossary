import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  loadContent,
  parseTerm,
  type Content,
  type Language,
} from "./content.ts";
import { avoidedFormRegex, findMixedScriptWords, lint } from "./lint.ts";

const term = (
  lang: string,
  id: string,
  { title = id, body = 'Text.\n\n## usage\n\n"Example."', front = "" } = {}
) =>
  parseTerm(
    id,
    lang,
    `content/${lang}/terms/${id}.md`,
    `---\ntitle: ${title}\ndescription: Desc.\n${front}---\n\n${body}\n`
  );

const intro = (lang: string, body = "Intro.") =>
  parseTerm(
    "intro",
    lang,
    `content/${lang}/intro.md`,
    `---\ntitle: T\ntagline: Tag.\n---\n\n${body}\n`
  );

function language(
  code: string,
  terms: ReturnType<typeof term>[],
  equivalents?: string
): Language {
  const lang: Language = {
    code,
    file: `content/${code}/language.yaml`,
    data: { code, name: code, sections: { main: "Main" } },
    terms: new Map(terms.map((t) => [t.id, t])),
    intro: intro(code),
  };
  if (equivalents !== undefined) {
    const data = parse(equivalents) ?? {};
    lang.equivalents = {
      file: `content/${code}/equivalents.yaml`,
      source: equivalents,
      entries: new Map(
        Object.entries(data).map(([k, v]: [string, any]) => [
          k,
          { value: v[code], avoid: v.avoid ?? [] },
        ])
      ),
    };
  }
  return lang;
}

function content(
  en: ReturnType<typeof term>[],
  uk: ReturnType<typeof term>[] = [],
  {
    sectionTerms = en.map((t) => t.id),
    equivalents,
  }: { sectionTerms?: string[]; equivalents?: string } = {}
): Content {
  return {
    structure: {
      file: "content/structure.yaml",
      sections: [{ id: "main", terms: sectionTerms }],
    },
    languages: new Map([
      ["en", language("en", en)],
      ["uk", language("uk", uk, equivalents)],
    ]),
  };
}

const messages = (c: Content) => lint(c).map((i) => `${i.file}: ${i.message}`);

describe("lint", () => {
  it("accepts the real content", () => {
    expect(messages(loadContent())).toEqual([]);
  });

  it("accepts a minimal valid dictionary", () => {
    expect(
      messages(
        content(
          [term("en", "model")],
          [term("uk", "model", { title: "Модель" })]
        )
      )
    ).toEqual([]);
  });

  describe("structure", () => {
    it("requires every EN term to be in a section", () => {
      expect(
        messages(
          content([term("en", "a"), term("en", "b")], [], {
            sectionTerms: ["a"],
          })
        )
      ).toEqual(["content/en/terms/b.md: термін не входить у жоден розділ"]);
    });

    it("rejects section entries without an EN file", () => {
      expect(
        messages(
          content([term("en", "a")], [], { sectionTerms: ["a", "ghost"] })
        )[0]
      ).toMatch(/`ghost`.*файлу `content\/en\/terms\/ghost.md` немає/);
    });

    it("rejects a translation without an EN version", () => {
      expect(
        messages(content([term("en", "a")], [term("uk", "only-uk")]))
      ).toContain("content/uk/terms/only-uk.md: Переклад без EN-версії");
    });
  });

  describe("frontmatter", () => {
    it("reports invalid YAML (unquoted colon)", () => {
      const t = parseTerm(
        "a",
        "en",
        "a.md",
        "---\ntitle: A\ndescription: one: two\n---\n\n## usage\n"
      );
      expect(messages(content([t]))[0]).toMatch(/невалідний YAML/);
    });

    it("rejects unknown fields", () => {
      expect(
        messages(content([term("en", "a", { front: "status: draft\n" })]))
      ).toEqual(["content/en/terms/a.md: невідоме поле `status`"]);
    });
  });

  describe("markers", () => {
    it("requires ## usage", () => {
      expect(messages(content([term("en", "a", { body: "Text." })]))).toEqual([
        "content/en/terms/a.md: немає маркера `## usage`",
      ]);
    });

    it("rejects other headings, including wrong-case markers", () => {
      const issues = lint(
        content([term("en", "a", { body: "## Usage\n\nx\n\n## usage\n\ny" })])
      );
      expect(issues[0]!.message).toMatch(/«## Usage» не дозволено/);
      expect(issues[0]!.hint).toMatch(/рівно `## usage`/);
      expect(issues[0]!.line).toBe(6);
    });

    it("requires avoid before usage", () => {
      expect(
        messages(
          content([term("en", "a", { body: "## usage\n\nx\n\n## avoid\n\ny" })])
        )
      ).toEqual([
        "content/en/terms/a.md: `## avoid` має стояти перед `## usage`",
      ]);
    });
  });

  describe("links", () => {
    it("rejects links to missing terms and old-style links", () => {
      const body =
        "[a](./ghost.md) [b](./Tool%20call.md) [c](https://x.com) [d](./b.md#x)\n\n## usage";
      expect(
        messages(content([term("en", "a", { body }), term("en", "b")]))
      ).toEqual([
        "content/en/terms/a.md: посилання на неіснуючий термін `./ghost.md`",
        "content/en/terms/a.md: посилання `./Tool%20call.md` у неправильному форматі",
      ]);
    });

    it("resolves links within the same language", () => {
      const body = "[модель](./model.md)\n\n## usage";
      expect(
        messages(
          content(
            [term("en", "a"), term("en", "model")],
            [term("uk", "a", { body })]
          )
        )
      ).toEqual([
        "content/uk/terms/a.md: посилання на неіснуючий термін `./model.md`",
      ]);
    });
  });

  describe("mixed scripts", () => {
    it("finds Latin homoglyphs inside Cyrillic words", () => {
      expect(findMixedScriptWords("хаpнес і залишinline")).toEqual([
        "хаpнес",
        "залишinline",
      ]);
    });

    it("treats hyphens as word boundaries and ignores pure words", () => {
      expect(
        findMixedScriptWords("API-ключ, MCP-сервер, Claude і модель")
      ).toEqual([]);
    });

    it("ignores inline code", () => {
      const body = "Слово `хаpнес` у коді.\n\n## usage";
      expect(
        messages(content([term("en", "a")], [term("uk", "a", { body })]))
      ).toEqual([]);
    });
  });

  describe("equivalents", () => {
    const eq =
      "harness:\n  uk: Оболонка\n  avoid: [харнес, агентний режим]\nprompt:\n  uk: промпт\n  avoid: [запит]\n";

    it("catches avoided forms in any inflection", () => {
      for (const word of [
        "харнес",
        "Харнесом",
        "харнесс",
        "харнесі",
        "агентному режимі",
      ])
        expect(word).toMatch(
          avoidedFormRegex(word.startsWith("аг") ? "агентний режим" : "харнес")
        );
    });

    it("does not match longer unrelated words", () => {
      expect("запитання").not.toMatch(avoidedFormRegex("запит"));
      expect("перехарнес").not.toMatch(avoidedFormRegex("харнес"));
    });

    it("reports avoided forms in body and description", () => {
      const body = 'Це робить харнесом.\n\n## usage\n\n"Запитами."';
      const issues = lint(
        content(
          [term("en", "harness")],
          [term("uk", "harness", { title: "Оболонка", body })],
          { equivalents: eq }
        )
      );
      expect(issues.map((i) => i.message)).toEqual([
        "«харнесом» — Заборонена форма для `harness`",
        "«Запитами» — Заборонена форма для `prompt`",
      ]);
      expect(issues[0]!.line).toBe(6);
    });

    it("requires title to match the equivalent", () => {
      expect(
        messages(
          content(
            [term("en", "harness")],
            [term("uk", "harness", { title: "Обв'язка" })],
            { equivalents: eq }
          )
        )
      ).toEqual([
        "content/uk/terms/harness.md: `title` «Обв'язка» не збігається з Відповідником «Оболонка»",
      ]);
    });
  });

  describe("intro", () => {
    it("is required for EN only", () => {
      const c = content([term("en", "a")], [term("uk", "a")]);
      c.languages.get("uk")!.intro = undefined;
      expect(messages(c)).toEqual([]);
      c.languages.get("en")!.intro = undefined;
      expect(messages(c)).toEqual([
        "content/en/intro.md: немає вступу для головної сторінки",
      ]);
    });

    it("requires title and tagline", () => {
      const c = content([term("en", "a")]);
      c.languages.get("en")!.intro = parseTerm(
        "intro",
        "en",
        "content/en/intro.md",
        "---\ntitle: T\n---\n\nText.\n"
      );
      expect(messages(c)).toEqual([
        "content/en/intro.md: немає поля `tagline`",
      ]);
    });

    it("links to terms via ./terms/ and is checked for avoided forms", () => {
      const c = content(
        [term("en", "harness")],
        [term("uk", "harness", { title: "Оболонка" })],
        {
          equivalents: "harness:\n  uk: Оболонка\n  avoid: [харнес]\n",
        }
      );
      c.languages.get("uk")!.intro = intro(
        "uk",
        "[оболонка](./terms/harness.md), [x](./harness.md), харнес"
      );
      expect(messages(c)).toEqual([
        "content/uk/intro.md: посилання `./harness.md` у неправильному форматі",
        "content/uk/intro.md: «харнес» — Заборонена форма для `harness`",
      ]);
    });
  });
});
