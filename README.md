# diziAssist

Suivi des actions issues de comptes rendus de réunion.

Cas pratique technique **DFSJIA-001** — DIZIGROUP.

Vous collez le texte brut d'une réunion. diziAssist en propose les actions, les points en attente et les informations. Vous corrigez, vous validez, et seulement là quelque chose est écrit en base. Le tableau de bord consolide ensuite tous les comptes rendus validés.

---

## Installation

Prérequis : **Node.js 22** ou plus.

```bash
git clone <url-du-depot>
cd diziassist

cp .env.example .env      # DATABASE_URL, aucune clé requise
npm install               # génère aussi le client Prisma
npx prisma migrate dev    # crée prisma/dev.db
npm run seed              # charge le compte rendu Quizz+ du sujet
npm run dev
```

L'application est sur **http://127.0.0.1:3000**.

**Aucune clé API n'est nécessaire.** L'extraction par règles est le socle de l'application et fonctionne hors ligne. L'IA est une surcouche facultative — voir plus bas.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run seed` | recharge le compte rendu de référence (repart d'une base vide) |
| `npm test` | 97 tests unitaires |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | ESLint |
| `npx prisma studio` | inspection de la base |

---

## Prise en main en deux minutes

1. **`/`** — la liste des comptes rendus. Le compte rendu Quizz+ y attend une validation, signalé par un filet ambre.
2. **Cliquez dessus.** L'écran de validation affiche ce que l'extracteur propose : 5 actions, 2 points en attente, 1 information. Chaque ligne porte la phrase du compte rendu qui la justifie, et les éléments incomplets portent un motif en clair — « Responsable non identifié », « Échéance non précisée ».
3. **Corrigez, décochez, ajoutez**, puis *Valider et enregistrer*. C'est le premier moment où quelque chose est écrit en base.
4. **`/dashboard`** — la vue consolidée. Filtres par nature, statut, priorité, retard ; modification du statut d'un clic ; suppression derrière *Modifier*.
5. **`/meetings/new`** — pour saisir votre propre compte rendu.

---

## Les règles que le code ne transgresse jamais

Ces cinq règles expliquent la plupart des décisions de conception.

**1. Aucune donnée n'est inventée.** Si le texte ne dit pas qui est responsable ou pour quand, la valeur est `null`, `needsReview` passe à `true` et un motif lisible est affiché. Il n'existe aucune valeur par défaut.

**2. L'extracteur propose, il n'enregistre pas.** Tant que `reviewedAt` est nul, rien n'existe en base. L'extraction par règles est déterministe : elle est rejouée à chaque affichage, sans état intermédiaire.

**3. Chaque élément porte sa preuve d'origine.** `sourceExcerpt` est le seul champ texte non nullable du modèle : un élément sans phrase justificative ne peut pas exister. Un ajout manuel porte la mention *« Ajouté manuellement lors de la validation »*.

**4. Les dates relatives partent de la date de réunion**, jamais de la date du jour. « Avant jeudi » dans une réunion du lundi 27 juillet 2026 vaut le 30 juillet — et le résultat ne change pas demain.

**5. Le retard n'est jamais stocké.** Il se calcule : `dueDate < aujourd'hui && status !== "termine"`. Une valeur stockée deviendrait fausse à minuit.

---

## Architecture

La justification complète est dans **[`docs/note-architecture.md`](docs/note-architecture.md)** : choix de stack, alternatives écartées, modèle de données, périmètre.

**Next.js 15 (App Router) · TypeScript · Prisma · SQLite · Tailwind · shadcn/ui · Zod · Vitest**

```
src/
  app/                    4 pages, toutes des Server Components
    page.tsx                liste des comptes rendus
    meetings/new/           saisie
    meetings/[id]/          validation si reviewedAt est nul, sinon fiche
    dashboard/              vue consolidée filtrable
  components/             9 composants "use client", le reste côté serveur
  lib/
    db.ts                   singleton Prisma
    constants.ts            source unique des valeurs autorisées
    actions/                Server Actions ("use server")
    extraction/             rules.ts, ai.ts, types.ts, index.ts
    validation/             schémas Zod
prisma/
  schema.prisma
  migrations/
  seed.ts
```

Quatre principes structurants :

- **Server Components par défaut.** Les pages appellent Prisma directement. `"use client"` seulement en cas d'interactivité réelle.
- **Aucun Route Handler.** Toutes les écritures passent par des Server Actions.
- **Une Server Action est un endpoint public.** Chacune valide ses entrées avec Zod avant de toucher la base — y compris les `searchParams` du tableau de bord, qui sont une entrée utilisateur comme une autre.
- **Une source unique pour les valeurs autorisées.** `lib/constants.ts` alimente les types TypeScript, les schémas Zod et les menus déroulants. Ajouter une nature d'élément casse la compilation tant que son libellé manque.

### Extraction

L'ordre du pipeline est le cœur de la logique : **les non-actions sont testées avant les actions.** « Le budget n'a pas encore été validé » contient le mot « validé » ; en cherchant les actions d'abord, on produirait « valider le budget » avec un responsable inventé.

### Surcouche IA — facultative

Renseignez `ANTHROPIC_API_KEY` dans `.env` et un second bouton apparaît à la saisie. La clé ne quitte jamais le serveur : `lib/extraction/ai.ts` porte `import "server-only"`, qui transforme toute importation depuis le navigateur en erreur de compilation.

Trois gardes en sortie de modèle :

1. le format est **imposé par l'API** (sorties structurées), pas seulement demandé dans le prompt ;
2. la réponse est **validée par Zod** ;
3. chaque `sourceExcerpt` cité doit **exister mot pour mot** dans le texte source, sinon l'élément est écarté.

En cas d'échec — pas de clé, quota atteint, service injoignable, réponse inexploitable — l'application retombe sur les règles **et affiche le motif en clair**. Le repli n'est jamais silencieux.

---

## Tests

```bash
npm test        # 97 tests, 9 fichiers
```

Le compte rendu Quizz+ du 27 juillet 2026 sert de test de non-régression : il doit produire exactement **5 actions, 2 points en attente et 1 information**, avec les échéances attendues. Les tests couvrent aussi les schémas Zod, les calculs de date, le tri par priorité et les gardes de l'extraction par IA.

L'extracteur et la logique de validation sont du TypeScript pur, testables sans base de données ni serveur. C'est délibéré : `lib/actions/persist-review.ts` contient toute la logique d'enregistrement **sans** `"use server"`, et `review.ts` se contente de l'envelopper.

---

## Déploiement

**L'application n'est pas déployée, et c'est un choix.**

SQLite stocke la base dans un fichier. Les hébergements sans état — Vercel et équivalents — ont un système de fichiers éphémère : l'application démarrerait, afficherait les données du seed, puis échouerait à la première écriture.

Y remédier supposerait une base hébergée, donc un compte, des identifiants et des clés que l'évaluateur devrait provisionner. Le compromis a été tranché en faveur de l'installation locale : **quatre commandes, hors ligne, sans compte**. Le raisonnement complet est dans la note d'architecture, section 2.

Une mise en production réelle changerait ce verdict — et changerait alors de base de données, ce qui est prévu dans les suites proposées.

---

## Limites connues

Elles sont assumées, pas subies. L'extracteur par règles :

- ne reconnaît que des tournures françaises standard ;
- ne résout pas les pronoms d'une phrase à l'autre ;
- ne reconnaît pas les futurs irréguliers en `-rront` (« enverront », « verront ») ;
- ne calcule des échéances que sur les jours de la semaine, et uniquement lorsqu'un marqueur les introduit (`avant`, `d'ici`, `au plus tard`, `pour`) — sans quoi « le compte rendu du lundi précédent » produirait une échéance inventée ;
- atteint un rendement décroissant : au-delà d'une vingtaine de règles, les cas rares commencent à se contredire.

C'est ce plafond structurel qui justifie la surcouche IA. Elle ne cherche pas un gain marginal.

Hors périmètre, volontairement : authentification et multi-utilisateurs, notifications, export, commentaires, rôles, import audio, historique des modifications.
