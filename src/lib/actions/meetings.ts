"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { meetingFormSchema, meetingIdSchema } from "@/lib/validation/meeting";

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
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      // Premier message par champ : inutile d'en empiler plusieurs.
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { errors };
  }

  // Le compte rendu est créé sans aucun item : l'extraction est proposée à
  // l'écran suivant et rien n'est enregistré avant validation explicite.
  const meeting = await prisma.meeting.create({ data: parsed.data });

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
