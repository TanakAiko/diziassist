import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aiPayloadSchema,
  describeAiError,
  extractWithAi,
  isAnchored,
  toExtractedItems,
} from "./ai";
import type { AiItem } from "./ai";
import type { ExtractionInput } from "./types";

const INPUT: ExtractionInput = {
  rawContent:
    "Abdou doit vérifier la configuration Play Store avant jeudi. L’équipe confirme que la version Android doit être disponible.",
  meetingDate: new Date("2026-07-27T00:00:00.000Z"),
};

function aiItem(overrides: Partial<AiItem> = {}): AiItem {
  return {
    kind: "action",
    description: "Vérifier la configuration Play Store",
    owner: "Abdou",
    dueDate: "2026-07-30",
    priority: "moyenne",
    sourceExcerpt: "Abdou doit vérifier la configuration Play Store avant jeudi.",
    ...overrides,
  };
}

describe("gardes 1 et 2 : forme de la réponse", () => {
  it("accepte une réponse conforme", () => {
    expect(aiPayloadSchema.safeParse({ items: [aiItem()] }).success).toBe(true);
  });

  it("rejette une nature, une priorité ou un champ hors contrat", () => {
    for (const invalid of [
      { kind: "tache" },
      { priority: "urgente" },
      { description: 42 },
    ]) {
      expect(
        aiPayloadSchema.safeParse({ items: [{ ...aiItem(), ...invalid }] })
          .success,
      ).toBe(false);
    }
  });

  it("rejette une réponse qui n'est pas la structure attendue", () => {
    for (const payload of [null, {}, { items: "rien" }, [aiItem()]]) {
      expect(aiPayloadSchema.safeParse(payload).success).toBe(false);
    }
  });
});

describe("garde 3 : ancrage dans le texte source", () => {
  it("accepte une phrase réellement présente", () => {
    expect(
      isAnchored(
        "Abdou doit vérifier la configuration Play Store",
        INPUT.rawContent,
      ),
    ).toBe(true);
  });

  it("tolère une apostrophe droite face à une apostrophe typographique", () => {
    // Le modèle peut renvoyer L'équipe là où le texte porte L’équipe.
    expect(isAnchored("L'équipe confirme", INPUT.rawContent)).toBe(true);
  });

  it("refuse une phrase absente du compte rendu", () => {
    expect(
      isAnchored("Fatou doit réserver la salle de réunion.", INPUT.rawContent),
    ).toBe(false);
  });

  it("refuse une citation vide", () => {
    expect(isAnchored("   ", INPUT.rawContent)).toBe(false);
  });

  it("écarte l'élément dont la citation est inventée", () => {
    const items = toExtractedItems(
      [
        aiItem(),
        aiItem({
          description: "Réserver la salle",
          owner: "Fatou",
          sourceExcerpt: "Fatou doit réserver la salle de réunion.",
        }),
      ],
      INPUT,
    );

    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Vérifier la configuration Play Store");
  });
});

describe("invariants appliqués côté serveur", () => {
  it("retire priorité, statut et échéance d'un point en attente ou d'une information", () => {
    for (const kind of ["pending", "info"] as const) {
      const [item] = toExtractedItems(
        [aiItem({ kind, priority: "haute", dueDate: "2026-07-30" })],
        INPUT,
      );
      expect(item.priority).toBeNull();
      expect(item.status).toBeNull();
      expect(item.dueDate).toBeNull();
    }
  });

  it("attribue un statut initial aux seules actions", () => {
    const [action] = toExtractedItems([aiItem()], INPUT);
    expect(action.status).toBe("a_faire");
  });

  it("ramène un responsable vide à null et le signale", () => {
    const [item] = toExtractedItems([aiItem({ owner: "   " })], INPUT);
    expect(item.owner).toBeNull();
    expect(item.needsReview).toBe(true);
    expect(item.reviewReason).toContain("Responsable non identifié");
  });

  it("refuse une échéance antérieure à la réunion", () => {
    // Une date passée est une erreur de calcul du modèle, pas une donnée.
    const [item] = toExtractedItems([aiItem({ dueDate: "2026-07-20" })], INPUT);
    expect(item.dueDate).toBeNull();
    expect(item.reviewReason).toContain("Échéance non précisée");
  });

  it("refuse une échéance mal formée", () => {
    for (const dueDate of ["jeudi", "30/07/2026", ""]) {
      const [item] = toExtractedItems([aiItem({ dueDate })], INPUT);
      expect(item.dueDate).toBeNull();
    }
  });

  it("ne signale pas une information complète", () => {
    const [item] = toExtractedItems([aiItem({ kind: "info" })], INPUT);
    expect(item.needsReview).toBe(false);
    expect(item.reviewReason).toBeNull();
  });

  it("ne laisse jamais passer une description vide", () => {
    expect(toExtractedItems([aiItem({ description: "  " })], INPUT)).toEqual([]);
  });
});

describe("gestion des pannes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuse d'appeler l'API sans clé, avec un message actionnable", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const outcome = await extractWithAi(INPUT);

    expect(outcome.status).toBe("error");
    if (outcome.status !== "error") return;
    expect(outcome.message).toContain("ANTHROPIC_API_KEY");
  });

  it("traduit chaque panne en une phrase destinée à l'utilisateur", () => {
    const headers = new Headers();
    const cases: [unknown, string][] = [
      [new Anthropic.AuthenticationError(401, {}, "unauthorized", headers), "clé API est invalide"],
      [new Anthropic.PermissionDeniedError(403, {}, "forbidden", headers), "n'a pas accès"],
      [new Anthropic.RateLimitError(429, {}, "rate limited", headers), "quota"],
      [new Anthropic.InternalServerError(500, {}, "boom", headers), "momentanément indisponible"],
      [new Error("inattendu"), "raison inattendue"],
    ];

    for (const [error, expected] of cases) {
      expect(describeAiError(error)).toContain(expected);
    }
  });

  it("ne laisse jamais fuiter la trace technique dans le message affiché", () => {
    const message = describeAiError(new Error("ANTHROPIC_API_KEY=sk-ant-secret"));
    expect(message).not.toContain("sk-ant");
  });
});

describe("présentation alignée sur l'extraction par règles", () => {
  it("retire la ponctuation finale d'un intitulé de tâche", () => {
    const [item] = toExtractedItems(
      [aiItem({ description: "Vérifier la configuration Play Store." })],
      INPUT,
    );
    expect(item.description).toBe("Vérifier la configuration Play Store");
  });

  it("ne touche pas à une description déjà propre", () => {
    const [item] = toExtractedItems([aiItem()], INPUT);
    expect(item.description).toBe("Vérifier la configuration Play Store");
  });
});
