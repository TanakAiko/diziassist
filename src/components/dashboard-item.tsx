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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <li
      className={cn(
        "rounded-lg border p-4",
        status === "termine" && "opacity-70",
        overdue && "border-destructive/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {KIND_LABELS[item.kind as Kind] ?? item.kind}
        </Badge>
        {item.needsReview ? <Badge>À confirmer</Badge> : null}
        {overdue ? <Badge variant="destructive">En retard</Badge> : null}
        <Link
          href={`/meetings/${item.meeting.id}`}
          className="ml-auto text-sm text-muted-foreground hover:underline"
        >
          {item.meeting.title}
        </Link>
      </div>

      <p
        className={cn(
          "mt-2 font-medium",
          status === "termine" && "line-through",
        )}
      >
        {item.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className={cn(!item.owner && "text-muted-foreground italic")}>
          {item.owner ?? "responsable non précisé"}
        </span>
        <span className={cn(!item.dueDate && "text-muted-foreground italic")}>
          {item.dueDate ? formatDate(item.dueDate) : "échéance non précisée"}
        </span>

        {isAction ? (
          <>
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut</span>
              <select
                value={status ?? ""}
                onChange={(event) => changeStatus(event.target.value)}
                aria-label={`Statut de « ${item.description} »`}
                className="h-7 rounded-lg border bg-background px-2 text-sm"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value as Status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Priorité</span>
              <select
                value={priority ?? ""}
                onChange={(event) => changePriority(event.target.value)}
                aria-label={`Priorité de « ${item.description} »`}
                className="h-7 rounded-lg border bg-background px-2 text-sm"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value as Priority]}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing((current) => !current)}
          aria-expanded={editing}
        >
          {editing ? "Fermer" : "Modifier"}
        </Button>
      </div>

      {item.reviewReason ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">À confirmer — </span>
          {item.reviewReason}
        </p>
      ) : null}

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      {editing ? (
        <DetailsPanel item={item} onDone={() => setEditing(false)} />
      ) : null}

      <p className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground italic">
        {item.sourceExcerpt}
      </p>
    </li>
  );
}

// Responsable et échéance passent par un panneau d'édition et non par une
// modification en ligne : ce sont des champs de saisie libre, qui méritent
// une validation explicite avant écriture.
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
    <form action={formAction} className="mt-4 rounded-lg border p-4">
      <input type="hidden" name="id" value={item.id} />
      <div className="grid gap-4 sm:grid-cols-2">
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

      {state.error ? (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
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
  );
}
