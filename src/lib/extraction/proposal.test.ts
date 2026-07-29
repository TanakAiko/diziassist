import { describe, expect, it } from "vitest";
import { deserializeProposal, serializeProposal } from "./proposal";
import type { ExtractedItem } from "./types";

const ITEMS: ExtractedItem[] = [
  {
    kind: "action",
    description: "Vérifier la configuration Play Store",
    owner: "Abdou",
    dueDate: new Date("2026-07-30T00:00:00.000Z"),
    priority: "moyenne",
    status: "a_faire",
    needsReview: false,
    reviewReason: null,
    sourceExcerpt: "Abdou doit vérifier la configuration Play Store.",
  },
  {
    kind: "pending",
    description: "Date de lancement",
    owner: null,
    dueDate: null,
    priority: null,
    status: null,
    needsReview: true,
    reviewReason: "Conditionné aux tests",
    sourceExcerpt: "La date de lancement ne pourra être confirmée qu'après.",
  },
];

describe("mémorisation de la proposition IA", () => {
  it("restitue les éléments à l'identique après un aller-retour", () => {
    const restored = deserializeProposal(serializeProposal(ITEMS));
    expect(restored).toEqual(ITEMS);
  });

  it("conserve l'échéance en UTC, sans glissement de jour", () => {
    const [action] = deserializeProposal(serializeProposal(ITEMS))!;
    expect(action.dueDate?.toISOString()).toBe("2026-07-30T00:00:00.000Z");
  });

  it("renvoie null sur un contenu illisible plutôt que de lever", () => {
    // La page retombe alors sur l'extraction par règles.
    for (const raw of ["", "{", "null", '{"items":[]}', '[{"kind":"tache"}]']) {
      expect(deserializeProposal(raw)).toBeNull();
    }
  });

  it("accepte une proposition vide", () => {
    expect(deserializeProposal("[]")).toEqual([]);
  });
});
