// Ce module ne doit jamais atteindre le navigateur : ANTHROPIC_API_KEY est une
// clé serveur. « server-only » transforme une importation depuis un composant
// client en erreur de compilation, plutôt qu'en fuite silencieuse.
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  DEFAULT_STATUS,
  KINDS,
  PRIORITIES,
  type Priority,
} from "@/lib/constants";
import { joinReasons } from "@/lib/review-reason";
import { normalize } from "./rules";
import type { ExtractedItem, ExtractionInput } from "./types";

// Le modèle ne renseigne que ce qu'il lit dans le texte. Ni needsReview ni
// status : ces champs sont déduits côté serveur, pour que la règle « ne jamais
// inventer » ne dépende pas de la bonne volonté du modèle.
const aiItemSchema = z.object({
  kind: z.enum(KINDS),
  description: z.string(),
  owner: z.string().nullable(),
  dueDate: z.string().nullable(),
  priority: z.enum(PRIORITIES).nullable(),
  sourceExcerpt: z.string(),
});

export const aiPayloadSchema = z.object({
  items: z.array(aiItemSchema),
});

export type AiItem = z.infer<typeof aiItemSchema>;

// Résultat explicite : l'appelant sait si l'analyse a réussi, et sinon pourquoi.
// Le message est rédigé pour l'utilisateur, jamais une trace technique brute.
export type AiExtraction =
  | { status: "ok"; items: ExtractedItem[] }
  | { status: "error"; message: string };

const SYSTEM_PROMPT = `Tu analyses des comptes rendus de réunion en français et tu en extrais des éléments structurés.

Règles absolues :
- N'invente jamais une donnée. Si le responsable ou l'échéance n'est pas explicite dans le texte, la valeur est null.
- Un sujet collectif (« l'équipe », « le groupe ») n'est pas un responsable : owner vaut null.
- sourceExcerpt doit être une phrase RECOPIÉE MOT POUR MOT du compte rendu. Ne la reformule pas, ne la tronque pas au milieu d'un mot.
- Classe en "pending" ce qui est en suspens, conditionné ou non validé, même si la phrase contient un verbe d'action.
- Classe en "info" ce qui est annoncé ou rappelé sans travail à produire : une réunion à venir, un rappel.
- Classe en "action" tout ce qui exprime une obligation ou un engagement — « doit », « devra », « est chargé de », un verbe au futur — y compris quand le sujet est une chose et non une personne. « La version doit être disponible » est une action, pas une information.
- Une phrase qui lie deux obligations par « et » produit deux éléments distincts ; le second reprend le responsable du premier.
- Une information ou un point en attente n'a ni responsable, ni échéance, ni priorité.
- Les échéances relatives (« avant jeudi ») se calculent depuis la date de la réunion qui t'est donnée, et se renvoient au format AAAA-MM-JJ.
- N'ajoute aucun élément qui ne soit pas dans le texte.`;

function buildUserPrompt({ rawContent, meetingDate }: ExtractionInput): string {
  const isoDate = meetingDate.toISOString().slice(0, 10);
  const weekday = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(meetingDate);

  return `Date de la réunion : ${isoDate} (un ${weekday}).
Toute échéance relative se calcule depuis cette date.

Compte rendu :
"""
${rawContent}
"""`;
}

// Garde n°3 : un élément dont la phrase d'origine ne figure pas réellement dans
// le compte rendu est écarté. C'est la protection contre l'hallucination — un
// modèle qui invente une action invente aussi la phrase censée la justifier.
export function isAnchored(sourceExcerpt: string, rawContent: string): boolean {
  const excerpt = normalize(sourceExcerpt).trim();
  if (excerpt.length === 0) return false;
  return normalize(rawContent).includes(excerpt);
}

function parseDueDate(value: string | null, meetingDate: Date): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  // Une échéance antérieure à la réunion est un calcul erroné, pas une donnée.
  if (parsed.getTime() < meetingDate.getTime()) return null;

  return parsed;
}

// Conversion vers le modèle interne. Les invariants métier sont appliqués ici
// et non côté modèle : priorité et statut nuls hors action, signalement déduit
// des champs manquants.
export function toExtractedItems(
  items: AiItem[],
  { rawContent, meetingDate }: ExtractionInput,
): ExtractedItem[] {
  return items
    .filter((item) => isAnchored(item.sourceExcerpt, rawContent))
    .filter((item) => item.description.trim().length > 0)
    .map((item) => {
      const isAction = item.kind === "action";
      const owner = item.owner?.trim() ? item.owner.trim() : null;
      const dueDate = isAction ? parseDueDate(item.dueDate, meetingDate) : null;

      const reviewReason = isAction
        ? joinReasons([
            owner ? null : "Responsable non identifié",
            dueDate ? null : "Échéance non précisée",
          ])
        : "À confirmer : élément en suspens dans le compte rendu";

      return {
        kind: item.kind,
        // Même présentation que l'extraction par règles : un intitulé de tâche
        // ne se termine pas par un point.
        description: item.description.trim().replace(/[.;:]+$/, ""),
        owner,
        dueDate,
        priority: isAction ? ((item.priority ?? "moyenne") as Priority) : null,
        status: isAction ? DEFAULT_STATUS : null,
        needsReview: item.kind === "info" ? false : reviewReason !== null,
        reviewReason: item.kind === "info" ? null : reviewReason,
        sourceExcerpt: item.sourceExcerpt.trim(),
      };
    });
}

// Traduit une panne technique en une phrase que l'utilisateur peut comprendre
// et sur laquelle il peut agir. La trace complète reste dans les logs serveur.
export function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "La clé API est invalide ou a été révoquée. Vérifiez ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "Cette clé API n'a pas accès au modèle demandé.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Le quota d'appels au service d'IA est atteint. Réessayez dans quelques minutes.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Le service d'IA est injoignable. Vérifiez la connexion réseau.";
  }
  if (error instanceof Anthropic.InternalServerError) {
    return "Le service d'IA est momentanément indisponible. Réessayez plus tard.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Le service d'IA a renvoyé une erreur (${error.status}).`;
  }
  return "L'analyse par IA a échoué pour une raison inattendue.";
}

// Ne lève jamais : renvoie soit les éléments, soit un motif d'échec en clair.
// L'appelant décide quoi en faire — ici, retomber sur l'extraction par règles.
export async function extractWithAi(
  input: ExtractionInput,
): Promise<AiExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message:
        "Aucune clé API n'est configurée sur le serveur. Renseignez ANTHROPIC_API_KEY dans .env.",
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    // Garde n°1 : le format de sortie est imposé par l'API elle-même
    // (structured outputs), et pas seulement demandé dans le prompt.
    // Garde n°2 : la réponse est validée par le schéma Zod.
    const response = await client.messages.parse({
      // L'extraction structurée est une tâche bornée : Sonnet suffit largement
      // et coûte nettement moins qu'Opus pour un résultat équivalent ici.
      model: "claude-sonnet-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      output_config: {
        format: zodOutputFormat(aiPayloadSchema),
        // L'extraction est une tâche bornée : inutile de payer une réflexion
        // longue là où l'utilisateur attend devant son écran.
        effort: "medium",
      },
    });

    if (response.stop_reason === "refusal") {
      return {
        status: "error",
        message: "Le modèle a refusé d'analyser ce compte rendu.",
      };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        status: "error",
        message: "La réponse du modèle n'a pas pu être exploitée.",
      };
    }

    // Garde n°3 : ancrage de chaque élément dans le texte source.
    const items = toExtractedItems(parsed.items, input);
    if (items.length === 0) {
      return {
        status: "error",
        message:
          "L'IA n'a produit aucun élément vérifiable dans le texte du compte rendu.",
      };
    }

    return { status: "ok", items };
  } catch (error) {
    // La trace technique reste côté serveur ; l'utilisateur reçoit une phrase.
    console.error("Échec de l'extraction par IA :", error);
    return { status: "error", message: describeAiError(error) };
  }
}
