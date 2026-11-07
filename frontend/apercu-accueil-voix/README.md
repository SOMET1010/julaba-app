# Aperçu — accueil marchand et portes vocales

Banc **visuel et interactif seulement**, isolé de l’application. Il montre :

- l’accueil avec deux entrées illustrées : ouvrir la caisse et ajouter un produit ;
- la question issue du catalogue, puis l’écran d’écoute sans texte (le micro
  animé est le seul signal visible) ;
- la reprise visuelle du fond en toutes lettres, puis l’écoute de confirmation ;
- pour un produit connu, l’étape graphique de l’unité réinitialisée à chaque fois,
  puis le même chemin vers la quantité. La voix ne valide ni unité ni quantité.

Le parcours produit reflète le `AjoutProduitGuide` existant : reconnaissance du
produit → choix explicite de l’unité → quantité. Le banc réutilise le catalogue
vocal, la fonction pure qui propose les unités et la signature de marque ; il ne
monte aucun contexte de caisse, ne déclenche aucun service métier et n’écrit
aucune donnée. Les résultats et commandes de l’aperçu sont simulés.
Le banc n’ouvre pas le micro, ne joue pas la voix et n’enregistre rien.

La confirmation est montrée en deux temps — montant relu, puis écoute oui/non
sans texte — conformément à la doctrine. Le composant applicatif existant n’a
pas été modifié ; son affichage pendant l’écoute devra être vérifié avant
implémentation.

Les couleurs, polices, espacements et rayons sont lus depuis
`src/styles/commerce.css` ; aucun paquet n’est ajouté. Pour lancer :

```sh
cd frontend
npx vite --config apercu-accueil-voix/vite.config.ts
```

`?etat=accueil`, `?etat=caisse-question`, `?etat=caisse-ecoute`,
`?etat=caisse-confirme`, `?etat=caisse-confirm-ecoute`,
`?etat=produit-question`, `?etat=produit-ecoute`, `?etat=produit-unite` et
`?etat=produit-quantite` ouvrent les états à capturer.
