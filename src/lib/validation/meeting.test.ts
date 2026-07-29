import { describe, expect, it } from "vitest";
import { meetingFormSchema, toFieldErrors } from "./meeting";

const validInput = {
  title: "Réunion Projet Quizz+",
  meetingDate: "2026-07-27",
  rawContent:
    "Abdou doit vérifier la configuration Play Store avant jeudi prochain.",
};

describe("meetingFormSchema", () => {
  it("accepte une saisie complète et convertit la date en UTC", () => {
    const result = meetingFormSchema.parse(validInput);
    expect(result.title).toBe("Réunion Projet Quizz+");
    expect(result.meetingDate.toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });

  it("refuse un titre vide", () => {
    const result = meetingFormSchema.safeParse({ ...validInput, title: "   " });
    expect(result.success).toBe(false);
  });

  it("refuse une date absente ou mal formée", () => {
    for (const meetingDate of ["", "27/07/2026", "2026-7-27"]) {
      expect(
        meetingFormSchema.safeParse({ ...validInput, meetingDate }).success,
      ).toBe(false);
    }
  });

  it("refuse un compte rendu trop court pour être exploité", () => {
    const result = meetingFormSchema.safeParse({
      ...validInput,
      rawContent: "Trop court.",
    });
    expect(result.success).toBe(false);
  });

  it("renvoie un message par champ fautif, prêt à afficher sous le champ", () => {
    const result = meetingFormSchema.safeParse({
      title: "",
      meetingDate: "pas une date",
      rawContent: "court",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = toFieldErrors(result.error);
    expect(Object.keys(errors).sort()).toEqual([
      "meetingDate",
      "rawContent",
      "title",
    ]);
    expect(errors.title).toBe("Le titre est obligatoire.");
    // Les messages sont en français et adressés à l'utilisateur, pas au développeur.
    for (const message of Object.values(errors)) {
      expect(message).toMatch(/^[A-ZÀ-Ý].*\.$/);
    }
  });

  it("rejette une entrée non textuelle sans lever d'exception", () => {
    // Une Server Action est un endpoint public : le payload peut être n'importe quoi.
    const result = meetingFormSchema.safeParse({
      title: 42,
      meetingDate: null,
      rawContent: undefined,
    });
    expect(result.success).toBe(false);
  });
});
