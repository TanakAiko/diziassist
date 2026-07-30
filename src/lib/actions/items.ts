"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { remainingReviewReason } from "@/lib/review-reason";
import {
  deleteItemSchema,
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
    description: formData.get("description") ?? "",
    owner: formData.get("owner") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const { id, description, owner, dueDate } = parsed.data;

  // Compléter ce qui manquait lève le signalement : c'est précisément ce que
  // l'utilisateur vient de faire.
  const item = await prisma.item.findUnique({
    where: { id },
    select: { kind: true, reviewReason: true },
  });
  if (!item) {
    return { error: "Cet élément n'existe plus." };
  }

  // Correctif : le motif n'est pas vidé en bloc. Renseigner le responsable et
  // l'échéance lève « Responsable non identifié » et « Échéance non précisée »,
  // mais laisse intact un « Validateur non identifié », que personne n'a traité.
  const remaining = remainingReviewReason(item.reviewReason, { owner, dueDate });

  // Règle métier : seule une action porte un responsable et une échéance.
  // La Server Action est un endpoint public, elle ne se repose donc pas sur le
  // fait que le formulaire masque déjà ces champs hors action.
  const isAction = item.kind === "action";

  await prisma.item.update({
    where: { id },
    data: {
      description,
      owner: isAction ? owner : null,
      dueDate: isAction ? dueDate : null,
      needsReview: remaining !== null,
      reviewReason: remaining,
    },
  });

  revalidateItemViews();
  return {};
}

// Suppression d'un élément déjà enregistré. Elle est définitive : l'élément
// n'est pas marqué supprimé, il est retiré. C'est cohérent avec le reste du
// modèle, qui ne stocke aucun état dérivé — et la confirmation en deux temps
// côté interface est ce qui protège l'utilisateur, pas une colonne en base.
export async function deleteItem(formData: FormData): Promise<void> {
  const parsed = deleteItemSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return;
  }

  // deleteMany plutôt que delete : supprimer un élément déjà supprimé dans un
  // autre onglet ne doit pas lever, juste ne rien faire.
  await prisma.item.deleteMany({ where: { id: parsed.data.id } });

  revalidateItemViews();
}

// Un élément modifié apparaît aussi sur la fiche de son compte rendu :
// « layout » revalide toutes les routes sous /meetings, sans avoir à
// remonter l'identifiant du compte rendu jusqu'ici.
function revalidateItemViews() {
  revalidatePath("/dashboard");
  revalidatePath("/meetings", "layout");
  revalidatePath("/");
}
