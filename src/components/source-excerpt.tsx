// Élément signature de l'interface : la phrase du compte rendu qui justifie un
// élément. Elle est présentée comme une citation — mono, filet à gauche,
// guillemets français — parce que c'est exactement ce qu'elle est. C'est la
// règle « ne jamais inventer de donnée » rendue visible à l'écran.
//
// Un seul composant pour les quatre écrans : la traçabilité ne doit pas avoir
// quatre apparences différentes.
export function SourceExcerpt({ children }: { children: string }) {
  return (
    <blockquote className="border-l-2 border-brand/50 pl-3 font-mono text-sm leading-relaxed text-muted-foreground">
      «&nbsp;{children}&nbsp;»
    </blockquote>
  );
}
