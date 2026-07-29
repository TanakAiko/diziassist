import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 se connecte via un driver adapter : ici le pilote SQLite officiel.
// L'URL vient de DATABASE_URL, jamais d'un chemin écrit en dur.
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL est absent. Copier .env.example vers .env avant de lancer l'application.",
    );
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// Next.js recharge les modules à chaud en développement : sans ce cache global,
// chaque rechargement ouvrirait une nouvelle connexion à SQLite.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
