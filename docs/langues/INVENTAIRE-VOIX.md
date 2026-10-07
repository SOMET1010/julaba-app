# Inventaire exhaustif des phrases vocales — JULABA

> **Généré** par `npm run i18n:inventaire` (`frontend_src/scripts/i18n-inventaire.mjs`), lecture du source par l'AST TypeScript. **Ne pas éditer à la main** : le garde-fou `validateInventaire` compare ce document au source et rougit s'il est périmé.
>
> Étape 0 du lot i18n — **aucune traduction ici**. On extrait ce que le code dit AUJOURD'HUI, tel quel (`frActuel`), pour que le catalogue (`src/app/i18n/voice/catalog.ts`) ne repose sur aucune phrase inventée.

## 1. Chiffres clés

| Mesure | Valeur |
|---|---|
| Sites d'appel vocaux (`speak`, `dire`, `direEtRetenir`, `ttsSpeak`, `speakAuto`, `speakClipOrText`, `direIntro`, `speakMessage`) | **416** |
| Branches de phrase à ces sites (un ternaire = deux branches) | 437 |
| — littéraux (phrase fixe en dur) | 196 |
| — gabarits (`${…}`, phrase dynamique à variables) | 84 |
| — dynamiques (phrase construite ailleurs : `effet.texte`, `phraseLigneAjoutee(…)`, `res.message`…) | 78 |
| — relais (`dire = (t) => speak(t)`) | 20 |
| — clés i18n (`speakMessage('…')`, `t('…')`) | 59 |
| Phrases distinctes aux sites d'appel (littéraux + gabarits) | **241** |
| Dont dynamiques (avec variables) | 84 |
| Dont critiques argent (fichier d'argent ou vocabulaire d'argent) | **55** |
| Phrases des corpus fixes (clips, scripts, dialogues purs, moteur) | **468** |
| Fichiers avec au moins un site d'appel | 79 |
| Attributs `aria-label` (lecteur d'écran uniquement) | 319 — **hors parcours vocal**, voir §8 |

## 2. Par fichier (sites d'appel)

| Fichier | Domaine | Appels | Littéraux | Gabarits | Dynamiques | Relais | Clés | Critiques argent |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `components/marchand/POSCaisse.tsx` | caisse | 29 | 0 | 0 | 9 | 2 | 19 | 0 |
| `components/producteur/CommandesProducteurPage.tsx` | producteur | 26 | 14 | 15 | 0 | 0 | 0 | 3 |
| `components/producteur/Stocks.tsx` | stock | 23 | 11 | 12 | 0 | 0 | 0 | 1 |
| `hooks/useVoiceCore.ts` | moteur_vocal | 17 | 9 | 0 | 7 | 2 | 0 | 1 |
| `components/marchand/AjoutProduitGuide.tsx` | autre | 16 | 0 | 0 | 2 | 1 | 13 | 0 |
| `components/wallet/WithdrawWalletModal.tsx` | wallet | 15 | 11 | 4 | 0 | 0 | 0 | 10 |
| `components/marchand/GestionStock.tsx` | stock | 14 | 8 | 4 | 2 | 1 | 0 | 2 |
| `components/marchand/MesCommandes.tsx` | marchand_autre | 14 | 6 | 3 | 4 | 0 | 2 | 1 |
| `components/wallet/RechargeWalletModal.tsx` | wallet | 14 | 10 | 4 | 0 | 0 | 0 | 6 |
| `components/auth/LoginPassword.tsx` | auth | 11 | 7 | 1 | 7 | 0 | 0 | 0 |
| `components/marchand/MarchandModals.tsx` | marchand_autre | 10 | 4 | 6 | 0 | 0 | 0 | 10 |
| `components/marchand/MicroVenteCaisse.tsx` | vente | 10 | 0 | 0 | 3 | 2 | 6 | 0 |
| `components/producteur/ProducteurProduction.tsx` | producteur | 9 | 6 | 2 | 1 | 0 | 0 | 0 |
| `components/marchand/ConfirmationLigne.tsx` | vente | 8 | 0 | 0 | 3 | 1 | 5 | 0 |
| `components/marchand/CreditModal.tsx` | credit | 8 | 6 | 1 | 0 | 1 | 0 | 4 |
| `components/marchand/VentesPassees.tsx` | marchand_autre | 8 | 5 | 1 | 2 | 0 | 0 | 2 |
| `components/marchand/DepenseForm.tsx` | depense | 7 | 5 | 1 | 1 | 0 | 0 | 2 |
| `components/producteur/CreerPlantationModal.tsx` | producteur | 7 | 5 | 1 | 1 | 0 | 0 | 0 |
| `components/shared/ProfilUnifieModal.tsx` | partage | 7 | 7 | 0 | 0 | 0 | 0 | 0 |
| `components/cooperative/Membres.tsx` | cooperative | 6 | 0 | 5 | 1 | 0 | 0 | 0 |
| `components/marchand/PinConfirmModal.tsx` | auth | 6 | 5 | 1 | 1 | 0 | 0 | 0 |
| `components/marchand/SaisieGuidee.tsx` | vente | 6 | 0 | 0 | 2 | 1 | 4 | 0 |
| `components/producteur/PublierRecolteModal.tsx` | producteur | 6 | 5 | 1 | 0 | 0 | 0 | 1 |
| `components/shared/InboxNegociations.tsx` | partage | 6 | 3 | 0 | 3 | 0 | 0 | 0 |
| `components/cooperative/Commandes.tsx` | cooperative | 5 | 3 | 2 | 0 | 0 | 0 | 1 |
| `components/cooperative/MarcheHub.tsx` | cooperative | 5 | 2 | 3 | 0 | 0 | 0 | 0 |
| `components/marchand/MarchandAccueilVoice.tsx` | marchand_autre | 5 | 0 | 0 | 0 | 0 | 5 | 0 |
| `components/producteur/ModifierPublicationModal.tsx` | producteur | 5 | 5 | 0 | 0 | 0 | 0 | 1 |
| `components/producteur/PublierRecolte.tsx` | producteur | 5 | 4 | 1 | 0 | 0 | 0 | 0 |
| `components/shared/RoleDashboard.tsx` | partage | 5 | 5 | 0 | 0 | 1 | 0 | 0 |
| `components/shared/ScoreResumeCard.tsx` | partage | 5 | 0 | 1 | 4 | 0 | 0 | 0 |
| `components/wallet/WalletCard.tsx` | wallet | 5 | 7 | 0 | 0 | 0 | 0 | 2 |
| `pages/CollecteVoix.tsx` | pages | 5 | 1 | 0 | 3 | 1 | 0 | 0 |
| `pages/marchand/MesDonnees.tsx` | pages | 5 | 4 | 0 | 1 | 0 | 0 | 0 |
| `components/auth/ActivationScreen.tsx` | auth | 4 | 2 | 0 | 1 | 1 | 0 | 0 |
| `components/shared/ReceptionPaiementModal.tsx` | partage | 4 | 2 | 1 | 1 | 0 | 0 | 0 |
| `components/shared/UniversalParametres.tsx` | marchand_autre | 4 | 3 | 0 | 0 | 0 | 2 | 0 |
| `contexts/ObjectifContext.tsx` | marchand_autre | 4 | 2 | 0 | 0 | 2 | 0 | 0 |
| `components/cooperative/Stock.tsx` | stock | 3 | 2 | 1 | 0 | 0 | 0 | 0 |
| `components/cooperative/TresorerieCooperative.tsx` | cooperative | 3 | 2 | 1 | 0 | 0 | 0 | 2 |
| `components/marchand/Fidelite.tsx` | marchand_autre | 3 | 1 | 2 | 0 | 0 | 0 | 2 |
| `components/producteur/RecolteForm.tsx` | producteur | 3 | 2 | 1 | 0 | 0 | 0 | 0 |
| `components/shared/DocumentsCertificationsModalUniversal.tsx` | partage | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| `services/vendreVocalUnifie.ts` | vente | 3 | 0 | 0 | 2 | 0 | 1 | 0 |
| `components/academy/UniversalAcademy.tsx` | academy | 2 | 0 | 0 | 1 | 1 | 0 | 0 |
| `components/backoffice/BOLayout.tsx` | backoffice | 2 | 1 | 1 | 0 | 0 | 0 | 0 |
| `components/backoffice/BOProfil.tsx` | backoffice | 2 | 1 | 0 | 0 | 1 | 0 | 0 |
| `components/marchand/BoutonDireProduit.tsx` | autre | 2 | 1 | 0 | 1 | 0 | 0 | 0 |
| `components/marchand/MarchandDepenses.tsx` | depense | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| `components/marchand/ResumeCaisse.tsx` | caisse | 2 | 0 | 0 | 0 | 0 | 2 | 0 |
| `components/marchand/TontineDetail.tsx` | marchand_autre | 2 | 3 | 0 | 0 | 0 | 0 | 0 |
| `components/producteur/ProducteurAlertes.tsx` | producteur | 2 | 1 | 0 | 1 | 0 | 0 | 0 |
| `components/producteur/ProducteurModals.tsx` | producteur | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| `components/producteur/RecolteDetailModal.tsx` | producteur | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| `components/shared/FinancialScoreDetailModal.tsx` | partage | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| `components/shared/ModeAccesSwitcher.tsx` | partage | 2 | 0 | 0 | 1 | 1 | 0 | 0 |
| `contexts/AppContext.tsx` | contexte | 2 | 0 | 1 | 1 | 0 | 0 | 1 |
| `contexts/CaisseContext.tsx` | caisse | 2 | 0 | 0 | 1 | 1 | 0 | 0 |
| `components/auth/ChangePasswordScreen.tsx` | auth | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/backoffice/BOLogin.tsx` | auth | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `components/backoffice/BONotifications.tsx` | backoffice | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| `components/cooperative/CooperativeHome.tsx` | cooperative | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/cooperative/FinancesCooperative.tsx` | cooperative | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| `components/layout/Sidebar.tsx` | partage | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `components/marchand/BesoinMarchand.tsx` | marchand_autre | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `components/marchand/BoutonDirePrix.tsx` | autre | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/marchand/ChoixUnite.tsx` | caisse | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/marchand/MaCooperative.tsx` | marchand_autre | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `components/marchand/MarchandAlertes.tsx` | marchand_autre | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/marchand/ProtectionSociale.tsx` | marchand_autre | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/marchand/Tontines.tsx` | marchand_autre | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `components/marketplace/Marketplace.tsx` | marketplace | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| `components/producteur/MesRecoltesPage.tsx` | producteur | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| `components/producteur/PlantationDetailModal.tsx` | producteur | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| `components/producteur/ProducteurHome.tsx` | producteur | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `components/producteur/Revenus.tsx` | producteur | 1 | 1 | 1 | 0 | 0 | 0 | 1 |
| `components/shared/FicheActeurDetailModal.tsx` | partage | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| `components/ui/UniversalKPI.tsx` | partage | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `services/elevenlabs.ts` | moteur_vocal | 1 | 0 | 0 | 1 | 0 | 0 | 0 |

## 3. Par domaine

| Domaine | Appels | Phrases (littéraux + gabarits) | Critiques argent |
|---|---:|---:|---:|
| producteur | 71 | 71 | 6 |
| marchand_autre | 55 | 39 | 15 |
| stock | 40 | 38 | 3 |
| partage | 37 | 24 | 0 |
| caisse | 34 | 0 | 0 |
| wallet | 34 | 36 | 18 |
| vente | 27 | 0 | 0 |
| auth | 23 | 17 | 0 |
| cooperative | 21 | 19 | 4 |
| autre | 19 | 1 | 0 |
| moteur_vocal | 18 | 9 | 1 |
| pages | 10 | 5 | 0 |
| depense | 9 | 8 | 2 |
| credit | 8 | 7 | 4 |
| backoffice | 5 | 4 | 0 |
| academy | 2 | 0 | 0 |
| contexte | 2 | 1 | 1 |
| marketplace | 1 | 1 | 1 |

Grille des domaines : `caisse` (encaissement, monnaie, relecture), `vente` (dictée, vente guidée, repli), `questions_caisse`, `credit`, `stock`, `depense`, `moteur_vocal` (attentes, accusés, erreurs du moteur), `auth` (connexion, accueil, onboarding), `marchand_autre`, `producteur`, `cooperative`, `wallet`, `partage`, `backoffice`, `contexte`, `pages`, `guidage`.

## 4. Liste exhaustive des sites d'appel

Nature : `literal` = phrase fixe ; `template` = gabarit avec variables `{…}` ; `dynamique` = phrase produite par une fonction (listée dans les corpus §5 quand elle est pure) ; `relais` = passe-plat ; `cle_i18n` = déjà migré vers une clé.

### `components/academy/UniversalAcademy.tsx` — academy

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 316 | `speak` | relais | msg |  |  |
| 880 | `speak` | dynamique | q.question |  |  |

### `components/auth/ActivationScreen.tsx` — auth

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 18 | `speakClipOrText` | relais | texte |  |  |
| 52 | `parle` | literal | Tape le code que tu as reçu, puis choisis ton code secret à quatre chiffres. Personne d'autre ne doit le connaître. |  |  |
| 66 | `parle` | dynamique | error |  |  |
| 72 | `parle` | literal | Compte activé ! Tu peux maintenant te connecter avec ton code. |  |  |

### `components/auth/ChangePasswordScreen.tsx` — auth

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 101 | `speakClipOrText` | dynamique | texte |  |  |

### `components/auth/LoginPassword.tsx` — auth

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 243 | `parle` | literal | Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé. |  |  |
| 243 | `parle` | literal | Voilà les chiffres maintenant. Mets ton code comme d'habitude. |  |  |
| 370 | `parle` | dynamique | error |  |  |
| 410 | `parle` | dynamique | suggestion.texte |  |  |
| 418 | `parle` | literal | D'accord, c'est calé comme ça. |  |  |
| 421 | `parle` | literal | D'accord, on continue comme d'habitude. |  |  |
| 617 | `parle` | literal | Pour que je puisse t'écouter, je vérifie ma voix. Touche le bouton, ou tape ton numéro. |  |  |
| 811 | `parle` | dynamique | ENTREE_VOICE_CLIPS.verrouCinqMinutes.texte |  |  |
| 811 | `parle` | dynamique | ENTREE_VOICE_CLIPS.tropDEssais.texte |  |  |
| 831 | `parle` | dynamique | ENTREE_VOICE_CLIPS.dernierEssai.texte |  |  |
| 831 | `parle` | dynamique | ENTREE_VOICE_CLIPS.mauvaisCodeAttention.texte |  |  |
| 831 | `parle` | dynamique | ENTREE_VOICE_CLIPS.codeErreur.texte |  |  |
| 1032 | `parle` | literal | C'est effacé net. |  |  |
| 1330 | `parle` | literal | C'est bon maintenant. Appuie sur le micro et puis parle. |  |  |
| 1516 | `parle` | template | Version {__APP_VERSION__}, {__BUILD_ID__} | `__APP_VERSION__` `__BUILD_ID__` |  |

### `components/backoffice/BOLayout.tsx` — backoffice

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 855 | `speak` | literal | Au revoir. Déconnexion du Back-Office. |  |  |
| 1063 | `speak` | template_compose | Bonjour {prenom}. Vous êtes connecté en tant que {role}. Il y a {nouveauxCount} ticket{s} en attente. Comment puis-je vous aider ? | `prenom` `role` `nouveauxCount` `s` |  |

### `components/backoffice/BOLogin.tsx` — auth

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 275 | `speak` | literal | Connexion refusée. Vérifie tes identifiants. |  |  |

### `components/backoffice/BONotifications.tsx` — backoffice

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 251 | `speak` | template_compose | Vous avez {unreadCount} notifications non lues. {édiate} | `unreadCount` `édiate` |  |

### `components/backoffice/BOProfil.tsx` — backoffice

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 279 | `speak` | relais | text |  |  |
| 313 | `speak` | literal | Déconnexion en cours |  |  |

### `components/cooperative/Commandes.tsx` — cooperative

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 296 | `speak` | literal | La distribution n'a pas marché. Réessaie, s'il te plaît. |  |  |
| 300 | `speak` | literal | Besoin mis à jour. |  |  |
| 358 | `speak` | template | Commande groupée pour {newProduit} créée. | `newProduit` |  |
| 383 | `speak` | template | Statut mis à jour : {label} | `label` |  |
| 1364 | `speak` | literal | C'est fait ! La commande est clôturée et payée. |  | € |

### `components/cooperative/CooperativeHome.tsx` — cooperative

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 59 | `speak` | dynamique | message |  |  |

### `components/cooperative/FinancesCooperative.tsx` — cooperative

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 249 | `speak` | template | Trésorerie actuelle : {soldeActuel} francs. | `soldeActuel` | € |

### `components/cooperative/MarcheHub.tsx` — cooperative

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 936 | `speak` | template | Commande de {produit} envoyée. | `produit` |  |
| 954 | `speak` | literal | Le produit a été retiré de votre marketplace. |  |  |
| 968 | `speak` | literal | La commande du marchand a été acceptée. |  |  |
| 1634 | `speak` | template | {produit} est maintenant visible par tous les marchands. | `produit` |  |
| 1692 | `speak` | template | {produit} est maintenant visible par tous les marchands. | `produit` |  |

### `components/cooperative/Membres.tsx` — cooperative

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 393 | `speak` | dynamique | msg |  |  |
| 418 | `speak` | template | {prenom} {nom} a été suspendu. Une notification a été envoyée. | `prenom` `nom` |  |
| 449 | `speak` | template | {prenom} {nom} a été réactivé | `prenom` `nom` |  |
| 484 | `speak` | template | {prenom} a été exclu définitivement de la coopérative | `prenom` |  |
| 523 | `speak` | template | {prenom} {nom} a rejoint la coopérative | `prenom` `nom` |  |
| 537 | `speak` | template | La demande de {prenom} {nom} a été refusée | `prenom` `nom` |  |

### `components/cooperative/Stock.tsx` — stock

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 188 | `speak` | template | {produit} ajouté au stock commun. | `produit` |  |
| 229 | `speak` | literal | La distribution n'a pas marché. Réessaie, s'il te plaît. |  |  |
| 233 | `speak` | literal | Distribution enregistrée avec succès. |  |  |

### `components/cooperative/TresorerieCooperative.tsx` — cooperative

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 96 | `speak` | literal | Remplis tous les champs obligatoires |  |  |
| 102 | `speak` | literal | Entre un montant valide |  | € |
| 125 | `speak` | template_compose | Transaction {sortie} de {montant} francs CFA enregistrée | `sortie` `montant` | € |

### `components/layout/Sidebar.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 55 | `speak` | literal | À bientôt sur Jùlaba |  |  |

### `components/marchand/AjoutProduitGuide.tsx` — autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 96 | `speak` | relais | t |  |  |
| 168 | `direMessage` | dynamique | PHRASE_DU_REFUS[refus] |  |  |
| 186 | `direMessage` | cle_i18n | STOCK_047 |  |  |
| 187 | `direMessage` | cle_i18n | STOCK_048 |  |  |
| 188 | `direMessage` | cle_i18n | STOCK_049 |  |  |
| 189 | `direMessage` | cle_i18n | STOCK_054 |  |  |
| 196 | `direMessage` | cle_i18n | STOCK_055 |  |  |
| 208 | `direMessage` | cle_i18n | STOCK_058 |  |  |
| 214 | `direMessage` | cle_i18n | STOCK_057 |  |  |
| 215 | `direMessage` | cle_i18n | STOCK_056 |  |  |
| 218 | `direMessage` | cle_i18n | TATA_VENTE_ECHEC |  |  |
| 241 | `direMessage` | dynamique | PHRASE_DU_REFUS[refus] |  |  |
| 252 | `direMessage` | cle_i18n | TATA_PRODUIT_POSE |  |  |
| 255 | `direMessage` | cle_i18n | TATA_VENTE_ECHEC |  |  |
| 263 | `direMessage` | cle_i18n | TATA_MONTANT_DEVISE |  |  |
| 317 | `direMessage` | cle_i18n | TATA_UNITE_CHOISIE |  |  |

### `components/marchand/BesoinMarchand.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 55 | `speak` | literal | Votre besoin a été soumis à la coopérative |  |  |

### `components/marchand/BoutonDirePrix.tsx` — autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 132 | `dire` | dynamique | question |  |  |

### `components/marchand/BoutonDireProduit.tsx` — autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 86 | `dire` | literal | Je n'ai pas entendu de produit. Dis-moi ce que tu vends. |  |  |
| 105 | `dire` | dynamique | MICRO_INDISPONIBLE |  |  |

### `components/marchand/ChoixUnite.tsx` — caisse

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 89 | `dire` | dynamique | phraseUnite(u) |  |  |

### `components/marchand/ConfirmationLigne.tsx` — vente

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 51 | `speak` | dynamique | phrase() |  |  |
| 105 | `speak` | relais | t |  |  |
| 117 | `dire` | dynamique | phrase.texteParle |  |  |
| 127 | `dire` | dynamique | quantiteAvecUnite(q, ligne.unite) |  |  |
| 132 | `direMessage` | cle_i18n | TATA_MONTANT_DEVISE |  |  |
| 133 | `direMessage` | cle_i18n | TATA_PRIX_EFFACE |  |  |
| 192 | `direMessage` | cle_i18n | TATA_PRIX_D_UN_SEUL |  |  |
| 192 | `direMessage` | cle_i18n | TATA_PRIX_DU_TOUT |  |  |
| 245 | `direMessage` | cle_i18n | TATA_QUESTION_CORRECTION |  |  |

### `components/marchand/CreditModal.tsx` — credit

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 44 | `speak` | relais | t |  |  |
| 166 | `dire` | literal | Numéro de téléphone invalide. Format attendu : 07XXXXXXXX |  |  |
| 181 | `dire` | literal | Le montant de l'acompte est invalide |  | € |
| 185 | `dire` | literal | L'acompte ne peut pas être égal ou supérieur au total. Enregistre plutôt une vente. |  | € |
| 203 | `dire` | template | Crédit de {total} francs noté pour {clientNom}. Elle rembourse le {echeanceLong} | `total` `clientNom` `echeanceLong` | € |
| 209 | `dire` | literal | Erreur lors de l'enregistrement |  |  |
| 337 | `dire` | literal | Dis-moi d'abord le nom du client. |  |  |
| 443 | `dire` | literal | L'acompte ne peut pas dépasser le total. Enregistre plutôt une vente. |  | € |

### `components/marchand/DepenseForm.tsx` — depense

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 84 | `speak` | literal | Dépense enregistrée |  |  |
| 89 | `speak` | literal | Erreur, réessaie |  |  |
| 99 | `speak` | literal | Problème avec le micro — réessaie |  |  |
| 118 | `speak` | dynamique | 'Dépense de ' + nombreEnMotsFr(m) + ' francs enregistrée' |  |  |
| 120 | `speak` | literal | Erreur lors de l'enregistrement |  |  |
| 131 | `speak` | literal | Attention, le montant est élevé. Vérifie bien. |  | € |
| 364 | `speak` | template | {m} francs | `m` | € |

### `components/marchand/Fidelite.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 62 | `speak` | template | {pointsGagnes} points ajoutés. Total {points} points. | `pointsGagnes` `points` | € |
| 63 | `speak` | literal | Ce client a droit à sa récompense ! |  |  |
| 74 | `speak` | template | Récompense appliquée : {remise} francs de remise. | `remise` | € |

### `components/marchand/GestionStock.tsx` — stock

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 252 | `speak` | relais | t |  |  |
| 373 | `speak` | dynamique | nomPropre |  |  |
| 375 | `speak` | literal | Je n'ai pas entendu le nom. Réessaie, s'il te plaît. |  |  |
| 401 | `speak` | literal | Tous tes stocks sont bons |  |  |
| 401 | `speak` | template | {low} produits en stock bas : {join} | `low` `join` |  |
| 404 | `speak` | literal | Tes montants sont cachés. Appuie sur l'œil pour les afficher. |  |  |
| 408 | `speak` | template | La valeur totale est {val} francs | `val` | € |
| 487 | `speak` | literal | C'est mis à jour. |  |  |
| 490 | `speak` | literal | Ça n'a pas marché. Réessaie, s'il te plaît. |  |  |
| 502 | `speak` | literal | Saisis une quantité valide |  | € |
| 507 | `speak` | template | {reappNum} {unit} de {name} ajoutés. Stock à {newQty} {unit} | `reappNum` `unit` `name` `newQty` `unit` |  |
| 536 | `speak` | template | {name} supprimé | `name` |  |
| 544 | `speak` | literal | Ça n'a pas marché. Le produit n'est pas supprimé. |  |  |
| 609 | `speak` | dynamique | dit |  |  |
| 613 | `speak` | literal | Ça n'a pas été enregistré. Réessaie, s'il te plaît. |  |  |

### `components/marchand/MaCooperative.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 64 | `speak` | literal | Ta demande a été envoyée |  |  |

### `components/marchand/MarchandAccueilVoice.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 130 | `speakMessage` | cle_i18n | ACCUEIL_COMPTOIR |  |  |
| 138 | `speakMessage` | cle_i18n | ACCUEIL_CAISSE_CONNUE |  |  |
| 139 | `speakMessage` | cle_i18n | ACCUEIL_CAISSE_PARTIELLE |  |  |
| 140 | `speakMessage` | cle_i18n | ACCUEIL_CAISSE_ILLISIBLE |  |  |
| 380 | `speakMessage` | cle_i18n | ACCUEIL_JOURNEE_ROUVERTE |  |  |

### `components/marchand/MarchandAlertes.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 489 | `speak` | dynamique | texte |  |  |

### `components/marchand/MarchandDepenses.tsx` — depense

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 222 | `speak` | literal | Tu n'as pas encore de dépense aujourd'hui. |  |  |
| 233 | `speak` | literal | Tes montants sont cachés. |  |  |

### `components/marchand/MarchandModals.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 339 | `speak` | template | {montant} Francs CFA ajoutés. Total : {newValue} Francs CFA | `montant` `newValue` | € |
| 347 | `speak` | template | {montant} Francs CFA ajoutés. Total : {newValue} Francs CFA | `montant` `newValue` | € |
| 364 | `speak` | literal | Le montant saisi est invalide |  | € |
| 370 | `speak` | literal | Le montant doit être un multiple de 5 francs |  | € |
| 378 | `speak` | template | Ta journée est ouverte avec {montant} Francs CFA | `montant` | € |
| 475 | `speak` | template | {montant} Francs CFA ajoutés. Total : {newValue} Francs CFA | `montant` `newValue` | € |
| 482 | `speak` | template | {montant} Francs CFA ajoutés. Total : {newValue} Francs CFA | `montant` `newValue` | € |
| 488 | `speak` | literal | Le montant saisi est invalide |  | € |
| 492 | `speak` | template | Ton fond de caisse est maintenant de {montant} Francs CFA | `montant` | € |
| 590 | `speak` | literal | Compte l'argent de ta boîte, puis entre le montant que tu as trouvé. |  | € |

### `components/marchand/MesCommandes.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 189 | `speak` | cle_i18n | MARCHAND_HORS_LIGNE_ACTION |  |  |
| 190 | `speak` | cle_i18n | MARCHAND_ENVOI_TOMBE_ACTION |  |  |
| 197 | `speak` | literal | Commande annulée |  |  |
| 202 | `speak` | dynamique | message |  |  |
| 210 | `speak` | literal | Vente confirmée |  |  |
| 215 | `speak` | dynamique | message |  |  |
| 223 | `speak` | literal | Vente refusée |  |  |
| 228 | `speak` | dynamique | message |  |  |
| 236 | `speak` | literal | Commande marquée comme livrée |  |  |
| 241 | `speak` | dynamique | message |  |  |
| 255 | `speak` | literal | Contre-offre acceptée. |  |  |
| 255 | `speak` | template | Contre-offre acceptée : {prixContreOffre} FCFA/{unite} | `prixContreOffre` `unite` | € |
| 262 | `speak` | template | Erreur : {message} | `message` |  |
| 274 | `speak` | literal | Contre-offre refusée. |  |  |
| 279 | `speak` | template | Erreur : {message} | `message` |  |

### `components/marchand/MicroVenteCaisse.tsx` — vente

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 166 | `speak` | relais | texte |  |  |
| 169 | `speakMessage` | relais | id |  |  |
| 223 | `speakMessage` | cle_i18n | TATA_AJOUT_PANIER |  |  |
| 392 | `direEtRetenirMessage` | cle_i18n | TATA_DEPENSE_MONTANT_INCOMPRIS |  |  |
| 405 | `direEtRetenirMessage` | cle_i18n | TATA_DEPENSE_MONTANT_INCOMPRIS |  |  |
| 435 | `speakMessage` | dynamique | ...introMessage() |  |  |
| 674 | `speakMessage` | cle_i18n | TATA_PRODUIT_AJOUTE_BOUTIQUE |  |  |
| 676 | `speakMessage` | cle_i18n | TATA_AJOUT_BOUTIQUE_ECHEC |  |  |
| 685 | `speakMessage` | cle_i18n | TATA_ON_NE_CHANGE_RIEN |  |  |
| 834 | `speak` | dynamique | dernierePhraseRef.current |  |  |
| 834 | `speak` | dynamique | introLigne() |  |  |

### `components/marchand/PinConfirmModal.tsx` — auth

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 61 | `speak` | literal | Erreur réseau. Réessaie. |  |  |
| 67 | `speak` | literal | Erreur réseau. Réessaie. |  |  |
| 73 | `speak` | dynamique | successMessage |  |  |
| 73 | `speak` | literal | Code correct. Action confirmée |  |  |
| 79 | `speak` | literal | Trop de tentatives incorrectes. Réessaie dans 5 minutes. |  |  |
| 83 | `speak` | template | Code incorrect. {attempts} tentative(s) restante(s) | `attempts` |  |
| 91 | `speak` | literal | Erreur réseau. Réessaie. |  |  |

### `components/marchand/POSCaisse.tsx` — caisse

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 85 | `speak` | relais | t |  |  |
| 93 | `speakMessage` | relais | id |  |  |
| 226 | `dire` | dynamique | ligneAjouteeDeuxFormes({ nom: p?.nom \|\| p?.name \|\| 'Produit', quantite: q, unite: p?.unite, totalLigne, totalPanier: total + prixU }).texteParle |  |  |
| 292 | `direMessage` | cle_i18n | TATA_AMBIGUITE |  |  |
| 334 | `direMessage` | cle_i18n | TATA_INDIQUE_PRIX |  |  |
| 346 | `dire` | dynamique | res.message |  |  |
| 346 | `dire` | cle_i18n | TATA_ARTICLE_IMPOSSIBLE |  |  |
| 363 | `direMessage` | cle_i18n | TATA_ARTICLE_AJOUTE_CATALOGUE |  |  |
| 387 | `dire` | dynamique | ligneAjouteeDeuxFormes({ nom, quantite: qte, unite: libreUnite, totalLigne, totalPanier: total + totalLigne }).texteParle |  |  |
| 405 | `dire` | dynamique | direCoupure(valeur) |  |  |
| 434 | `direMessage` | cle_i18n | TATA_MONTANT_TOTAL_INVALIDE |  |  |
| 438 | `direMessage` | cle_i18n | TATA_MONTANT_RECU_INSUFFISANT |  |  |
| 439 | `direMessage` | cle_i18n | TATA_CHOISIS_OPERATEUR |  |  |
| 513 | `direMessage` | cle_i18n | TATA_VENTE_ENREGISTREE_RUPTURE |  |  |
| 514 | `direMessage` | cle_i18n | TATA_VENTE_ENREGISTREE |  |  |
| 526 | `direMessage` | cle_i18n | TATA_VENTE_GARDEE_TELEPHONE_RUPTURE |  |  |
| 527 | `direMessage` | cle_i18n | TATA_VENTE_GARDEE_TELEPHONE |  |  |
| 550 | `dire` | dynamique | raison |  |  |
| 552 | `direMessage` | cle_i18n | TATA_VENTE_ECHEC |  |  |
| 629 | `speak` | dynamique | effet.texteParle |  |  |
| 663 | `speak` | dynamique | effet.texteParle |  |  |
| 693 | `dire` | dynamique | relu.texteParle |  |  |
| 718 | `direMessage` | cle_i18n | TATA_VENTE_CREDIT_ENREGISTREE |  |  |
| 792 | `direMessage` | cle_i18n | TATA_QUANTITE_LIGNE |  |  |
| 825 | `direMessage` | cle_i18n | TATA_PRIX_UNITE_LIGNE |  |  |
| 858 | `direMessage` | cle_i18n | TATA_TOTAL |  |  |
| 1000 | `speak` | dynamique | relectureAffichee |  |  |
| 1036 | `direMessage` | cle_i18n | TATA_MONNAIE_A_RENDRE |  |  |
| 1132 | `direMessage` | cle_i18n | TATA_AJOUTE_PRODUITS_D_ABORD |  |  |
| 1678 | `direMessage` | cle_i18n | TATA_AMBIGUITE |  |  |

### `components/marchand/ProtectionSociale.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 107 | `speak` | dynamique | parts.join(' ') |  |  |

### `components/marchand/ResumeCaisse.tsx` — caisse

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 298 | `speakMessage` | cle_i18n | RESUME_DETAIL |  |  |
| 299 | `speakMessage` | cle_i18n | RESUME_DETAIL_PERTE |  |  |

### `components/marchand/SaisieGuidee.tsx` — vente

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 107 | `speak` | relais | t |  |  |
| 131 | `dire` | dynamique | questionEtape |  |  |
| 155 | `direMessage` | cle_i18n | TATA_MONTANT_DEVISE |  |  |
| 156 | `direMessage` | cle_i18n | TATA_PRIX_EFFACE |  |  |
| 162 | `dire` | dynamique | quantiteAvecUnite(q, uniteProduit) |  |  |
| 355 | `direMessage` | cle_i18n | TATA_PRIX_D_UN_SEUL |  |  |
| 355 | `direMessage` | cle_i18n | TATA_PRIX_DU_TOUT |  |  |

### `components/marchand/TontineDetail.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 80 | `speak` | literal | Tu as reçu le pot de la tontine |  |  |
| 80 | `speak` | literal | Cotisation enregistrée, le pot a été distribué |  |  |
| 83 | `speak` | literal | Cotisation enregistrée |  |  |

### `components/marchand/Tontines.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 135 | `speak` | literal | Tontine créée. Chaque membre peut maintenant cotiser. |  |  |

### `components/marchand/VentesPassees.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 100 | `speak` | literal | Veux-tu vraiment annuler cette vente ? Le stock sera rendu. |  |  |
| 117 | `speak` | literal | Vente annulée. Le stock a été rendu. |  |  |
| 120 | `speak` | literal | Je n'ai pas pu annuler cette vente. |  |  |
| 141 | `speak` | template | {productName} : {montant} francs{texteMarge}, le {quand}. | `productName` `montant` `texteMarge` `quand` | € |
| 428 | `speakMessage` | dynamique | a.cle |  |  |
| 433 | `speak` | literal | Tes montants sont cachés. |  |  |
| 435 | `speakMessage` | dynamique | a.cle |  |  |
| 812 | `speak` | literal | C'est bien payé ? Touche encore pour confirmer. |  | € |

### `components/marketplace/Marketplace.tsx` — marketplace

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 71 | `speak` | template | {productName}, {quantity} kilogrammes à {price} francs CFA le kilo. Vendeur: {sellerName}, score {sellerScore} sur 100 | `productName` `quantity` `price` `sellerName` `sellerScore` | € |

### `components/producteur/CommandesProducteurPage.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 314 | `speak` | template | Commande de {acheteurId} acceptée. Le marchand va maintenant payer. | `acheteurId` | € |
| 318 | `speak` | template | Erreur : {message} | `message` |  |
| 328 | `speak` | literal | Commande refusée. |  |  |
| 334 | `speak` | template | Erreur : {message} | `message` |  |
| 344 | `speak` | template | Contre-proposition de {nouveauPrix} FCFA envoyée au marchand. | `nouveauPrix` | € |
| 351 | `speak` | template | Erreur : {message} | `message` |  |
| 360 | `speak` | literal | Livraison déclarée. Le marchand va confirmer la réception. |  |  |
| 364 | `speak` | template | Erreur : {message} | `message` |  |
| 374 | `speak` | literal | Paiement récupéré ! L'argent est dans ton Keiwa. |  |  |
| 379 | `speak` | template | Erreur : {message} | `message` |  |
| 512 | `speak` | template | Commande mise à jour : {statut} | `statut` |  |
| 516 | `speak` | template | Erreur : {msg} | `msg` |  |
| 516 | `speak` | literal | Impossible de mettre à jour la commande |  |  |
| 602 | `speak` | template | Commande de {produit} ajoutée | `produit` |  |
| 609 | `speak` | template | Erreur : {message} | `message` |  |
| 609 | `speak` | literal | Impossible d'ajouter la commande |  |  |
| 650 | `speak` | literal | Toutes les commandes |  |  |
| 659 | `speak` | literal | Commandes urgentes |  |  |
| 668 | `speak` | literal | Mes revenus |  |  |
| 677 | `speak` | literal | Commandes livrées |  |  |
| 775 | `speak` | template | Demande de {acheteurId} pour {produit} | `acheteurId` `produit` |  |
| 1546 | `speak` | literal | Commande marquée comme livrée |  |  |
| 1550 | `speak` | template | Erreur : {msg} | `msg` |  |
| 1550 | `speak` | literal | Impossible de marquer comme livrée |  |  |
| 1649 | `speak` | literal | Commande annulée |  |  |
| 1653 | `speak` | template | Erreur : {message} | `message` |  |
| 1670 | `speak` | literal | Commande annulée |  |  |
| 1674 | `speak` | template | Erreur : {message} | `message` |  |
| 2428 | `speak` | literal | Paiement encaissé ! L'argent est dans ton Keiwa. |  | € |

### `components/producteur/CreerPlantationModal.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 57 | `speak` | literal | Choisis d'abord une culture. |  |  |
| 62 | `speak` | literal | Dis-moi le nom de la culture. |  |  |
| 78 | `speak` | literal | C'est fait ! Ta plantation est créée. |  |  |
| 90 | `speak` | literal | Tu dois être connectée. Vérifie ton réseau et réessaie. |  |  |
| 93 | `speak` | literal | Ça n'a pas marché. Réessaie, s'il te plaît. |  |  |
| 154 | `speak` | dynamique | c.id |  |  |
| 248 | `speak` | template | {mois} mois | `mois` |  |

### `components/producteur/MesRecoltesPage.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 259 | `speak` | template | {produit}, {toLocaleString} kg | `produit` `toLocaleString` |  |

### `components/producteur/ModifierPublicationModal.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 57 | `speak` | literal | Prix invalide |  | € |
| 58 | `speak` | literal | Quantité invalide |  |  |
| 61 | `speak` | literal | Modification en cours... |  |  |
| 78 | `speak` | literal | Publication modifiée avec succès ! |  |  |
| 84 | `speak` | literal | Erreur lors de la modification |  |  |

### `components/producteur/PlantationDetailModal.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 55 | `speak` | template | Détails de ta plantation de {culture}. Progression {progressPercent} pourcent. | `culture` `progressPercent` |  |

### `components/producteur/ProducteurAlertes.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 387 | `speak` | dynamique | resumeVocalMeteo(meteo) |  |  |
| 466 | `speak` | literal | Alertes basses ignorées |  |  |

### `components/producteur/ProducteurHome.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 64 | `speak` | dynamique | message |  |  |

### `components/producteur/ProducteurModals.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 390 | `speak` | literal | Création de plantation agricole |  |  |
| 452 | `speak` | literal | Déclaration de récolte |  |  |

### `components/producteur/ProducteurProduction.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 242 | `speak` | dynamique | f.label |  |  |
| 298 | `speak` | literal | Ma Plantation |  |  |
| 325 | `speak` | literal | Mes récoltes |  |  |
| 352 | `speak` | literal | Mon Marché |  |  |
| 379 | `speak` | literal | Mon Historique de ventes |  |  |
| 481 | `speak` | literal | Suivre une nouvelle plantation |  |  |
| 522 | `speak` | template | Détails de ta plantation de {culture} | `culture` |  |
| 683 | `speak` | template | Détails de {culture} | `culture` |  |
| 695 | `speak` | literal | Déclarer une récolte |  |  |

### `components/producteur/PublierRecolte.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 75 | `speak` | literal | Remplis tous les champs obligatoires |  |  |
| 79 | `speak` | literal | Le stock disponible ne peut pas dépasser la quantité totale de la récolte |  |  |
| 84 | `speak` | literal | Indique le nom du produit |  |  |
| 123 | `speak` | template | Récolte de {produitName} publiée avec succès sur le marché virtuel | `produitName` |  |
| 142 | `speak` | literal | Erreur lors de la publication, réessaie |  |  |

### `components/producteur/PublierRecolteModal.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 29 | `speak` | literal | La quantité doit être supérieure à zéro |  |  |
| 33 | `speak` | template | La quantité ne peut pas dépasser le stock disponible de {stockMax} | `stockMax` |  |
| 38 | `speak` | literal | Prix invalide |  | € |
| 43 | `speak` | literal | Publication en cours... |  |  |
| 59 | `speak` | literal | Récolte publiée avec succès ! |  |  |
| 63 | `speak` | literal | Erreur lors de la publication |  |  |

### `components/producteur/RecolteDetailModal.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 322 | `speak` | literal | Modifier la récolte |  |  |
| 336 | `speak` | literal | Publication sur le marché en cours |  |  |

### `components/producteur/RecolteForm.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 263 | `speak` | literal | Dis-moi la quantité que tu as récoltée. |  |  |
| 294 | `speak` | template | C'est enregistré ! {quantiteEnKg} kilos de {cultureName}. | `quantiteEnKg` `cultureName` |  |
| 301 | `speak` | literal | Ça n'a pas marché. Réessaie, s'il te plaît. |  |  |

### `components/producteur/Revenus.tsx` — producteur

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 105 | `speak` | template | Tu as gagné {revenuTotal} francs en tout. | `revenuTotal` | € |
| 105 | `speak` | literal | Tu n'as pas encore de revenu. |  |  |

### `components/producteur/Stocks.tsx` — stock

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 162 | `speak` | template | Bienvenue {prenoms} dans ta gestion de production. Je peux t'aider à gérer tes récoltes. Que veux-tu faire ? | `prenoms` |  |
| 217 | `speak` | literal | D'accord ! Dis-moi ce que tu veux faire : ajouter une récolte, modifier une quantité, ou consulter ta production |  |  |
| 221 | `speak` | literal | D'accord ! Je reste là si tu as besoin |  |  |
| 245 | `speak` | template | Parfait ! {quantity} kg de {name} ajouté à ta production | `quantity` `name` |  |
| 250 | `speak` | template | Production mise à jour ! {name} : {quantity} {unit} | `name` `quantity` `unit` |  |
| 257 | `speak` | literal | D'accord, action annulée |  |  |
| 268 | `speak` | template | Tu as {quantity} {unit} de {name} en stock | `quantity` `unit` `name` |  |
| 271 | `speak` | literal | Je n'ai pas trouvé ce produit dans ta production |  |  |
| 279 | `speak` | template | La valeur totale de ta production est de {totalValue} francs CFA | `totalValue` | € |
| 285 | `speak` | template | Tu as {stocks} produits différents en production | `stocks` |  |
| 293 | `speak` | literal | Toute ta production est au-dessus du seuil. Tout va bien ! |  |  |
| 295 | `speak` | template | Tu as {lowStocks} produits en stock bas : {join} | `lowStocks` `join` |  |
| 307 | `speak` | template | Tu veux ajouter {quantity} {unit} de {name} à ta production actuelle de {quantity} {unit}. Je confirme ? | `quantity` `unit` `name` `quantity` `unit` |  |
| 315 | `speak` | template | Tu veux ajouter {quantity} kg de {productName} à ta production. Je confirme ? | `quantity` `productName` |  |
| 326 | `speak` | literal | Voici tes légumes en production |  |  |
| 330 | `speak` | literal | Voici tes fruits en production |  |  |
| 334 | `speak` | literal | Voici tes céréales en production |  |  |
| 338 | `speak` | literal | Voici tes tubercules en production |  |  |
| 342 | `speak` | literal | Voici tous tes produits en production |  |  |
| 351 | `speak` | template | Voici {name} | `name` |  |
| 355 | `speak` | literal | Je n'ai pas compris. Demande-moi d'ajouter une récolte, de consulter ta production, ou de filtrer par catégorie |  |  |
| 457 | `speak` | template | {name} ajouté avec succès | `name` |  |
| 486 | `speak` | template | {name} supprimé de la production | `name` |  |

### `components/shared/DocumentsCertificationsModalUniversal.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 133 | `speak` | literal | Ouverture des détails de la carte d'identité |  |  |
| 155 | `speak` | literal | Ouverture des détails de la certification JULABA |  |  |
| 177 | `speak` | literal | Ouverture des détails de l'attestation d'activité |  |  |

### `components/shared/FicheActeurDetailModal.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 155 | `speak` | template | Fiche de {prenoms} {nom}, {label} | `prenoms` `nom` `label` |  |

### `components/shared/FinancialScoreDetailModal.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 103 | `speak` | dynamique | buildSpeechSummary(result) |  |  |
| 184 | `speak` | dynamique | buildSpeechSummary(data) |  |  |

### `components/shared/InboxNegociations.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 107 | `speak` | literal | Demande acceptée |  |  |
| 112 | `speak` | dynamique | msg |  |  |
| 126 | `speak` | literal | Contre-proposition envoyée |  |  |
| 131 | `speak` | dynamique | msg |  |  |
| 141 | `speak` | literal | Demande refusée |  |  |
| 146 | `speak` | dynamique | msg |  |  |

### `components/shared/ModeAccesSwitcher.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 22 | `speak` | relais | texte |  |  |
| 31 | `dire` | dynamique | texte + ' C\'est fait.' |  |  |

### `components/shared/ProfilUnifieModal.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 266 | `speak` | literal | Identité mise à jour |  |  |
| 289 | `speak` | literal | Contact mis à jour |  |  |
| 305 | `speak` | literal | Format de fichier invalide. Utilise une image. |  |  |
| 309 | `speak` | literal | Image trop lourde. Maximum 2 mégaoctets. |  |  |
| 315 | `speak` | literal | Photo modifiée |  |  |
| 587 | `speak` | literal | Verso de la carte |  |  |
| 588 | `speak` | literal | Téléchargement de la carte |  |  |

### `components/shared/ReceptionPaiementModal.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 100 | `speak` | literal | Réception confirmée. Passons au paiement. |  |  |
| 120 | `speak` | template | Paiement de {montantFormate} validé par {modePaiement}. | `montantFormate` `modePaiement` |  |
| 127 | `speak` | dynamique | msg |  |  |
| 312 | `speak` | literal | Signalement de problème |  |  |

### `components/shared/RoleDashboard.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 171 | `speak` | relais | message |  |  |
| 308 | `speak` | literal | Journée réduite |  |  |
| 308 | `speak` | literal | Détails de la journée |  |  |
| 422 | `speak` | literal | Combien tu as en caisse ce matin ? |  |  |
| 476 | `speak` | literal | Bienvenue sur le terminal de vente. Ajoute tes produits au panier |  |  |
| 552 | `speak` | literal | Ouverture de ton Wallet Jùlaba |  |  |

### `components/shared/ScoreResumeCard.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 198 | `speak` | dynamique | message |  |  |
| 204 | `speak` | dynamique | message |  |  |
| 351 | `speak` | template | {label}. {description}. Cela te rapportera {points} points | `label` `description` `points` |  |
| 458 | `speak` | dynamique | l.tooltip! |  |  |
| 460 | `speak` | dynamique | l.tooltip! |  |  |

### `components/shared/UniversalParametres.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 632 | `speak` | literal | Paramètres sauvegardés |  |  |
| 752 | `speak` | cle_i18n | REGLAGE_VOIX_ESSENTIEL |  |  |
| 752 | `speak` | cle_i18n | REGLAGE_VOIX_COMPLET |  |  |
| 941 | `speak` | literal | Export en cours |  |  |
| 1080 | `speak` | literal | Déconnexion en cours |  |  |

### `components/ui/UniversalKPI.tsx` — partage

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 227 | `speak` | dynamique | `${label} : ${lu} ${suffixe}`.trim() |  |  |

### `components/wallet/RechargeWalletModal.tsx` — wallet

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 77 | `speak` | template | {name} sélectionné | `name` |  |
| 84 | `speak` | template | {selectedMontant} francs CFA | `selectedMontant` | € |
| 91 | `speak` | literal | Saisir un autre montant |  | € |
| 99 | `speak` | literal | Le montant minimum est de 200 FCFA |  | € |
| 105 | `speak` | literal | Le montant doit être un multiple de 100 francs |  | € |
| 110 | `speak` | template | {montantNum} francs CFA | `montantNum` | € |
| 127 | `speak` | literal | Numéro Mobile Money invalide. Dix chiffres requis |  |  |
| 143 | `speak` | literal | Tu vas être redirigé vers Wave pour confirmer le paiement |  |  |
| 145 | `speak` | template | Demande envoyée. Confirme sur ton téléphone {name} | `name` |  |
| 151 | `speak` | literal | Paiement en cours — confirme sur ton téléphone |  |  |
| 156 | `speak` | literal | Erreur lors du rechargement |  |  |
| 170 | `speak` | literal | Retour au choix du service |  |  |
| 175 | `speak` | literal | Retour au choix du montant |  | € |
| 197 | `speak` | literal | Paiement confirmé ! Ton Keiwa est rechargé. |  |  |

### `components/wallet/WalletCard.tsx` — wallet

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 40 | `speak` | literal | Solde masqué |  | € |
| 40 | `speak` | literal | Solde affiché |  | € |
| 45 | `speak` | literal | Ouverture du Wallet Jùlaba |  |  |
| 50 | `speak` | literal | Mon argent fermé |  |  |
| 50 | `speak` | literal | Mon argent ouvert |  |  |
| 55 | `speak` | literal | Ouvre le formulaire de rechargement Mobile Money |  |  |
| 60 | `speak` | literal | Ouvre le formulaire de retrait Mobile Money |  |  |

### `components/wallet/WithdrawWalletModal.tsx` — wallet

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 71 | `speak` | template | {name} sélectionné | `name` |  |
| 79 | `speak` | literal | Solde insuffisant |  | € |
| 86 | `speak` | template | {selectedMontant} francs CFA | `selectedMontant` | € |
| 94 | `speak` | literal | Saisir un autre montant |  | € |
| 102 | `speak` | literal | Montant invalide |  | € |
| 108 | `speak` | literal | Le montant doit être un multiple de 100 francs |  | € |
| 114 | `speak` | literal | Solde insuffisant |  | € |
| 119 | `speak` | template | {montantNum} francs CFA | `montantNum` | € |
| 136 | `speak` | literal | Numéro Mobile Money invalide. Dix chiffres requis |  |  |
| 153 | `speak` | literal | Paiement en cours — confirme sur ton téléphone |  |  |
| 157 | `speak` | template | Retrait de {montant} francs CFA en cours. Confirme sur ton téléphone. | `montant` | € |
| 162 | `speak` | literal | Erreur lors du retrait |  |  |
| 176 | `speak` | literal | Retour au choix du service |  |  |
| 181 | `speak` | literal | Retour au choix du montant |  | € |
| 199 | `speak` | literal | Retrait confirmé ! Ton solde a été mis à jour. |  | € |

### `contexts/AppContext.tsx` — contexte

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 741 | `speak` | dynamique | safeText |  |  |
| 923 | `speak` | template | Ta journée est déjà ouverte avec {fondRetenu} francs. Pour changer ce montant, touche Modifier le fond. | `fondRetenu` | € |

### `contexts/CaisseContext.tsx` — caisse

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 356 | `speakMessage` | relais | id |  |  |
| 468 | `direMessage` | dynamique | annonce.cle |  |  |

### `contexts/ObjectifContext.tsx` — marchand_autre

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 21 | `speak` | relais | texte |  |  |
| 23 | `speakAuto` | relais | texte |  |  |
| 92 | `speakAuto` | literal | Félicitations ! Tu as atteint 50% de ton objectif. Continue ma chère, tu es sur la bonne voie ! |  |  |
| 102 | `speakAuto` | literal | Incroyable ! Tu as atteint ton objectif du jour ! Tu es trop forte ma chère ! |  |  |

### `hooks/useVoiceCore.ts` — moteur_vocal

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 273 | `speakClipOrText` | dynamique | { clipUrl: choice.mode === "clip" ? clipUrl : undefined, text } |  |  |
| 293 | `speakClipOrText` | relais | fallback |  |  |
| 566 | `ttsSpeak` | relais | text |  |  |
| 659 | `ttsSpeak` | dynamique | data.response |  |  |
| 659 | `ttsSpeak` | dynamique | ack |  |  |
| 714 | `ttsSpeak` | dynamique | m |  |  |
| 755 | `ttsSpeak` | dynamique | data.response |  |  |
| 788 | `ttsSpeak` | literal | J'ai compris |  |  |
| 799 | `ttsSpeak` | literal | D'accord, j'annule. Pas de souci. |  |  |
| 833 | `ttsSpeak` | dynamique | phrase |  |  |
| 884 | `ttsSpeak` | literal | Je prépare ta voix, un petit instant. |  |  |
| 906 | `ttsSpeak` | literal | Dis oui pour valider, ou non pour annuler. |  | € |
| 909 | `ttsSpeak` | literal | Touche Oui ou Non à l'écran, s'il te plaît. |  |  |
| 925 | `ttsSpeak` | literal | Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. |  |  |
| 926 | `ttsSpeak` | literal | Je n'ai rien entendu. Réessaie, parle un peu plus fort. |  |  |
| 962 | `ttsSpeak` | dynamique | msg |  |  |
| 994 | `ttsSpeak` | literal | Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. |  |  |
| 998 | `ttsSpeak` | literal | Je n'ai pas réussi, réessaie. |  |  |

### `pages/CollecteVoix.tsx` — pages

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 30 | `speakClipOrText` | relais | texte |  |  |
| 71 | `parle` | dynamique | prompt.consigne |  |  |
| 110 | `parle` | dynamique | 'On refait celle-là. ' + (v.raisons[0] === 'silence (rien d\'audible détecté)' ? 'Je n\'ai rien entendu.' : 'Le son n\'est pas net.') |  |  |
| 128 | `parle` | literal | Merci ! |  |  |
| 149 | `parle` | dynamique | prompt.consigne |  |  |

### `pages/marchand/MesDonnees.tsx` — pages

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 192 | `speak` | literal | Ton compte a été anonymisé. Ton argent a été conservé. |  |  |
| 431 | `speak` | dynamique | texte |  |  |
| 438 | `speak` | literal | Demande d'accès enregistrée. Tu recevras un récapitulatif de tes données par message. |  |  |
| 441 | `speak` | literal | Pour corriger une donnée, je t'emmène à ton profil. |  |  |
| 446 | `speak` | literal | Demande d'opposition enregistrée. Une personne du support te contactera. |  |  |

### `services/elevenlabs.ts` — moteur_vocal

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 137 | `speak` | dynamique | u |  |  |

### `services/vendreVocalUnifie.ts` — vente

| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |
|---:|---|---|---|---|:-:|
| 275 | `speak` | dynamique | refusDeuxFormes.texteParle |  |  |
| 332 | `speak` | dynamique | phraseCompris({ nom: ligne.nom, quantite: qte, total: ligne.total, unite: uniteLigne }) |  |  |
| 344 | `speak` | cle_i18n | TATA_PRODUIT_INCONNU_AJOUTER |  |  |

## 5. Corpus fixes (phrases qui ne sont pas à un site d'appel)

Tableaux, records et fonctions de phrases. Ce sont les textes EXACTS du source ; les gabarits gardent leurs variables `{…}`.

### `services/tataUiClips.ts` — clips Tata enregistrés (137 fichiers ui-*.mp3) — appariés par TEXTE exact (202)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 17 | literal | Alertes basses ignorées |  |
| 18 | literal | Au revoir. Déconnexion du Back-Office. |  |
| 19 | literal | Besoin mis à jour |  |
| 20 | literal | Bienvenue sur le terminal de vente. Ajoute tes produits au panier |  |
| 21 | literal | Bonjour ! Tu veux écrire ou parler avec moi ? |  |
| 22 | literal | Bonne réponse ! |  |
| 23 | literal | Ce client a droit à sa récompense ! |  |
| 24 | literal | Chargement du document en cours |  |
| 25 | literal | Choisissez un nouveau document |  |
| 26 | literal | Combien tu as en caisse ce matin ? |  |
| 27 | literal | Commande annulée |  |
| 28 | literal | Commande marquée comme livrée |  |
| 29 | literal | Commande refusée. |  |
| 30 | literal | Commandes livrées |  |
| 31 | literal | Commandes urgentes |  |
| 32 | literal | Connexion refusée. Vérifie tes identifiants. |  |
| 33 | literal | Connexion rétablie |  |
| 34 | literal | Contact mis à jour |  |
| 35 | literal | Contre-offre refusée. |  |
| 36 | literal | Contre-proposition envoyée |  |
| 37 | literal | Création de plantation agricole |  |
| 38 | literal | Création en cours... |  |
| 39 | literal | Demande acceptée |  |
| 40 | literal | Demande refusée |  |
| 41 | literal | Document chargé avec succès. En attente de vérification |  |
| 42 | literal | Document sauvegardé avec succès |  |
| 43 | literal | Document supprimé |  |
| 44 | literal | Document tourné |  |
| 45 | literal | Début de la formation |  |
| 46 | literal | Déclaration de récolte |  |
| 47 | literal | Déclarer une récolte |  |
| 48 | literal | Déconnexion en cours |  |
| 49 | literal | Dépense de |  |
| 50 | literal | Dépense enregistrée |  |
| 51 | literal | Entre ton code secret à 4 chiffres |  |
| 52 | literal | Entre un montant valide |  |
| 53 | literal | Erreur de synchronisation. Fiche sauvegardée localement. |  |
| 54 | literal | Erreur lors de l'enregistrement |  |
| 55 | literal | Erreur lors de l'enregistrement de la vente |  |
| 56 | literal | Erreur lors de la modification |  |
| 57 | literal | Erreur lors de la publication |  |
| 58 | literal | Erreur lors de la publication, réessaie |  |
| 59 | literal | Erreur lors du rechargement |  |
| 60 | literal | Erreur lors du retrait |  |
| 61 | literal | Erreur réseau. Réessaie. |  |
| 62 | literal | Erreur, réessaie |  |
| 63 | literal | Export en cours |  |
| 64 | literal | Fiche mise à jour |  |
| 65 | literal | Fiche mise à jour et synchronisée |  |
| 66 | literal | Format de fichier invalide. Utilise une image. |  |
| 67 | literal | Identité mise à jour |  |
| 68 | literal | Image trop lourde. Maximum 2 mégaoctets. |  |
| 69 | literal | Indique le nom du produit |  |
| 70 | literal | Informations personnelles enregistrées avec succès |  |
| 71 | literal | J'ai compris |  |
| 72 | literal | Je n'ai pas compris. Tape ton numéro, ou réessaie. |  |
| 73 | literal | La commande du marchand a été acceptée. |  |
| 74 | literal | La quantité doit être supérieure à zéro |  |
| 75 | literal | Le montant doit être un multiple de 100 francs |  |
| 76 | literal | Le montant doit être un multiple de 5 francs |  |
| 77 | literal | Le montant minimum est de 200 FCFA |  |
| 78 | literal | Le montant saisi est invalide |  |
| 79 | literal | Le produit a été retiré de votre marketplace. |  |
| 80 | literal | Le stock disponible ne peut pas dépasser la quantité totale de la récolte |  |
| 81 | literal | Livraison déclarée. Le marchand va confirmer la réception. |  |
| 82 | literal | Ma Plantation |  |
| 83 | literal | Mes revenus |  |
| 84 | literal | Mes récoltes |  |
| 85 | literal | Mode hors ligne |  |
| 86 | literal | Mode édition activé |  |
| 87 | literal | Modification en cours... |  |
| 88 | literal | Modifications annulées |  |
| 89 | literal | Modifier la récolte |  |
| 90 | literal | Mon Historique de ventes |  |
| 91 | literal | Mon Marché |  |
| 92 | literal | Montant invalide |  |
| 93 | literal | Montant total invalide |  |
| 94 | literal | Numéro Mobile Money invalide. Dix chiffres requis |  |
| 95 | literal | Numéro de téléphone invalide. Format attendu : 07XXXXXXXX |  |
| 96 | literal | Ouverture de ton Wallet Jùlaba |  |
| 97 | literal | Ouverture des détails de la certification JULABA |  |
| 98 | literal | Ouverture du Wallet Jùlaba |  |
| 99 | literal | Ouvre le formulaire de rechargement Mobile Money |  |
| 100 | literal | Ouvre le formulaire de retrait Mobile Money |  |
| 101 | literal | Ouvre ta journée pour activer ta caisse |  |
| 102 | literal | Paiement confirmé ! Ton Keiwa est rechargé. |  |
| 103 | literal | Paiement en cours — confirme sur ton téléphone |  |
| 104 | literal | Paiement récupéré ! L'argent est dans ton Keiwa. |  |
| 105 | literal | Paramètres sauvegardés |  |
| 106 | literal | Photo modifiée |  |
| 107 | literal | Plantation créée avec succès ! |  |
| 108 | literal | Prix invalide |  |
| 109 | literal | Problème avec le micro — réessaie |  |
| 110 | literal | Publication en cours... |  |
| 111 | literal | Publication modifiée avec succès ! |  |
| 112 | literal | Publication sur le marché en cours |  |
| 113 | literal | Quantité invalide |  |
| 114 | literal | Recharger votre keiwa |  |
| 115 | literal | Remplis tous les champs obligatoires |  |
| 116 | literal | Retour au choix du montant |  |
| 117 | literal | Retour au choix du service |  |
| 118 | literal | Retrait confirmé ! Ton solde a été mis à jour. |  |
| 119 | literal | Réception confirmée. Passons au paiement. |  |
| 120 | literal | Récolte publiée avec succès ! |  |
| 121 | literal | Saisir un autre montant |  |
| 122 | literal | Saisis le nom du produit |  |
| 123 | literal | Saisis une quantité valide |  |
| 124 | literal | Signalement de problème |  |
| 125 | literal | Solde insuffisant |  |
| 126 | literal | Suivre une nouvelle plantation |  |
| 127 | literal | Ta demande a été envoyée |  |
| 128 | literal | Ton streak a été réinitialisé |  |
| 129 | literal | Ton streak est sauvé grâce au bouclier ! |  |
| 130 | literal | Toute ta production est au-dessus du seuil. Tout va bien ! |  |
| 131 | literal | Toutes les commandes |  |
| 132 | literal | Trop de tentatives incorrectes. Réessaie dans 5 minutes. |  |
| 133 | literal | Tu vas être redirigé vers Wave pour confirmer le paiement |  |
| 134 | literal | Téléchargement de la carte |  |
| 135 | literal | Vente confirmée |  |
| 136 | literal | Vente refusée |  |
| 137 | literal | Verso de la carte |  |
| 138 | literal | Voici tes céréales en production |  |
| 139 | literal | Voici tes fruits en production |  |
| 140 | literal | Voici tes légumes en production |  |
| 141 | literal | Voici tes tubercules en production |  |
| 142 | literal | Voici tous tes produits en production |  |
| 143 | literal | Votre besoin a été soumis à la coopérative |  |
| 144 | literal | À bientôt sur Jùlaba |  |
| 165 | literal | Ouverture des détails de la carte d'identité |  |
| 200 | literal | C'est fait net ! |  |
| 201 | literal | C'est bien reçu ! |  |
| 202 | literal | J'ai calé ça ! |  |
| 203 | literal | C'est noté deh ! |  |
| 204 | literal | C'est bien enregistré ! |  |
| 205 | literal | C'est calé, ta vente est bien entrée dans la machine. |  |
| 206 | literal | D'accord, j'annule ça. Y'a pas de souci. |  |
| 207 | literal | Je n'ai pas bien capté. Faut me redire ça autrement, s'il te plaît. |  |
| 208 | literal | Je n'ai rien entendu, deh. Réessaie en haussant un peu la voix. |  |
| 209 | literal | Dis oui pour confirmer, ou bien dis non pour laisser tomber. |  |
| 210 | literal | Appuie sur Oui ou sur Non sur l'écran. |  |
| 211 | literal | Je chauffe ma voix un coup, patiente deux minutes. |  |
| 212 | literal | La voix n'est pas sortie. Regarde ton réseau et puis réessaie. |  |
| 213 | literal | Je regarde ça un coup... |  |
| 214 | literal | Attends deux minutes... |  |
| 215 | literal | Je vérifie ça tout de suite... |  |
| 216 | literal | Je gère ça pour toi... |  |
| 217 | literal | Je fais le point... |  |
| 218 | literal | J'enregistre ta vente là tout de suite... |  |
| 219 | literal | Laisse-moi relancer encore... |  |
| 220 | literal | L'avance qu'elle t'a donnée dépasse ou bien c'est égal au prix total. Enregistre ça comme vente cash directement. |  |
| 221 | literal | Donne-moi d'abord le nom de la cliente. |  |
| 222 | literal | Attention, l'argent-là est beaucoup, deh ! Vérifie bien si tu ne t'es pas trompée. |  |
| 223 | literal | Eh, ma fille ! Te voilà. On continue, non ? |  |
| 224 | literal | Chaque vente, tu mets ça ici. Comme ça là, tu n'oublies rien et tout ton point est là. |  |
| 225 | literal | Bon, pour commencer là, appuie ici. |  |
| 226 | literal | Mets ton numéro de téléphone ici. |  |
| 227 | literal | Tu peux me dicter aussi, hein. Appuie sur le micro d'abord. |  |
| 228 | literal | Dis les chiffres doucement doucement, un à un. |  |
| 229 | literal | Tu veux réécouter ça ? Appuie ici. |  |
| 230 | literal | C'est bien ton numéro, non ? Appuie ici pour avancer. |  |
| 231 | literal | Tu t'es trompée ? Y'a pas problème, c'est rien. Appuie ici pour effacer. |  |
| 232 | literal | Il manque encore des chiffres dedans. Continue. |  |
| 233 | literal | Regarde bien, y'a un chiffre qui n'est pas bon dedans. |  |
| 253 | literal | Regarde bien, y'a un chiffre qui n'est pas bon dedans. Si tu veux, tape ton numéro directement ici. |  |
| 254 | literal | Je n'ai pas bien entendu, deh. Redis-moi ça doucement. |  |
| 255 | literal | Si tu veux, tape ton numéro directement ici. |  |
| 256 | literal | Pour que je puisse bien t'entendre, appuie sur "Autoriser". |  |
| 257 | literal | Le micro ne prend pas là. Faut taper ton numéro ici. |  |
| 258 | literal | C'est bon maintenant. Appuie sur le micro et puis parle. |  |
| 259 | literal | Attends un peu, je vérifie ça pour toi. |  |
| 260 | literal | Bon, mets les quatre chiffres de ton code secret. |  |
| 261 | literal | Appuie sur tes quatre photos, une à une, comme tu avais choisi là. |  |
| 262 | literal | Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé. |  |
| 263 | literal | Voilà les chiffres maintenant. Mets ton code comme d'habitude. |  |
| 264 | literal | Ton code là, c'est pour toi seule. Faut jamais montrer ou dire ça à quelqu'un. |  |
| 265 | literal | C'est effacé net. |  |
| 266 | literal | Appuie ici. Ton propre téléphone va te guider. |  |
| 267 | literal | Ça n'a pas pris. On passe par ton code directement. |  |
| 268 | literal | Ce n'est pas toi ? Y'a pas problème, appuie ici pour taper ton numéro. |  |
| 269 | literal | Le numéro ou le code n'est pas bon, deh. Regarde bien avant de reprendre. |  |
| 270 | literal | Attention, hein ! Il te reste une seule chance. Prends bien ton temps. |  |
| 271 | literal | Tu as trop forcé. Patiente un peu d'abord avant de réessayer. |  |
| 272 | literal | Ma fille, là c'est bloqué net. Faut aller voir ton agent pour te débloquer. |  |
| 273 | literal | Eh, le réseau ne passe pas là ! Réessaie dans un petit moment. |  |
| 274 | literal | Ça pèse un peu. Patiente, je suis en train de relancer. |  |
| 275 | literal | Maintenant là, choisis ton propre code secret. C'est pour toi seule, hein. |  |
| 276 | literal | D'accord, c'est calé comme ça. |  |
| 277 | literal | D'accord, on continue comme d'habitude. |  |
| 278 | literal | Voilà, ma fille. Allons-y ! |  |
| 279 | literal | Quel produit vivrier tu veux faire entrer dans le stock ? |  |
| 280 | literal | Tout ton stock est bien chargé, y'a pas de manque. |  |
| 281 | literal | Tu n'as pas mis à combien tu as payé ça au gros. On ne pourra pas calculer ton vrai bénéfice. |  |
| 282 | literal | Appuie sur moi et puis dis-moi ce que tu as vendu au marché. |  |
| 283 | literal | Je n'ai pas bien capté. Rapproche le téléphone de ta bouche et puis parle doucement. |  |
| 284 | literal | C'est rentré dans le panier. Tu ajoutes encore ou bien on encaisse l'argent ? |  |
| 285 | literal | D'accord, on laisse tomber ça. Ton panier n'a pas bougé. |  |
| 286 | literal | Ma voix ne sort pas là. Tape ta vente sur le clavier, je suis avec toi. |  |
| 287 | literal | Et puis c'est à combien ? |  |
| 288 | literal | Tu n'as pas encore fait de vente aujourd'hui. Y'a pas problème, le marché va s'ouvrir ! |  |
| 289 | literal | L'argent est tombé pile, y'a pas de monnaie. |  |
| 290 | literal | Ton argent est caché |  |
| 291 | literal | Ton argent est affiché |  |

### `services/tataVoice.ts` — clips Tata par CLÉ (vente_enregistree, hors_ligne…) (8)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 32 | literal | Vente confirmée |  |
| 33 | literal | Vente refusée |  |
| 34 | literal | Dépense enregistrée |  |
| 35 | literal | J'ai compris |  |
| 36 | literal | Commande annulée |  |
| 37 | literal | Erreur réseau. Réessaie. |  |
| 38 | literal | Mode hors ligne |  |
| 39 | literal | Ouvre ta journée pour activer ta caisse |  |

### `services/onboardingVoix.ts` — clips d'onboarding (texte = filet si le .mp3 manque) (9)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 40 | literal | Akwaba. Pour vendre, touche un produit, ou parle à Tata. On est ensemble. |  |
| 45 | literal | Re-bonjour ! On y va. |  |
| 52 | literal | Je serai avec toi chaque jour dans ton commerce. Tu peux toucher l'écran. Tu peux aussi écouter. On est ensemble. |  |
| 57 | literal | Tu vends. J'enregistre. Je compte. Tu sais toujours combien tu gagnes. |  |
| 62 | literal | Tu peux me parler, ou utiliser le clavier. C'est toi qui décides. |  |
| 67 | literal | Tout est prêt. Ouvrons ta boutique. |  |
| 73 | literal | Comment préfères-tu travailler avec moi ? Le plus simple : laisse-moi choisir, je m'adapte à toi. Sinon : je sais lire et écrire, ou je lis un peu, ou je préfère parler. Il n'y a pas de mauvais choix. |  |
| 85 | literal | Pour que je puisse t'écouter et te parler partout, même sans réseau : ta voix est déjà dans l'application, je la vérifie, c'est tout. Rien à télécharger. |  |
| 92 | literal | Bravo ! Nous sommes prêtes. Ouvrons ta boutique. |  |

### `services/loginVoiceScript.ts` — script de connexion / chiffres / pipeline (à enregistrer ; ids AUTH_*, NUM_*, CORE_*) (183)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 32 | literal | Premier accueil |  |
| 32 | literal | Bonjour ma fille. Moi, c'est Tantie Nanti Lou. Viens, je vais te montrer. |  |
| 32 | literal | I ni sɔgɔma n'denmuso. N'tɔgɔ ye Tantie Nanti Lou. Na yan, n'b'a yira i la. |  |
| 33 | literal | Eh, ma fille ! Te voilà. On continue ? |  |
| 33 | literal | Eh, n'denmuso ! I nana wa ? An b'a to yen ? |  |
| 34 | literal | Présenter son aide |  |
| 34 | literal | Chaque vente, tu la mets ici. Comme ça, tu n'oublies rien, et tes comptes sont là. |  |
| 34 | literal | Feere o feere, i b'a bila yan. O la, i tɛ fɔyi ɲinɛ, i ka konte bɛɛ bɛ yan. |  |
| 35 | literal | Bon, pour commencer, appuie ici. |  |
| 35 | literal | Bon, walasa an ka daminɛ, a digi yan. |  |
| 36 | literal | Demander le numéro |  |
| 36 | literal | Mets ton numéro de téléphone ici. |  |
| 36 | literal | I ka telefɔni nimɔrɔ, a bila yan. |  |
| 37 | literal | Proposer la voix |  |
| 37 | literal | Tu peux aussi me le dire. Appuie sur le micro d'abord. |  |
| 37 | literal | I bise fana ka fɔ n'ye. A digi mikoro kan fɔlɔ. |  |
| 38 | literal | Expliquer la dictée |  |
| 38 | literal | Dis les chiffres doucement doucement, un par un. |  |
| 38 | literal | Nimɔrɔw fɔ dɔɔnin dɔɔnin, kelen kelen. |  |
| 39 | literal | Écouter le numéro saisi |  |
| 39 | literal | Tu veux réécouter ? Appuie ici. |  |
| 39 | literal | I b'a fɛ k'a mɛn tugun wa ? A digi yan. |  |
| 40 | literal | C'est bien ton numéro ? Appuie ici pour continuer. |  |
| 40 | literal | I ka nimɔrɔ yɛrɛ le do wa ? A digi yan walasa k'a to yen. |  |
| 41 | literal | Tu t'es trompée ? C'est rien, y'a pas problème. Appuie ici pour effacer. |  |
| 41 | literal | I filila wa ? Gɛlɛya t'a la. A digi yan k'a josi. |  |
| 42 | literal | Numéro incomplet |  |
| 42 | literal | Il manque encore des chiffres dedans. Continue. |  |
| 42 | literal | Dɔ b'a la fɔlɔ. Fɔ ka t'a la. |  |
| 43 | literal | Numéro invalide |  |
| 43 | literal | Regarde bien, y'a un chiffre qui n'est pas bon dedans. Si tu veux, tape ton numéro directement ici. |  |
| 43 | literal | A filɛ ka ɲa, nimɔrɔ dɔ ma sɔrɔ ka ɲa. |  |
| 44 | literal | Dictée mal comprise |  |
| 44 | literal | Je n'ai pas bien entendu. Redis-le, doucement. |  |
| 44 | literal | N'ma mɛn ka ɲa. A fɔ tugun, dɔɔnin dɔɔnin. |  |
| 45 | literal | Proposer le clavier |  |
| 45 | literal | Si tu veux, tape ton numéro ici. |  |
| 45 | literal | Ni a ka di i ye, i ka nimɔrɔ sɛbɛn yan. |  |
| 46 | literal | Autorisation du micro |  |
| 46 | literal | Pour que je t'entende, appuie sur Autoriser. |  |
| 46 | literal | Walasa n'ka i kan mɛn, a digi Autoriser kan. |  |
| 47 | literal | Micro indisponible |  |
| 47 | literal | Le micro ne prend pas là. Faut taper ton numéro ici. |  |
| 47 | literal | Mikoro tɛ baara kɛra sisan. I ka nimɔrɔ sɛbɛn yan. |  |
| 48 | literal | Micro disponible |  |
| 48 | literal | C'est bon maintenant. Appuie sur le micro et puis parle. |  |
| 48 | literal | A bɛna. A digi mikoro kan, k'i kuma. |  |
| 49 | literal | Attends un peu, je regarde. |  |
| 49 | literal | Mɔgɔni kɔn dɔɔnin, n'b'a filɛ. |  |
| 50 | literal | Code en chiffres |  |
| 50 | literal | Bon, mets les quatre chiffres de ton code secret. |  |
| 50 | literal | Bon, i ka kɔdi nimɔrɔ naani bila yan. |  |
| 51 | literal | Code en images |  |
| 51 | literal | Appuie sur tes quatre images, une par une, dans l'ordre. |  |
| 51 | literal | I ka ja naani digi, kelen kelen, cogo min na u bɛ ɲɔgɔn kɔ. |  |
| 52 | literal | Passage aux images |  |
| 52 | literal | Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé. |  |
| 52 | literal | Ja le bɛ yan sisan nimɔrɔw nɔrɔ la. I ka kɔdi ma yɛlɛma. |  |
| 53 | literal | Retour aux chiffres |  |
| 53 | literal | Voilà les chiffres maintenant. Mets ton code comme d'habitude. |  |
| 53 | literal | Nimɔrɔw nana tugun. I ka kɔdi bila i n'a fɔ kɔrɔlen. |  |
| 54 | literal | Ton code, c'est pour toi seule. Faut pas le dire à quelqu'un. |  |
| 54 | literal | I ka kɔdi, i kelenpe ta le. Kana fɔ mɔgɔ si ye. |  |
| 55 | literal | C'est effacé net. |  |
| 55 | literal | A josila. |  |
| 56 | literal | Entrer avec le téléphone |  |
| 56 | literal | Appuie ici. Ton téléphone va te dire quoi faire. |  |
| 56 | literal | A digi yan. I ka telefɔni bɛna a fɔ i ye k'i ka min kɛ. |  |
| 57 | literal | Reconnaissance échouée |  |
| 57 | literal | Ça n'a pas pris. On passe par ton code directement. |  |
| 57 | literal | A ma taga. An b'a kɛ n'i ka kɔdi ye. |  |
| 58 | literal | Autre personne sur le téléphone |  |
| 58 | literal | Ce n'est pas toi ? Y'a pas problème, appuie ici pour mettre ton numéro. |  |
| 58 | literal | E tɛ wa ? Gɛlɛya t'a la, a digi yan k'i ka nimɔrɔ bila. |  |
| 59 | literal | Numéro ou code incorrect |  |
| 59 | literal | Le numéro ou le code n'est pas bon. Regarde bien pour reprendre. |  |
| 59 | literal | Nimɔrɔ walima kɔdi man ɲi. A filɛ ka ɲa ka kɔsegi a la. |  |
| 60 | literal | Dernier essai |  |
| 60 | literal | Attention, il te reste un seul essai. Prends ton temps. |  |
| 60 | literal | Kɔlɔsi, kelenpe dɔrɔn le tora i bolo. I kanto i yɛrɛ la. |  |
| 61 | literal | Trop de tentatives |  |
| 61 | literal | Tu as trop forcé. Patiente un peu d'abord avant de réessayer. |  |
| 61 | literal | I y'a ɲini siɲɛ caaman kojugu. Makɔnni dɔɔnin sanni k'a daminɛ tugun. |  |
| 62 | literal | Accès bloqué |  |
| 62 | literal | Ma fille, là c'est bloqué. Faut voir ton agent pour t'aider. |  |
| 62 | literal | N'denmuso, sira datugura sisan. Taga i ka azan filɛ, a bɛna i dɛmɛ. |  |
| 63 | literal | Connexion impossible |  |
| 63 | literal | Eh, ça ne passe pas là. Réessaie dans un petit moment. |  |
| 63 | literal | Eh, a tɛ tagara dɛ. Kɔsegi a la dɔɔnin kɔfɛ. |  |
| 64 | literal | Nouvelle tentative automatique |  |
| 64 | literal | Ça pèse un peu. Patiente, je suis en train de relancer. |  |
| 64 | literal | A bɛ waati dɔɔnin ta. Sabali dɔɔnin, n'bɛ kɔsegi a la. |  |
| 65 | literal | Changement de code |  |
| 65 | literal | Maintenant, choisis ton propre code. C'est pour toi seule. |  |
| 65 | literal | Sisan, i yɛrɛ ka kɔdi sugandi. I kelenpe ta le. |  |
| 66 | literal | Choix enregistré |  |
| 66 | literal | D'accord, c'est calé comme ça. |  |
| 66 | literal | Ayiwa, an b'a kɛ ten. |  |
| 67 | literal | Choix conservé |  |
| 67 | literal | D'accord, on continue comme d'habitude. |  |
| 67 | literal | Ayiwa, an b'a to ten i n'a fɔ kɔrɔlen. |  |
| 68 | literal | Fin de l'accueil |  |
| 68 | literal | Voilà, ma fille. On y va ! |  |
| 68 | literal | A banna, n'denmuso. An ka taga ! |  |
| 87 | literal | Réponse illisible |  |
| 87 | literal | Ça n'a pas bien répondu. Attends un petit moment, puis reprends. |  |
| 88 | literal | Compte introuvable |  |
| 88 | literal | Ça n'a pas marché comme il faut. Reprends depuis le début. |  |
| 89 | literal | Numéro d'ailleurs |  |
| 89 | literal | Ce numéro-là ne commence pas comme un numéro d'ici. Regarde bien le début. |  |
| 92 | literal | Chiffre 0 |  |
| 93 | literal | Chiffre 1 |  |
| 94 | literal | Chiffre 2 |  |
| 95 | literal | Chiffre 3 |  |
| 96 | literal | Chiffre 4 |  |
| 97 | literal | Chiffre 5 |  |
| 98 | literal | Chiffre 6 |  |
| 99 | literal | Chiffre 7 |  |
| 100 | literal | Chiffre 8 |  |
| 101 | literal | Chiffre 9 |  |
| 104 | literal | Phrase d'attente |  |
| 104 | literal | Je réfléchis... |  |
| 104 | literal | N'b'a kɔlɔsi dɔɔnin... |  |
| 105 | literal | Phrase d'attente |  |
| 105 | literal | Un instant... |  |
| 105 | literal | Sabali dɔɔnin... |  |
| 106 | literal | Phrase d'attente |  |
| 106 | literal | Je vois ça... |  |
| 106 | literal | N'b'a lajɛra... |  |
| 107 | literal | Phrase d'attente |  |
| 107 | literal | Je m'en occupe... |  |
| 107 | literal | N'bɛ baara kɛ a la... |  |
| 108 | literal | Phrase d'attente calcul |  |
| 108 | literal | Je calcule ça... |  |
| 108 | literal | N'b'a jatebɔ la... |  |
| 109 | literal | Phrase d'attente vente |  |
| 109 | literal | Je note ta vente... |  |
| 109 | literal | N'bɛ i ka feere sɛbɛn... |  |
| 110 | literal | Phrase d'attente réessai |  |
| 110 | literal | Laisse-moi réessayer... |  |
| 110 | literal | A to n'ka kɔsegi a la... |  |
| 111 | literal | Accusé réception |  |
| 111 | literal | C'est fait ! |  |
| 111 | literal | A banna ! |  |
| 112 | literal | Accusé réception |  |
| 112 | literal | Bien reçu ! |  |
| 112 | literal | A mɛnna ka ɲa ! |  |
| 113 | literal | Accusé réception |  |
| 113 | literal | Je note ça ! |  |
| 113 | literal | N'b'a sɛbɛn ! |  |
| 114 | literal | Accusé réception |  |
| 114 | literal | C'est noté ! |  |
| 114 | literal | A sɛbɛnna ! |  |
| 115 | literal | Accusé réception |  |
| 115 | literal | C'est enregistré ! |  |
| 115 | literal | A bilala ka ɲa ! |  |
| 116 | literal | Validation vente finale |  |
| 116 | literal | C'est noté, ta vente est bien enregistrée. |  |
| 116 | literal | A banna, i ka feere bilala ka ɲa. |  |
| 117 | literal | Annulation vente |  |
| 117 | literal | D'accord, j'annule. Pas de souci. |  |
| 117 | literal | Ayiwa, n'b'a to yen. Gɛlɛya t'a la. |  |
| 118 | literal | Non compris |  |
| 118 | literal | Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. |  |
| 118 | literal | N'ma a faamu ka ɲa. A fɔ n'ye kokura, sabali. |  |
| 119 | literal | Rien entendu |  |
| 119 | literal | Je n'ai rien entendu. Réessaie, parle un peu plus fort. |  |
| 119 | literal | N'ma foyi mɛn. Kɔsegi a la, i kan kɔrɔta dɔɔnin. |  |
| 120 | literal | Choix confirmation ambigu |  |
| 120 | literal | Dis oui pour valider, ou non pour annuler. |  |
| 120 | literal | A fɔ 'Awo' walasa k'a sɔn, walima 'Ayi' walasa k'a dabila. |  |
| 121 | literal | Rappel écran |  |
| 121 | literal | Touche Oui ou Non à l'écran, s'il te plaît. |  |
| 121 | literal | A digi 'Awo' walima 'Ayi' kan ekran na, sabali. |  |
| 122 | literal | Préparation moteur |  |
| 122 | literal | Je prépare ta voix, un petit instant. |  |
| 122 | literal | N'bɛ kan labɛnna, makɔnni dɔɔnin. |  |
| 123 | literal | Erreur réseau moteur |  |
| 123 | literal | Je n'ai pas réussi à préparer ta voix. Vérifie le réseau et réessaie. |  |
| 123 | literal | N'ma se ka kan labɛn. Reso lajɛ ka kɔsegi a la. |  |
| 127 | literal | Connexion (accueil, numéro, code) |  |
| 128 | literal | Chiffres isolés (0 à 9) |  |
| 129 | literal | Pipeline vocal — attentes et accusés fréquents |  |

### `hooks/useVoiceCore.ts` — moteur vocal : attentes, accusés, erreurs, confirmations locales (53)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 145 | literal | Je réfléchis... |  |
| 146 | literal | Un instant... |  |
| 147 | literal | Je vois ça... |  |
| 148 | literal | Je m'en occupe... |  |
| 149 | literal | Laisse-moi voir... |  |
| 150 | literal | Je traite ça... |  |
| 151 | literal | Attends un moment... |  |
| 155 | literal | Je calcule ça... |  |
| 156 | literal | Je note ta vente... |  |
| 157 | literal | Un instant, j'enregistre... |  |
| 158 | literal | Je m'en occupe... |  |
| 162 | literal | Excuse-moi, je recommence... |  |
| 163 | literal | Un instant, je réessaie... |  |
| 164 | literal | Je réfléchis encore... |  |
| 165 | literal | Laisse-moi réessayer... |  |
| 169 | literal | C'est fait ! |  |
| 170 | literal | Bien reçu ! |  |
| 171 | literal | D'accord ! |  |
| 172 | literal | Je note ça ! |  |
| 173 | literal | C'est noté ! |  |
| 174 | literal | Voilà ! |  |
| 175 | literal | Ça marche ! |  |
| 176 | literal | Top ! |  |
| 177 | literal | C'est enregistré ! |  |
| 181 | literal | Bravo, continue comme ça ! |  |
| 182 | literal | Super, tu travailles bien ! |  |
| 183 | literal | Excellent ! |  |
| 184 | literal | Tu gères bien ! |  |
| 185 | literal | C'est du bon travail ! |  |
| 242 | literal | voix-desactivee (julaba_voice_disabled) |  |
| 409 | template | Le pack vocal {lang} n’est pas encore installé. Le texte reste disponible, sans utiliser Internet. | `lang` |
| 539 | literal | Analyse en cours... |  |
| 711 | literal | Enregistrement impossible. |  |
| 788 | literal | J'ai compris |  |
| 799 | literal | D'accord, j'annule. Pas de souci. |  |
| 808 | literal | ma chère |  |
| 844 | literal | J'écoute... |  |
| 883 | literal | Je prépare ta voix… |  |
| 884 | literal | Je prépare ta voix, un petit instant. |  |
| 906 | literal | Dis oui pour valider, ou non pour annuler. |  |
| 909 | literal | Touche Oui ou Non à l'écran, s'il te plaît. |  |
| 925 | literal | Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. |  |
| 926 | literal | Je n'ai rien entendu. Réessaie, parle un peu plus fort. |  |
| 936 | literal | moteur voix indisponible ou transcription échouée (ensureOfflineModel / transcribeWav) |  |
| 957 | literal | La dictée n'est disponible que dans l'application. Ici, touche les produits. |  |
| 959 | literal | Je n'ai pas réussi à préparer ta voix. Réessaie. |  |
| 960 | literal | Je n'ai pas réussi à t'écouter, réessaie. |  |
| 994 | literal | Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. |  |
| 998 | literal | Je n'ai pas réussi, réessaie. |  |
| 1025 | literal | Micro non accessible dans cette application. Ouvre Jùlaba dans Safari ou Chrome pour utiliser la voix. |  |
| 1061 | literal | Microphone inaccessible. Vérifie les permissions. |  |
| 1064 | literal | Accès au micro refusé. Autorise le micro pour Jùlaba dans les réglages de ton téléphone. |  |
| 1066 | literal | Micro introuvable ou déjà utilisé par une autre application. Vérifie ton micro et réessaie. |  |

### `services/dialoguesTata.ts` — dialogues purs de la vente guidée (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `services/machineEncaissement.ts` — relecture financière (machine d'encaissement) (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `services/relectureSpontanee.ts` — relecture spontanée (billets touchés, ligne ajoutée) (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `services/vendreVocalUnifie.ts` — refus de prix, produit inconnu (1)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 320 | template | C'est dans le panier : {qte} × {nom} | `qte` `nom` |

### `services/intentionsCaisse.ts` — réponses aux questions « chiffres du jour » (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `services/ruptureStock.ts` — avertissement de rupture dit après la vente (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `voice-offline/localIntent.ts` — `response` de confirmation locale (vente/dépense) (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `utils/fcfa.ts` — coupures dites (« cinq mille francs ») (0)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|

### `components/marchand/ChoixUnite.tsx` — unité dite (« au tas », « au kilo ») (7)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 39 | literal | à l'unité |  |
| 40 | literal | au tas |  |
| 41 | literal | au kilo |  |
| 42 | literal | au sac |  |
| 43 | literal | à la bassine |  |
| 44 | literal | au régime |  |
| 48 | template | en {unite} | `unite` |

### `utils/accessMode.ts` — proposition d'adaptation du mode (dite par Tata) (2)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 97 | literal | J'ai remarqué que tu préfères le clavier. Veux-tu que Julaba s'adapte ? |  |
| 100 | literal | J'ai remarqué que tu préfères me parler. Veux-tu que Julaba s'adapte ? |  |

### `contexts/ObjectifContext.tsx` — annonces automatiques d'objectif (audioManager.speakAuto) (2)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 92 | literal | Félicitations ! Tu as atteint 50% de ton objectif. Continue ma chère, tu es sur la bonne voie ! |  |
| 102 | literal | Incroyable ! Tu as atteint ton objectif du jour ! Tu es trop forte ma chère ! |  |

### `contexts/AppContext.tsx` — annonces du contexte applicatif (fond du jour…) (1)

| Ligne | Nature | Phrase | Variables |
|---:|---|---|---|
| 924 | template | Ta journée est déjà ouverte avec {fondRetenu} francs. Pour changer ce montant, touche Modifier le fond. | `fondRetenu` |

## 6. Intentions reconnues et variantes STT existantes

Ce que la marchande peut DIRE aujourd'hui, tel que le code l'accepte. Corpus STT — à ne jamais mélanger avec les phrases de Tata (§4-5).

### 6.1 Encaissement — `voice-offline/grammaireEncaissement.ts` (critique argent)

- Intentions : `encaisser`, `combien_doit`, `oui_valide`, `annuler_validation`
- `oui_valide` — LISTE BLANCHE FERMÉE, phrase entière normalisée : 
- `annuler_validation` — regex : `undefined`
- `encaisser` — regex : `undefined`
- `combien_doit` — regex : `undefined`

### 6.2 Vente / dépense / questions — `voice-offline/vocabulaire.ts` (`INTENTIONS_MAP`)

| Intention | Mots déclencheurs |
|---|---|
| `vente` | `vendu`, `vendue`, `vendus`, `vendues`, `vente`, `vends` |
| `depense` | `acheté`, `achetée`, `achetés`, `achetées`, `achète`, `achete`, `acheter`, `pris`, `prise`, `dépensé`, `dépensée`, `depensé`, `depense`, `dépense`, `payé`, `payée`, `payés`, `payer` |
| `solde` | `solde`, `reste` |
| `credit` | `crédit`, `credit`, `dette`, `dettes`, `doit`, `dois`, `doivent` |
| `remboursement` | `remboursé`, `remboursée`, `rembourser`, `remboursement` |
| `recette` | `recette`, `bénéfice`, `benefice`, `gagné`, `gagnée` |
| `reappro` | `reçu`, `recu`, `reçue`, `arrivé`, `arrivés`, `arrivée`, `arrivées`, `épuisé`, `epuise` |

### 6.3 Réponses en confirmation de ligne — `services/grammaireCorrection.ts`

- `MOTS_ANNULE` : `annule`, `annuler`, `recommence`, `recommencer`, `oublie`, `oublier`, `laisse tomber`
- `MOTS_SUPPRIME` : `enleve`, `enlever`, `retire`, `retirer`, `supprime`, `supprimer`, `jette`, `jeter`
- `MOTS_ENCAISSE` : `encaisse`, `encaisser`, `termine`, `terminer`, `fini`, `finir`, `c'est tout`, `c'est fini`, `termine la`
- `MOTS_SUIVANT` : `j'ajoute`, `autre chose`, `autre article`, `encore un`, `un autre`, `aussi`, `et aussi`, `ajoute autre`
- `MOTS_REFUS` : `non`, `pas`, `pas ca`, `c'est pas ca`, `c'est faux`, `faux`, `pas bon`, `c'est pas bon`, `errone`, `erreur`
- `MOTS_CONFIRME` : `oui`, `ouais`, `c'est bon`, `c'est ca`, `c'est exact`, `voila`, `exact`, `ok`, `okay`, `d'accord`, `daccord`, `parfait`
- `MOTS_TOTAL` : `le tout`, `au total`, `en tout`, `tout ca`, `ensemble`, `pour les`, `les deux`, `les trois`

### 6.4 Questions « chiffres du jour » — `services/intentionsCaisse.ts`

- Signal interrogatif : `/combien|quel(le)?s? |qu'est|c'est quoi|dis[- ]moi|montre[- ]moi|\?/` ; questions : `ventes_jour`, `depenses_jour`, `solde_caisse`, `benefice_jour`, `meilleure_vente` (motifs dans le source).

### 6.5 Oui / non du moteur (`hooks/useVoiceCore.ts`, `interpretYesNo`)

- NON (testé d'abord) : ` non `, ` pas `, ` faux `, ` annule`, ` efface`, ` recommence` ; OUI : ` oui `, ` ouais `, ` voila `, ` voilà `, ` exact `, ` accord `, ` ok `, ` okay `, ` c'est bon `, ` c'est ca `, ` c'est ça `, ` bon `, ` ca `, ` ça ` — inclusion de sous-chaîne, bordée d'espaces. Sert à confirmer une DÉPENSE dictée (écriture d'argent) : critique.

### 6.6 Marqueurs syntaxiques du parseur — `voice-offline/extraction.ts`

- Montant AVANT : `à`, `a`, `pour` ; montant APRÈS : `francs`, `franc`
- Mots d'unité tolérés entre le nombre et le produit : `tas`, `sac`, `sacs`, `kilo`, `kilos`, `kilogramme`, `kilogrammes`, `bidon`, `bidons`, `botte`, `bottes`, `sachet`, `sachets`, `boite`, `boites`, `paquet`, `paquets`, `morceau`, `morceaux`, `litre`, `litres`, `régime`, `regime`, `regimes`, `régimes`, `carton`, `cartons`, `caisse`, `caisses`, `bouteille`, `bouteilles`, `panier`, `paniers`, `de`

## 7. Lexique du parseur (produits, unités, nombres, monnaie)

### 7.1 Produits — `voice-offline/vocabulaire.ts` (`PRODUITS_FORMES` : forme entendue → identifiant)

| Identifiant (libellé fr actuel) | Formes entendues |
|---|---|
| `tomate` | `tomate`, `tomates` |
| `piment` | `piment`, `piments` |
| `gombo` | `gombo`, `gombos` |
| `attiéké` | `attieké`, `attieke`, `attiéké` |
| `banane` | `banane`, `bananes` |
| `banane plantain` | `plantain`, `banane plantain`, `bananes plantain`, `banane plantains`, `bananes plantains` |
| `igname` | `igname`, `ignames` |
| `manioc` | `manioc`, `maniocs` |
| `aubergine` | `aubergine`, `aubergines` |
| `oignon` | `oignon`, `oignons` |
| `ail` | `ail` |
| `poisson` | `poisson`, `poissons` |
| `viande` | `viande`, `viandes` |
| `poulet` | `poulet`, `poulets` |
| `huile` | `huile` |
| `sel` | `sel` |
| `sucre` | `sucre` |
| `riz` | `riz` |
| `haricot` | `haricot`, `haricots` |
| `maïs` | `maïs`, `mais` |
| `foutou` | `foutou`, `foutous` |
| `orange` | `orange`, `oranges` |
| `savon` | `savon`, `savons` |
| `farine` | `farine` |
| `jus` | `jus` |
| `bière` | `bière`, `biere`, `bières` |
| `biscuit` | `biscuit`, `biscuits` |
| `lait` | `lait`, `laits` |

28 produits, 54 formes. NB : l'identifiant est aujourd'hui le libellé français lui-même — le lexique i18n (`locales/*/lexicon.ts`) le découple (`productId` stable, formes par langue).

### 7.2 Unités

- Graphies canoniques (`utils/unite.utils.ts`, `GRAPHIES_CANONIQUES`) : `unité` ← `unite` `unites` ; `tas` ← `tas` ; `kg` ← `kg` `kilo` `kilos` `kilogramme` `kilogrammes` ; `sac` ← `sac` `sacs` ; `bassine` ← `bassine` `bassines` ; `régime` ← `regime` `regimes` ; `pièce` ← `piece` `pieces` ; `litre` ← `litre` `litres` `l` ; `morceau` ← `morceau` `morceaux` ; `boîte` ← `boite` `boites`
- Unités neutres (jamais dites) : `unite`, `unité`, `unites`, `unités`, `` ; abréviations invariables : `kg`, `g`, `l`, `ml`, `cl`, `m`, `cm`
- Sélecteur tactile (`config/unites.ts`) : `kg`, `sac`, `tonne`, `tas`, `régimes`, `carton`, `L`, `pièce`
- Mêmes mesures pour le prix (`services/prixVocal.ts`, `MEMES_UNITES`) : `['kg', 'kilo', 'kilos', 'kilogramme', 'kilogrammes']` ; `['tas']` ; `['sac', 'sacs']` ; `['piece', 'pièce', 'pieces', 'pièces', 'unite', 'unité', 'unites', 'unités']` ; `['regime', 'régime', 'regimes', 'régimes']` ; `['litre', 'litres', 'l']` ; `['portion', 'portions']` ; `['botte', 'bottes']` ; `['paquet', 'paquets']` ; `['carton', 'cartons']` ; `['bidon', 'bidons']` ; `['sachet', 'sachets']` ; `['boite', 'boîte', 'boites', 'boîtes']` ; `['panier', 'paniers']`
- Unité DITE (`components/marchand/ChoixUnite.tsx`) : `unité` → « à l'unité » ; `tas` → « au tas » ; `kg` → « au kilo » ; `sac` → « au sac » ; `bassine` → « à la bassine » ; `régime` → « au régime »

### 7.3 Nombres

- Français, parseur de vente (`voice-offline/extraction.ts`) : 33 unités/exceptions + 37 dizaines, plus `cent(s)`, `mille`, `et` ; ellipse du marché « mille cinq » = 1 500.
- Français, dictée d'un numéro (`utils/frenchDigits.ts`) : 23 petits nombres, 5 dizaines.
- Bambara (`voice-offline/nombresMandingue.ts`, existant, base annoncée pour le dioula) : unités  ; échelles  ; monnaie orale  (= 5 F).

### 7.4 Monnaie — `config/devise.ts`

- Code `undefined`, symbole affiché `undefined`, forme DITE `undefined` ; coupures dites dans `utils/fcfa.ts` (`direCoupure`, §5).

## 8. Ce qui n'est PAS dans le parcours vocal (et pourquoi)

- **`aria-label` (319)** : lus par un lecteur d'écran (TalkBack), pas par Tata. La marchande non-lectrice n'utilise pas de lecteur d'écran — l'application parle elle-même. Jugés hors parcours vocal ; ils restent du texte d'interface (rail Manus / design), pas des phrases de Tata.
- **Toasts** (`toast.success(…)`) et libellés d'écran : affichés, jamais dits. Hors inventaire vocal.
- **`texteDyu`** de `loginVoiceScript.ts` : traduction dioula de travail, NON validée (le fichier le dit). Elle n'est ni activée ni reprise : Manus tranche.

## 9. Phrases critiques argent (rappel)

Marquées `€` en §4. Règle : une phrase est critique si elle vit dans un fichier d'argent (`machineEncaissement`, `grammaireEncaissement`, `relectureSpontanee`, `POSCaisse`, `CaisseContext`, `vendreVocalUnifie`, `fcfa`) ou si elle porte le vocabulaire d'argent (francs, valide, monnaie, rends, manque, compte juste, encaisse, doit, reçu, total, crédit, solde, montant, prix, payé).
