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
    },
  },
});
