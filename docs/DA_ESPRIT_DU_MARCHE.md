# JULABA — L’esprit du marché

Cette refonte applique une identité commune au front office et au back office du dépôt. Elle modifie la présentation des composants existants. Elle ne constitue pas une recette visuelle de chaque écran ni une validation d’un APK.

## Direction artistique

| Élément | Traitement |
| --- | --- |
| Fond | Papier ivoire `#F6F0E4`, surfaces `#FFFCF7` |
| Structure | Aubergine `#332533`, navigation desktop et carte caisse |
| Action principale | Terre cuite `#B74725`, assombrie par rapport au repère décoratif `#C0522E` pour les libellés blancs |
| Voix | Vert `#00563B`, bouton avec contour et libellé explicite |
| Signature locale | Petit tiret orange et rectangle vert auprès du logo existant ; aucune frise tricolore |
| Typographie | Police existante conservée, montants tabulaires, textes secondaires renforcés |
| Composants | Boutons rectangulaires arrondis, ombres réduites, navigation sans pulsations décoratives permanentes |

Les couleurs de statut, les logos des opérateurs et les repères de rôle restent distincts. Le mode sombre et le mode soleil disposent de leurs propres encres et surfaces.

## Application aux écrans réels

| Périmètre | Application dans le code |
| --- | --- |
| Toutes les routes et fenêtres portales | `commerce.css` chargé à l’entrée ; palette Tailwind gris/orange reliée aux variables communes ; encres, focus, surfaces et ombres partagés |
| Connexion | Logo et signature visibles, bandeau tricolore retiré, assistant accessible par bouton vocal ; options code, clavier, biométrie et reconnaissance conservées |
| Accueil marchand | Carte caisse aubergine, nouvelle vente compacte, voix en contour vert, tuiles sobres ; montants issus des contextes existants |
| Navigation des cinq profils | Sidebar aubergine, barre mobile avec icônes et libellés ; éléments issus de `roleConfig`, accès Tata et confirmation de déconnexion conservés |
| Sous-pages métier | En-tête aubergine commun, fond papier, retour nommé pour les technologies d’assistance |
| Marchand | Couleurs de marque migrées dans caisse, dépenses, ventes passées, résumé, commandes, marché, tontines et fenêtres associées |
| Producteur | Palette commune ; aplats dans commandes, formulaires de récolte, plantations et détails ; statuts de récolte conservés |
| Coopérative | Palette commune ; aplats dans membres, commandes, marché et finances ; filtres et pagination conservés |
| Identification et institution | Palette commune ; couleurs de marque migrées dans tableaux de bord, fiches, rapports, suivi et analyses |
| Wallet, formation, profil et paramètres | Couleurs de marque et composants partagés ; parcours financiers et états conservés |
| Back office | Palette BO unifiée, navigation active terre cuite, logo signé, libellés de navigation agrandis, tables et actions communes adaptées |

La couverture par le thème partagé ne signifie pas que chaque mise en page a été redessinée individuellement. Les couleurs sémantiques, illustrations métier et styles spécifiques non migrés peuvent encore apparaître ; leur cohérence finale nécessite la recette visuelle ci-dessous.

## Limites et validation

- Le backend, les services, les contextes, les hooks, les utilitaires, les routes et les dépendances n’ont pas été modifiés (contrôle du diff).
- Les changements n’ajoutent ni données de démonstration ni indicateurs financiers fictifs. Certaines données de démonstration préexistantes dans les composants universels n’ont pas été remplacées dans ce travail de présentation.
- Avant rebase, `npm run typecheck` et `npm run build` réussissent localement (codes de sortie 0). Après rebase sur `6e1bac4`, le build réussit encore ; TypeScript échoue sur les dépendances `jsdom` et `@testing-library/react`, ajoutées par la mise à jour distante et absentes de l’installation locale. La tentative `npm ci` s’est interrompue sur une autorisation réseau annulée. Le contrôle TypeScript après installation complète reste donc à valider dans la CI. `git diff --check` réussit. Les CSS compilés contiennent les classes de la nouvelle identité et les références de palette utilisées par les utilitaires Tailwind. Les avertissements Vite sur les imports mixtes et la taille des bundles ne sont pas corrigés dans cette refonte.
- Les tests `tsx` restent à valider dans la CI : le lancement local précédent a échoué sur une permission IPC (`listen EPERM`). La poursuite sans ces tests a été autorisée ; aucun autre lanceur n’est utilisé pour contourner ce blocage.
- Le workflow existant `.github/workflows/ci.yml` inclut `npm run test:ci -w frontend_src`. Aucune exécution distante n’est attestée ici.
- La refonte est proposée sur la branche `design/esprit-du-marche` par Pull Request vers `main`. Aucun déploiement, APK reconstruit ou contrôle sur téléphone n’est inclus.

## Recette à effectuer avant livraison aux utilisateurs

| Parcours | Vérification attendue |
| --- | --- |
| Connexion | Numéro vocal et clavier, code secret, reconnaissance, erreur réseau, retour et changement de compte |
| Vente marchand | Nouvelle vente, reprise de panier récent/ancien, voix, saisie, confirmation, annulation et montant caisse |
| Journée | Résumé, fond de caisse, clôture et visibilité du solde |
| Chaque rôle | Navigation mobile/desktop, pages longues, filtres, formulaires, états vides/chargement/erreur et fenêtres |
| Back office | Tableaux et dossiers sur petit/grand écran, recherche, pagination, onglets et permissions selon le compte |
| Accessibilité | Écran 360 px, texte agrandi, clavier, focus, modes normal/sombre/soleil, contrastes et zones tactiles |
| Android/hors-ligne | Barres système, clavier natif, voix et reprise après perte de connexion sur appareil |

Ces vérifications nécessitent des comptes de recette et un environnement visuel exécutable. La réussite d’une compilation ne les remplace pas.
