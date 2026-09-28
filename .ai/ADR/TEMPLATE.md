# ADR-XXX — [Titre court]

> Architecture Decision Record. Remplir toutes les sections. Date au format YYYY-MM-DD.

## Métadonnées

- **ID** : ADR-XXX
- **Titre** : [Titre court, descriptif]
- **Statut** : proposé | accepté | rejeté | déprécié | remplacé par ADR-YYY
- **Date** : YYYY-MM-DD
- **Décideur** : Agent 1 (Tech Lead) / Patrick Somet (arbitre produit) / Alex Degny (CEO)
- **Périmètre** : backend | frontend | mobile | database | infrastructure | gouvernance

## Contexte

[Description du problème ou de la situation qui justifie la décision. Inclure les forces en présence, les contraintes, les hypothèses.]

## Décision

[La décision prise, énoncée clairement et sans ambiguïté. Commencer par "Nous décidons de..."]

## Alternatives considérées

### Alternative A : [Nom]
- **Description** : ...
- **Avantages** : ...
- **Inconvénients** : ...
- **Rejetée parce que** : ...

### Alternative B : [Nom]
- **Description** : ...
- **Avantages** : ...
- **Inconvénients** : ...
- **Rejetée parce que** : ...

## Conséquences

### Positives
- ...

### Négatives
- ...

### Risques neutres
- ...

## Invariants testables

[Liste d'invariants business vérifiables par des tests automatisés. Référence vers les fichiers de test.]

- Invariant 1 : [Description] — Test : `backend/test/invariants/XXX.spec.ts`
- Invariant 2 : [Description] — Test : `backend/test/invariants/YYY.spec.ts`

## Modules impactés

[Liste des modules sacrés touchés. Toute modification future de ces modules exigera un nouveau ADR.]

- `auth/` — Module sacré
- `caisse-rest/` — Module sacré
- ...

## Plan de mise en œuvre

### Étape 1 : [Nom]
- **Effort** : S | M | L | XL
- **Responsable** : Agent
- **Fichiers** : ...
- **Tests** : ...

### Étape 2 : [Nom]
- ...

## Références

- `CONSTITUTION.md` §X — Principe applicable
- `JULABA_DECISIONS.md` §Y — Décision associée
- ADR-ZZZ — Décision liée
- `docs/dette/REGISTRE-MAITRE.md` — Item de dette traité

## Historique des révisions

| Date | Révision | Auteur | Description |
|---|---|---|---|
| YYYY-MM-DD | 1 | Agent | Création |
| YYYY-MM-DD | 2 | Agent | Mise à jour statut |

## Post-mortem (à remplir après implémentation)

[Leçon apprise : ce qui a marché, ce qui a coincé, ce qu'on améliorerait la prochaine fois.]
