# diziAssist — Note de cadrage

Ce que j'ai décidé de faire, ce que j'ai décidé de ne pas faire, et pourquoi.

La contrainte de départ : **6 heures de développement effectif**, avec un barème où 60 points sur 100 récompensent un produit fini, lisible et robuste, et où l'IA n'en pèse que 10. La priorisation découle de ce constat : un périmètre restreint et terminé vaut mieux qu'un périmètre large inachevé.

---

## 1. La décision structurante : les règles d'abord, l'IA ensuite

L'énoncé autorise une extraction par IA. J'ai construit **l'extracteur déterministe en premier**, et l'IA en surcouche facultative.

Trois raisons :

- **L'application doit fonctionner sans clé API.** Un évaluateur sans clé doit voir un produit complet, pas une démo dégradée.
- **Le socle vaut 60 points, l'IA en vaut 10.** Investir dans l'IA avant que le socle soit fini aurait été un mauvais placement.
- **L'extraction par règles est testable.** Elle est déterministe, donc le compte rendu de référence devient un test de non-régression exécutable. Une extraction par IA seule n'aurait offert aucune garantie reproductible.

Conséquence assumée : l'extracteur par règles ne comprend que des tournures françaises standard. C'est un plafond structurel, et c'est précisément ce qui **justifie** la surcouche IA plutôt que de la rendre décorative.

---

## 2. Ce qui a été livré

| Bloc | Contenu |
|---|---|
| 1 | Schéma Prisma, migration, seed du compte rendu de référence |
| 2 | CRUD des comptes rendus, extracteur par règles, tests |
| 3 | Écran de validation, enregistrement transactionnel |
| 4 | Tableau de bord : filtres, statuts, retards, compteurs |
| 5 | Surcouche IA avec repli automatique |
| 6 | Refonte visuelle, relecture du code, documentation |

97 tests, 9 fichiers. Le compte rendu Quizz+ produit exactement 5 actions, 2 points en attente et 1 information.

---

## 3. Ce qui a été écarté, et pourquoi

| Écarté | Motif |
|---|---|
| **Déploiement en ligne** | SQLite stocke la base dans un fichier ; un hébergement sans état ne peut pas l'écrire. Y remédier imposerait une base hébergée, donc un compte et des clés à provisionner par l'évaluateur. J'ai préféré une installation locale en quatre commandes, hors ligne, sans compte. |
| **Authentification, rôles, multi-utilisateurs** | Hors du problème posé. Aurait consommé la moitié du budget sans toucher au cœur : extraire, valider, suivre. |
| **Export CSV/PDF, notifications, commentaires** | Fonctionnalités périphériques. Rien dans le sujet ne les demande. |
| **Import audio ou fichiers** | Le sujet fournit du texte. |
| **Historique des modifications** | Utile en production, sans effet sur la démonstration. |
| **Route Handlers** | Les Server Actions couvrent tous les besoins d'écriture, typées de bout en bout. Aucun consommateur externe au périmètre. |

---

## 4. Arbitrages techniques notables

**Une seule table `Item`, discriminée par `kind`.** Les trois natures partagent 90 % de leurs champs ; ce qui diffère est la nullabilité, pas la structure. Trois tables auraient imposé une fusion en TypeScript sur le tableau de bord, qui les consolide. Contrepartie assumée : la base ne peut pas garantir qu'une information n'a pas de priorité — l'invariant est appliqué côté serveur, au moment de l'écriture.

**Le retard n'est pas stocké.** Il est recalculé à chaque affichage. Une valeur stockée deviendrait fausse à minuit. Conséquence : ce filtre ne peut pas passer en SQL, il s'applique en TypeScript.

**Le tri par priorité ne passe pas non plus par la base.** SQLite trierait « basse » avant « haute » avant « moyenne », par ordre alphabétique. Un rang explicite en TypeScript règle le problème.

**La proposition de l'IA est stockée en JSON opaque**, pas dans une table. Ce n'est pas une donnée, c'est un brouillon : la rendre non joignable interdit structurellement de la confondre avec des éléments enregistrés.

**La logique de validation est isolée de Next.js.** `persist-review.ts` ne porte pas `"use server"` ; `review.ts` se contente de l'envelopper. Le chemin le plus risqué du projet est ainsi exerçable sans serveur.

---

## 5. L'ordre dans lequel j'ai travaillé

D'après l'historique Git — 22 commits, deux journées.

| Quand | Travail |
|---|---|
| 29/07, 15h52 – 16h12 | note d'architecture, initialisation, schéma, migration |
| 29/07, 18h05 – 18h40 | seed, CRUD, extracteur par règles, premier correctif |
| 29/07, 21h43 – 23h21 | écran de validation, tableau de bord, surcouche IA |
| 30/07, matin – 13h20 | refonte visuelle : direction, palette DIZIGROUP, réagencement |
| 30/07, 14h30 – 14h48 | relecture du code, nettoyage, cinq correctifs |

**Deux choix de séquencement méritent d'être signalés :**

Le **design est venu après le fonctionnel**, pas avant. Une interface soignée sur une fonctionnalité incomplète n'aurait rien rapporté ; l'inverse restait défendable.

La **relecture est venue avant la documentation.** Documenter un code qu'on n'a pas relu revient à documenter ses défauts. Cette relecture a supprimé 305 lignes de code mort et corrigé cinq défauts réels, dont un qui violait la règle centrale du projet : un jour de la semaine mentionné n'importe où dans une phrase produisait une échéance, y compris quand la phrase parlait du passé.

### Temps de développement effectif

**Plus de 6 heures**, réparties sur deux journées avec de nombreuses
interruptions. Le budget annoncé était de 6 heures : il a été dépassé.

Le dépassement est localisé. Le périmètre fonctionnel — blocs 1 à 5, de
l'initialisation à la surcouche IA — tient dans les trois sessions du 29 juillet.
Toute la seconde journée est allée à la refonte visuelle, à la relecture du code
et à la documentation.

Ce n'est donc pas une dérive de périmètre : **aucune fonctionnalité n'a été
ajoutée après le 29 juillet.** C'est du temps investi là où le barème le
valorise le plus — 35 points cumulés sur l'UX, la qualité du code et la
documentation — au prix d'un dépassement assumé, plutôt qu'un livrable brut
rendu dans les délais.

---

## 6. Ce que je ferais avec plus de temps

Dans cet ordre :

1. **Élargir la couverture de l'extracteur** — futurs irréguliers, dates absolues (« le 12 août »), résolution de pronoms d'une phrase à l'autre.
2. **Comparer les deux extractions côte à côte** sur le même compte rendu, pour rendre l'apport de l'IA mesurable plutôt qu'affirmé.
3. **Authentification et espaces d'équipe** — premier vrai besoin dès qu'il y a plus d'un utilisateur.
4. **Notifications d'échéance.**
5. **Migration vers PostgreSQL** au-delà de quelques milliers d'éléments, ce qui rendrait alors le déploiement en ligne pertinent.

---

## 7. Ce que je changerais si je recommençais

**J'écrirais le test de référence avant l'extracteur.** Il a été écrit juste après, et il a bien joué son rôle — mais l'écrire d'abord aurait guidé les règles au lieu de les valider.

**Je relirais le code plus tôt.** Les cinq défauts trouvés à la relecture existaient depuis le premier jour. Trois d'entre eux auraient été visibles à la première écriture des tests, si j'avais testé les cas limites plutôt que le chemin nominal.

**Je n'aurais pas installé de composants sans les utiliser.** 304 des 305 lignes supprimées étaient deux composants shadcn ajoutés par réflexe et jamais employés.
