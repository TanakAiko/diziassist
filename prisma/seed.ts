import "dotenv/config";
import { prisma } from "../src/lib/db";
import { QUIZZ_PLUS } from "./comptes-rendus/quizz-plus";

// Le seed charge le compte rendu de référence *sans* l'extraire ni le valider :
// reviewedAt reste null. L'extraction est rejouée à l'affichage et rien n'est
// enregistré avant validation explicite de l'utilisateur.
async function main() {
  if (QUIZZ_PLUS.rawContent.trim() === "") {
    throw new Error(
      "Le compte rendu de référence est vide. Renseigner prisma/comptes-rendus/quizz-plus.ts " +
        "avec le texte exact du sujet avant de lancer le seed.",
    );
  }

  // Seed rejouable : on repart d'une base propre à chaque exécution.
  // La suppression du meeting entraîne celle de ses items (onDelete: Cascade).
  await prisma.meeting.deleteMany();

  const meeting = await prisma.meeting.create({
    data: {
      title: QUIZZ_PLUS.title,
      meetingDate: QUIZZ_PLUS.meetingDate,
      rawContent: QUIZZ_PLUS.rawContent,
    },
  });

  console.log(`Compte rendu créé : ${meeting.title} (${meeting.id})`);
  console.log("Statut : en attente de validation.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
