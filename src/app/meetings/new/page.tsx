import Link from "next/link";
import { MeetingForm } from "@/components/meeting-form";

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
        <MeetingForm />
      </div>
    </main>
  );
}
