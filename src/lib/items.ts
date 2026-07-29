import { PRIORITY_RANK, type Priority } from "@/lib/constants";
import { isOverdue, todayUtc } from "@/lib/dates";
import type { Filters } from "@/lib/validation/filters";

// Ce dont le tri et le filtrage ont besoin : ni plus, ni moins. Un Item de
// Prisma satisfait ce type, ce qui garde ces fonctions testables sans base.
export type SortableItem = {
  dueDate: Date | null;
  priority: string | null;
  status: string | null;
  needsReview: boolean;
};

// Le tri ne peut pas se faire en base : SQLite classerait « basse » avant
// « haute » et « moyenne », par ordre alphabétique. Rang explicite, tri en TS.
// Les éléments sans échéance passent en dernier — ils ne sont pas urgents,
// ils sont indatés.
export function compareItems(a: SortableItem, b: SortableItem): number {
  if (a.dueDate && b.dueDate) {
    const delta = a.dueDate.getTime() - b.dueDate.getTime();
    if (delta !== 0) return delta;
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }

  return priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(priority: string | null): number {
  if (priority && priority in PRIORITY_RANK) {
    return PRIORITY_RANK[priority as Priority];
  }
  // Un élément sans priorité (information, point en attente) passe après.
  return Object.keys(PRIORITY_RANK).length;
}

// Le retard est calculé, jamais stocké : il change tout seul à minuit.
// Il ne peut donc pas être filtré en SQL.
export function applyComputedFilters<T extends SortableItem>(
  items: T[],
  filters: Filters,
  today: Date = todayUtc(),
): T[] {
  if (!filters.retard) return items;
  return items.filter((item) => isOverdue(item.dueDate, item.status, today));
}

export type Counters = {
  total: number;
  overdue: number;
  toConfirm: number;
  done: number;
};

// Les compteurs reflètent le filtre actif : ils sont calculés sur la liste
// affichée, pas sur toute la base.
export function countItems(
  items: SortableItem[],
  today: Date = todayUtc(),
): Counters {
  return {
    total: items.length,
    overdue: items.filter((item) => isOverdue(item.dueDate, item.status, today))
      .length,
    toConfirm: items.filter((item) => item.needsReview).length,
    done: items.filter((item) => item.status === "termine").length,
  };
}
