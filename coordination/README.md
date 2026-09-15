# Bus de coordination JULABA

Ce dossier n'est **pas** de la documentation projet. C'est le fil de
coordination entre Patrick et les instances IA, pour que Patrick puisse
s'absenter sans faire le facteur entre elles.

Quatre fichiers. Pas un de plus.

## La règle essentielle

**JULABA historique est le chef d'orchestre et le seul qui écrit dans le
code.** Il lit les instructions de Patrick, poursuit automatiquement le
chantier actif, sollicite l'instance de preuve locale quand une
contre-preuve est nécessaire, et ne réveille Patrick que lorsqu'un
arbitrage humain est réellement requis.

## Qui écrit où

| Fichier | Seul écrivain autorisé |
|---|---|
| `INSTRUCTIONS-PATRICK.md` | **Patrick** |
| `JULABA-STATUS.md` | **JULABA historique** |
| `PREUVE-LOCALE.md` → section `COMMANDE_A_EXECUTER` | **JULABA historique** |
| `PREUVE-LOCALE.md` → section `RESULTAT` | **Instance de preuve locale** |
| `README.md` | JULABA historique (sur décision de Patrick) |

`PREUVE-LOCALE.md` est le seul fichier à deux écrivains : **chacun n'édite
que sa propre section, jamais celle de l'autre.** C'est la seule règle qui
protège ce dossier des conflits Git.

ChatGPT a un accès Git mais **n'écrit pas dans le dépôt** : il lit `main`
et rend son verdict dans la conversation de Patrick. Il n'a donc pas de
fichier ici.

## Ce que ce dossier ne contient pas

Aucune duplication. L'état réel du projet vit ailleurs et n'est **jamais**
recopié ici :

- **État de `main`, lots clos, lot actif, file d'attente, invariants gelés**
  → [`docs/PASSATION.md`](../docs/PASSATION.md)
- **Décisions produit et métier** → [`JULABA_DECISIONS.md`](../JULABA_DECISIONS.md),
  [`docs/DECISIONS_METIER.md`](../docs/DECISIONS_METIER.md)
- **Décisions d'architecture** → les ADR
- **La loi du dépôt** → [`CONSTITUTION.md`](../CONSTITUTION.md)

`JULABA-STATUS.md` dit *où on en est à l'instant T*. `docs/PASSATION.md`
dit *ce qui est acquis*. En cas de contradiction, `docs/PASSATION.md`
gagne.

## Protocole de reprise (JULABA historique)

À chaque reprise — réveil programmé, événement CI, ou message de Patrick :

1. `git fetch origin main` et se resynchroniser.
2. Lire `coordination/INSTRUCTIONS-PATRICK.md`.
3. Lire `coordination/JULABA-STATUS.md` (son propre état) et
   `coordination/PREUVE-LOCALE.md` (une réponse attend peut-être).
4. Tant que `AUTONOMIE: OUI` et qu'aucun cas de `ARRET_PATRICK_SEULEMENT_SI`
   n'est atteint : **poursuivre le chantier actif jusqu'au GO/NO-GO, mettre
   à jour le statut, enchaîner l'étape suivante sans demander de
   confirmation intermédiaire.**
5. Si un cas d'arrêt est atteint : poser `BESOIN_PATRICK: OUI` dans
   `JULABA-STATUS.md`, écrire la question exacte à trancher, et s'arrêter
   **sur cette question-là uniquement** — le reste du chantier continue.
