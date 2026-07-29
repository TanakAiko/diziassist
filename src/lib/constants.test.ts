import { describe, expect, it } from "vitest";
import {
  KINDS,
  KIND_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_RANK,
  STATUSES,
  STATUS_LABELS,
} from "./constants";

describe("constantes", () => {
  it("associe un libellé français à chaque valeur stockée", () => {
    expect(Object.keys(KIND_LABELS).sort()).toEqual([...KINDS].sort());
    expect(Object.keys(PRIORITY_LABELS).sort()).toEqual([...PRIORITIES].sort());
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...STATUSES].sort());
  });

  it("stocke des valeurs sans accent ni espace", () => {
    for (const value of [...KINDS, ...PRIORITIES, ...STATUSES]) {
      expect(value).toMatch(/^[a-z_]+$/);
    }
  });

  it("classe les priorités de la plus forte à la plus faible", () => {
    expect(PRIORITY_RANK.haute).toBeLessThan(PRIORITY_RANK.moyenne);
    expect(PRIORITY_RANK.moyenne).toBeLessThan(PRIORITY_RANK.basse);
  });
});
