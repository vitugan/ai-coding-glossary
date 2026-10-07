import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { SOURCE_LANGUAGE } from "../scripts/lib/content.ts";
import { generate, sectionTitle, ui } from "./src/generate/generate.ts";
import { REPO } from "./src/site.ts";

const contentDir = fileURLToPath(new URL("../content", import.meta.url));
const outDir = fileURLToPath(new URL("./src/content/docs", import.meta.url));
const uiDir = fileURLToPath(new URL("./src/generated", import.meta.url));

const content = generate({ contentDir, outDir, uiDir, repo: REPO });
const languages = [...content.languages.values()];
const others = languages.filter((l) => l.code !== SOURCE_LANGUAGE);

/** `{ uk: "…" }` for every language except the source one. */
const translations = (text: (lang: string) => string) =>
  Object.fromEntries(others.map((l) => [l.code, text(l.code)]));

export default defineConfig({
  site: process.env.SITE_URL,
  // Subfolder on the VPS for now; becomes "/" once the site has its own domain.
  base: process.env.BASE_PATH ?? "/",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: Object.fromEntries(
        languages.map((l) => [l.code, String(l.intro?.data?.title ?? "")])
      ),
      defaultLocale: SOURCE_LANGUAGE,
      locales: Object.fromEntries(
        languages.map((l) => [
          l.code,
          { label: String(l.data?.name ?? l.code), lang: l.code },
        ])
      ),
      social: [{ icon: "github", label: "GitHub", href: REPO }],
      editLink: { baseUrl: `${REPO}/edit/main/` },
      customCss: [
        "@fontsource-variable/inter",
        "./src/styles/theme.css",
        "./src/styles/variants.css",
      ],
      // TEMPORARY: ?accent=blue|amber|teal&logo=letters|dialogue|book preview switch.
      head: [
        {
          tag: "script",
          content: `(() => {
            const params = new URLSearchParams(location.search);
            for (const key of ["accent", "logo"]) {
              let value = params.get(key);
              try {
                value ??= sessionStorage.getItem(key);
                if (value) sessionStorage.setItem(key, value);
              } catch {}
              if (value) document.documentElement.dataset[key] = value;
            }
          })();`,
        },
      ],
      components: {
        EditLink: "./src/components/EditLink.astro",
        FallbackContentNotice: "./src/components/FallbackContentNotice.astro",
        Footer: "./src/components/Footer.astro",
      },
      sidebar: [
        ...content.structure.sections.map((section, i) => ({
          label: `${i + 1}. ${sectionTitle(content, SOURCE_LANGUAGE, section.id)}`,
          translations: translations(
            (lang) => `${i + 1}. ${sectionTitle(content, lang, section.id)}`
          ),
          collapsed: true,
          items: section.terms,
        })),
        {
          label: ui(content, SOURCE_LANGUAGE).equivalents,
          translations: translations((lang) => ui(content, lang).equivalents),
          slug: "equivalents",
        },
      ],
    }),
    {
      // Regenerate pages when `content/` changes; restart when structure does.
      name: "glossary-content",
      hooks: {
        "astro:config:setup": ({ addWatchFile }) => {
          addWatchFile(new URL("../content/structure.yaml", import.meta.url));
          for (const l of languages)
            addWatchFile(
              new URL(`../content/${l.code}/language.yaml`, import.meta.url)
            );
        },
        "astro:server:setup": ({ server }) => {
          server.watcher.add(contentDir);
          server.watcher.on("all", (_, path) => {
            if (path.startsWith(contentDir) && path.endsWith(".md"))
              generate({ contentDir, outDir, uiDir, repo: REPO });
          });
        },
      },
    },
  ],
});
