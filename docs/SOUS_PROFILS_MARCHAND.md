# Sous-profils marchand — état et décisions

Audit du 11/08/2026 (code vérifié fichier par fichier). Le marchand a trois
sous-profils : **grossiste**, **demi-grossiste**, **détaillant**
(`sous-profil-marchand.enum.ts`, colonne `sous_profil_marchand` en base,
saisie OBLIGATOIRE à l'identification d'un marchand).

## Ce que chaque sous-profil obtient aujourd'hui

| | Marché virtuel (amont) | Récoltes prévues | Publier | Caisse |
|---|---|---|---|---|
| **Grossiste** | Offres des producteurs et coopératives | ✅ (réservé) | ✅ (republication d'offres) | commune + négoce |
| **Demi-grossiste** | Offres publiées par les grossistes | ❌ | ❌ | commune + négoce |
| **Détaillant** | Aucun achat amont dans l'application (historique seul) | ❌ | ❌ | commune |

Le cloisonnement est fait CÔTÉ BACKEND (publications-rest), pas seulement à
l'affichage — c'est la bonne architecture.

## Décision du 11/08/2026 : « la caisse suit le sous-profil » (v5.0.0.11)

Le parcours métier fourni le 20/10/2026 précise le circuit : le
DEMI-GROSSISTE achète auprès des GROSSISTES via le marché virtuel et revend
aux détaillantes **en quantités moyennes, à prix négocié à chaque vente**.
Les grossistes publient leurs offres via `/publications/republier`; la lecture
et la validation d'une commande doivent vérifier côté serveur le profil vendeur
et le canal de marché.

Livré (100 % frontend, panier) :
- **Prix convenu par ligne** : en négoce (demi-grossiste ET grossiste), le
  prix unitaire de chaque ligne du panier est modifiable au toucher — le
  prix catalogue devient un prix de départ, le prix CONVENU est celui de la
  vente (persisté avec le panier, marge calculée sur le prix réel).
- **Quantité tapée directement** : pour tous les sous-profils, la quantité
  d'une ligne se tape au clavier (on ne vend pas 40 cuvettes au +1/+1).
- La détaillante ne voit AUCUN changement de son parcours (prix non
  modifiable, mêmes écrans).

## À faire (ordre de valeur, à valider terrain)

1. **Unités de gros** pour grossiste/demi-grossiste : sac (25/50 kg),
   carton, cuvette — avec conversion vers l'unité de détail (nécessite un
   champ backend sur le produit).
2. **Paliers de prix par volume** (prix dégressifs) — backend + UI.
3. **Chaîne demi-grossiste → détaillant** : le détaillant n'a pas de
   commande amont dans l'application selon le parcours actuel ; les ventes au
   détail sont enregistrées dans sa caisse.
4. **Marchands sans sous-profil** (comptes d'avant la migration) : aucun
   marché, silencieusement — prévoir un rattrapage (question à la première
   connexion, ou campagne identificateur).
5. **Terminologie** : le métier dit parfois « semi-grossiste », le code dit
   `demi_grossiste` partout. Trancher AVANT la recette ANSUT.
