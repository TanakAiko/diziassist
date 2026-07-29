import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";

// Next 15 : params est asynchrone.
export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Comptes rendus
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Réunion du {formatLongDate(meeting.meetingDate)}
          </p>
        </div>
        {meeting.reviewedAt ? (
          <Badge variant="secondary">Validé</Badge>
        ) : (
          <Badge>À valider</Badge>
        )}
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Compte rendu original</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
          {meeting.rawContent}
        </p>
      </section>
    </main>
  );
}
