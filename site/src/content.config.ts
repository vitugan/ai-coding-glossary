import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

// Pages here are generated from the repo's `content/` by src/generate/generate.ts.
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        /** Set on term pages: the term ID shared by all languages. */
        term: z
          .object({
            id: z.string(),
            /** Language code → GitHub link to start a translation. EN pages only. */
            translate: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
      }),
    }),
  }),
};
