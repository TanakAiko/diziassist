// Source unique des valeurs autorisées.
// SQLite ne supporte pas `enum` : ces unions alimentent à la fois les types
// TypeScript, les schémas Zod et les menus déroulants de l'interface.
// Les valeurs stockées sont sans accent ni espace ; les libellés affichés
// sont en français et vivent uniquement dans les tables LABELS ci-dessous.

export const KINDS = ["action", "pending", "info"] as const;
export type Kind = (typeof KINDS)[number];

export const PRIORITIES = ["basse", "moyenne", "haute"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["a_faire", "en_cours", "termine"] as const;
export type Status = (typeof STATUSES)[number];

export const KIND_LABELS: Record<Kind, string> = {
  action: "Action",
  pending: "Point en attente",
  info: "Information",
};

// Le pluriel ne s'obtient pas en ajoutant un « s » : « point en attente »
// donnerait « point en attentes ». Les deux formes sont donc explicites.
export const KIND_LABELS_PLURAL: Record<Kind, string> = {
  action: "actions",
  pending: "points en attente",
  info: "informations",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
};

export const STATUS_LABELS: Record<Status, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};

// Le tri par priorité ne peut pas se faire en base : SQLite trierait
// « basse » avant « haute » et « moyenne ». Rang explicite, tri en TypeScript.
export const PRIORITY_RANK: Record<Priority, number> = {
  haute: 0,
  moyenne: 1,
  basse: 2,
};

// Statut par défaut d'une action enregistrée. Ne s'applique jamais à un
// élément de type pending ou info, qui n'ont ni statut ni priorité.
export const DEFAULT_STATUS: Status = "a_faire";

// Mention portée par sourceExcerpt lorsqu'un élément est ajouté à la main
// pendant la validation : il n'a pas d'origine dans le texte du compte rendu.
export const MANUAL_SOURCE_EXCERPT = "Ajouté manuellement lors de la validation";
