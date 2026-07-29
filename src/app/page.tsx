import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteMeetingButton } from "@/components/delete-meeting-button";
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Comptes rendus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saisissez un compte rendu, validez les éléments extraits, suivez les
            actions.
          </p>
        </div>
        <Link href="/meetings/new" className={buttonVariants()}>
          Nouveau compte rendu
        </Link>
      </header>

      {meetings.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Aucun compte rendu pour le moment.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Commencez par en saisir un pour en extraire les actions.
          </p>
          <Link
            href="/meetings/new"
            className={cn(buttonVariants(), "mt-6")}
          >
            Saisir un compte rendu
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="font-medium hover:underline"
                >
                  {meeting.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  Réunion du {formatDate(meeting.meetingDate)}
                  {meeting.reviewedAt
                    ? ` · ${meeting._count.items} élément${meeting._count.items > 1 ? "s" : ""}`
                    : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {meeting.reviewedAt ? (
                  <Badge variant="secondary">Validé</Badge>
                ) : (
                  <Badge>À valider</Badge>
                )}
                <DeleteMeetingButton id={meeting.id} title={meeting.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
