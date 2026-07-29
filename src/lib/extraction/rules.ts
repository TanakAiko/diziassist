import { DEFAULT_STATUS, type Priority } from "@/lib/constants";
import type { ExtractedItem, ExtractionInput } from "./types";

// Extraction déterministe, sans dépendance ni appel réseau.
//
// L'ordre du pipeline est le cœur de la logique : les non-actions sont testées
// AVANT les actions. « Le budget n'a pas encore été validé » contient « validé » ;
// en cherchant les actions d'abord, on produirait « valider le budget » avec un
// responsable inventé. Règle n°1 du projet : ne jamais inventer de donnée.

// --------------------------------------------------------------------------
// Dictionnaires
// --------------------------------------------------------------------------

// 1. Non-actions : un sujet ouvert, pas une tâche assignée.
const PENDING_RULES: { pattern: RegExp; reason: (match: RegExpMatchArray) => string }[] = [
  {
    pattern: /n'(?:a|ont) pas encore été (?:validée?s?|confirmée?s?|arrêtée?s?|tranchée?s?)/i,
    reason: () => "Non validé à ce jour",
  },
  {
    pattern: /ne pourra(?:ient|it)? (?:pas )?être \S+ qu'après (.+?)[.!?]?$/i,
    reason: (match) => `Conditionné à : ${match[1]?.trim() ?? "un événement à venir"}`,
  },
  {
    pattern: /reste(?:nt)? à (?:valider|confirmer|définir|arbitrer|trancher)/i,
    reason: () => "Reste à valider",
  },
  {
    pattern: /(?:est|sont|reste(?:nt)?) en attente de (.+?)[.!?]?$/i,
    reason: (match) => `En attente de : ${match[1]?.trim() ?? "confirmation"}`,
  },
  {
    pattern: /sous réserve (?:de|d')\s*(.+?)[.!?]?$/i,
    reason: (match) => `Sous réserve de : ${match[1]?.trim() ?? "confirmation"}`,
  },
];

// 2. Informations : ce qui est annoncé ou rappelé, sans travail à produire.
const INFO_PATTERNS = [
  /\b(?:est|sont) prévue?s?\b/i,
  /\baura(?:ont)? lieu\b/i,
  /\ba été rappelé/i,
  /\bpour information\b/i,
];

// 3. Déclencheurs d'action.
const MODAL_TRIGGER = /\b(doit|doivent|devra|devront)\b/i;
const ASSIGNMENT_TRIGGER =
  /\b(?:est|sont) chargée?s? de\b|\bse charge(?:nt)? de\b|\bprend(?:ent)? en charge\b/i;
// Futur simple des verbes du premier groupe : « préparera », « enverront ».
// [A-Za-zÀ-ÿ] et non \w : en JavaScript, \w ignore les lettres accentuées et
// couperait « préparera » en plein milieu.
const FUTURE_TRIGGER = /\b([A-Za-zÀ-ÿ]{3,})(era|eront)\b/i;
// Faux amis du futur : ce sont des états ou des tournures impersonnelles,
// pas des actions confiées à quelqu'un.
const FUTURE_BLACKLIST = new Set([
  "sera",
  "seront",
  "pourra",
  "pourront",
  "faudra",
  "aura",
  "auront",
  "verra",
  "verront",
]);

// Sujets collectifs : une équipe n'est pas un responsable nommé.
const COLLECTIVE_SUBJECT =
  /^(?:l'équipe|l'ensemble|les équipes|le groupe|chacun|tout le monde|tous)\b/i;

// Mots capitalisés qui ne sont jamais un responsable.
const SUBJECT_BLACKLIST = new Set([
  "le", "la", "les", "il", "elle", "ils", "elles", "ce", "cet", "cette",
  "ces", "on", "chaque", "un", "une", "des", "nous", "vous", "je", "tu",
  "cela", "ceci", "aucun", "certains", "plusieurs",
]);

// « Avant jeudi, Abdou doit vérifier… » : une phrase peut s'ouvrir sur un
// complément circonstanciel. Le sujet n'est alors pas le premier mot mais
// celui qui suit la virgule. Sans cela, « Avant » deviendrait responsable.
const LEADING_ADVERBIAL =
  /^(?:avant|après|dès|d'ici|pour|lors|suite|selon|concernant|durant|pendant|en|au|aux|à|sur|sous|par|afin|ensuite|puis|enfin|désormais|prochainement|demain|aujourd'hui)\b[^,]{0,60},\s*/i;

const WEEKDAYS: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3,
  jeudi: 4, vendredi: 5, samedi: 6,
};

const WEEKDAY_PATTERN =
  /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i;

// Clause temporelle à retirer de la description : elle est déjà portée
// par le champ dueDate, la répéter alourdirait le libellé.
const TIME_CLAUSE =
  /\s*\b(?:avant|d'ici|au plus tard le|au plus tard|pour)\s+(?:le\s+)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+(?:matin|midi|après-midi|soir))?\b/gi;

const HIGH_PRIORITY = /\b(urgent|urgente|bloquant|bloquante|critique|au plus vite|impérativement)\b/i;
const LOW_PRIORITY = /\b(si possible|à terme|quand ce sera possible|idéalement)\b/i;

const HOURS_48 = 48 * 60 * 60 * 1000;

// --------------------------------------------------------------------------
// Segmentation
// --------------------------------------------------------------------------

type Segment = {
  // Forme d'origine, conservée telle quelle pour sourceExcerpt.
  original: string;
  // Forme normalisée (apostrophes droites), sur laquelle travaillent les regex.
  text: string;
};

// Les apostrophes typographiques d'un copier-coller (Word, Google Docs) et les
// espaces insécables casseraient silencieusement toutes les expressions régulières.
export function normalize(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/ /g, " ");
}

export function segment(rawContent: string): Segment[] {
  return rawContent
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((piece) => piece.replace(/^[-•*–\s]+/, "").trim())
    .filter((piece) => piece.length > 0)
    .map((original) => ({ original, text: normalize(original) }));
}

// --------------------------------------------------------------------------
// Échéances
// --------------------------------------------------------------------------

// Prochaine occurrence du jour visé, strictement après la date de réunion.
// « avant jeudi » dit dans une réunion du jeudi désigne le jeudi suivant.
export function nextWeekdayAfter(reference: Date, weekday: number): Date {
  const result = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  );
  const delta = (weekday - result.getUTCDay() + 7) % 7;
  result.setUTCDate(result.getUTCDate() + (delta === 0 ? 7 : delta));
  return result;
}

function findDueDate(text: string, meetingDate: Date): Date | null {
  const match = text.match(WEEKDAY_PATTERN);
  if (!match) return null;

  const weekday = WEEKDAYS[match[1].toLowerCase()];
  if (weekday === undefined) return null;

  return nextWeekdayAfter(meetingDate, weekday);
}

// --------------------------------------------------------------------------
// Responsable
// --------------------------------------------------------------------------

type OwnerResult = { owner: string | null; reason: string | null };

// Le responsable est le sujet en tête de proposition, jamais un mot capitalisé
// pris au hasard : dans « la version Android doit être disponible », « Android »
// est capitalisé et précède le déclencheur sans être responsable de quoi que ce soit.
function findOwner(text: string): OwnerResult {
  // Le sujet est cherché après l'éventuel complément circonstanciel en tête.
  const subject = text.replace(LEADING_ADVERBIAL, "");

  if (COLLECTIVE_SUBJECT.test(subject)) {
    return { owner: null, reason: "Responsable collectif, à préciser" };
  }

  const firstWord = subject.match(/^([A-Za-zÀ-ÿ'-]+)/)?.[1];
  if (!firstWord) {
    return { owner: null, reason: "Responsable non identifié" };
  }

  const isCapitalized = firstWord[0] === firstWord[0].toUpperCase();
  const isBlacklisted = SUBJECT_BLACKLIST.has(firstWord.toLowerCase());

  if (!isCapitalized || isBlacklisted) {
    return { owner: null, reason: "Responsable non identifié" };
  }

  return { owner: firstWord, reason: null };
}

// --------------------------------------------------------------------------
// Description
// --------------------------------------------------------------------------

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanup(text: string): string {
  return capitalize(text.replace(/\s+/g, " ").replace(/[.,;:]+$/, "").trim());
}

// « L'équipe confirme que X » : le contenu de l'action est la complétive,
// la principale ne fait que rapporter.
function unwrapCompletive(text: string): string {
  const match = text.match(
    /^.*?\b(?:confirme|indique|rappelle|précise|signale|note)(?:nt)? qu[e']\s*(.+)$/i,
  );
  return match?.[1] ?? text;
}

function buildActionDescription(text: string, owner: string | null): string {
  let description = unwrapCompletive(text);

  // Le complément circonstanciel de tête est déjà porté par dueDate.
  description = description.replace(LEADING_ADVERBIAL, "");

  // Retrait du responsable en tête, lui-même porté par le champ owner.
  if (owner) {
    description = description.replace(
      new RegExp(`^${owner}\\b\\s*`, "i"),
      "",
    );
  }

  // Le modal n'est retiré que s'il ouvre la proposition. Au milieu d'une
  // phrase (« la version Android doit être disponible »), le retirer
  // produirait une phrase bancale : on garde alors le texte tel quel.
  const withoutModal = description.replace(
    /^(?:doit|doivent|devra|devront)\s+/i,
    "",
  );
  const modalRemoved = withoutModal !== description;
  description = withoutModal;

  // Futur simple en tête ramené à l'infinitif : « préparera » → « préparer ».
  description = description.replace(
    /^([A-Za-zÀ-ÿ]{3,})(?:era|eront)\b/i,
    (whole, stem: string) =>
      FUTURE_BLACKLIST.has(whole.toLowerCase()) ? whole : `${stem}er`,
  );

  description = description.replace(
    /^(?:est|sont) chargée?s? de\s+|^se charge(?:nt)? de\s+|^prend(?:ent)? en charge\s+/i,
    "",
  );

  // La clause temporelle est déjà portée par dueDate.
  description = description.replace(TIME_CLAUSE, "");

  // Pronom clitique devenu orphelin après retrait du modal :
  // « devra le faire valider » → « faire valider ». Conditionné au retrait du
  // modal, sinon « Le fichier doit être envoyé » perdrait son article.
  if (modalRemoved) {
    description = description.replace(
      /^(?:le|la|les|l')\s*(?=[A-Za-zÀ-ÿ]+(?:er|ir|re)\b)/i,
      "",
    );
  }

  return cleanup(description);
}

// Pour un point en attente, la description est le sujet de la phrase :
// ce qui reste en suspens, pas la tournure qui l'exprime.
function buildPendingDescription(text: string, pattern: RegExp): string {
  const index = text.search(pattern);
  const subject = index > 0 ? text.slice(0, index) : text;
  return cleanup(subject.replace(/^(?:le|la|les|l'|un|une|des)\s*/i, ""));
}

// --------------------------------------------------------------------------
// Priorité
// --------------------------------------------------------------------------

function findPriority(text: string, dueDate: Date | null, meetingDate: Date): Priority {
  if (HIGH_PRIORITY.test(text)) return "haute";
  if (dueDate && dueDate.getTime() - meetingDate.getTime() < HOURS_48) {
    return "haute";
  }
  if (LOW_PRIORITY.test(text)) return "basse";
  return "moyenne";
}

// --------------------------------------------------------------------------
// Coordination
// --------------------------------------------------------------------------

// « Mamadou préparera le message et devra le faire valider » porte deux
// obligations. On ne coupe que si la seconde partie a son propre déclencheur :
// « les erreurs et les bugs » doit rester d'un seul tenant.
function splitCoordination(text: string): string[] {
  const separator = text.match(/\s+et\s+/i);
  if (!separator?.index) return [text];

  const left = text.slice(0, separator.index);
  const right = text.slice(separator.index + separator[0].length);

  const rightHasTrigger =
    MODAL_TRIGGER.test(right) ||
    ASSIGNMENT_TRIGGER.test(right) ||
    hasFutureTrigger(right);

  return rightHasTrigger ? [left, right] : [text];
}

function hasFutureTrigger(text: string): boolean {
  const match = text.match(FUTURE_TRIGGER);
  return Boolean(match) && !FUTURE_BLACKLIST.has(match![0].toLowerCase());
}

// --------------------------------------------------------------------------
// Pipeline
// --------------------------------------------------------------------------

function joinReasons(reasons: (string | null)[]): string | null {
  const kept = reasons.filter((reason): reason is string => Boolean(reason));
  return kept.length > 0 ? kept.join(" · ") : null;
}

export function extractWithRules({
  rawContent,
  meetingDate,
}: ExtractionInput): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  for (const { original, text } of segment(rawContent)) {
    // 1. Non-actions d'abord : elles contiennent souvent un verbe d'action.
    const pendingRule = PENDING_RULES.find((rule) => rule.pattern.test(text));
    if (pendingRule) {
      const match = text.match(pendingRule.pattern);
      items.push({
        kind: "pending",
        description: buildPendingDescription(text, pendingRule.pattern),
        owner: null,
        dueDate: null,
        priority: null,
        status: null,
        needsReview: true,
        reviewReason: match ? pendingRule.reason(match) : "À confirmer",
        sourceExcerpt: original,
      });
      continue;
    }

    // 2. Informations : rien à faire, rien à suivre.
    if (INFO_PATTERNS.some((pattern) => pattern.test(text))) {
      items.push({
        kind: "info",
        description: cleanup(text),
        owner: null,
        dueDate: null,
        priority: null,
        status: null,
        needsReview: false,
        reviewReason: null,
        sourceExcerpt: original,
      });
      continue;
    }

    // 3. Actions : une phrase peut en porter deux.
    const parts = splitCoordination(text);
    const hasTrigger = parts.some(
      (part) =>
        MODAL_TRIGGER.test(part) ||
        ASSIGNMENT_TRIGGER.test(part) ||
        hasFutureTrigger(part),
    );
    if (!hasTrigger) {
      // Ni obligation, ni information : un titre, une transition. On n'invente rien.
      continue;
    }

    let inheritedOwner: string | null = null;

    for (const part of parts) {
      const ownerResult = findOwner(part);
      // La seconde obligation d'une phrase coordonnée hérite du responsable
      // de la première : « Mamadou préparera … et devra le faire valider ».
      const owner = ownerResult.owner ?? inheritedOwner;
      const ownerReason = owner ? null : ownerResult.reason;
      if (ownerResult.owner) {
        inheritedOwner = ownerResult.owner;
      }

      const dueDate = findDueDate(part, meetingDate);
      const description = buildActionDescription(part, ownerResult.owner);

      // Une validation dont on ne sait pas qui la prononce reste à préciser.
      const validationReason =
        /faire (?:valider|relire|approuver|signer)/i.test(part) &&
        !/\bpar\s+[A-ZÀ-Ý]/.test(part)
          ? "Validateur non identifié"
          : null;

      const reviewReason = joinReasons([
        ownerReason,
        dueDate ? null : "Échéance non précisée",
        validationReason,
      ]);

      items.push({
        kind: "action",
        description,
        owner,
        dueDate,
        priority: findPriority(part, dueDate, meetingDate),
        status: DEFAULT_STATUS,
        needsReview: reviewReason !== null,
        reviewReason,
        sourceExcerpt: original,
      });
    }
  }

  return items;
}
