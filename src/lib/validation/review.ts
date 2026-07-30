import { z } from "zod";
import { KINDS, PRIORITIES, STATUSES } from "@/lib/constants";

// Un champ texte vide dans un formulaire signifie « non renseigné », donc null.
// C'est le seul endroit où la conversion a lieu : jamais de chaîne vide en base.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Ce champ ne doit pas dépasser ${max} caractères.`)
    .nullable()
    .transform((value) => (value === "" || value === null ? null : value));

// Saisie d'un <input type="date"> : AAAA-MM-JJ, ou vide si aucune échéance.
const optionalDate = z
  .string()
  .nullable()
  .transform((value) => (value === "" || value === null ? null : value))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "L'échéance n'est pas une date valide.",
  })
  .transform((value) => (value === null ? null : new Date(`${value}T00:00:00.000Z`)));

export const reviewItemSchema = z.object({
  // Une ligne décochée reste affichée mais n'est pas enregistrée.
  selected: z.boolean(),
  kind: z.enum(KINDS),
  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire.")
    .max(500, "La description ne doit pas dépasser 500 caractères."),
  owner: optionalText(100),
  dueDate: optionalDate,
  priority: z.enum(PRIORITIES).nullable(),
  status: z.enum(STATUSES).nullable(),
  needsReview: z.boolean(),
  reviewReason: optionalText(300),
  // Aucun élément ne peut exister sans preuve d'origine.
  sourceExcerpt: z
    .string()
    .trim()
    .min(1, "L'origine de l'élément est obligatoire."),
});

export const reviewSchema = z.object({
  meetingId: z.string().trim().min(1, "Compte rendu introuvable."),
  items: z.array(reviewItemSchema),
});

export type ReviewItemInput = z.input<typeof reviewItemSchema>;
export type ReviewInput = z.input<typeof reviewSchema>;

// Une information et un point en attente n'ont ni responsable, ni échéance, ni
// priorité, ni statut : ces champs sont nullables par nature métier. L'invariant
// est appliqué côté serveur pour qu'il tienne quel que soit ce qu'envoie le
// client — le formulaire masque déjà ces champs, mais il ne fait pas foi.
export function normalizeByKind<
  T extends {
    kind: string;
    owner: unknown;
    dueDate: unknown;
    priority: unknown;
    status: unknown;
  },
>(item: T): T {
  if (item.kind === "action") {
    return item;
  }
  // Règle métier : une information ou un point en attente n'a ni responsable,
  // ni échéance, ni priorité, ni statut. Le nettoyage a lieu ici, au moment de
  // l'écriture, et pas seulement dans le formulaire : la Server Action est un
  // endpoint public et ne peut pas faire confiance à ce qu'elle reçoit.
  return { ...item, owner: null, dueDate: null, priority: null, status: null };
}
