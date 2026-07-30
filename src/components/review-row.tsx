"use client";

import {
  KINDS,
  KIND_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Kind,
  type Priority,
  type Status,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { SourceExcerpt } from "@/components/source-excerpt";
import { StateRule } from "@/components/state-rule";
import { cn } from "@/lib/utils";
import type { EditableItem } from "./review-form";

type ReviewRowProps = {
  item: EditableItem;
  index: number;
  error?: string;
  onChange: (index: number, patch: Partial<EditableItem>) => void;
  onRemove: (index: number) => void;
};

export function ReviewRow({
  item,
  index,
  error,
  onChange,
  onRemove,
}: ReviewRowProps) {
  const fieldId = (name: string) => `item-${index}-${name}`;
  // Une information ou un point en attente n'a ni priorité ni statut.
  const isAction = item.kind === "action";

  return (
    <li
      className={cn(
        "grid grid-cols-[3px_1fr] border-b last:border-b-0",
        // Une ligne décochée reste lisible : elle n'est pas supprimée, seulement
        // écartée de l'enregistrement.
        !item.selected && "opacity-60",
        error && "bg-destructive/5",
      )}
    >
      <StateRule state={item.needsReview ? "attention" : "neutral"} />

      <div className="flex items-start gap-3 px-5 py-4">
        <input
          type="checkbox"
          id={fieldId("selected")}
          checked={item.selected}
          onChange={(event) =>
            onChange(index, { selected: event.target.checked })
          }
          className="mt-0.5 size-5 shrink-0 accent-brand"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={fieldId("selected")} className="text-base font-medium">
              Enregistrer cet élément
            </Label>
            {item.needsReview ? <Badge>À confirmer</Badge> : null}
            {item.isManual ? <Badge variant="outline">Ajout manuel</Badge> : null}
          </div>

          {/* Le motif est écrit en clair : l'utilisateur doit savoir quoi corriger. */}
          {item.reviewReason ? (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="eyebrow text-attention">À confirmer</span>
              <span className="text-muted-foreground">{item.reviewReason}</span>
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor={fieldId("description")}>Description</Label>
              <Input
                id={fieldId("description")}
                value={item.description}
                onChange={(event) =>
                  onChange(index, { description: event.target.value })
                }
                aria-invalid={Boolean(error)}
                aria-describedby={error ? fieldId("error") : undefined}
                className="mt-2"
              />
              {error ? (
                <p id={fieldId("error")} className="mt-1 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={fieldId("kind")}>Nature</Label>
                <NativeSelect
                  id={fieldId("kind")}
                  value={item.kind}
                  onChange={(event) =>
                    onChange(index, { kind: event.target.value as Kind })
                  }
                  className="mt-2 w-full"
                >
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <Label htmlFor={fieldId("owner")}>Responsable</Label>
                <Input
                  id={fieldId("owner")}
                  value={item.owner}
                  placeholder="non précisé"
                  onChange={(event) =>
                    onChange(index, { owner: event.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor={fieldId("dueDate")}>Échéance</Label>
                <Input
                  id={fieldId("dueDate")}
                  type="date"
                  value={item.dueDate}
                  onChange={(event) =>
                    onChange(index, { dueDate: event.target.value })
                  }
                  className="mt-2"
                />
              </div>

              {isAction ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={fieldId("priority")}>Priorité</Label>
                    <NativeSelect
                      id={fieldId("priority")}
                      value={item.priority}
                      onChange={(event) =>
                        onChange(index, { priority: event.target.value as Priority })
                      }
                      className="mt-2 w-full"
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor={fieldId("status")}>Statut</Label>
                    <NativeSelect
                      id={fieldId("status")}
                      value={item.status}
                      onChange={(event) =>
                        onChange(index, { status: event.target.value as Status })
                      }
                      className="mt-2 w-full"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Traçabilité : la phrase d'origine reste sous les yeux pendant l'édition. */}
          <div className="mt-4">
            <SourceExcerpt>{item.sourceExcerpt}</SourceExcerpt>
          </div>

          {item.isManual ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => onRemove(index)}
            >
              Retirer cette ligne
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
