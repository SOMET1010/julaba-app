# Cinq sentinelles — savoir ce qu'on teste

> Cinq flux Maestro, et pas un de plus. Décision de Patrick, 16/09/2026.

## Pourquoi elles existent

Pas pour trouver des défauts : **pour savoir quelle version on a entre les
mains.** Le 16/09/2026, en une seule journée :

- un APK périmé a été installé et jugé « sans amélioration » ;
- un rapport de recette complet a été produit sur `main` au lieu de la branche
  candidate — six de ses « défauts graves » étaient déjà corrigés ;
- un `backend/dist` périmé a renvoyé un 404 qui imitait exactement un défaut
  réparé, au point de faire croire que le correctif ne marchait pas.

Trois fois, du temps perdu à cause d'un artefact périmé. Ces cinq flux
répondent en trente secondes à « est-ce bien la bonne version ? ».

## Ce qu'elles ne feront jamais

Aucune ne juge la voix. Un automate peut vérifier qu'un bouton existe et qu'il
déclenche quelque chose ; il ne peut pas entendre si Tata est compréhensible,
naturelle, audible dans le bruit d'un marché. **Cela reste un test humain, sur
un vrai appareil.** Voir `docs/RECETTE-TERRAIN-GROUPEE.md`.

## Les cinq

| Flux | Ce qu'il garantit |
|---|---|
| `01-demarrage.yaml` | l'APK s'installe, se lance, et n'affiche pas un écran vide |
| `02-connexion.yaml` | l'écran de connexion est le bon, avec le pavé attendu |
| `03-haut-parleur.yaml` | **le discriminant de version** : le haut-parleur est là dès le PREMIER chiffre |
| `04-vente.yaml` | une vente simple va jusqu'au bout |
| `05-hors-ligne.yaml` | une vente hors ligne puis reconnexion ne crée **pas** deux ventes |

Le troisième est le plus important pour le problème qu'on vient de vivre :
avant les correctifs du 16/09, le haut-parleur n'apparaissait qu'au dixième
chiffre. S'il faut encore dix chiffres, l'appareil porte une version périmée
et tout ce qu'on observera ensuite sera faux.

## Lancer

```bash
maestro test maestro/01-demarrage.yaml
maestro test maestro/            # les cinq
```

Maestro Studio (`maestro studio`) aide à ajuster un sélecteur qui ne trouve
plus sa cible.

## Avertissement sur ces fichiers

**Ils n'ont jamais été exécutés.** Ils ont été écrits sans appareil ni
émulateur disponible — le réseau de la session ne permet ni d'installer
Maestro ni d'atteindre sa documentation. Les sélecteurs sont tirés des textes
réellement observés dans l'application, mais le premier passage demandera
vraisemblablement des ajustements. C'est normal, et c'est à ça que sert
Maestro Studio.

Ne pas confondre « écrit » et « vert ».
