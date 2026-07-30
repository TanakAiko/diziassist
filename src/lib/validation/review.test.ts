import { describe, expect, it } from "vitest";
import { normalizeByKind, reviewSchema } from "./review";

function line(overrides: Record<string, unknown> = {}) {
  return {
    selected: true,
    kind: "action",
    description: "Vérifier la configuration Play Store",
    owner: "Abdou",
    dueDate: "2026-07-30",
    priority: "moyenne",
    status: "a_faire",
    needsReview: false,
    reviewReason: "",
    sourceExcerpt: "Abdou doit vérifier la configuration Play Store.",
    ...overrides,
  };
}

describe("reviewSchema", () => {
  it("convertit les champs vides en null plutôt qu'en chaîne vide", () => {
    const result = reviewSchema.parse({
      meetingId: "abc",
      items: [line({ owner: "", dueDate: "", reviewReason: "" })],
    });
    const item = result.items[0];
    expect(item.owner).toBeNull();
    expect(item.dueDate).toBeNull();
    expect(item.reviewReason).toBeNull();
  });

  it("interprète l'échéance en UTC pour rester stable quel que soit le fuseau", () => {
    const result = reviewSchema.parse({
      meetingId: "abc",
      items: [line({ dueDate: "2026-07-30" })],
    });
    expect(result.items[0].dueDate?.toISOString()).toBe(
      "2026-07-30T00:00:00.000Z",
    );
  });

  it("refuse une description vide", () => {
    const result = reviewSchema.safeParse({
      meetingId: "abc",
      items: [line({ description: "   " })],
    });
    expect(result.success).toBe(false);
  });

  it("refuse un élément sans origine", () => {
    const result = reviewSchema.safeParse({
      meetingId: "abc",
      items: [line({ sourceExcerpt: "" })],
    });
    expect(result.success).toBe(false);
  });

  it("refuse une valeur hors des unions autorisées", () => {
    for (const invalid of [
      { kind: "tache" },
      { priority: "urgente" },
      { status: "fait" },
    ]) {
      expect(
        reviewSchema.safeParse({ meetingId: "abc", items: [line(invalid)] })
          .success,
      ).toBe(false);
    }
  });

  it("localise l'erreur sur la ligne fautive", () => {
    const result = reviewSchema.safeParse({
      meetingId: "abc",
      items: [line(), line({ description: "" }), line()],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path.slice(0, 2)).toEqual(["items", 1]);
  });

  it("accepte une liste vide : tout décocher est un choix légitime", () => {
    const result = reviewSchema.safeParse({ meetingId: "abc", items: [] });
    expect(result.success).toBe(true);
  });
});

describe("normalizeByKind", () => {
  it("laisse une action intacte", () => {
    const action = {
      kind: "action",
      owner: "Awa",
      dueDate: new Date("2026-07-31T00:00:00.000Z"),
      priority: "haute",
      status: "en_cours",
    };
    expect(normalizeByKind(action)).toEqual(action);
  });

  it("vide les quatre champs réservés aux actions sur un point en attente ou une information", () => {
    // Un client modifié pourrait envoyer un responsable sur une information :
    // l'invariant métier est appliqué côté serveur, pas seulement dans l'interface.
    // Sans cela, la valeur était enregistrée puis n'apparaissait nulle part.
    for (const kind of ["pending", "info"]) {
      expect(
        normalizeByKind({
          kind,
          owner: "Awa",
          dueDate: new Date("2026-07-31T00:00:00.000Z"),
          priority: "haute",
          status: "termine",
        }),
      ).toEqual({
        kind,
        owner: null,
        dueDate: null,
        priority: null,
        status: null,
      });
    }
  });
});
