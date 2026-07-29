import Link from "next/link";
import { MeetingForm } from "@/components/meeting-form";

// La disponibilité de l'IA dépend d'une variable d'environnement lue au
// moment de la requête : la page ne peut pas être figée au build.
export const dynamic = "force-dynamic";

export default function NewMeetingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Comptes rendus
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Nouveau compte rendu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Collez le texte de la réunion. Les éléments seront proposés à l&apos;écran
        suivant, puis enregistrés seulement après votre validation.
      </p>
      <div className="mt-8">
        {/* Seul un booléen traverse la frontière serveur → client : la clé
            elle-même ne quitte jamais le serveur. */}
        <MeetingForm aiAvailable={Boolean(process.env.ANTHROPIC_API_KEY)} />
      </div>
    </main>
  );
}
