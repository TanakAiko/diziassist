import { z } from "zod";
import { KINDS, PRIORITIES, STATUSES } from "@/lib/constants";
import type { ExtractedItem } from "./types";

// Sérialisation de la proposition IA pour la colonne Meeting.aiProposal.
//
// Ce module est volontairement séparé de ai.ts : la page de validation a besoin
// de relire la proposition, pas d'appeler l'API. L'y importer chargerait le SDK
// Anthropic à chaque rendu, pour rien.

// Les dates ne survivent pas à JSON.stringify autrement qu'en texte : elles
// sont stockées au format AAAA-MM-JJ et reconstruites en UTC à la relecture.
const storedItemSchema = z.object({
  kind: z.enum(KINDS),
  description: z.string(),
  owner: z.string().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  priority: z.enum(PRIORITIES).nullable(),
  status: z.enum(STATUSES).nullable(),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable(),
  sourceExcerpt: z.string(),
});

const storedProposalSchema = z.array(storedItemSchema);

export function serializeProposal(items: ExtractedItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      ...item,
      dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
    })),
  );
}

// Renvoie null plutôt que de lever : une proposition illisible (colonne
// corrompue, format d'une version antérieure) fait simplement retomber
// l'affichage sur l'extraction par règles.
export function deserializeProposal(raw: string): ExtractedItem[] | null {
  try {
    const parsed = storedProposalSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;

    return parsed.data.map((item) => ({
      ...item,
      dueDate: item.dueDate ? new Date(`${item.dueDate}T00:00:00.000Z`) : null,
    }));
  } catch {
    return null;
  }
}
