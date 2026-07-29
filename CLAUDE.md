# diziAssist

Dépôt : `diziassist`. Cas pratique DFSJIA-001 pour DIZIGROUP.

MVP de suivi des actions issues de comptes rendus de réunion.
Cas pratique technique DFSJIA-001. Spécification complète : `docs/note-architecture.md`.

## Contraintes du projet

- **6 h de développement effectif maximum.** Ne jamais proposer de fonctionnalité hors périmètre.
- Le code doit rester explicable ligne par ligne lors d'une soutenance orale. Préférer systématiquement la solution simple et lisible à la solution élégante mais dense.
- Livraison prioritaire sur exhaustivité. Un périmètre restreint et terminé vaut mieux qu'un périmètre large inachevé.

## Stack — verrouillée, ne pas proposer d'alternative

Next.js 15 (App Router) · TypeScript strict · Prisma · SQLite · Tailwind CSS · shadcn/ui · Zod · Vitest

## Règles non négociables

1. **Ne jamais inventer de donnée.** Si un responsable ou une échéance n'est pas explicite dans le texte source, la valeur est `null` et `needsReview` passe à `true` avec un motif en clair dans `reviewReason`. Aucune valeur par défaut, jamais.
2. **L'extracteur propose, il n'enregistre pas.** Rien n'est écrit en base avant validation explicite de l'utilisateur.
3. **Les dates relatives se calculent depuis `meetingDate`**, jamais depuis `new Date()`.
4. **L'application doit fonctionner sans clé API.** L'extraction par règles est le socle ; l'IA est une surcouche optionnelle avec repli automatique.
5. **Aucune variable d'environnement sensible en `NEXT_PUBLIC_`.** Les appels LLM se font exclusivement dans du code serveur.
6. **Toute Server Action valide ses entrées avec Zod** avant tout accès à la base. Une Server Action est un endpoint public.
7. **Aucun Route Handler.** Toutes les mutations passent par des Server Actions.
8. **Aucun composant n'appelle Prisma directement.** L'accès aux données passe par `lib/actions/` ou par un Server Component de page.
9. **Le retard n'est jamais stocké**, il est calculé : `dueDate < aujourd'hui && status !== "termine"`.
10. **`sourceExcerpt` est obligatoire** sur chaque `Item`. Un ajout manuel porte la mention `"Ajouté manuellement lors de la validation"`.

## Modèle de données

Deux modèles : `Meeting` et `Item`. `Item` est une table unique discriminée par `kind` (`action` | `pending` | `info`) — pas trois tables.

Champs nullables par nature métier, pas par commodité technique : `owner`, `dueDate`, `priority`, `status`, `reviewReason`.

SQLite ne supporte pas `enum`. Les valeurs autorisées vivent dans `lib/constants.ts` sous forme d'unions `as const`, qui alimentent à la fois les types, les schémas Zod et les menus déroulants. Source unique.

Ne jamais trier par `priority` en base : le tri serait alphabétique. Trier en TypeScript avec un rang explicite.

## Conventions

- Server Components par défaut. `"use client"` uniquement en cas d'interactivité réelle.
- Toute la chaîne de texte affichée est en **français**.
- Valeurs stockées sans accent ni espace : `a_faire`, `en_cours`, `termine`, `basse`, `moyenne`, `haute`.
- Les filtres du dashboard transitent par l'URL (`searchParams`), pas par un état React.
- Chaque formulaire gère trois états : chargement, erreur de validation par champ, état vide.
- Pas d'`alert()`. Les erreurs s'affichent sous le champ concerné.

## Arborescence

```
src/
  app/
    page.tsx                    liste des comptes rendus
    meetings/new/page.tsx       saisie
    meetings/[id]/page.tsx      validation si reviewedAt null, sinon fiche
    dashboard/page.tsx          vue consolidée filtrable
  components/
  lib/
    db.ts                       singleton Prisma
    constants.ts
    actions/                    "use server"
    extraction/                 types.ts, rules.ts, ai.ts, index.ts
    validation/                 schémas Zod
prisma/
  schema.prisma
  seed.ts                       compte rendu Quizz+ du sujet
```

## Commandes

```bash
npm run dev
npm run seed
npm test
npx prisma migrate dev
npx prisma studio
```

## Méthode de travail

Avancer **bloc par bloc**, s'arrêter à la fin de chaque bloc et attendre validation avant de continuer.

1. Initialisation, schéma Prisma, migration, seed
2. CRUD comptes rendus + extracteur par règles + tests
3. Écran de validation + enregistrement transactionnel
4. Dashboard : filtres, statuts, retards, compteurs
5. Surcouche IA — uniquement si 1 à 4 sont terminés
6. README et note de cadrage

Ne pas générer plusieurs blocs d'un coup. Ne pas anticiper sur un bloc ultérieur.

## Test de référence

Le compte rendu Quizz+ du 27 juillet 2026 (un lundi) doit produire exactement 5 actions, 2 points en attente et 1 information. Détail attendu dans `docs/note-architecture.md`. Ce résultat est couvert par des tests et ne doit pas régresser.
