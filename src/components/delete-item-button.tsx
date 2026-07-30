"use client";

import { useState } from "react";
import { deleteItem } from "@/lib/actions/items";
import { Button } from "@/components/ui/button";

// Suppression en deux temps plutôt qu'un confirm() natif, comme pour les
// comptes rendus : le second clic vaut confirmation, et l'utilisateur peut
// revenir en arrière. Aucune boîte de dialogue du navigateur.
export function DeleteItemButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={`Supprimer l'élément « ${description} »`}
      >
        Supprimer
      </Button>
    );
  }

  return (
    <form action={deleteItem} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        Confirmer la suppression
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Annuler
      </Button>
    </form>
  );
}
