// Compte rendu de référence du cas pratique DFSJIA-001.
//
// Ce texte sert à la fois de jeu de démonstration (seed) et de test de
// non-régression de l'extracteur : il doit produire exactement 5 actions,
// 2 points en attente et 1 information (docs/note-architecture.md, § 5).
//
// rawContent doit contenir le texte du sujet **à l'identique**, sans
// reformulation : l'extracteur travaille sur des tournures précises et le
// résultat attendu est adossé à ce texte mot pour mot.

export const QUIZZ_PLUS = {
  title: "Point hebdomadaire Quizz+",

  // Lundi 27 juillet 2026. Toutes les échéances relatives du compte rendu
  // (« avant jeudi », « avant vendredi »…) se calculent depuis cette date,
  // jamais depuis la date du jour.
  meetingDate: new Date("2026-07-27T00:00:00.000Z"),

  rawContent: ``,
};
