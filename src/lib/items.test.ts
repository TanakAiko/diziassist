import { describe, expect, it } from "vitest";
import { applyComputedFilters, compareItems, countItems } from "./items";
import { parseFilters } from "./validation/filters";
import type { SortableItem } from "./items";

const TODAY = new Date("2026-07-29T00:00:00.000Z");

function item(overrides: Partial<SortableItem> = {}): SortableItem {
  return {
    dueDate: null,
    priority: "moyenne",
    status: "a_faire",
    needsReview: false,
    ...overrides,
  };
}

function day(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("tri", () => {
  it("classe par échéance croissante", () => {
    const sorted = [
      item({ dueDate: day("2026-08-05") }),
      item({ dueDate: day("2026-07-30") }),
      item({ dueDate: day("2026-08-01") }),
    ].sort(compareItems);

    expect(sorted.map((i) => i.dueDate?.toISOString().slice(0, 10))).toEqual([
      "2026-07-30",
      "2026-08-01",
      "2026-08-05",
    ]);
  });

  it("place les éléments sans échéance en dernier", () => {
    const sorted = [
      item({ dueDate: null }),
      item({ dueDate: day("2026-08-05") }),
      item({ dueDate: null }),
      item({ dueDate: day("2026-07-30") }),
    ].sort(compareItems);

    expect(sorted.map((i) => i.dueDate !== null)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it("départage à échéance égale par priorité, pas par ordre alphabétique", () => {
    // En base, un tri sur la colonne donnerait basse < haute < moyenne.
    const sorted = [
      item({ dueDate: day("2026-07-30"), priority: "basse" }),
      item({ dueDate: day("2026-07-30"), priority: "haute" }),
      item({ dueDate: day("2026-07-30"), priority: "moyenne" }),
    ].sort(compareItems);

    expect(sorted.map((i) => i.priority)).toEqual([
      "haute",
      "moyenne",
      "basse",
    ]);
  });

  it("range les éléments sans priorité après ceux qui en ont une", () => {
    const sorted = [
      item({ priority: null }),
      item({ priority: "basse" }),
    ].sort(compareItems);

    expect(sorted.map((i) => i.priority)).toEqual(["basse", null]);
  });
});

describe("retard", () => {
  const overdue = item({ dueDate: day("2026-07-28"), status: "a_faire" });
  const dueToday = item({ dueDate: TODAY, status: "a_faire" });
  const finished = item({ dueDate: day("2026-07-28"), status: "termine" });
  const undated = item({ dueDate: null });

  it("ne retient que les éléments dépassés et non terminés", () => {
    const filters = parseFilters({ retard: "1" });
    const result = applyComputedFilters(
      [overdue, dueToday, finished, undated],
      filters,
      TODAY,
    );
    expect(result).toEqual([overdue]);
  });

  it("ne compte pas comme en retard une échéance fixée au jour même", () => {
    expect(countItems([dueToday], TODAY).overdue).toBe(0);
  });

  it("laisse la liste intacte quand le filtre est absent", () => {
    const filters = parseFilters({});
    expect(applyComputedFilters([overdue, undated], filters, TODAY)).toHaveLength(2);
  });
});

describe("compteurs", () => {
  it("porte sur la liste transmise, donc sur le filtre actif", () => {
    const counters = countItems(
      [
        item({ dueDate: day("2026-07-28") }),
        item({ status: "termine" }),
        item({ needsReview: true }),
        item(),
      ],
      TODAY,
    );

    expect(counters).toEqual({
      total: 4,
      overdue: 1,
      toConfirm: 1,
      done: 1,
    });
  });
});

describe("filtres d'URL", () => {
  it("vaut « tous » par défaut", () => {
    const filters = parseFilters({});
    expect(filters.meeting).toBeNull();
    expect(filters.kind).toBeNull();
    expect(filters.status).toBeNull();
    expect(filters.retard).toBe(false);
    expect(filters.q).toBeNull();
  });

  it("lit les valeurs autorisées", () => {
    const filters = parseFilters({
      kind: "action",
      status: "en_cours",
      priority: "haute",
      retard: "1",
      aconfirmer: "1",
      q: "  Play Store  ",
    });
    expect(filters.kind).toBe("action");
    expect(filters.status).toBe("en_cours");
    expect(filters.priority).toBe("haute");
    expect(filters.retard).toBe(true);
    expect(filters.aconfirmer).toBe(true);
    expect(filters.q).toBe("Play Store");
  });

  it("ignore une valeur aberrante au lieu de casser la page", () => {
    // L'URL est une entrée publique : elle peut contenir n'importe quoi.
    const filters = parseFilters({
      kind: "n'importe quoi",
      status: "<script>",
      priority: "999",
      retard: "oui",
    });
    expect(filters.kind).toBeNull();
    expect(filters.status).toBeNull();
    expect(filters.priority).toBeNull();
    expect(filters.retard).toBe(false);
  });

  it("ne retient que la première valeur d'un paramètre répété", () => {
    const filters = parseFilters({ kind: ["action", "info"] });
    expect(filters.kind).toBe("action");
  });
});
