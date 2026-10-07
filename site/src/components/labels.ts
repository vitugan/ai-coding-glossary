import labels from "../generated/ui.json";
import type { Ui } from "../generate/generate.ts";

/** Our UI labels (from `content/<lang>/language.yaml`) for a Starlight locale. */
export function t(locale: string | undefined): Ui {
  const all = labels as Record<string, Ui>;
  return all[locale ?? "en"] ?? all.en!;
}
