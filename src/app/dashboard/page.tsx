import Link from "next/link";
import { prisma } from "@/lib/db";
import { applyComputedFilters, compareItems, countItems } from "@/lib/items";
import { hasActiveFilter, parseFilters } from "@/lib/validation/filters";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardItemRow } from "@/components/dashboard-item";

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Comptes rendus
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tous les éléments validés, tous comptes rendus confondus.
        </p>
      </header>

      {/* Les compteurs portent sur la liste affichée, pas sur toute la base. */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter label="Éléments" value={counters.total} />
        <Counter label="En retard" value={counters.overdue} />
        <Counter label="À confirmer" value={counters.toConfirm} />
        <Counter label="Terminés" value={counters.done} />
      </section>

      <div className="mt-6">
        <DashboardFilters
          meetings={meetings}
          hasActiveFilter={hasActiveFilter(filters)}
        />
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {hasActiveFilter(filters)
            ? "Aucun élément ne correspond à ces filtres."
            : "Aucun élément enregistré pour le moment. Validez un compte rendu pour alimenter le tableau de bord."}
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <DashboardItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
