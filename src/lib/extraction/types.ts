import type { Kind, Priority, Status } from "@/lib/constants";

// Un élément *proposé* par l'extraction. Ce n'est pas encore un Item en base :
// rien n'est enregistré avant validation explicite de l'utilisateur.
export type ExtractedItem = {
  kind: Kind;
  description: string;
  owner: string | null;
  dueDate: Date | null;
  priority: Priority | null;
  status: Status | null;
  needsReview: boolean;
  reviewReason: string | null;
  // Phrase du compte rendu dont l'élément est issu, dans sa forme d'origine.
  sourceExcerpt: string;
};

export type ExtractionInput = {
  rawContent: string;
  // Repère de calcul des échéances relatives. Jamais new Date().
  meetingDate: Date;
};

// Interface commune à l'extraction par règles et à la surcouche IA :
// les deux sont interchangeables, l'IA n'est qu'une implémentation de plus.
export type Extractor = (input: ExtractionInput) => Promise<ExtractedItem[]>;
