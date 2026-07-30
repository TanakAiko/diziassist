import { prisma } from "@/lib/db";
import { applyComputedFilters, compareItems, countItems } from "@/lib/items";
import { hasActiveFilter, parseFilters } from "@/lib/validation/filters";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardItemRow } from "@/components/dashboard-item";
import { cn } from "@/lib/utils";

// Le tableau de bord reflète l'état de la base à chaque requête.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);

  const meetings = await prisma.meeting.findMany({
    where: { reviewedAt: { not: null } },
    orderBy: { meetingDate: "desc" },
    select: { id: true, title: true },
  });

  // Ce que la base sait faire, la base le fait : les filtres portant sur des
  // colonnes stockées sont traduits en SQL.
  const rows = await prisma.item.findMany({
    where: {
      ...(filters.meeting ? { meetingId: filters.meeting } : {}),
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.aconfirmer ? { needsReview: true } : {}),
      ...(filters.q
        ? {
            OR: [
              { description: { contains: filters.q } },
              { owner: { contains: filters.q } },
            ],
          }
        : {}),
    },
    include: { meeting: { select: { id: true, title: true } } },
  });

  // Le retard est calculé, jamais stocké : il ne peut pas être filtré en SQL.
  // Le tri non plus — SQLite classerait les priorités par ordre alphabétique.
  const items = applyComputedFilters(rows, filters).sort(compareItems);
  const counters = countItems(items);
  const filtered = hasActiveFilter(filters);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <p className="mt-1 max-w-prose text-base text-muted-foreground">
          Tous les éléments validés, tous comptes rendus confondus.
        </p>
      </header>

      {/* Les compteurs portent sur la liste affichée, pas sur toute la base.
          Une bande de quatre chiffres plutôt que quatre cartes : c'est une seule
          information, lue d'un seul mouvement. */}
      <section className="mt-6 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-md border bg-card sm:grid-cols-4 sm:divide-y-0">
        <Counter label="Éléments" value={counters.total} />
        <Counter label="En retard" value={counters.overdue} tone="text-overdue" />
        <Counter
          label="À confirmer"
          value={counters.toConfirm}
          tone="text-attention"
        />
        <Counter label="Terminés" value={counters.done} tone="text-done" />
      </section>

      <div className="mt-6">
        <DashboardFilters meetings={meetings} hasActiveFilter={filtered} />
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed bg-card px-6 py-14 text-center">
          <p className="font-heading text-lg font-medium">
            {filtered ? "Aucun élément ne correspond" : "Rien à suivre encore"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">
            {filtered
              ? "Élargissez les filtres ou réinitialisez-les pour revoir la liste complète."
              : "Validez un compte rendu pour alimenter le tableau de bord."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 overflow-hidden rounded-md border bg-card">
          {items.map((item) => (
            <DashboardItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}

// Le chiffre est en mono et surdimensionné, l'intitulé en capitales sous lui :
// on lit le nombre avant de lire ce qu'il compte. La couleur n'apparaît que si
// le compteur n'est pas à zéro — un « 0 en retard » n'a pas à crier en rouge.
function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p
        className={cn(
          "font-mono text-3xl leading-none font-medium",
          value > 0 && tone,
        )}
      >
        {value}
      </p>
      <p className="eyebrow mt-2 text-muted-foreground">{label}</p>
    </div>
  );
}
