import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // L'extracteur et les utilitaires de date sont du TypeScript pur :
    // aucun environnement navigateur n'est nécessaire.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Les modules serveur importent « server-only », qui lève une erreur dès
      // qu'il est chargé hors d'un Server Component. Les tests tournent dans
      // Node : on lui substitue un module inerte, sans toucher au code livré.
      "server-only": path.resolve(
        __dirname,
        "./src/lib/testing/server-only.stub.ts",
      ),
    },
  },
});
