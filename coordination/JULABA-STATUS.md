# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: BLOQUE
TACHE: VOIX-V5
BESOIN_PATRICK: OUI
TYPE_BESOIN: TEST_PHYSIQUE_ANDROID
ACTION_PATRICK: exécuter docs/RECETTE-VOIX-V5.md sur un téléphone dont le
  compte est mémorisé SANS biométrie (~20 min), puis coller le rapport
  « 🐞 Rapport de test » dans la conversation. Rien d'autre n'est attendu
  de Patrick.
DERNIER_SHA_MAIN: b626ceb
BRANCHE_EN_ATTENTE: claude/clever-allen-dnr8by (47bcb0e) — correctif VOIX-V5,
  NON mergé : l'authentification est un module sacré, la Constitution exige
  une preuve réelle avant merge (principe 3).
PROCHAINE_ACTION: à réception du rapport — lire le tableau de décision de
  docs/RECETTE-VOIX-V5.md, merger le correctif sur main si GO, puis
  enchaîner sur le point 3 de la file d'attente (« Ouvre ta journée »,
  câblage bouton/carte RoleDashboard.tsx ~L286-393).
DERNIER_RESULTAT: diagnostic confirmé au niveau du code, correctif écrit et
  testé (verify, test:ci, build, gate TS — verts), outil de diagnostic
  étendu, procédure terrain rédigée. Tout le préparatoire est fait.
```

`STATUT` ∈ `EN_ATTENTE` · `EN_COURS` · `BLOQUE` · `TERMINE`
`TYPE_BESOIN` ∈ `ARBITRAGE` · `TEST_PHYSIQUE_ANDROID` · `ACCES_VPS_ODOO`
(voir [`README.md`](README.md) — un arrêt n'est pas un échec d'autonomie,
mais il doit dire quel geste unique Patrick doit poser)

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

- **15/09/2026** — VOIX-V5 : diagnostic confirmé (LoginPassword.tsx:114
  + :255 — 'password' était la seule des trois étapes sans filet de
  rattrapage audio). Correctif, six tests sur useAudioUnlockFallback,
  journal de diagnostic ouvert dès l'arrivée sur l'écran, relèvement des
  voix tardives, recette terrain écrite. Arrêt sur test physique.
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
sans Patrick. Le préparatoire est **terminé** et l'arrêt est **atteint** : une seule
action terrain reste, décrite pas à pas dans
[`docs/RECETTE-VOIX-V5.md`](../docs/RECETTE-VOIX-V5.md).
