import type { ExtractedItem, ExtractionInput } from "./types";
import { extractWithRules } from "./rules";

export type { ExtractedItem, ExtractionInput, Extractor } from "./types";

// Point d'entrée unique de l'extraction.
//
// L'extraction par règles est le socle : elle ne dépend d'aucune clé API et
// fonctionne hors ligne. La surcouche IA (bloc 5) viendra se brancher ici,
// avec repli automatique sur les règles en cas d'absence de clé ou d'échec.
export async function extract(
  input: ExtractionInput,
): Promise<ExtractedItem[]> {
  return extractWithRules(input);
}
