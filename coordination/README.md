# Bus de coordination JULABA

Ce dossier n'est **pas** de la documentation projet. C'est le fil de
coordination entre Patrick et les instances IA, pour que Patrick puisse
s'absenter sans faire le facteur entre elles.

Cinq fichiers. Pas un de plus.

## La règle essentielle

**JULABA historique est le chef d'orchestre et le seul qui écrit dans le
code.** Il lit les instructions de Patrick, poursuit automatiquement le
chantier actif, sollicite l'instance de preuve locale quand une
contre-preuve est nécessaire, et ne réveille Patrick que lorsqu'un
arbitrage humain — ou un geste physique — est réellement requis.

## Un fichier, un écrivain

| Fichier | Seul écrivain autorisé |
|---|---|
| `INSTRUCTIONS-PATRICK.md` | **Patrick** |
| `JULABA-STATUS.md` | **JULABA historique** |
| `PREUVE-COMMANDE.md` | **JULABA historique** |
| `PREUVE-RESULTAT.md` | **Instance de preuve locale** |
| `README.md` | JULABA historique (sur décision de Patrick) |

**Aucun fichier de ce dossier n'a deux écrivains.** C'est la propriété qui
protège le bus des conflits Git — pas le dossier en lui-même. La boîte aux
lettres de la preuve locale est volontairement coupée en deux (commande /
résultat) pour que cette propriété tienne.

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

## Deux façons de s'arrêter, à ne pas confondre

Un arrêt n'est pas un échec d'autonomie. Mais il doit dire **ce que
Patrick doit faire**, en un geste unique et précis :

| `TYPE_BESOIN` | Sens | Exemple |
|---|---|---|
| `ARBITRAGE` | Une décision appartient à Patrick (métier, produit, irréversible) | appId Android, homonymie catalogue |
| `TEST_PHYSIQUE_ANDROID` | Aucune instance n'a d'appareil : le logiciel est prêt, il manque le geste | reconnexion sur appareil connu sans biométrie |
| `ACCES_VPS_ODOO` | Aucune instance n'a accès au VPS ni à Odoo réel | exécuter une commande préparée sur le serveur |

Dans les trois cas, tout ce qui ne dépend **pas** de ce blocage continue
sans Patrick.

## Protocole de reprise (JULABA historique)

À chaque reprise — réveil programmé, événement CI, ou message de Patrick :

1. `git fetch origin main` et se resynchroniser.
2. Lire `coordination/INSTRUCTIONS-PATRICK.md`.
3. Lire `coordination/JULABA-STATUS.md` (son propre état) et
   `coordination/PREUVE-RESULTAT.md` (une réponse attend peut-être).
4. Tant que `AUTONOMIE: OUI` et qu'aucun cas de `ARRET_PATRICK_SEULEMENT_SI`
   n'est atteint : **poursuivre le chantier actif jusqu'au GO/NO-GO, mettre
   à jour le statut, enchaîner l'étape suivante sans demander de
   confirmation intermédiaire.**
5. Aller au bout de tout ce qui est préparatoire — diagnostic logiciel,
   correctif candidat, outil de rapport, procédure exacte — **avant** de
   s'arrêter sur un blocage physique.
6. Si un arrêt est atteint : renseigner `BESOIN_PATRICK: OUI`,
   `TYPE_BESOIN:` et `ACTION_PATRICK:` dans `JULABA-STATUS.md`, et
   s'arrêter **sur ce point-là uniquement**.
