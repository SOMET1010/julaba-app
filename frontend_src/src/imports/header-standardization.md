STANDARDISATION GLOBALE DES HEADERS (SAFE AREA + HARMONISATION TOTALE)
🎯 OBJECTIF
Uniformiser tous les Headers de l’application pour :
1. Éviter toute superposition avec le bloc caméra / notch / Dynamic Island.
2. Garantir une hauteur identique partout.
3. Uniformiser tailles de police.
4. Uniformiser tailles d’icônes.
5. Garantir cohérence Desktop / Tablet / Mobile.
6. Ne jamais casser la structure UI existante.

1️⃣ SAFE AREA OBLIGATOIRE (CRITIQUE)
Implémenter partout :
padding-top: env(safe-area-inset-top);
* fallback :
padding-top: constant(safe-area-inset-top);
Sur mobile :
* Hauteur totale Header = Safe Area + hauteur fixe définie.
* Aucun texte ou icône ne doit toucher la zone notch.
Tester sur :
* iPhone avec notch
* Android avec trou caméra
* Navigateur réduit

2️⃣ HAUTEUR STANDARD UNIQUE
Définir une seule hauteur officielle :
Mobile :
* 64px zone utile (hors safe area)
Tablet :
* 72px
Desktop :
* 80px
Interdiction de Header plus petit ou plus grand ailleurs.
Créer une variable globale :
--header-height-mobile: 64px;
--header-height-tablet: 72px;
--header-height-desktop: 80px;
Tous les layouts doivent utiliser cette variable.

3️⃣ TYPOGRAPHIE STANDARDISÉE
Titre principal Header :
Mobile :
* 18px
* Font-weight 600
Tablet :
* 20px
* Font-weight 600
Desktop :
* 22px
* Font-weight 600
Sous-titre (si présent) :
* 12px mobile
* 13px tablet
* 14px desktop
* weight 400
* opacity 0.7
Interdiction de tailles aléatoires.

4️⃣ ICÔNES UNIFIÉES
Taille unique :
Mobile :
* 20px
Tablet / Desktop :
* 22px
Zone cliquable minimum :
* 40x40px mobile
* 44x44px recommandé
Alignement vertical parfait centré.

5️⃣ STRUCTURE INTERNE DU HEADER
Structure obligatoire :
[ Bouton Retour ]   [ Titre centré ou gauche ]   [ Actions / Notifications ]
Espacements fixes :
* Padding horizontal : 16px mobile / 24px desktop
* Gap icônes : 12px
* Aucun titre collé aux bords

6️⃣ RÈGLES D’HARMONISATION
Tous ces écrans doivent être vérifiés :
* BackOffice
* Coopérative
* Marchand
* Producteur
* Institution
* Identificateur
* Chat IA
* Modals avec Header
* Pages analytics
Même hauteur. Même alignement. Même proportions.

7️⃣ SCROLL BEHAVIOR
Header doit :
* Rester sticky
* Ne jamais se superposer au contenu
* Ne pas changer de taille au scroll
Interdiction d’effet shrink automatique.

8️⃣ TESTS OBLIGATOIRES
Vérifier :
1. Aucun titre masqué par notch.
2. Aucun débordement texte long.
3. Responsive correct 320px → 1920px.
4. Cohérence visuelle sur 10 écrans minimum.
5. Aucun composant isolé utilisant une autre hauteur.

9️⃣ RÈGLE ABSOLUE
Ne jamais modifier le design graphique. Ne modifier que :
* Dimensions
* Espacements
* Variables globales
* Styles centralisés
Aucune altération fonctionnelle.

📦 LIVRABLE ATTENDU
1. Fichier Header.tsx centralisé.
2. Variables globales créées.
3. Liste des écrans corrigés.
4. Captures comparatives avant/après.
5. Confirmation qu’aucun écran n’utilise une hauteur différente.
