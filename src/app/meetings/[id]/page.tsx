import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import { extract } from "@/lib/extraction";
import {
  DEFAULT_STATUS,
  KIND_LABELS,
  KIND_LABELS_PLURAL,
  PRIORITIES,
  STATUSES,
  type Kind,
  type Priority,
  type Status,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ItemPreview, type PreviewItem } from "@/components/item-preview";
import { ReviewForm, type EditableItem } from "@/components/review-form";
import { deserializeProposal } from "@/lib/extraction/proposal";
import { toDateInputValue } from "@/lib/dates";

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

  const isReviewed = meeting.reviewedAt !== null;

  // Une proposition IA a été mémorisée à la création : on la relit plutôt que
  // de relancer un appel facturé à chaque affichage. Si elle est illisible, on
  // retombe sur les règles comme pour n'importe quel autre échec.
  const aiProposal = meeting.aiProposal
    ? deserializeProposal(meeting.aiProposal)
    : null;

  // Sinon l'extraction par règles est rejouée à l'affichage : elle est
  // déterministe et gratuite, il n'y a aucun état intermédiaire à stocker.
  // Rien n'est écrit en base à ce stade.
  const items: PreviewItem[] = isReviewed
    ? meeting.items
    : (aiProposal ??
      (await extract({
        rawContent: meeting.rawContent,
        meetingDate: meeting.meetingDate,
      })));

  // L'IA a été demandée mais n'a rien donné d'exploitable : le motif est
  // affiché en clair et l'écran fonctionne avec le résultat des règles.
  const aiFallbackReason =
    !isReviewed && !aiProposal
      ? (meeting.aiError ??
        (meeting.aiProposal
          ? "La proposition enregistrée est illisible."
          : null))
      : null;

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
        <p className="mt-1 text-sm text-muted-foreground">{counts}</p>

        {isReviewed ? (
          items.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Aucun élément n&apos;a été enregistré pour ce compte rendu.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {items.map((item, index) => (
                <ItemPreview key={index} item={item} />
              ))}
            </ul>
          )
        ) : (
          <>
            {/* L'échec de l'IA est dit franchement, avec son motif, plutôt que
                masqué par un repli silencieux. */}
            {aiFallbackReason ? (
              <p className="mt-3 rounded-lg border border-destructive p-3 text-sm">
                <span className="font-medium text-destructive">
                  L&apos;analyse par IA a échoué —{" "}
                </span>
                {aiFallbackReason} Les éléments ci-dessous proviennent de
                l&apos;analyse par règles.
              </p>
            ) : null}

            <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {aiProposal ? "Analyse par IA. " : "Analyse par règles. "}
              </span>
              Ces éléments sont des propositions. Corrigez-les, décochez ceux
              qui n&apos;ont pas lieu d&apos;être, ajoutez ce qui manque : rien
              n&apos;est écrit en base avant votre validation.
            </p>
            <div className="mt-6">
              <ReviewForm
                meetingId={meeting.id}
                initialItems={items.map(toEditableItem)}
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// Passage du modèle d'extraction au modèle de formulaire : les champs de
// saisie ne manipulent que des chaînes, null devient la chaîne vide. Le chemin
// inverse est assuré par le schéma Zod côté serveur.
function toEditableItem(item: PreviewItem): EditableItem {
  return {
    selected: true,
    kind: item.kind as EditableItem["kind"],
    description: item.description,
    owner: item.owner ?? "",
    dueDate: item.dueDate ? toDateInputValue(item.dueDate) : "",
    priority: asPriority(item.priority),
    status: asStatus(item.status),
    needsReview: item.needsReview,
    reviewReason: item.reviewReason ?? "",
    sourceExcerpt: item.sourceExcerpt,
    isManual: false,
  };
}

// SQLite stocke des String sans contrainte : une valeur venant de la base est
// revalidée avant d'alimenter un menu déroulant, jamais castée à l'aveugle.
function asPriority(value: string | null): Priority {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : "moyenne";
}

function asStatus(value: string | null): Status {
  return STATUSES.includes(value as Status) ? (value as Status) : DEFAULT_STATUS;
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
