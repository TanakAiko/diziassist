import { Badge } from "@/components/ui/badge";

// L'état de validation d'un compte rendu s'affiche sur la liste et sur la fiche.
// Un seul composant pour les deux, afin que le libellé et la couleur ne puissent
// pas diverger d'un écran à l'autre.
export function ReviewStateBadge({ reviewedAt }: { reviewedAt: Date | null }) {
  if (reviewedAt === null) {
    return (
      <Badge
        variant="outline"
        className="rounded-sm border-attention/40 bg-attention/10 text-attention"
      >
        À valider
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-sm text-muted-foreground">
      Validé
    </Badge>
  );
}
