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

// Responsable et échéance : les deux champs que l'extraction laisse le plus
// souvent à null. Une chaîne vide vaut « non renseigné », donc null.
export const updateDetailsSchema = z.object({
  id: itemId,
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
