import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Des package-lock.json présents dans les dossiers parents amènent Next.js à
  // y placer la racine du projet. On la fixe explicitement sur ce dépôt, sans
  // quoi le calcul des fichiers à embarquer part du mauvais répertoire.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default nextConfig;
