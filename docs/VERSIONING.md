# Versionnage Julaba

Décision du 11/08/2026 : la version applicative affichée est à QUATRE chiffres,
au format `MAJEUR.MINEUR.CORRECTIF.LIVRAISON`, à partir de **v5.0.0.1**.

## Où vit la version

- `frontend_src/package.json` → champ **`appVersion`** (ex. `"5.0.0.1"`).
  C'est LA source de vérité : Vite l'injecte dans `__APP_VERSION__`, affichée
  à la connexion (mode développeur) et dans Paramètres (« Jùlaba Marchand
  v5.0.0.1 »).
- Le champ npm `version` (frontend, backend, racine) reste un **semver à
  3 chiffres** (`5.0.0`) : npm refuse 4 segments. Il suit les trois premiers
  chiffres de `appVersion`.

## Règles d'évolution

- **LIVRAISON** (4e chiffre) : incrémenté à chaque lot livré/poussé
  (fonctionnalité, correctif visible). C'est le chiffre qui bouge au quotidien.
- **CORRECTIF** : correctif urgent en production.
- **MINEUR** : nouveau module ou phase produit.
- **MAJEUR** : réservé aux jalons décidés par le porteur (Alex).
- Quand MAJEUR/MINEUR/CORRECTIF bougent : mettre à jour `appVersion` ET les
  champs npm `version` (3 premiers chiffres), LIVRAISON repart à 1.

## Historique

- v5.0.0.5 — 11/08/2026 : tokens de contraste étendus à tout le parcours
  marchande — stock, dépenses, crédit, formulaire de dépense, Keiwa
  (228 usages au total, garde-fou test:tokens).
- v5.0.0.4 — 11/08/2026 : unification vocale lot 2 — après la vente d'un
  produit inconnu, Tata propose de l'ajouter à la boutique (prix dicté,
  refus mémorisé par produit) ; les ventes suivantes sont appariées.
- v5.0.0.3 — 11/08/2026 : contraste v2 — couche de tokens CSS (`--encre*`,
  `--trait`, styles/tokens.css) surchargée proprement par le mode soleil ;
  4 écrans cœur marchande migrés (caisse, accueil, ventes, résumé),
  cohérence gardée par `npm run test:tokens`.
- v5.0.0.2 — 11/08/2026 : montants parlés généralisés — tout KPI (UniversalKPI,
  53 écrans) et toute vente de l'historique se disent d'un toucher.
- v5.0.0.1 — 11/08/2026 : base de départ (session inclusion : sherpa unique,
  « Tata me reconnaît », billets CFA, nombres bambara, anti-jargon,
  vibrations, mode soleil).
