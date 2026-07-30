import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatLongDate, toDateInputValue } from "@/lib/dates";
import { extract } from "@/lib/extraction";
import {
  DEFAULT_STATUS,
  KINDS,
  KIND_LABELS_PLURAL,
  PRIORITIES,
  STATUSES,
  type Priority,
  type Status,
} from "@/lib/constants";
import { ItemPreview, type PreviewItem } from "@/components/item-preview";
import { ReviewForm, type EditableItem } from "@/components/review-form";
import { ReviewStateBadge } from "@/components/review-state-badge";
import { deserializeProposal } from "@/lib/extraction/proposal";

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Réunion du {formatLongDate(meeting.meetingDate)}
          </p>
        </div>
        <ReviewStateBadge reviewedAt={meeting.reviewedAt} />
      </header>

      {/* Deux colonnes : l'extraction à gauche, le texte source à droite et
          collant. Comparer une proposition à la phrase qui l'a produite est le
          geste central de cet écran — les deux doivent tenir à l'écran ensemble. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="min-w-0">
          {isReviewed ? (
            <ReviewedItems items={items} />
          ) : (
            <>
              {/* L'échec de l'IA est dit franchement, avec son motif, plutôt que
                  masqué par un repli silencieux. */}
              {aiFallbackReason ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-base">
                  <span className="font-medium text-destructive">
                    L&apos;analyse par IA a échoué —{" "}
                  </span>
                  {aiFallbackReason} Les éléments ci-dessous proviennent de
                  l&apos;analyse par règles.
                </p>
              ) : null}

              <div className="mt-4 rounded-md border border-dashed bg-muted/40 p-4">
                <p className="eyebrow text-brand-text">
                  {aiProposal ? "Analyse par IA" : "Analyse par règles"}
                </p>
                <p className="mt-1.5 text-base text-muted-foreground">
                  Ces éléments sont des propositions. Corrigez-les, décochez ceux
                  qui n&apos;ont pas lieu d&apos;être, ajoutez ce qui manque :
                  rien n&apos;est écrit en base avant votre validation.
                </p>
              </div>

              <div className="mt-6">
                <ReviewForm
                  meetingId={meeting.id}
                  initialItems={items.map(toEditableItem)}
                />
              </div>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-6">
          <h2 className="eyebrow text-muted-foreground">Compte rendu original</h2>
          <p className="mt-2 max-h-[60vh] overflow-y-auto rounded-md border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {meeting.rawContent}
          </p>
        </aside>
      </div>
    </main>
  );
}

// Les éléments enregistrés sont regroupés par nature. Le compte rendu de
// référence doit produire 5 actions, 2 points en attente et 1 information :
// regroupé, ce résultat se vérifie d'un coup d'œil au lieu de se compter à la
// main dans une liste unique.
function ReviewedItems({ items }: { items: PreviewItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-card px-6 py-14 text-center text-base text-muted-foreground">
        Aucun élément n&apos;a été enregistré pour ce compte rendu.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {KINDS.map((kind) => {
        const group = items.filter((item) => item.kind === kind);
        if (group.length === 0) return null;

        return (
          <section key={kind}>
            <h2 className="flex items-baseline gap-2 text-xl font-medium">
              <span className="first-letter:uppercase">
                {KIND_LABELS_PLURAL[kind]}
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                {group.length}
              </span>
            </h2>
            <ul className="mt-3 overflow-hidden rounded-md border bg-card">
              {group.map((item, index) => (
                <ItemPreview key={index} item={item} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
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
