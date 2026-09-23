# Recette terrain — APK `6a3663e`

**Construit depuis** : `6a3663e` (branche `claude/clever-allen-dnr8by`)
**Run** : [35912027452](https://github.com/SOMET1010/julaba-app/actions/runs/35912027452)
**Application** : `com.julaba.app` — versionName **1.0**, versionCode **1**
**Android** : minSdk **24** (Android 7) · target/compileSdk **36**
**API** : `https://julaba-api.onrender.com/api/v1`
**Voix** : dioula **éteinte**, montants dioula **éteints**, clips prototypes **éteints**
**Signature** : clé de debug — installation « sources inconnues », jamais un store.

**Ce qui est nouveau depuis le dernier APK terrain** : CAI-07, CAI-09, CAI-10,
CAI-11, STK-03 (a→g), CAI-06. Aucun changement fonctionnel n'a été fait après
ce SHA.

---

## Les dix gestes à faire sur le téléphone

Coche ce qui marche, écris ce qui ne marche pas **avec les mots que tu vois à
l'écran** — pas une interprétation.

| # | Geste | Ce qui doit se passer | OK ? |
|---|---|---|---|
| 1 | Ouvrir la caisse | L'écran s'ouvre, le micro est là | ☐ |
| 2 | Étal vide → « Ajouter un produit » → **Kponan** → **tas** → **1500** | Trois questions, pas une de plus. **Aucun prix prérempli** : le champ part vide et le bouton vert reste éteint tant que tu n'as rien tapé | ☐ |
| 3 | Regarder l'étal | **Kponan 1 500 F / tas** apparaît tout de suite, sans rien recharger | ☐ |
| 4 | Vendre **3 Kponan** | Le panier montre 3 × 1 500 = **4 500 F** | ☐ |
| 5 | Encaisser | La vente part, la caisse du jour monte de 4 500 F | ☐ |
| 6 | Fermer l'application, la rouvrir | Elle se rouvre sans redemander de poser l'étal | ☐ |
| 7 | Vérifier | **Kponan est toujours là**, et la vente de 4 500 F aussi | ☐ |
| 8 | Couper le réseau (mode avion) | — | ☐ |
| 9 | Rouvrir la caisse | L'étal s'affiche quand même | ☐ |
| 10 | Regarder au-dessus des produits | **« Derniers produits gardés sur ce téléphone »** — et **la vente reste possible** | ☐ |

---

## Ce qu'on cherche en priorité

1. **Un prix qui n'est pas le sien.** Si un montant apparaît quelque part sans
   qu'elle l'ait donné, c'est le défaut le plus grave — note l'écran exact.
2. **Un nom de produit qu'elle n'a pas dit.** « Igname » à la place de
   « Kponan », par exemple.
3. **Un écran muet.** Un endroit où elle ne sait pas quoi faire et où rien ne
   lui est dit à voix haute.
4. **Une chose perdue en rouvrant.** Produit, vente, ou prix.

## Ce qu'on ne teste pas ici

Le crédit (désactivé), la voix dioula (éteinte), le back-office (aucun compte
d'administration n'existe encore sur Render).

## Ce qu'on sait déjà, et qui n'est pas un défaut à signaler

- Le bandeau « Derniers produits gardés » apparaît aussi **brièvement à
  l'ouverture**, pendant que l'application demande ses produits. C'est voulu :
  tant qu'on n'a pas de réponse, on ne sait pas si la liste est à jour.
- Sans réseau, **tout** doit continuer de marcher. Au marché, c'est la
  situation normale.
