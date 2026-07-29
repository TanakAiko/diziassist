"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  updateDetailsSchema,
  updatePrioritySchema,
  updateStatusSchema,
} from "@/lib/validation/item";

export type ItemActionState = { error?: string };

// Les trois actions suivent le même contrat : valider, écrire, rafraîchir.
// Elles renvoient un message en cas d'échec plutôt que de lever, pour que
// l'interface puisse revenir sur son affichage optimiste.

export async function updateItemStatus(
  id: string,
  status: string,
): Promise<ItemActionState> {
  const parsed = updateStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { error: "Statut invalide." };
  }

  await prisma.item.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  revalidateItemViews();
  return {};
}

export async function updateItemPriority(
  id: string,
  priority: string,
): Promise<ItemActionState> {
  const parsed = updatePrioritySchema.safeParse({ id, priority });
  if (!parsed.success) {
    return { error: "Priorité invalide." };
  }

  await prisma.item.update({
    where: { id: parsed.data.id },
    data: { priority: parsed.data.priority },
  });

  revalidateItemViews();
  return {};
}

export async function updateItemDetails(
  _previousState: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = updateDetailsSchema.safeParse({
    id: formData.get("id"),
    owner: formData.get("owner") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const { id, owner, dueDate } = parsed.data;

  // Compléter ce qui manquait lève le signalement : c'est précisément ce que
  // l'utilisateur vient de faire.
  const item = await prisma.item.findUnique({
    where: { id },
    select: { needsReview: true, kind: true },
  });
  if (!item) {
    return { error: "Cet élément n'existe plus." };
  }

  const resolved =
    item.needsReview && item.kind === "action" && owner !== null && dueDate !== null;

  await prisma.item.update({
    where: { id },
    data: {
      owner,
      dueDate,
      ...(resolved ? { needsReview: false, reviewReason: null } : {}),
    },
  });

  revalidateItemViews();
  return {};
}

// Un élément modifié apparaît aussi sur la fiche de son compte rendu :
// « layout » revalide toutes les routes sous /meetings, sans avoir à
// remonter l'identifiant du compte rendu jusqu'ici.
function revalidateItemViews() {
  revalidatePath("/dashboard");
  revalidatePath("/meetings", "layout");
  revalidatePath("/");
}
