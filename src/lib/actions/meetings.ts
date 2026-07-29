"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  meetingFormSchema,
  meetingIdSchema,
  toFieldErrors,
} from "@/lib/validation/meeting";

// Retour commun aux formulaires : soit l'action réussit, soit elle renvoie
// un message par champ, affiché sous le champ concerné (jamais d'alert()).
export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function createMeeting(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = meetingFormSchema.safeParse({
    title: formData.get("title"),
    meetingDate: formData.get("meetingDate"),
    rawContent: formData.get("rawContent"),
  });

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error) };
  }

  // Deux boutons de soumission : l'analyse par règles reste le comportement
  // par défaut, l'IA n'est retenue que si l'utilisateur la demande explicitement.
  const useAi = formData.get("mode") === "ia";

  // L'appel à l'IA a lieu maintenant, une seule fois, et sa proposition est
  // mémorisée. Contrairement aux règles — déterministes et gratuites — on ne
  // peut pas la rejouer à chaque affichage de la page.
  let aiProposal: string | null = null;
  let aiError: string | null = null;

  if (useAi) {
    const { extractWithAi } = await import("@/lib/extraction/ai");
    const { serializeProposal } = await import("@/lib/extraction/proposal");

    const outcome = await extractWithAi({
      rawContent: parsed.data.rawContent,
      meetingDate: parsed.data.meetingDate,
    });

    if (outcome.status === "ok") {
      aiProposal = serializeProposal(outcome.items);
    } else {
      // L'échec n'interrompt pas la création : le compte rendu est enregistré,
      // l'écran de validation affiche le motif et les éléments issus des règles.
      aiError = outcome.message;
    }
  }

  // Le compte rendu est créé sans aucun item : l'extraction est proposée à
  // l'écran suivant et rien n'est enregistré avant validation explicite.
  const meeting = await prisma.meeting.create({
    data: { ...parsed.data, aiProposal, aiError },
  });

  revalidatePath("/");
  redirect(`/meetings/${meeting.id}`);
}

export async function deleteMeeting(formData: FormData): Promise<void> {
  const parsed = meetingIdSchema.safeParse(formData.get("id"));
  if (!parsed.success) {
    return;
  }

  // La suppression des items associés est assurée par onDelete: Cascade.
  await prisma.meeting.delete({ where: { id: parsed.data } });

  revalidatePath("/");
}
