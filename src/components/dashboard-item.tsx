"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import {
  KIND_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Kind,
  type Priority,
  type Status,
} from "@/lib/constants";
import {
  updateItemDetails,
  updateItemPriority,
  updateItemStatus,
  type ItemActionState,
} from "@/lib/actions/items";
import { formatDate, isOverdue, toDateInputValue } from "@/lib/dates";
import { itemState } from "@/lib/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteItemButton } from "@/components/delete-item-button";
import { NativeSelect } from "@/components/native-select";
import { SourceExcerpt } from "@/components/source-excerpt";
import { StateRule } from "@/components/state-rule";
import { cn } from "@/lib/utils";

export type DashboardItem = {
  id: string;
  kind: string;
  description: string;
  owner: string | null;
  dueDate: Date | null;
  priority: string | null;
  status: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  sourceExcerpt: string;
  meeting: { id: string; title: string };
};

export function DashboardItemRow({ item }: { item: DashboardItem }) {
  // Le statut affiché suit le clic immédiatement ; si l'écriture échoue,
  // React réapplique la valeur venue du serveur.
  const [status, setStatus] = useOptimistic(item.status);
  const [priority, setPriority] = useOptimistic(item.priority);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const isAction = item.kind === "action";
  const overdue = isOverdue(item.dueDate, status);
  const done = status === "termine";

  function changeStatus(next: string) {
    setError(null);
    startTransition(async () => {
      setStatus(next);
      const result = await updateItemStatus(item.id, next);
      if (result.error) setError(result.error);
    });
  }

  function changePriority(next: string) {
    setError(null);
    startTransition(async () => {
      setPriority(next);
      const result = await updateItemPriority(item.id, next);
      if (result.error) setError(result.error);
    });
  }

  return (
    // Trois zones plutôt qu'une pile : ce qui se lit, ce qui se consulte, ce
    // qui se manipule. Les commandes sont toujours au même endroit d'une ligne
    // à l'autre, au lieu de flotter au bout d'un enroulement de texte.
    <li className="grid grid-cols-[3px_1fr] border-b last:border-b-0 lg:grid-cols-[3px_1fr_11rem_13rem]">
      <StateRule state={itemState({ ...item, status })} />

      <div className="min-w-0 px-5 py-4">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="eyebrow text-muted-foreground">
            {KIND_LABELS[item.kind as Kind] ?? item.kind}
          </span>
          <Link
            href={`/meetings/${item.meeting.id}`}
            className="font-mono text-sm text-muted-foreground hover:text-brand-text hover:underline"
          >
            {item.meeting.title}
          </Link>
        </p>

        <p
          className={cn(
            "mt-1 text-base font-medium",
            done && "text-muted-foreground line-through",
          )}
        >
          {item.description}
        </p>

        {item.reviewReason ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="eyebrow text-attention">À confirmer</span>
            <span className="text-muted-foreground">{item.reviewReason}</span>
          </p>
        ) : null}

        <div className="mt-3">
          <SourceExcerpt>{item.sourceExcerpt}</SourceExcerpt>
        </div>

        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {editing ? (
          <DetailsPanel item={item} onDone={() => setEditing(false)} />
        ) : null}
      </div>

      {/* Responsable et échéance : consultés, pas modifiés en ligne. Réservés
          aux actions — une information n'en porte pas. La cellule suivante a un
          col-start explicite, l'omettre ne décale donc pas les commandes. */}
      {isAction ? (
        <dl className="col-start-2 space-y-2 px-5 pb-4 lg:col-start-3 lg:border-l lg:py-4">
          <div>
            <dt className="eyebrow text-muted-foreground">Responsable</dt>
            <dd
              className={cn(
                "font-mono text-sm",
                !item.owner && "text-muted-foreground italic",
              )}
            >
              {item.owner ?? "non précisé"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Échéance</dt>
            <dd
              className={cn(
                "font-mono text-sm",
                !item.dueDate && "text-muted-foreground italic",
                overdue && "text-overdue",
              )}
            >
              {item.dueDate ? formatDate(item.dueDate) : "non précisée"}
              {overdue ? " · en retard" : null}
            </dd>
          </div>
        </dl>
      ) : null}

      {/* Statut et priorité : les deux seuls champs modifiables d'un clic, donc
          les deux seuls à mériter une place fixe à droite de chaque ligne. */}
      <div className="col-start-2 space-y-2 px-5 pb-4 lg:col-start-4 lg:border-l lg:py-4">
        {isAction ? (
          <>
            <label className="block">
              <span className="eyebrow text-muted-foreground">Statut</span>
              <NativeSelect
                value={status ?? ""}
                onChange={(event) => changeStatus(event.target.value)}
                aria-label={`Statut de « ${item.description} »`}
                className="mt-1 w-full"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value as Status]}
                  </option>
                ))}
              </NativeSelect>
            </label>

            <label className="block">
              <span className="eyebrow text-muted-foreground">Priorité</span>
              <NativeSelect
                value={priority ?? ""}
                onChange={(event) => changePriority(event.target.value)}
                aria-label={`Priorité de « ${item.description} »`}
                className="mt-1 w-full"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value as Priority]}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setEditing((current) => !current)}
          aria-expanded={editing}
        >
          {editing ? "Fermer" : "Modifier"}
        </Button>
      </div>
    </li>
  );
}

// Titre, responsable et échéance passent par un panneau d'édition et non par
// une modification en ligne : ce sont des champs de saisie libre, qui méritent
// une validation explicite avant écriture. La suppression est rangée ici pour
// la même raison — rien de destructif ne doit être à un clic dans la liste.
function DetailsPanel({
  item,
  onDone,
}: {
  item: DashboardItem;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    ItemActionState,
    FormData
  >(async (previous, formData) => {
    const result = await updateItemDetails(previous, formData);
    if (!result.error) onDone();
    return result;
  }, {});

  return (
    <div className="mt-4 rounded-md border bg-muted/40 p-4">
      <form action={formAction}>
        <input type="hidden" name="id" value={item.id} />

        <div>
          <Label htmlFor={`description-${item.id}`}>Titre</Label>
          <Input
            id={`description-${item.id}`}
            name="description"
            defaultValue={item.description}
            aria-invalid={Boolean(state.error)}
            className="mt-2"
          />
        </div>

        {/* Responsable et échéance ne sont proposés que sur une action : hors
            action, la Server Action les remet à null de toute façon. */}
        {item.kind === "action" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`owner-${item.id}`}>Responsable</Label>
              <Input
                id={`owner-${item.id}`}
                name="owner"
                defaultValue={item.owner ?? ""}
                placeholder="non précisé"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor={`due-${item.id}`}>Échéance</Label>
              <Input
                id={`due-${item.id}`}
                name="dueDate"
                type="date"
                defaultValue={item.dueDate ? toDateInputValue(item.dueDate) : ""}
                className="mt-2"
              />
            </div>
          </div>
        ) : null}

        {state.error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </form>

      {/* La suppression est rangée derrière « Modifier » et sous un filet :
          elle reste atteignable en deux clics, jamais atteignable par erreur
          depuis la liste. */}
      <div className="mt-4 flex justify-end border-t pt-3">
        <DeleteItemButton id={item.id} description={item.description} />
      </div>
    </div>
  );
}
