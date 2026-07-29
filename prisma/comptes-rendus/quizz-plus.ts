import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Compte rendu de référence du cas pratique DFSJIA-001.
//
// Le texte vit dans quizz-plus.txt et non dans une chaîne TypeScript :
// il sert à la fois de jeu de démonstration (seed) et de test de
// non-régression de l'extracteur, qui doit en tirer exactement 5 actions,
// 2 points en attente et 1 information (docs/note-architecture.md, § 5).
// Un fichier texte se relit et se compare sans échappement parasite.

const RAW_CONTENT_PATH = fileURLToPath(
  new URL("./quizz-plus.txt", import.meta.url),
);

export const QUIZZ_PLUS = {
  title: "Réunion Projet Quizz+",

  // Lundi 27 juillet 2026. Toutes les échéances relatives du compte rendu
  // (« avant jeudi », « avant vendredi », « avant mercredi soir ») se calculent
  // depuis cette date, jamais depuis la date du jour.
  meetingDate: new Date("2026-07-27T00:00:00.000Z"),

  rawContent: readFileSync(RAW_CONTENT_PATH, "utf8"),
};
