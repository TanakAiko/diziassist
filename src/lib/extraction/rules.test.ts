import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractWithRules, nextWeekdayAfter, segment } from "./rules";

// Le texte du sujet, lu à la source : le test de référence ne vaut que s'il
// porte sur le compte rendu réel et non sur une paraphrase.
const RAW_CONTENT = readFileSync(
  fileURLToPath(
    new URL("../../../prisma/comptes-rendus/quizz-plus.txt", import.meta.url),
  ),
  "utf8",
);

// Lundi 27 juillet 2026.
const MEETING_DATE = new Date("2026-07-27T00:00:00.000Z");

const items = extractWithRules({
  rawContent: RAW_CONTENT,
  meetingDate: MEETING_DATE,
});

const actions = items.filter((item) => item.kind === "action");
const pendings = items.filter((item) => item.kind === "pending");
const infos = items.filter((item) => item.kind === "info");

function iso(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

describe("compte rendu de référence Quizz+", () => {
  it("est daté d'un lundi", () => {
    expect(MEETING_DATE.getUTCDay()).toBe(1);
  });

  it("produit exactement 5 actions, 2 points en attente et 1 information", () => {
    expect(actions).toHaveLength(5);
    expect(pendings).toHaveLength(2);
    expect(infos).toHaveLength(1);
    expect(items).toHaveLength(8);
  });

  it("n'invente aucun responsable", () => {
    expect(actions.map((action) => action.owner)).toEqual([
      null, // « L'équipe » est un collectif, pas un responsable nommé
      "Abdou",
      "Awa",
      "Mamadou",
      "Mamadou", // hérité de la première obligation de la phrase
    ]);
  });

  it("calcule les échéances depuis la date de réunion", () => {
    expect(actions.map((action) => iso(action.dueDate))).toEqual([
      null, // aucune échéance dans le texte
      "2026-07-30", // avant jeudi
      "2026-07-31", // avant vendredi
      null, // aucune échéance dans le texte
      "2026-07-29", // avant mercredi soir
    ]);
  });

  it("signale tout élément incomplet avec un motif en clair", () => {
    expect(actions.map((action) => action.needsReview)).toEqual([
      true,
      false,
      false,
      true,
      true,
    ]);

    expect(actions[0].reviewReason).toContain("collectif");
    expect(actions[3].reviewReason).toContain("Échéance non précisée");
    expect(actions[4].reviewReason).toContain("Validateur non identifié");

    // Un motif est toujours présent quand l'élément est signalé, jamais un
    // booléen seul : l'utilisateur doit savoir quoi corriger.
    for (const item of items) {
      if (item.needsReview) {
        expect(item.reviewReason).toBeTruthy();
      }
    }
  });

  it("produit des descriptions exploitables", () => {
    expect(actions.map((action) => action.description)).toEqual([
      "La version Android doit être disponible pour les prochains tests utilisateurs",
      "Vérifier la configuration Play Store",
      "Corriger les erreurs signalées sur le classement",
      "Préparer le message destiné aux testeurs",
      "Faire valider",
    ]);
  });

  it("classe les points en attente sans leur inventer de responsable ni d'échéance", () => {
    expect(pendings.map((pending) => pending.description)).toEqual([
      "Date de lancement",
      "Budget de la campagne de lancement",
    ]);

    for (const pending of pendings) {
      expect(pending.owner).toBeNull();
      expect(pending.dueDate).toBeNull();
      expect(pending.priority).toBeNull();
      expect(pending.status).toBeNull();
      expect(pending.needsReview).toBe(true);
    }
  });

  it("classe l'information sans statut ni priorité", () => {
    expect(infos[0].description).toContain("réunion");
    expect(infos[0].priority).toBeNull();
    expect(infos[0].status).toBeNull();
    expect(infos[0].dueDate).toBeNull();
    expect(infos[0].needsReview).toBe(false);
  });

  it("attribue un statut initial aux seules actions", () => {
    for (const action of actions) {
      expect(action.status).toBe("a_faire");
      expect(action.priority).not.toBeNull();
    }
  });

  it("rattache chaque élément à une phrase réellement présente dans le texte", () => {
    for (const item of items) {
      expect(item.sourceExcerpt.length).toBeGreaterThan(0);
      expect(RAW_CONTENT).toContain(item.sourceExcerpt);
    }
  });

  it("ne tire aucun élément de la ligne de titre", () => {
    const fromTitle = items.filter((item) =>
      item.sourceExcerpt.startsWith("Réunion Projet Quizz+ —"),
    );
    expect(fromTitle).toHaveLength(0);
  });
});

describe("segmentation", () => {
  it("découpe sur la ponctuation forte, les lignes et les puces", () => {
    const segments = segment("- Premier point.\nDeuxième point ! Troisième ?");
    expect(segments.map((s) => s.text)).toEqual([
      "Premier point.",
      "Deuxième point !",
      "Troisième ?",
    ]);
  });

  it("conserve la forme d'origine pour la traçabilité", () => {
    const [first] = segment("L’équipe doit décider.");
    expect(first.original).toBe("L’équipe doit décider.");
    expect(first.text).toBe("L'équipe doit décider.");
  });
});

describe("échéances relatives", () => {
  const monday = new Date("2026-07-27T00:00:00.000Z");

  it("résout un jour à sa prochaine occurrence après la réunion", () => {
    expect(iso(nextWeekdayAfter(monday, 4))).toBe("2026-07-30"); // jeudi
    expect(iso(nextWeekdayAfter(monday, 5))).toBe("2026-07-31"); // vendredi
    expect(iso(nextWeekdayAfter(monday, 3))).toBe("2026-07-29"); // mercredi
  });

  it("renvoie la semaine suivante quand le jour est celui de la réunion", () => {
    // « avant lundi » dit un lundi ne désigne pas le jour même.
    expect(iso(nextWeekdayAfter(monday, 1))).toBe("2026-08-03");
  });

  it("franchit correctement un changement de mois", () => {
    const thursday = new Date("2026-07-30T00:00:00.000Z");
    expect(iso(nextWeekdayAfter(thursday, 1))).toBe("2026-08-03");
  });

  it("ne dépend jamais de la date du jour", () => {
    // Même entrée, même sortie, quel que soit le moment où le test tourne.
    const first = extractWithRules({
      rawContent: RAW_CONTENT,
      meetingDate: MEETING_DATE,
    });
    expect(first.map((item) => iso(item.dueDate))).toEqual(
      items.map((item) => iso(item.dueDate)),
    );
  });
});

describe("garde-fous", () => {
  it("ne produit rien à partir d'un texte sans obligation", () => {
    const result = extractWithRules({
      rawContent: "Tour de table. Ordre du jour habituel.",
      meetingDate: MEETING_DATE,
    });
    expect(result).toEqual([]);
  });

  it("ne confond pas une non-action avec une action", () => {
    const result = extractWithRules({
      rawContent: "Le budget n'a pas encore été validé.",
      meetingDate: MEETING_DATE,
    });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("pending");
    expect(result[0].owner).toBeNull();
  });

  it("ne prend pas un nom propre non sujet pour un responsable", () => {
    const result = extractWithRules({
      rawContent: "La version Android doit être testée.",
      meetingDate: MEETING_DATE,
    });
    expect(result[0].owner).toBeNull();
    expect(result[0].needsReview).toBe(true);
  });

  it("marque une échéance à moins de 48 h en priorité haute", () => {
    const result = extractWithRules({
      rawContent: "Fatou doit livrer la maquette avant mardi.",
      meetingDate: MEETING_DATE,
    });
    expect(iso(result[0].dueDate)).toBe("2026-07-28");
    expect(result[0].priority).toBe("haute");
  });

  it("tolère un texte vide", () => {
    expect(
      extractWithRules({ rawContent: "", meetingDate: MEETING_DATE }),
    ).toEqual([]);
  });
});
