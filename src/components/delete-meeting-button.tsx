"use client";

import { useState } from "react";
import { deleteMeeting } from "@/lib/actions/meetings";
import { Button } from "@/components/ui/button";

// Suppression en deux temps plutôt qu'un confirm() natif : le second clic
// vaut confirmation, et l'utilisateur peut annuler.
export function DeleteMeetingButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={`Supprimer le compte rendu « ${title} »`}
      >
        Supprimer
      </Button>
    );
  }

  return (
    <form action={deleteMeeting} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        Confirmer
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
