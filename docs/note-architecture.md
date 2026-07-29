# diziAssist — Note d'architecture

Cas pratique DFSJIA-001. Document de référence pour le développement.

---

## 1. Objectif

Saisir un compte rendu de réunion, en extraire des éléments structurés, les faire valider par un humain, puis les suivre dans un tableau de bord.

### Contraintes

| Contrainte | Implication |
|---|---|
| 6 h de travail effectif | Aucune stack imposant du câblage non productif |
| Fonctionne sans IA | Extraction déterministe en socle, IA en surcouche |
| Persistance après actualisation | Base réelle, pas de stockage navigateur |
| Aucune clé API exposée (pénalité majeure) | Appels LLM côté serveur uniquement |
| Application lançable (pénalité majeure) | Installation sans compte externe |
| Code maîtrisé (pénalité majeure) | Aucune techno découverte la veille |

### Barème (100 points)

Fonctionnalités 25 · Qualité du code 15 · Architecture 10 · Données & erreurs 10 · UX 10 · IA 10 · Documentation 10 · Priorisation 5 · Démonstration 5.

60 points récompensent un produit fini, lisible et robuste. L'IA n'en pèse que 10.

---

## 2. Stack retenue

**Next.js 15 (App Router) · TypeScript · Prisma · SQLite · Tailwind · shadcn/ui · Zod**

| Composant | Justification |
|---|---|
| Next.js App Router | Un dépôt, un langage, un déploiement. Les Server Actions suppriment l'API REST et gardent l'accès aux données côté serveur. |
| TypeScript | `owner` et `dueDate` sont nullables par nature métier ; le compilateur force à traiter le cas partout. |
| Prisma | Schema-first : une source unique produit le SQL des migrations et les types TS, qui ne peuvent pas diverger. Migrations versionnées, écritures imbriquées transactionnelles. |
| SQLite | Base relationnelle dans un fichier. Aucun serveur, aucun compte, aucune clé. Installation en 4 commandes, hors ligne. |
| Tailwind + shadcn/ui | Composants copiés dans le dépôt, UI propre en ~20 min. |
| Zod | Validation à chaque entrée de Server Action. |

### Alternatives écartées

| Option | Motif |
|---|---|
| Supabase | Impose à l'évaluateur un compte, un projet, deux clés et un script SQL. Les clés ne peuvent pas être versionnées. Le lien live ne compense pas le risque de pénalité majeure. |
| Vite + Express séparés | Deux `package.json`, CORS, types dupliqués. ~45 min de plomberie non créditée. |
| FastAPI + front React | Cumule le coût du découplage et du changement de langage. |
| Laravel / PHP | Mise en route plus lourde, UI plus longue à obtenir. |
| FastAPI + Jinja | Repli sérieux si faible maîtrise de React. Écarté ici pour l'UX (10 pts). |

### Installation cible

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

---

## 3. Modèle de données

```prisma
model Meeting {
  id          String    @id @default(cuid())
  title       String
  meetingDate DateTime
  rawContent  String
  reviewedAt  DateTime?   // null = en attente de validation
  createdAt   DateTime  @default(now())
  items       Item[]
}

model Item {
  id            String    @id @default(cuid())
  kind          String    @default("action")   // action | pending | info
  description   String
  owner         String?
  dueDate       DateTime?
  priority      String?                        // basse | moyenne | haute
  status        String?                        // a_faire | en_cours | termine
  needsReview   Boolean   @default(false)
  reviewReason  String?
  sourceExcerpt String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  meetingId     String
  meeting       Meeting   @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@index([kind, status])
  @@index([dueDate])
  @@index([meetingId])
}
```

### Justification des champs

| Champ | Note |
|---|---|
| `id` | `cuid()` plutôt qu'un entier : n'expose pas le volume, non devinable dans l'URL. |
| `kind` | Table unique discriminée plutôt que trois tables. Reclasser un élément = modifier un champ. |
| `owner`, `dueDate` | Nullables par nature métier : le CR de test contient des actions sans responsable ni échéance. |
| `priority`, `status` | Nullables car une information n'a ni priorité ni statut. |
| `needsReview` / `reviewReason` | Deux champs : le booléen est indexable pour le filtrage, le texte s'adresse à l'utilisateur. |
| `sourceExcerpt` | Obligatoire. Aucun élément ne peut exister sans preuve d'origine. |

### Contraintes SQLite

- Pas de type `enum` : `String` contraints par des unions TS dans `lib/constants.ts`.
- Pas de tri par `priority` en base (tri alphabétique absurde). Tri en TS avec rang explicite.

---

## 4. Architecture applicative

| Mécanisme | Usage |
|---|---|
| Server Component (défaut) | Toutes les pages. Appellent Prisma directement, sans `useEffect` ni route API. |
| Client Component | Formulaires, filtres, changement de statut uniquement. |
| Server Action | Toutes les écritures, validées par Zod. |
| Route Handler | Aucun. Pas de consommateur externe au périmètre. |

**Sécurité** : une Server Action *est* un endpoint public, sollicitable avec n'importe quel payload. Validation Zod systématique.

**Clé IA** : `ANTHROPIC_API_KEY` reste serveur. Le préfixe `NEXT_PUBLIC_` est le seul mécanisme d'exposition de Next.js. `.env.example` versionné, `.env` et `prisma/dev.db` dans `.gitignore`.

---

## 5. Extraction sans IA

Système à règles, ~150 lignes de TypeScript, sans dépendance.

### Pipeline

1. **Segmenter** — ponctuation forte, retours ligne, puces
2. **Classifier** — non-actions testées **en premier**, puis informations, puis déclencheurs
3. **Extraire** — responsable, échéance, priorité, description
4. **Signaler** — tout champ manquant produit `needsReview` + motif

L'ordre est le cœur de la logique. « Le budget n'a pas encore été validé » contient « validé » : en cherchant les actions d'abord, on produirait « valider le budget » avec un responsable inventé.

### Dictionnaires

| Catégorie | Motifs |
|---|---|
| Non-actions | `n'a pas encore été validé/confirmé`, `ne pourra être … qu'après`, `reste à valider`, `en attente de`, `sous réserve de` |
| Informations | `est prévue`, `aura lieu`, `a été rappelé` |
| Déclencheurs | `doit/doivent/devra/devront`, futur en `-era/-eront`, `est chargé de`, `se charge de`, `prend en charge` |

### Règles par champ

| Champ | Règle |
|---|---|
| Responsable | Mot capitalisé précédant un déclencheur, hors liste noire (`Le`, `La`, `Les`, `Il`, `Ce`, `Cette`, `On`, `Chaque`…). Collectifs (`l'équipe`, `le groupe`) → `null` + motif. Jamais de défaut. |
| Échéance | Jour de semaine résolu à sa prochaine occurrence **strictement après `meetingDate`**. |
| Priorité | Défaut `moyenne`. `haute` sur « urgent », « bloquant », ou échéance < 48 h. `basse` sur « si possible », « à terme ». |
| Description | Retrait du responsable, du modal et de la clause temporelle ; verbe à l'infinitif ; majuscule initiale. |
| Coordination | Une phrase liant deux obligations par « et » produit deux éléments ; le second hérite du responsable. |

### Piège calendaire

Le CR de test est daté du **27 juillet 2026, un lundi**. Donc « avant jeudi » → 30/07, « avant vendredi » → 31/07, « avant mercredi soir » → 29/07.

### Résultat de référence (compte rendu Quizz+)

| Élément | kind | owner | dueDate | Signalement |
|---|---|---|---|---|
| Rendre la version Android disponible pour les tests | action | null | null | Responsable collectif |
| Vérifier la configuration Play Store | action | Abdou | 2026-07-30 | — |
| Corriger les erreurs signalées sur le classement | action | Awa | 2026-07-31 | — |
| Préparer le message destiné aux testeurs | action | Mamadou | null | Échéance non précisée |
| Faire valider le message | action | Mamadou | 2026-07-29 | Validateur non identifié |
| Date de lancement | pending | null | null | Conditionnée aux tests |
| Budget de la campagne | pending | null | null | Non validé |
| Réunion de suivi vendredi 15 h | info | null | null | — |

### Surcouche IA (bloc 5, optionnel)

Même interface `Extractor`. Prompt imposant du JSON strict et interdisant l'invention. Trois gardes côté serveur :

1. Parsing tolérant aux erreurs
2. Validation Zod du JSON
3. **Vérification que chaque `sourceExcerpt` cité existe réellement dans le texte source** — sinon l'élément est écarté

Sans clé ou en cas d'échec : repli automatique et silencieux sur les règles.

---

## 6. Écran de validation

L'extraction par règles étant déterministe, aucun état intermédiaire n'est stocké : tant que `reviewedAt` est nul, l'extraction est rejouée à chaque affichage.

| Élément | Raison |
|---|---|
| Case à cocher par ligne | Décoché = non enregistré, mais reste visible |
| Tous les champs éditables | L'extraction ne fait que pré-remplir un formulaire |
| Sélecteur de `kind` par ligne | Permet de reclasser : la validation porte sur la classification autant que sur les valeurs |
| Compte rendu original accessible | Panneau dépliable permanent |
| `sourceExcerpt` sous chaque ligne | Traçabilité au niveau de la phrase |
| Badge avec motif en clair | Pas une icône seule : la raison explicite |
| Ajout manuel | Une action manquante ne doit pas être perdue |

Enregistrement par Server Action unique, **en transaction** : création des items + `reviewedAt` réussissent ou échouent ensemble.

---

## 7. Dashboard

| Vue | Contenu |
|---|---|
| `/meetings/[id]` | Tout ce qui vient de ce CR + le texte original |
| `/dashboard` | Vue consolidée, filtre « Compte rendu » sur *Tous* par défaut |

**Filtres** : compte rendu, nature, statut, en retard, à confirmer, recherche. Via `searchParams`, pas via un état React — liens partageables et bouton retour fonctionnel.

**Modifications en ligne** : statut et priorité, avec retour optimiste. Responsable et échéance via panneau d'édition.

**Retard** : calculé, jamais stocké.

**Tri** : `dueDate` croissant avec `nulls: "last"`, puis priorité par rang explicite en TS.

**Compteurs d'en-tête** reflétant le filtre actif.

---

## 8. Périmètre

### Écarté volontairement

Authentification et multi-utilisateurs · notifications · export CSV/PDF · commentaires · rôles · import audio ou fichiers · historique des modifications.

### Limites de l'extraction par règles

- Tournures françaises standard uniquement
- Pas de résolution de pronoms inter-phrases
- Faux positifs possibles sur le futur en `-era` (« sera », « verra »)
- Dates relatives limitées aux jours de la semaine
- Rendement décroissant : au-delà d'une vingtaine de règles, les cas rares se contredisent

Ces limites justifient l'évolution IA : elle ne cherche pas un gain marginal, elle franchit un plafond structurel.

### Suite proposée

Extraction sémantique avec vérification d'ancrage · authentification et espaces d'équipe · notifications d'échéance · intégration aux outils de réunion · journal d'audit · migration PostgreSQL au-delà de quelques milliers d'items.

---

## 9. Contrôle avant remise

| Vérification | Risque couvert |
|---|---|
| Clone vierge, 4 commandes, app fonctionnelle | Application impossible à lancer |
| `.env` et `dev.db` absents du dépôt, `.env.example` présent | Clé API exposée |
| App testée sans `ANTHROPIC_API_KEY` | Exigence « utilisable sans IA » |
| README complet | Absence de README |
| Note de cadrage | Priorisation (5 pts) |
| Temps effectif déclaré | Livrable demandé |
| Historique Git progressif | Historique minimal exigé |
| Chaque choix explicable en une phrase | Code non maîtrisé |
