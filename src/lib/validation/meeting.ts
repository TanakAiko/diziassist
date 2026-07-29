import { z } from "zod";

// Une Server Action est un endpoint public : elle peut être appelée avec
// n'importe quel payload. Toute entrée passe par ces schémas avant la base.

export const meetingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Le titre est obligatoire.")
    .max(200, "Le titre ne doit pas dépasser 200 caractères."),

  // Saisie via <input type="date"> : format AAAA-MM-JJ.
  // La date est interprétée en UTC pour rester stable quel que soit le fuseau
  // du navigateur — c'est elle qui sert de repère aux échéances relatives.
  meetingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date de réunion est obligatoire.")
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine((date) => !Number.isNaN(date.getTime()), {
      message: "La date de réunion n'est pas valide.",
    }),

  rawContent: z
    .string()
    .trim()
    .min(20, "Le compte rendu est trop court pour être exploité."),
});

export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export const meetingIdSchema = z
  .string()
  .trim()
  .min(1, "Identifiant de compte rendu manquant.");
