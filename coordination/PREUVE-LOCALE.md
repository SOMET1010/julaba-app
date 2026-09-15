# Boîte aux lettres — Instance de preuve locale

> Seul fichier du bus à **deux écrivains**.
>
> - `COMMANDE_A_EXECUTER` → écrit par **JULABA historique** uniquement.
> - `RESULTAT` → écrit par **l'instance de preuve locale** uniquement.
>
> **Chacun n'édite que sa propre section, jamais celle de l'autre.**
> C'est la seule règle qui protège ce fichier des conflits Git.

Rappel du rôle (voir [`docs/PASSATION.md`](../docs/PASSATION.md)) :
l'instance de preuve locale exécute builds, tests E2E et recettes contre
des services locaux jetables. Elle n'a **aucun accès au VPS ni à Odoo
réel**. Elle exécute la commande et retourne la **sortie brute complète**.
Une anomalie découverte est **signalée, jamais corrigée** de sa propre
initiative.

---

## COMMANDE_A_EXECUTER

```
AUCUNE
```

## RESULTAT

```
EN_ATTENTE
```
