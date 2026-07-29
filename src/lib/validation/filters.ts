import { z } from "zod";
import { KINDS, PRIORITIES, STATUSES } from "@/lib/constants";

// Les filtres transitent par l'URL et non par un état React : les liens sont
// partageables et le bouton retour du navigateur fonctionne. L'URL est une
// entrée publique, donc validée — mais avec indulgence : un paramètre
// aberrant retombe sur « tous » plutôt que de casser la page.
export const ALL = "tous";

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .or(z.literal(ALL))
    .catch(ALL)
    .transform((value) => (value === ALL ? null : (value as T[number])));

// Une case cochée s'écrit « 1 » dans l'URL ; toute autre valeur vaut décoché.
const flag = z.string().transform((value) => value === "1");

export const filtersSchema = z.object({
  meeting: z
    .string()
    .trim()
    .catch(ALL)
    .transform((value) => (value === ALL || value === "" ? null : value)),
  kind: optionalEnum(KINDS),
  status: optionalEnum(STATUSES),
  priority: optionalEnum(PRIORITIES),
  retard: flag,
  aconfirmer: flag,
  q: z
    .string()
    .trim()
    .max(100)
    .catch("")
    .transform((value) => (value === "" ? null : value)),
});

export type Filters = z.infer<typeof filtersSchema>;

// searchParams de Next : une valeur peut être absente, unique ou répétée.
// On ne retient que la première occurrence.
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): Filters {
  const first = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return filtersSchema.parse({
    meeting: first("meeting") ?? ALL,
    kind: first("kind") ?? ALL,
    status: first("status") ?? ALL,
    priority: first("priority") ?? ALL,
    retard: first("retard") ?? "",
    aconfirmer: first("aconfirmer") ?? "",
    q: first("q") ?? "",
  });
}

export function hasActiveFilter(filters: Filters): boolean {
  return (
    filters.meeting !== null ||
    filters.kind !== null ||
    filters.status !== null ||
    filters.priority !== null ||
    filters.retard ||
    filters.aconfirmer ||
    filters.q !== null
  );
}
