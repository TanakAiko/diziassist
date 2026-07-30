// Format des motifs de signalement.
//
// Ils sont produits à deux endroits — l'extraction par règles et l'extraction
// par IA — et relus à un troisième : le panneau d'édition, qui doit savoir
// lesquels sont levés quand l'utilisateur complète un champ. Le format vit donc
// ici, une seule fois, plutôt que d'être recopié dans chacun.

// Un élément peut cumuler plusieurs motifs. Ils sont concaténés, jamais écrasés.
export const REASON_SEPARATOR = " · ";

// Les motifs qu'un renseignement de champ lève réellement.
const RESOLVED_BY_OWNER = [
  "Responsable non identifié",
  "Responsable collectif, à préciser",
];

const RESOLVED_BY_DUE_DATE = ["Échéance non précisée"];

export function joinReasons(reasons: (string | null)[]): string | null {
  const kept = reasons.filter((reason): reason is string => Boolean(reason));
  return kept.length > 0 ? kept.join(REASON_SEPARATOR) : null;
}

// Ce qu'il reste à confirmer une fois le responsable et l'échéance renseignés.
//
// Tout motif absent des deux listes ci-dessus survit : renseigner ces deux
// champs ne dit rien d'un « Validateur non identifié » ni d'un « Sous réserve
// de … ». Vider le motif en bloc ferait disparaître un signalement que
// personne n'a traité.
export function remainingReviewReason(
  reason: string | null,
  { owner, dueDate }: { owner: string | null; dueDate: Date | null },
): string | null {
  if (!reason) return null;

  const kept = reason.split(REASON_SEPARATOR).filter((part) => {
    if (owner !== null && RESOLVED_BY_OWNER.includes(part)) return false;
    if (dueDate !== null && RESOLVED_BY_DUE_DATE.includes(part)) return false;
    return true;
  });

  return kept.length > 0 ? kept.join(REASON_SEPARATOR) : null;
}
