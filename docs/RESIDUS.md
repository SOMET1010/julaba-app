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
