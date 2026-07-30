import { MeetingForm } from "@/components/meeting-form";

// La disponibilité de l'IA dépend d'une variable d'environnement lue au
// moment de la requête : la page ne peut pas être figée au build.
export const dynamic = "force-dynamic";

export default function NewMeetingPage() {
  return (
    // Écran de saisie : la largeur reste celle des autres pages pour que le
    // bord gauche ne saute pas d'un écran à l'autre, mais le contenu est borné
    // à une largeur de lecture confortable.
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Nouveau compte rendu
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Collez le texte de la réunion. Les éléments seront proposés à
          l&apos;écran suivant, puis enregistrés seulement après votre
          validation.
        </p>
        <div className="mt-8">
          {/* Seul un booléen traverse la frontière serveur → client : la clé
              elle-même ne quitte jamais le serveur. */}
          <MeetingForm aiAvailable={Boolean(process.env.ANTHROPIC_API_KEY)} />
        </div>
      </div>
    </main>
  );
}
