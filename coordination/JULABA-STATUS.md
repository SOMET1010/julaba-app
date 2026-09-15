# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_COURS
TACHE: VOIX-V5
BESOIN_PATRICK: NON
TYPE_BESOIN: —
ACTION_PATRICK: —
DERNIER_SHA_MAIN: f4ebf1e
PROCHAINE_ACTION: reprendre le diagnostic VOIX-V5 — instrumenter la piste
  useAudioUnlockFallback absent de l'étape 'password' (LoginPassword.tsx),
  puis construire le rapport de diagnostic intégré qui permettra à Patrick
  de trancher en une seule session terrain.
DERNIER_RESULTAT: bus de coordination créé et mergé sur main. Aucun code
  applicatif touché.
```

`STATUT` ∈ `EN_ATTENTE` · `EN_COURS` · `BLOQUE` · `TERMINE`
`TYPE_BESOIN` ∈ `ARBITRAGE` · `TEST_PHYSIQUE_ANDROID` · `ACCES_VPS_ODOO`
(voir [`README.md`](README.md) — un arrêt n'est pas un échec d'autonomie,
mais il doit dire quel geste unique Patrick doit poser)

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

- **15/09/2026** — Bus de coordination `coordination/` créé (gouvernance
  uniquement, zéro duplication de PASSATION / décisions / ADR), un seul
  écrivain par fichier. Mergé directement sur `main` sur décision de
  Patrick. Reprise de VOIX-V5.

---

## Limite connue sur le chantier actif

`AUTONOMIE: OUI` ne lève pas le blocage physique de VOIX-V5 : la
confirmation de la piste exige un **appareil Android réel** entre les
mains de Patrick (reconnexion sur appareil connu sans biométrie). Aucune
instance n'a d'appareil.

Ce blocage n'arrête pas le chantier : diagnostic logiciel, correctif
candidat, outil de rapport intégré et procédure de test exacte se font
sans Patrick. L'arrêt viendra **une seule fois**, à la fin de tout le
préparatoire, sous la forme `TYPE_BESOIN: TEST_PHYSIQUE_ANDROID` avec une
action terrain unique et précise.
