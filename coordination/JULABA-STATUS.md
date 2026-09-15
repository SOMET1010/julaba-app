# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_COURS
TACHE: VOIX-V5
BESOIN_PATRICK: NON
DERNIER_SHA_MAIN: e3bfe50
PROCHAINE_ACTION: reprendre le diagnostic VOIX-V5 — instrumenter la piste
  useAudioUnlockFallback absent de l'étape 'password' (LoginPassword.tsx)
  et préparer le rapport de diagnostic intégré, sans appliquer de
  correctif tant que la piste n'est pas confirmée.
DERNIER_RESULTAT: bus de coordination créé et mergé sur main. Aucun code
  applicatif touché.
```

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

- **15/09/2026** — Bus de coordination `coordination/` créé (4 fichiers,
  gouvernance uniquement, zéro duplication de PASSATION / décisions / ADR).
  Mergé directement sur `main` sur décision de Patrick. Reprise de VOIX-V5.

---

## Limite connue sur le chantier actif

`AUTONOMIE: OUI` ne lève pas le blocage physique de VOIX-V5 : les deux
protocoles de confirmation exigent un **appareil Android réel** entre les
mains de Patrick (reconnexion sur appareil connu sans biométrie). Aucune
instance n'a d'appareil. Le travail préparatoire — correctif et outil de
diagnostic intégré — se fait sans Patrick ; la **confirmation terrain**
restera un arrêt `BESOIN_PATRICK: OUI` par nature, pas par prudence.
