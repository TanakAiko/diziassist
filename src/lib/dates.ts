// Formatage des dates pour l'affichage. Les dates sont stockées à minuit UTC :
// on les lit en UTC pour éviter qu'un fuseau négatif n'affiche la veille.
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date);
}

// Jour courant ramené à minuit UTC, pour comparer avec une échéance stockée.
export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

// Le retard n'est jamais stocké : il se recalcule à chaque affichage.
export function isOverdue(
  dueDate: Date | null,
  status: string | null,
  reference: Date = todayUtc(),
): boolean {
  if (!dueDate || status === "termine") {
    return false;
  }
  return dueDate.getTime() < reference.getTime();
}

// Valeur d'un <input type="date">, en UTC pour rester cohérent avec le stockage.
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
