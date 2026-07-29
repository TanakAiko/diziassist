import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import { extract } from "@/lib/extraction";
import { KIND_LABELS, KIND_LABELS_PLURAL, type Kind } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ItemPreview, type PreviewItem } from "@/components/item-preview";

// Next 15 : params est asynchrone.
export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!meeting) {
    notFound();
  }

  // Tant que le compte rendu n'est pas validé, l'extraction est rejouée à
  // l'affichage : elle est déterministe, aucun état intermédiaire à stocker.
  // Rien n'est écrit en base à ce stade.
  const isReviewed = meeting.reviewedAt !== null;
  const items: PreviewItem[] = isReviewed
    ? meeting.items
    : await extract({
        rawContent: meeting.rawContent,
        meetingDate: meeting.meetingDate,
      });

  const counts = countByKind(items);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Comptes rendus
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Réunion du {formatLongDate(meeting.meetingDate)}
          </p>
        </div>
        {isReviewed ? (
          <Badge variant="secondary">Validé</Badge>
        ) : (
          <Badge>À valider</Badge>
        )}
      </header>

      <section className="mt-8">
        <details className="rounded-lg border">
          <summary className="cursor-pointer p-4 text-sm font-medium">
            Compte rendu original
          </summary>
          <p className="whitespace-pre-wrap border-t p-4 text-sm leading-relaxed">
            {meeting.rawContent}
          </p>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">
          {isReviewed ? "Éléments enregistrés" : "Éléments proposés"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts}
        </p>
        {!isReviewed ? (
          <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Ces éléments ne sont pas encore enregistrés. L&apos;écran de
            validation permettra de les corriger, d&apos;en écarter et d&apos;en
            ajouter avant enregistrement.
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Aucun élément n&apos;a pu être extrait de ce compte rendu.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((item, index) => (
              <ItemPreview key={index} item={item} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function countByKind(items: PreviewItem[]): string {
  const order: Kind[] = ["action", "pending", "info"];
  const parts = order
    .map((kind) => {
      const total = items.filter((item) => item.kind === kind).length;
      if (total === 0) return null;
      const label =
        total > 1 ? KIND_LABELS_PLURAL[kind] : KIND_LABELS[kind].toLowerCase();
      return `${total} ${label}`;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : "Aucun élément";
}
