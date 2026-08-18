# Studio v1 — collecte terrain (squelette)

Chantier « Studio Voice », backlog V5. Deux écrans internes, aucune donnée
serveur, aucun chemin d'argent :

- **`/collecte-voix`** — élicitation : une image + une consigne dite par Tata,
  on enregistre la réponse, réécoute automatique, contrôle qualité côté
  appareil, mise en file locale (IndexedDB).
- **`/collecte-voix/validation`** — validation par paires : écoute + 👍/👎 sur
  la file locale. Règle reprise de Common Voice : **2 votes positifs =
  validé, 2 négatifs = rejeté**.

## Ce que ce lot prouve, et ce qu'il ne fait pas

**Prouvé, testé** : la mécanique complète — file de consignes, contrôle
qualité (durée 0,5–10 s, silence, écrêtage), stockage local, verrou de vote
2/2. Modules purs, testables sans navigateur (`services/collecteVoix*.ts`).

**Volontairement hors périmètre** :
- **Le contenu réel** (dioula, baoulé) — `services/collecteVoixPrompts.ts`
  ne contient que 10 consignes françaises PLACEHOLDER, pour prouver le
  mécanisme. Écrire le vrai référentiel exige un locuteur natif — dépendance
  humaine, pas technique.
- **La synchronisation serveur** — les clips restent sur l'appareil qui les a
  enregistrés. Le point de synchro (protocole, stockage des gros fichiers
  audio, qui a le droit de lire quoi) est une décision à part, à concevoir
  quand une vraie campagne est budgétée (cf. doc de design des 3 chantiers).
- **La validation multi-appareils** — `/collecte-voix/validation` valide sur
  la file de CET appareil. Un vrai second regard (quelqu'un d'autre, ailleurs)
  suppose la synchro ci-dessus.

## Avant une vraie campagne

1. Remplacer `PROMPTS_PLACEHOLDER_FR` par le référentiel réel (dioula puis
   baoulé), écrit avec un locuteur natif — chiffres, produits, oui/non/annule
   d'abord (le vocabulaire réellement utile à Jùlaba).
2. Concevoir le point de synchro (proposition : upload direct vers Azure Blob
   Storage par lots, cf. `docs/AZURE.md`, avec métadonnées dans une table
   dédiée plutôt que de mélanger avec les données métier).
3. Rédiger le consentement oral (clip dédié en début de session, comme prévu
   dans le doc de design).
