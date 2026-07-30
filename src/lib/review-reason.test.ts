import { describe, expect, it } from "vitest";
import { joinReasons, remainingReviewReason } from "./review-reason";

const DUE = new Date("2026-07-31T00:00:00.000Z");

describe("joinReasons", () => {
  it("concatène les motifs présents et ignore les absents", () => {
    expect(joinReasons(["Échéance non précisée", null, "Validateur non identifié"])).toBe(
      "Échéance non précisée · Validateur non identifié",
    );
  });

  it("rend null quand il n'y a rien à signaler", () => {
    expect(joinReasons([null, null])).toBeNull();
  });
});

describe("remainingReviewReason", () => {
  it("lève le motif de responsable une fois celui-ci renseigné", () => {
    expect(
      remainingReviewReason("Responsable non identifié", {
        owner: "Awa",
        dueDate: null,
      }),
    ).toBeNull();
  });

  it("lève aussi le motif d'un responsable collectif", () => {
    expect(
      remainingReviewReason("Responsable collectif, à préciser", {
        owner: "Awa",
        dueDate: null,
      }),
    ).toBeNull();
  });

  // Le défaut corrigé : le motif était vidé en bloc dès que responsable et
  // échéance étaient renseignés, ce qui faisait disparaître un signalement
  // que personne n'avait traité.
  it("conserve un motif que renseigner ces deux champs ne traite pas", () => {
    expect(
      remainingReviewReason(
        "Échéance non précisée · Validateur non identifié",
        { owner: "Mamadou", dueDate: DUE },
      ),
    ).toBe("Validateur non identifié");
  });

  it("ne lève rien tant que le champ correspondant est vide", () => {
    expect(
      remainingReviewReason("Responsable non identifié · Échéance non précisée", {
        owner: null,
        dueDate: null,
      }),
    ).toBe("Responsable non identifié · Échéance non précisée");
  });

  it("rend null quand il n'y avait aucun motif", () => {
    expect(remainingReviewReason(null, { owner: "Awa", dueDate: DUE })).toBeNull();
  });
});
