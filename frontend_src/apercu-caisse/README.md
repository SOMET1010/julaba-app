# Aperçu caisse — banc de capture (VOIX-01, lot F)

Page **jetable, hors production** : elle monte le vrai `POSCaisse` (donc le vrai
`MicroVenteCaisse`, les vraies coupures dessinées, les mêmes feuilles de style)
avec des **contextes factices** — aucun backend, aucune connexion, aucune
écriture. Elle sert à une seule chose : que l'œil voie la caisse rendue par le
navigateur avant qu'un APK ne soit construit.

- `stubs/` : `CaisseContext`, `AppContext`, `StockContext`, `RaccourcisContext`,
  `ObjectifContext` remplacés par alias Vite (`vite.config.ts`). Données de la
  maquette : Tomate 3 tas, Oignon 1 kg, Banane 2 pièces = 2 900 F ; vignettes
  LOCALES (emoji rendu en SVG, comme l'appli hors ligne) — les photos du
  catalogue sont distantes et la capture se fait sans réseau.
- `capture.mjs` : serveur Vite de dev + Chromium (Playwright, exécutable déjà
  présent, toute requête externe bloquée), touche le billet de 5 000 F, **mesure**
  (largeur de défilement, éléments hors viewport, cibles < 44 px) et écrit les
  captures dans `docs/parcours/captures/`.

```sh
cd frontend_src
MAQUETTE_CAISSE=/chemin/vers/8.webp node apercu-caisse/capture.mjs
```

Ce dossier n'entre ni dans `npm run build` (l'entrée de production reste
`index.html`), ni dans `tsc -b` (`tsconfig.json` n'inclut que `src`). Ce qu'il
**ne prouve pas** : le comportement réel (voix, argent, hors-ligne) — seulement
l'apparence, sur des données de démonstration.
