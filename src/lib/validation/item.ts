import { z } from "zod";
import { PRIORITIES, STATUSES } from "@/lib/constants";

const itemId = z.string().trim().min(1, "Élément introuvable.");

export const updateStatusSchema = z.object({
  id: itemId,
  status: z.enum(STATUSES),
});

export const updatePrioritySchema = z.object({
  id: itemId,
  priority: z.enum(PRIORITIES),
});

export const deleteItemSchema = z.object({ id: itemId });

// Description, responsable et échéance. Les deux derniers sont ceux que
// l'extraction laisse le plus souvent à null : une chaîne vide vaut
// « non renseigné », donc null. La description, elle, reste obligatoire —
// un élément sans intitulé n'est pas rattrapable.
export const updateDetailsSchema = z.object({
  id: itemId,
  // Mêmes bornes que dans le schéma de validation initiale : un élément ne
  // change pas de règle selon l'écran depuis lequel on le modifie.
  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire.")
    .max(500, "La description ne doit pas dépasser 500 caractères."),
  owner: z
    .string()
    .trim()
    .max(100, "Le responsable ne doit pas dépasser 100 caractères.")
    .transform((value) => (value === "" ? null : value)),
  dueDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "L'échéance n'est pas une date valide.",
    })
    .transform((value) =>
      value === "" ? null : new Date(`${value}T00:00:00.000Z`),
    ),
});
