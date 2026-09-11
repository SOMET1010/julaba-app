# Plan de packs Tata et de langues locales — Julaba

## Principe non négociable

La voix Tata Nanti Lou est une **voix humaine féminine locale**. Julaba ne génère pas une imitation de Tata, ne bascule pas vers une voix système et ne fait pas d’appel TTS pendant une vente. Les nouveaux audios doivent être enregistrés avec l’accord explicite de Tata, validés par elle et embarqués dans l’application avant diffusion.

## Pack Tata prioritaire

Le pack actuel contient les confirmations et messages de navigation. Le prochain lot couvre les phrases composables les plus utiles : nombres, monnaie, unités et produits. Chaque clip est court, clair et enregistré dans un environnement calme, au format **MP3 mono 44,1 kHz**.

| Famille | Exemples de clips | Volume estimé |
|---|---|---:|
| Nombres | zéro à cent, dizaines et centaines fréquentes | 40 à 60 |
| Montants | francs, mille francs, prix total, prix d’un | 15 à 20 |
| Unités | kilo, sac, carton, panier, pièce, bouteille | 10 à 15 |
| Produits courants | tomate, oignon, piment, gombo, riz, huile, savon | 20 à 30 |
| Confirmation et correction | « j’ai compris », « regarde le montant », « recommence » | 15 à 20 |

> Une phrase qui ne peut pas être construite avec un clip validé reste affichée à l’écran. Elle ne doit jamais être lue par une autre voix.

## Packs linguistiques hors ligne

Le français local est le pack de base. Le Dioula et le Bambara sont des installations séparées, réalisées avant usage sur Wi‑Fi ou par un agent de terrain. Chaque pack doit contenir :

| Contenu | Dioula | Bambara |
|---|---|---|
| Modèle STT local compatible Android | À valider sur audio terrain | À valider sur audio terrain |
| Vocabulaire vente et nombres | À produire avec locutrices | À produire avec locutrices |
| Clips Tata/voix locale humaine | À enregistrer avec consentement | À enregistrer avec consentement |
| Fichier manifeste et somme de contrôle | Requis | Requis |
| Tests d’installation sans réseau | Requis | Requis |

## Conditions avant intégration

1. Tester chaque modèle sur des enregistrements réels de marché, et non seulement sur de la synthèse.
2. Mesurer WER/CER **et** extraction des entités de vente (produit, quantité, montant).
3. Tester l’APK en mode avion sur un Android d’entrée de gamme.
4. Valider la prononciation et les textes avec une locutrice native avant de publier le pack.
