import { prisma } from "@/lib/db";
import {
  normalizeByKind,
  reviewSchema,
  type ReviewInput,
} from "@/lib/validation/review";

export type ReviewState =
  | { status: "idle" }
  // Erreurs rattachées à la ligne concernée, pour un affichage au bon endroit.
  | { status: "error"; message: string; itemErrors?: Record<number, string> }
  | { status: "success"; saved: number };

// Erreur métier attendue, distinguée d'une panne technique.
class ReviewError extends Error {}

// Cœur de la validation, isolé de la couche Next : ni "use server", ni
// revalidatePath. C'est le chemin le plus risqué du projet — il doit pouvoir
// être exercé directement, sans passer par le protocole des Server Actions.
export async function persistReview(input: ReviewInput): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse(input);

  if (!parsed.success) {
    const itemErrors: Record<number, string> = {};
    for (const issue of parsed.error.issues) {
      // Chemin attendu : ["items", <index>, <champ>]
      const [root, index] = issue.path;
      if (root === "items" && typeof index === "number" && !itemErrors[index]) {
        itemErrors[index] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Certains éléments sont incomplets.",
      itemErrors,
    };
  }

  const { meetingId, items } = parsed.data;
  const selected = items.filter((item) => item.selected).map(normalizeByKind);

  try {
    // Création des éléments et passage du compte rendu à l'état validé :
    // les deux réussissent ou aucun des deux. Sans transaction, une erreur
    // à mi-parcours laisserait un compte rendu validé mais vide.
    await prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.findUnique({
        where: { id: meetingId },
        select: { reviewedAt: true },
      });

      if (!meeting) {
        throw new ReviewError("Ce compte rendu n'existe plus.");
      }
      // Rejouer une validation dupliquerait les éléments déjà enregistrés.
      if (meeting.reviewedAt) {
        throw new ReviewError("Ce compte rendu a déjà été validé.");
      }

      if (selected.length > 0) {
        await tx.item.createMany({
          data: selected.map((item) => ({
            meetingId,
            kind: item.kind,
            description: item.description,
            owner: item.owner,
            dueDate: item.dueDate,
            priority: item.priority,
            status: item.status,
            needsReview: item.needsReview,
            reviewReason: item.reviewReason,
            sourceExcerpt: item.sourceExcerpt,
          })),
        });
      }

      await tx.meeting.update({
        where: { id: meetingId },
        data: { reviewedAt: new Date() },
      });
    });
  } catch (error) {
    if (error instanceof ReviewError) {
      return { status: "error", message: error.message };
    }
    // L'utilisateur n'a pas à lire une erreur Prisma ; la trace reste serveur.
    console.error("Échec de l'enregistrement de la validation :", error);
    return {
      status: "error",
      message: "L'enregistrement a échoué. Aucun élément n'a été enregistré.",
    };
  }

  return { status: "success", saved: selected.length };
}
