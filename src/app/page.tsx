import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { buttonVariants } from "@/components/ui/button";
import { DeleteMeetingButton } from "@/components/delete-meeting-button";
import { ReviewStateBadge } from "@/components/review-state-badge";
import { StateRule } from "@/components/state-rule";
import { cn } from "@/lib/utils";

// La liste reflète l'état de la base : elle est rendue à chaque requête et
// non figée au build.
export const dynamic = "force-dynamic";

// Server Component : la lecture passe directement par Prisma, sans route API.
export default async function HomePage() {
  const meetings = await prisma.meeting.findMany({
    orderBy: { meetingDate: "desc" },
    include: { _count: { select: { items: true } } },
  });

  // Le nombre de comptes rendus en attente est l'information la plus utile de
  // cet écran : c'est le travail qui reste à faire.
  const pending = meetings.filter(
    (meeting) => meeting.reviewedAt === null,
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Comptes rendus
          </h1>
          <p className="mt-1 max-w-prose text-base text-muted-foreground">
            Saisissez un compte rendu, validez les éléments extraits, suivez les
            actions.
          </p>
        </div>
        {pending > 0 ? (
          <p className="shrink-0 font-mono text-sm text-attention">
            {pending} en attente de validation
          </p>
        ) : null}
      </header>

      {meetings.length === 0 ? (
        <div className="mt-10 rounded-md border border-dashed bg-card px-6 py-14 text-center">
          <p className="text-lg font-medium tracking-[-0.025em]">
            Aucun compte rendu pour le moment
          </p>
          <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">
            Collez le texte d&apos;une réunion : diziAssist en propose les
            actions, les points en attente et les informations. Vous validez
            avant tout enregistrement.
          </p>
          <Link href="/meetings/new" className={cn(buttonVariants(), "mt-6")}>
            Saisir un compte rendu
          </Link>
        </div>
      ) : (
        // Un seul cadre découpé par des filets, plutôt que des cartes détachées :
        // la lecture verticale est plus rapide et la densité plus élevée.
        <ul className="mt-8 divide-y overflow-hidden rounded-md border bg-card">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex items-stretch">
              {/* Même filet que sur les éléments : ambre si le compte rendu
                  attend une validation, neutre s'il est déjà validé. */}
              <StateRule
                state={meeting.reviewedAt === null ? "attention" : "neutral"}
              />
              <div className="flex flex-1 items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="text-base font-medium hover:text-brand-text hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {formatDate(meeting.meetingDate)}
                    {meeting.reviewedAt
                      ? ` · ${meeting._count.items} élément${meeting._count.items > 1 ? "s" : ""}`
                      : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ReviewStateBadge reviewedAt={meeting.reviewedAt} />
                  <DeleteMeetingButton id={meeting.id} title={meeting.title} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
