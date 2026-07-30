import { cn } from "@/lib/utils";

// Les trois écrans utilisaient un <select> natif avec les mêmes classes recopiées
// à la main, à sept endroits. Le style vit désormais ici.
//
// Le natif est préféré au composant shadcn Select : il fonctionne au clavier et
// avec les technologies d'assistance sans une ligne de JavaScript, et sur mobile
// il ouvre le sélecteur du système. Pour un menu de six valeurs, c'est le bon
// outil.
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-background px-2.5 text-base transition-colors",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
