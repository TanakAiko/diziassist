"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_STATUS,
  MANUAL_SOURCE_EXCERPT,
  type Kind,
  type Priority,
  type Status,
} from "@/lib/constants";
import { saveReview, type ReviewState } from "@/lib/actions/review";
import { Button } from "@/components/ui/button";
import { ReviewRow } from "@/components/review-row";

// Version éditable d'un élément proposé : tous les champs sont des chaînes,
// c'est ce que manipulent les champs de formulaire. La conversion en null et
// en Date a lieu côté serveur, dans le schéma Zod.
export type EditableItem = {
  selected: boolean;
  kind: Kind;
  description: string;
  owner: string;
  dueDate: string;
  // Restreints aux valeurs autorisées : les menus déroulants sont alimentés par
  // les mêmes unions que les schémas Zod, il n'y a pas d'autre valeur possible.
  priority: Priority;
  status: Status;
  needsReview: boolean;
  reviewReason: string;
  sourceExcerpt: string;
  isManual: boolean;
};

export function ReviewForm({
  meetingId,
  initialItems,
}: {
  meetingId: string;
  initialItems: EditableItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [state, setState] = useState<ReviewState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const itemErrors = state.status === "error" ? (state.itemErrors ?? {}) : {};
  const selectedCount = items.filter((item) => item.selected).length;

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((current) =>
      current.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, position) => position !== index));
  }

  // Une action absente du compte rendu ne doit pas être perdue.
  function addItem() {
    setItems((current) => [
      ...current,
      {
        selected: true,
        kind: "action",
        description: "",
        owner: "",
        dueDate: "",
        priority: "moyenne",
        status: DEFAULT_STATUS,
        needsReview: false,
        reviewReason: "",
        sourceExcerpt: MANUAL_SOURCE_EXCERPT,
        isManual: true,
      },
    ]);
  }

  function submit() {
    startTransition(async () => {
      const result = await saveReview({
        meetingId,
        items: items.map((item) => ({
          selected: item.selected,
          kind: item.kind,
          description: item.description,
          owner: item.owner,
          dueDate: item.dueDate,
          priority: item.kind === "action" ? item.priority : null,
          status: item.kind === "action" ? item.status : null,
          needsReview: item.needsReview,
          reviewReason: item.reviewReason,
          sourceExcerpt: item.sourceExcerpt,
        })),
      });

      setState(result);
      if (result.status === "success") {
        // La page repasse en mode fiche : le compte rendu est désormais validé.
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          {selectedCount} élément{selectedCount > 1 ? "s" : ""} sur{" "}
          {items.length} sera{selectedCount > 1 ? "ont" : ""} enregistré
          {selectedCount > 1 ? "s" : ""}.
        </p>
        <Button type="button" variant="outline" onClick={addItem}>
          Ajouter un élément
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed bg-card px-6 py-14 text-center text-base text-muted-foreground">
          Aucun élément n&apos;a été extrait de ce compte rendu. Vous pouvez en
          ajouter un à la main.
        </p>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-md border bg-card">
          {items.map((item, index) => (
            <ReviewRow
              key={index}
              item={item}
              index={index}
              error={itemErrors[index]}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ))}
        </ul>
      )}

      {state.status === "error" ? (
        <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-base text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t bg-background/95 py-4 backdrop-blur">
        <Button type="button" onClick={submit} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Valider et enregistrer"}
        </Button>
        <p className="text-base text-muted-foreground">
          Rien n&apos;est enregistré avant ce clic.
        </p>
      </div>
    </div>
  );
}
