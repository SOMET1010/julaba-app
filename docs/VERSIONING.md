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

- v5.0.0.16 — 11/08/2026 : migration tokens ACHEVÉE pour les couleurs de
  texte inline — ~180 gris pâles migrés vers var(--encre-3/4) sur toute
  l'app (partagés, coopérative, institution, identificateur, back-office).
  Les sélecteurs d'attribut de soleil.css v1 sont retirés, avec preuve au
  Chromium qu'ils n'ont jamais matché (hex normalisés en rgb() par le
  navigateur) : le soleil ET le sombre s'appliquent désormais via les
  tokens, partout où le texte est en inline.
- v5.0.0.15 — 11/08/2026 : deux mensonges d'interface réparés — le curseur
  « Taille du texte » agit VRAIMENT (zoom réel 85-130 % sur le corps, même
  mécanique que le mode soleil, garde-fou test:taille — avant il écrasait
  même la base du mode soleil), et l'accueil de la connexion salue depuis le
  compte mémorisé (source de vérité) au lieu d'une clé effacée au logout.
- v5.0.0.14 — 11/08/2026 : confort visuel UNIFIÉ — normal / soleil / sombre
  sous un seul arbitre (utils/confortVisuel) : plus jamais deux modes à la
  fois, migration de l'ancien réglage sombre, et surcharge `html.dark` des
  tokens `--encre*` (avant : encre noire sur fond sombre = texte invisible
  sur les écrans migrés). Parité soleil/sombre gardée par test:tokens.
- v5.0.0.13 — 11/08/2026 : la dernière « fonction jamais câblée » du
  registre tombe — le bouton « Dis ton objectif » (ObjectifModal) marche
  vraiment : dictée sherpa hors-ligne + nombres bambara, montant rempli en
  direct, micro rangé après 2 s de silence. Section « fonctions jamais
  câblées » du registre : VIDE.
- v5.0.0.12 — 11/08/2026 : câblage des fonctions mortes du registre — le
  compteur « réponses du support non lues » devient réel (mémoire de lecture
  locale, `test:support`, 9 suites au portail verify), bandeau d'explication
  pour le marchand sans sous-profil (marché virtuel). Distribution de stock
  laissée non câblée (backend neutralisé, preuve au registre) ; « bug
  latent » publications classé non-bug (le serveur filtre déjà par
  utilisatrice).
- v5.0.0.11 — 11/08/2026 : la caisse suit le sous-profil marchand
  (docs/SOUS_PROFILS_MARCHAND.md) — prix convenu par ligne en négoce
  (demi-grossiste/grossiste), quantité tapée directement pour tous.
  Parcours détaillante inchangé.
- v5.0.0.10 — 11/08/2026 : ZÉRO ERREUR TypeScript (90 → 0 ; 241 → 0 sur la
  session). Le shim `leaflet.d.ts` qui écrasait @types/leaflet est supprimé,
  4 fichiers morts retirés (ui/carousel, drawer, input-otp, examples), et
  `npm run verify` (typecheck 0 + 8 suites) devient LE portail avant push.
- v5.0.0.9 — 11/08/2026 : résorption TypeScript paquet 3 — 55 erreurs en
  moins (145 → 90). Trois bugs réels corrigés au passage : titre des
  notifications coopérative jamais transmis (titre → title), tuiles du
  tableau de bord identificateur affichant du vide (champs inexistants),
  section stats du modal institution qui lisait une promesse (plantage).
  @types/leaflet installé (carte BO typée).
- v5.0.0.8 — 11/08/2026 : résorption TypeScript paquet 2 — 45 erreurs en
  moins (190 → 145) : back-office (Dashboard, Institutions) et MarcheHub.
  Mensonge de type corrigé : InstitutionBO.modules était déclaré string[]
  alors que tous les écrans le lisent en dictionnaire module → niveau.
- v5.0.0.7 — 11/08/2026 : résorption TypeScript paquet 1 — 49 erreurs en
  moins (239 → 190) : chaîne academy morte supprimée, types d'API
  complétés (producteur), enveloppe StockContext cassée retirée. Un bug
  latent découvert et consigné (filtres de publications ignorés par
  l'adaptateur).
- v5.0.0.6 — 11/08/2026 : nettoyage des résidus legacy, passe 1 — 41
  fichiers morts supprimés (specs/logs/SVG de imports/, ancien accueil,
  mot-réveil désactivé, artefact Ollama), registre docs/RESIDUS.md ouvert.
  Baseline TypeScript : 241 → 239.
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
