import { describe, expect, it } from "vitest";
import {
  deleteItemSchema,
  updateDetailsSchema,
  updatePrioritySchema,
  updateStatusSchema,
} from "./item";

describe("modification en ligne", () => {
  it("n'accepte que les statuts et priorités autorisés", () => {
    expect(updateStatusSchema.safeParse({ id: "x", status: "termine" }).success).toBe(true);
    expect(updateStatusSchema.safeParse({ id: "x", status: "fait" }).success).toBe(false);
    expect(updatePrioritySchema.safeParse({ id: "x", priority: "haute" }).success).toBe(true);
    expect(updatePrioritySchema.safeParse({ id: "x", priority: "urgente" }).success).toBe(false);
  });

  it("refuse un identifiant vide", () => {
    expect(updateStatusSchema.safeParse({ id: "  ", status: "termine" }).success).toBe(false);
  });
});

describe("suppression", () => {
  it("exige un identifiant non vide", () => {
    expect(deleteItemSchema.safeParse({ id: "abc" }).success).toBe(true);
    expect(deleteItemSchema.safeParse({ id: "   " }).success).toBe(false);
    expect(deleteItemSchema.safeParse({}).success).toBe(false);
  });
});

describe("panneau d'édition", () => {
  it("convertit les champs vidés en null, pas en chaîne vide", () => {
    const result = updateDetailsSchema.parse({
      id: "x",
      description: "Corriger le bug de connexion",
      owner: "   ",
      dueDate: "",
    });
    expect(result.owner).toBeNull();
    expect(result.dueDate).toBeNull();
  });

  it("interprète l'échéance en UTC", () => {
    const result = updateDetailsSchema.parse({
      id: "x",
      description: "Corriger le bug de connexion",
      owner: "Awa",
      dueDate: "2026-07-31",
    });
    expect(result.owner).toBe("Awa");
    expect(result.dueDate?.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });

  it("refuse une date mal formée", () => {
    const result = updateDetailsSchema.safeParse({
      id: "x",
      description: "Corriger le bug de connexion",
      owner: "",
      dueDate: "31/07/2026",
    });
    expect(result.success).toBe(false);
  });

  // La description suit exactement les mêmes bornes qu'à la validation
  // initiale : un élément ne change pas de règle selon l'écran qui le modifie.
  it("exige une description non vide", () => {
    const empty = updateDetailsSchema.safeParse({
      id: "x",
      description: "   ",
      owner: "",
      dueDate: "",
    });
    expect(empty.success).toBe(false);

    const tooLong = updateDetailsSchema.safeParse({
      id: "x",
      description: "a".repeat(501),
      owner: "",
      dueDate: "",
    });
    expect(tooLong.success).toBe(false);
  });

  it("nettoie les espaces autour de la description", () => {
    const result = updateDetailsSchema.parse({
      id: "x",
      description: "  Préparer la démo client  ",
      owner: "",
      dueDate: "",
    });
    expect(result.description).toBe("Préparer la démo client");
  });
});
