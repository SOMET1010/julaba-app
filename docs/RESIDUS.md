# Registre des résidus — Julaba

Ouvert le 11/08/2026. Les implémentations par couches (nécessaires pour livrer
sans casser) laissent des résidus : ce registre les rend VISIBLES et suivis,
au lieu de les laisser s'accumuler en silence. Règle : toute passe de
nettoyage retire une ligne d'ici ou en ajoute une, avec preuve.

## Nettoyé (passe 1 — v5.0.0.6, 11/08/2026)

- `Ollama` (fichier vide à la racine, suivi par git) : supprimé.
- `frontend_src/src/imports/` : 35 fichiers non-code (specs .md, logs .txt,
  SVG en double) supprimés — aucun n'était importé (vérifié par grep, y
  compris `?raw`). Les `*-api.ts` réellement importés sont conservés.
- `MarchandAccueil.tsx` (ancien accueil marchand) : supprimé — plus aucun
  importeur depuis la Phase 2 (accueil unique MarchandAccueilVoice).
- `useWakeWord.ts` + son câblage dans VenteVocaleModal (état mains libres,
  bip, bloc UI) : supprimés — le hook renvoyait `supported: false` en dur
  depuis l'abandon du mot-réveil en ligne ; le bloc UI ne se rendait jamais.
  Un futur mot-réveil HORS-LIGNE (sherpa) repartira de zéro, proprement.

## Nettoyé (passe 2 — v5.0.0.7, 11/08/2026)

- Chaîne « academy » legacy supprimée (5 fichiers morts, prouvés sans
  importeur atteignable) : `useAcademy.ts` (10 erreurs TS, imports de
  fonctions inexistantes), `useAcademyTracking.ts`, `useAcademyModules.ts`,
  `JulabaAcademy.tsx`, `MarchandAcademy.tsx`. La route réelle pointe vers
  `UniversalAcademy`.
- `StockContext` : l'enveloppe « compatibilité » contenait un bloc de
  polling référençant des identifiants INEXISTANTS (`appUser`,
  `refreshStocks`) — il aurait planté au premier rendu s'il avait été
  exécuté. Retiré ; le vrai rafraîchissement vit dans `StockProviderInner`.
- Types résorbés (49 erreurs TS, 239 → 190) : variantes d'API déclarées en
  OPTIONNEL sur `Recolte`/`CommandeProducteur` (ProducteurContext) et
  `Recolte` (recoltes-api), alias `Cycle as CycleAgricole`, types de
  publication depuis les alias locaux existants.

## Nettoyé (passe 3 — v5.0.0.8, 11/08/2026)

- Résorption types paquet 2 (45 erreurs, 190 → 145) : configs d'énums
  complétées (TYPE_CONFIG, NIVEAU_CONFIG), gardes équivalentes au runtime
  (dates/index optionnels), ProduitMarche aligné sur le flux /publications
  réel, props de compat sub/trendUp déclarées sur UniversalKPI.
- Mensonge de type corrigé : `InstitutionBO.modules` et
  `BOInstitution.modules` déclaraient `string[]` alors que TOUS les écrans
  BO le lisent en dictionnaire module → niveau. Types alignés sur la
  réalité (`ModuleAcces`).

## Bug latent découvert par le typage (à corriger avec test runtime)

- `publicationsApiAdapter.fetchPublications()` IGNORE ses filtres : le
  contexte producteur appelait `fetchPublications(true, false)` (« mes
  publications actives ») mais l'adaptateur n'accepte aucun argument et
  appelle l'API sans filtre. Les arguments (morts) ont été retirés — le
  COMPORTEMENT est inchangé, mais l'intention d'origine (filtrer sur ses
  propres publications) reste non honorée. À corriger en passant les
  filtres à travers l'adaptateur, AVEC vérification runtime de l'écran
  Publications du producteur.

## Résidus connus, assumés, à traiter

- **241 erreurs TypeScript baseline** : le plus gros résidu du legacy. Toutes
  les livraisons de la session tiennent la ligne « 0 ajoutée » (diff du jeu
  d'erreurs à chaque commit) ; les RÉSORBER est un chantier dédié, par
  paquets, avec le même protocole de preuve.
- **`styles/soleil.css` v1 (sélecteurs d'attribut)** : encore NÉCESSAIRE pour
  les écrans non migrés vers les tokens (connexion, partagés, producteur,
  coopérative, institution). À retirer quand la migration tokens sera
  complète — c'est le critère de fin explicite.
- **`imports/*-api.ts`** (api-client, caisse-api, backoffice-api…) :
  réellement importés partout ; leur place est `app/services/api/`. À
  reloger « à froid » (gros renommage transverse, hors session de livraison).
- **`TextSizeSlider` quasi cosmétique** : il pilote `--font-size` qui n'a
  qu'UN consommateur CSS — l'app écrit ses tailles en px inline. Le mode
  soleil (zoom) fait le vrai travail. À décider : brancher réellement le
  curseur (rem partout = gros chantier) ou le retirer des Paramètres.
- **Doublon d'accueil `greetTitle` (connexion)** : lit `julaba_auth_user`
  alors que `comptesMemorises` est la source de vérité depuis le lot 1 de la
  reconnaissance. Unifier à la prochaine passe connexion.
- **`ThemeContext` (mode sombre 18h-6h)** : coexiste avec le mode soleil sans
  se connaître. Unifier sous un seul « confort visuel » (normal / soleil /
  sombre) à la prochaine passe d'inclusion.
