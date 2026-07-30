import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Priority,
  type Status,
} from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/dates";
import { itemState } from "@/lib/items";
import { DeleteItemButton } from "@/components/delete-item-button";
import { SourceExcerpt } from "@/components/source-excerpt";
import { StateRule } from "@/components/state-rule";
import { cn } from "@/lib/utils";

// Vue commune à un élément proposé par l'extraction et à un élément enregistré :
// les deux portent exactement les mêmes champs. Les valeurs venant de la base
// sont typées `string` par SQLite, d'où les libellés cherchés prudemment.
export type PreviewItem = {
  id?: string;
  kind: string;
  description: string;
  owner: string | null;
  dueDate: Date | null;
  priority: string | null;
  status: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  sourceExcerpt: string;
};

function label<T extends string>(
  labels: Record<T, string>,
  value: string | null,
): string | null {
  if (!value) return null;
  return labels[value as T] ?? value;
}

// La ligne ne porte plus de badge de nature : la fiche regroupe les éléments par
// nature, l'information est donc déjà dans le titre de section au-dessus.
export function ItemPreview({ item }: { item: PreviewItem }) {
  const overdue = isOverdue(item.dueDate, item.status);
  const done = item.status === "termine";
  const isAction = item.kind === "action";

  // Pour une action, responsable et échéance sont affichés même absents : c'est
  // le manque qui est l'information, et le motif juste en dessous l'explique.
  // Pour une information ou un point en attente, ces champs sont nuls par règle
  // métier — la colonne disparaît au lieu d'afficher quatre tirets.
  const meta = isAction
    ? [
        { label: "Responsable", value: item.owner },
        {
          label: "Échéance",
          value: item.dueDate ? formatDate(item.dueDate) : null,
          overdue,
        },
        { label: "Priorité", value: label<Priority>(PRIORITY_LABELS, item.priority) },
        { label: "Statut", value: label<Status>(STATUS_LABELS, item.status) },
      ]
    : [];

  return (
    // Deux colonnes : ce qui est à lire à gauche, ce qui est à consulter à
    // droite. Les métadonnées s'alignent d'une ligne à l'autre au lieu de
    // s'enrouler différemment selon la longueur de la description.
    <li
      className={cn(
        "grid grid-cols-[3px_1fr] border-b last:border-b-0",
        meta.length > 0 && "sm:grid-cols-[3px_1fr_12rem]",
      )}
    >
      <StateRule state={itemState(item)} />

      <div className="min-w-0 px-5 py-4">
        <p
          className={cn(
            "text-base font-medium",
            done && "text-muted-foreground line-through",
          )}
        >
          {item.description}
        </p>

        {/* Le motif est écrit en clair : une icône seule n'apprendrait rien. */}
        {item.reviewReason ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="eyebrow text-attention">À confirmer</span>
            <span className="text-muted-foreground">{item.reviewReason}</span>
          </p>
        ) : null}

        <div className="mt-3">
          <SourceExcerpt>{item.sourceExcerpt}</SourceExcerpt>
        </div>

        {/* Présent uniquement sur un élément enregistré : une proposition
            n'existe pas encore en base, on la décoche au lieu de la supprimer. */}
        {item.id ? (
          <div className="mt-2 -ml-2">
            <DeleteItemButton id={item.id} description={item.description} />
          </div>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <dl className="col-start-2 space-y-2 px-5 pb-4 sm:col-start-3 sm:border-l sm:py-4">
          {meta.map((entry) => (
            <div key={entry.label}>
              <dt className="eyebrow text-muted-foreground">{entry.label}</dt>
              <dd
                className={cn(
                  "font-mono text-sm",
                  entry.value === null && "text-muted-foreground italic",
                  entry.overdue && "text-overdue",
                )}
              >
                {entry.value ?? "non précisé"}
                {entry.overdue ? " · en retard" : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}
