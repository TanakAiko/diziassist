import {
  KIND_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Kind,
  type Priority,
  type Status,
} from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Vue commune à un élément proposé par l'extraction et à un élément enregistré :
// les deux portent exactement les mêmes champs. Les valeurs venant de la base
// sont typées `string` par SQLite, d'où les libellés cherchés prudemment.
export type PreviewItem = {
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

export function ItemPreview({ item }: { item: PreviewItem }) {
  const overdue = isOverdue(item.dueDate, item.status);

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {label<Kind>(KIND_LABELS, item.kind) ?? item.kind}
        </Badge>
        {item.needsReview ? <Badge>À confirmer</Badge> : null}
        {overdue ? <Badge variant="destructive">En retard</Badge> : null}
      </div>

      <p className="mt-2 font-medium">{item.description}</p>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Responsable :</dt>
          <dd className={cn(!item.owner && "text-muted-foreground italic")}>
            {item.owner ?? "non précisé"}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Échéance :</dt>
          <dd className={cn(!item.dueDate && "text-muted-foreground italic")}>
            {item.dueDate ? formatDate(item.dueDate) : "non précisée"}
          </dd>
        </div>
        {item.priority ? (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Priorité :</dt>
            <dd>{label<Priority>(PRIORITY_LABELS, item.priority)}</dd>
          </div>
        ) : null}
        {item.status ? (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Statut :</dt>
            <dd>{label<Status>(STATUS_LABELS, item.status)}</dd>
          </div>
        ) : null}
      </dl>

      {/* Le motif est écrit en clair : une icône seule n'apprendrait rien. */}
      {item.reviewReason ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">À confirmer — </span>
          {item.reviewReason}
        </p>
      ) : null}

      {/* Traçabilité à la phrase près : d'où sort cet élément. */}
      <p className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground italic">
        {item.sourceExcerpt}
      </p>
    </li>
  );
}
