import type { ItemState } from "@/lib/items";
import { cn } from "@/lib/utils";

// Filet de 3 px posé au bord gauche d'une ligne. C'est le seul endroit où la
// couleur d'état apparaît en aplat : le reste de la ligne reste neutre, ce qui
// permet d'en aligner beaucoup sans que l'écran devienne bariolé.
const RULE: Record<ItemState, string> = {
  overdue: "bg-overdue",
  attention: "bg-attention",
  done: "bg-done",
  neutral: "bg-border",
};

export function StateRule({ state }: { state: ItemState }) {
  // aria-hidden : l'information est déjà portée par le texte de la ligne
  // (« en retard », « à confirmer »). La couleur ne fait que la doubler.
  return <span aria-hidden className={cn("w-[3px] shrink-0", RULE[state])} />;
}
