# ADR-0002 — Convergence du schéma vers des migrations reproductibles (#10)

- **Statut** : Accepté (plan) — exécution **étagée**, base de prod vivante.
- **Date** : 2026-08-15
- **Périmètre** : mécanisme de construction/évolution du schéma Postgres. **Aucune
  perte de données** ; la base de prod est la source de vérité, on ne la
  reconstruit jamais à partir de zéro.

## Contexte — le mécanisme actuel

1. **`prepareDatabase()` (main.ts)** : au boot, si la base est **vierge** (pas de
   table `users`), active `synchronize` → TypeORM construit le schéma **depuis les
   entités**. Si la base est **peuplée** : on ne touche à rien.
2. **`DbInitService.runInit()`** : applique ensuite des patchs SQL **idempotents**
   (`ALTER/CREATE ... IF NOT EXISTS`) pour rattraper colonnes/tables/index/vue que
   `synchronize` ne pose pas (tables sans entité : `caisse_sessions`, `produits`,
   `stock_mouvements`, index d'idempotence, colonnes ajoutées après coup…).
3. **Migrations** : 31 fichiers existent mais `migrationsRun` est **OFF**
   (« historique incomplet, échouerait sur une base neuve »). **Elles ne tournent
   jamais.**

**Conséquence** : le schéma réel = `synchronize` initial + accumulation de patchs
`DbInit` + objets créés **hors dépôt** (`credits`, `clients`, `produits`, vue
`credits_avec_statut`). **Il n'est pas reproductible depuis les migrations.** Une
base neuve ne peut pas être reconstruite à l'identique par `migration:run`.

### Symptômes observés (dette réelle)

- **Drift `synchronize`** : `recoltes.user_id` est re-`ADD ... NOT NULL` à chaque
  `synchronize` (cf. incident CI #12 : dès que la table n'est plus vide, l'ADD
  échoue). Cause : dette de mapping/typage entité↔base.
- **Timestamps de migration en doublon** : `1779200000000` (×2),
  `1779300000000` (×3) → **ordre d'exécution non déterministe**.
- **Objets non sourcés** : `credits`, `clients`, `produits`, vue
  `credits_avec_statut` préexistent en base, hors dépôt.
- **Tables garanties par l'entité seule** (pas de migration de création) :
  `caisse_transactions`, `stocks`, `cooperatives`, `objectifs_journaliers`,
  `raccourcis`, `push_tokens`, `stock_reservations`…

## Décision — cible

> Une base **vierge** doit se reconstruire **à l'identique** via `migration:run`,
> sans `synchronize`. `synchronize` devient un filet de secours de dernier
> recours, `DbInit` fond progressivement dans les migrations, et un **contrôle CI
> de reproductibilité** garde l'invariant.

On **ne big-bang pas**. Migration étagée, chaque étape non destructive et vérifiée.

## Plan étagé

**Étape 0 — arrêter d'aggraver (ce lot).**
- Corriger les collisions de timestamp que **nous** introduisons (ma migration
  `AddRecolteToStockAndCommande` renommée avec un timestamp unique).
- Figer le plan (cet ADR).

**Étape 1 — baseline reproductible.**
- Construire une base vierge, appliquer `synchronize` (entités) **+** `DbInit`
  (le schéma réel actuel), puis `pg_dump --schema-only` → SQL canonique.
- En dériver une migration **`0-BaselineSchema`** (CREATE de tout le schéma).
- Archiver les 31 migrations pré-baseline hors du glob (`migrations/_archive/`) :
  elles décrivent un historique incomplet et ne doivent plus s'exécuter.
- **Vérifier** : base vierge #2 → `migration:run` (baseline seule) →
  `pg_dump` → **diff nul** avec le schéma de référence.

**Étape 2 — folder `DbInit` dans les migrations.**
- Chaque patch idempotent de `DbInit` devient (ou est déjà couvert par) la
  baseline / une migration post-baseline. `DbInit` se réduit puis se retire.
- Les objets hors dépôt (`credits`, `clients`, `produits`, vue) sont **sourcés**
  dans la baseline (leur schéma réel capturé par le dump).

**Étape 3 — corriger les drifts de mapping.**
- `recoltes.user_id` et autres divergences entité↔base qui font churner
  `synchronize`, pour que baseline == entités (diff stable).

**Étape 4 — bascule.**
- Prod : `migrationsRun = true`, `synchronize = false` par défaut, une fois la
  baseline prouvée reproductible. `synchronize` ne reste qu'en secours explicite.
- **Gate CI** : un job « schéma reproductible » construit une base neuve depuis
  les migrations et échoue au moindre écart avec le schéma de référence.

## Conséquences

- **Sûr** : aucune étape ne touche les données de prod ; la baseline se **valide
  sur base jetable** avant toute bascule.
- **Bénéfice** : recette reproductible, fin des drifts `synchronize`, plus de
  patchs `DbInit` masquant la vérité, onboarding d'un dev en une commande.
- **Coût** : la baseline est un gros fichier (attendu) ; Étapes 2-3 demandent une
  passe soigneuse table par table.

## Risques & garde-fous

- La base de prod **préexiste** : la baseline sert aux bases **neuves** ; sur la
  prod existante on ne rejoue pas la baseline (elle reste marquée « déjà
  appliquée » via `migration:run --fake` au moment de la bascule).
- Objets hors dépôt : capturés par `pg_dump` de la **vraie** base de référence,
  pas devinés.
- Chaque étape est **réversible** et gardée par le diff de schéma.
