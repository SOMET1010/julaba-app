# AUDIT ACTEUR — PRODUCTEUR — 2026-10-19

> **Mission** : 2e vague d'audits statiques par acteur (Task 45-b) — re-vérification de première main des constats du 05/10 (`AUDIT-ACTEUR-PRODUCTEUR-2026-10-05.md`), des constats comptables transverses (`AUDIT-COMPTA-ACTEURS-2026-10-12.md` : C-08, C-10, C-16, M-06) et du delta 05/10→19/10.
> **Périmètre** : `frontend/src/app/components/producteur/**` (19 fichiers), `ProducteurContext.tsx`, routes `/producteur/*` (routes.tsx:98-118) ; backend `commandes-rest/`, `publications-rest/`, `recoltes-rest/`, `cycles-rest/`, `producteurs-rest/`, `producteur-rest/`, `revenus/`.
> **Méthode** : lecture directe du code sur `/home/z/julaba-wt` @ 04ae652 (dev) ; git log --since=2026-10-05 file par file ; AUCUNE confiance aux numéros de ligne des anciens audits (tous relocalisés). Aucune sonde runtime (auditeur statique).
> **Auteur** : agent Z.ai Code Task 45-b — 2026-10-19.

## 1. Identité et périmètre

- **Rôle** : `producteur` (+ `cooperateur` accepté sur POST /publications) — acteur terrain voice-first, public le plus peu-lecteur.
- **Frontend** : 19 composants (CommandesProducteurPage 2 479 l., RecolteForm 804 l., Revenus 427 l…), `ProducteurContext.tsx` (735 l.), services `api/`, 18 routes `/producteur/*`.
- **Backend** : commandes-rest (637 l. + StockReservationService), publications-rest (283 l.), recoltes-rest (93 l.), cycles-rest (93 l.), producteurs-rest, producteur-rest/producteur-stats, revenus.
- **Registres recoupés** : BUG-008/009/010 (OUVERTS, `.ai/BUGS.md:110-133`), C-08/C-10/C-16/M-06 (audit comptable 12/10).

### Évolutions depuis le 05/10

Delta `git log --since=2026-10-05` sur le périmètre : **8 commits** touchent le producteur, tous côté voix/écrans, **ZÉRO correctif serveur** sur commandes/publications/récoltes/cycles :
1. **06/10 `2e12cf6` fix(roles) UX-2/T1** : le garde `role !== 'marchand'` est SUPPRIMÉ de `AppContext.speak` — **PRODUCTEUR-01 (P0) CORRIGÉ** (AppContext.tsx:726-748 : seul `voiceMuted` borne désormais, commentaire cite l'audit UX 06/10).
2. **06/10 `060c333`** : Revenus.tsx réécrit (fin du graphique fictif), KPI commandes livrées, publication/stocks renforcés côté front, `roleConfig` corrigé.
3. **06/10 `aefc7fa`+`1c2f914`** : suppression des modules orphelis `producteur/cycles` + `producteur/recoltes` et DTOs morts (la « couche DTO morte » de PRODUCTEUR-08 est DÉTRUITE, pas recâblée).
4. **07/10 `eba2380`, `1f44736`, `5a56cb3`** : voix producteur — plus de messages serveur bruts ni d'UUID dictés (messageUtilisateur), montants en toutes lettres, vibrations succès/erreur sur l'encaissement.
5. Rien sur `commandes-rest` (hors renommage) : PRODUCTEUR-02/03 intacts.

## 2. Fonctionnalités observées dans le code

- **Accueil** : KPIs serveur `/producteur/stats` (kg/FCFA, `producteur-stats.controller.ts:30-67` — stock issu de `recoltes.stock_disponible` :34-37), greeting, 4 modales KPI.
- **Production** : cycles → récoltes → publications (ProducteurProduction 4 onglets) ; publication modal bornée au stock (PublierRecolteModal.tsx:18-47, `recolte_id` + `stockMax`) vs page PublierRecolte non bornée.
- **Déclarer une récolte** : unités locales, conversion prix→kg (RecolteForm.tsx:281-283), confirmation parlée (l.271), photo base64 (PublierRecolte.tsx:68).
- **Commandes** : demandes marchands (accepter/refuser/contre-proposer), livraison, encaissement Keiwa (handleRecupererPaiement, CommandesProducteurPage.tsx:395-413), vente directe adossée à une récolte, KPI « revenus » filtré sur `livree` (l.490-496).
- **Stocks/Revenus** : conversation Tantie sur Stocks, Revenus réécrit le 06/10 (historique = commandes réelles).
- **Encaissement serveur** : POST /commandes/:id/paiement — transaction unique, verrous pessimistes commande+2 wallets, `assertCompteActif` ×2, index unique partiel d'idempotence (commandes-rest.controller.ts:216-311) — **invariant K1 tenu, re-vérifié**.

## 3. Constats détaillés

- **PRODUCTEUR-01 [P0] — CORRIGÉ** (05/10 → 19/10 : ✅). Le garde rôle est levé : `speak` ne s'arrête plus que sur `voiceMuted` (AppContext.tsx:738-739). Les ~40 appels producteur sont désormais audibles ; encaissement annoncé + vibré (CommandesProducteurPage.tsx:399-410). Reste : 24 phrases non migrées en clips (voir -16).
- **PRODUCTEUR-02 [P1] — TOUJOURS VALABLE** : POST /commandes n'exige la propriété du vendeur QUE pour `vente_directe` (commandes-rest.controller.ts:88-94) ; `vendeur_id` accepté du client pour tout autre type (l.140-141) et `recolteId` de vente directe jamais vérifié comme appartenant au vendeur (l.100-102 ; `convertirRecolteDirecte` sans contrôle owner, stock-reservation.service.ts:158-170). IDOR inter-comptes inchangé.
- **PRODUCTEUR-03 [P1] — TOUJOURS VALABLE** : `total` validé `> 0` seulement, jamais comparé à `quantite × prixUnitaire` (commandes-rest.controller.ts:126-131) ; `statut` accepté dès la création (l.121-125, une commande peut naître `confirmee` et convertir le stock l.167-169) ; l'encaissement débite/crédite `cmd.total` (l.229) = prix client non recalculé. **C-08 confirmé**.
- **PRODUCTEUR-04 [P1] — TOUJOURS VALABLE** : POST /publications accepte `quantite_disponible` libre sans `recolte_id` ni plafond (publications-rest.controller.ts:108-141 — `recolte_id` ne sert qu'à marquer la récolte `validee` l.142-148) ; PublierRecolte.tsx:117 envoie toujours sans récolte.
- **PRODUCTEUR-05 [P1] — TOUJOURS VALABLE** : DELETE durs sans trace ni contrôle de dépendances : cycles-rest.controller.ts:65-69, recoltes-rest.controller.ts:87-91, publications-rest.controller.ts:258-264, stocks-rest.controller.ts:~264-271. Contre règle §8.6 « rien n'est jamais supprimé ».
- **PRODUCTEUR-06 [P1] — CORRIGÉ EN GRANDE PARTIE** (05/10 → 19/10 : ⚠️ résidu) : le graphique fictif 450 k→1 150 k a DISPARU — `donneesGraphique` dérivé des commandes réelles (Revenus.tsx:126-128), `enAttente` réel (l.112-114), historique = commandes (l.115-125), « Croissance +0% » remplacé par « Commandes » (l.265). **Résidus** : `revenuTotal = stats.revenusTotal` (l.88) reste alimenté par le repli du contexte qui compte TOUTES les commandes non annulées, y compris `en_attente`/`confirmee` (ProducteurContext.tsx:611-614) = **BUG-010 toujours valable** ; axe du graphique positionnel (jour 1..7 = index, pas des dates).
- **PRODUCTEUR-07 [P1] — TOUJOURS VALABLE** : 0 `role="dialog"`, 0 `aria-modal`, pas de focus trap dans tout `components/producteur/` (grep négatif 19/10) — modales custom `motion.div` (CommandesProducteurPage, ProducteurModals, MesRecoltesPage:66-74…).
- **PRODUCTEUR-08 [P2] — TOUJOURS VALABLE** (nuance) : `statut` récolte libre (recoltes-rest.controller.ts:77), `statut` publication libre (publications-rest:242), `status` cycle libre (cycles-rest:36) → 500 sur enum PG. La couche DTO morte a été supprimée le 06/10 (aefc7fa) : le code mort est parti, la validation n'existe toujours pas.
- **PRODUCTEUR-09 [P2] — TOUJOURS VALABLE** : aucun `@Roles`/RolesGuard sur cycles/recoltes/publications/revenus (imports vérifiés) ; scoping `user.id` systématique (défense en profondeur absente, pas de fuite constatée).
- **PRODUCTEUR-10 [P2] — TOUJOURS VALABLE** : `cycleId: body.cycle_id || null` sans vérification d'appartenance (recoltes-rest.controller.ts:51).
- **PRODUCTEUR-11 [P2] — TOUJOURS VALABLE** : Stocks.tsx:93-107 lit la table `stocks` pendant que KPIs/réservations portent sur `recoltes.stock_disponible` (producteur-stats.controller.ts:34-37) — deux vérités stock.
- **PRODUCTEUR-12 [P2] — TOUJOURS VALABLE** : fermeture modale 36 px (MesRecoltesPage.tsx:70 `w-9 h-9`) ; garde CI test-cible-tactile toujours hors producteur.
- **PRODUCTEUR-13 [P2] — TOUJOURS VALABLE** (progrès mineur) : 2 `htmlFor` seulement (PublierRecolte.tsx:320, ModifierPublicationModal.tsx:145), le reste des formulaires sans labels associés ni `role="alert"` ; erreurs = toast+speak (le speak vit désormais, ce qui atténue l'impact).
- **PRODUCTEUR-14 [P2] — TOUJOURS VALABLE** : 4 `aria-label` dans 19 fichiers (grep 19/10).
- **PRODUCTEUR-15 [P2] — TOUJOURS VALABLE** : **BUG-008 OUVERT** (BUGS.md:110-118) — `createRecolte` POST direct sans outbox (ProducteurContext.tsx:351-371), échecs réseau avalés `console.warn` (l.212, 367) ; l'outbox de la caisse (eventReplayBuffer) n'a pas été étendue au producteur par les retours terrain PIE du 07/10 (A2 = file de la caisse uniquement).
- **PRODUCTEUR-16 [P2] — TOUJOURS VALABLE** : PROD_001… toujours `statut: 'a_migrer'` (i18n/voice/catalog.ts:362-376) ; atténué par la voix TTS rendue effective et les montants en toutes lettres (1f44736).
- **PRODUCTEUR-17 [P2] — TOUJOURS VALABLE** : photo en data-URL base64 (PublierRecolte.tsx:68) vs Cloudinary côté commandes — stratégie mixte inchangée.
- **PRODUCTEUR-18 [P2] — TOUJOURS VALABLE** : hex littéraux partout (`#00563B` Revenus.tsx:136,199,299,406 ; `#2E8B57`/`#4CAF50` CommandesProducteurPage:1670 ; 50+ occurrences dossier) ; aucune charte/garde producteur.
- **PRODUCTEUR-19 [P3] — TOUJOURS VALABLE** : /revenus somme `prixUnitaire × quantite` de TOUTES les récoltes (revenus.controller.ts:14-15) — contradictoire et quasi orphelin.
- **PRODUCTEUR-20 [P3] — TOUJOURS VALABLE** : `localisation` saisie et envoyée par RecolteForm (l.292) mais abandonnée par ProducteurContext.createRecolte (l.353-368 : le POST ne la contient pas).
- **PRODUCTEUR-21 [P3] — TOUJOURS VALABLE** : 26 `console.*` sur producteur+cooperative (grep 19/10) ; warnDev non étendu.
- **PRODUCTEUR-22 [P3] — TOUJOURS VALABLE** : `/publications/marche` joint prénom/nom/commune (publications-rest:60-63) ; `/producteurs/recoltes-prevues` liste noms nationwide (producteurs-rest:77-92). Pas de téléphone/email (vérifié).
- **C-16 [P2] — TOUJOURS VALABLE** : `blockFunds/releaseFunds/refundFunds` sans AUCUN appelant (wallets.service.ts:395,436,476 ; grep codebase 19/10) ; WalletContext renvoie un faux escrow et logge « bloquerArgent non implémenté — endpoint /escrow manquant » (WalletContext.tsx:118-119).
- **M-06 / BUG-009 [P1] — TOUJOURS VALABLE** : « Annuler la commande » déclenche `cancelCommande` immédiatement, sans confirmation ni raison ni verrou (CommandesProducteurPage.tsx:1681-1693 et 1704-1716 — le `isUpdatingStatut` ne protège pas ces boutons).

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | État 05/10 → 19/10 |
|---|---|---|---|---|
| PRODUCTEUR-01 | Parcours muet | Voice-first | P0 | **CORRIGÉ** (2e12cf6) |
| PRODUCTEUR-02 | IDOR vendeur_id/récolte | Autorisation | P1 | Toujours valable |
| PRODUCTEUR-03 | Prix d'encaissement client (C-08) | Intégrité argent | P1 | Toujours valable |
| PRODUCTEUR-04 | Offres sans stock réel | Intégrité marché | P1 | Toujours valable |
| PRODUCTEUR-05 | DELETE durs sans trace | Conformité §8.6 | P1 | Toujours valable |
| PRODUCTEUR-06 | Chiffres fictifs | Intégrité argent | P1 | Corrigé (résidu BUG-010) |
| PRODUCTEUR-07 | Modales hors normes a11y | A11y | P1 | Toujours valable |
| BUG-009 (M-06) | Annulation sans confirmation | UX argent | P1 | Toujours valable |
| BUG-008 (M-06) | Récolte perdue hors ligne | Offline | P1 | Toujours valable |
| PRODUCTEUR-08..18 | validation/gardes/stock/clip/hex | P2 | P2 | Toujours valable |
| PRODUCTEUR-19..22, C-16 | revenus/localisation/console/PII/escrow | P3-P2 | P3 | Toujours valable |

## 5. Points forts

1. **Encaissement Keiwa bancaire re-vérifié** : transaction unique, 3 verrous pessimistes, `assertCompteActif` ×2, index unique d'idempotence (commandes-rest.controller.ts:216-311) — K1 tenu.
2. **Réservations de stock exemplaires** : idempotence par `commande_id`, `FOR UPDATE`, refus 409, libération à l'annulation (stock-reservation.service.ts:23,45,97,169).
3. **Scoping propriétaire systématique** : `user_id` dans toutes les requêtes cycles/récoltes/publications/stats.
4. **La voix est rendue au producteur** (06/10) puis durcie le 07/10 : messages d'erreur 4xx dits humains (messageUtilisateur), montants en toutes lettres, triple canal voir/entendre/sentir sur l'encaissement.
5. **Revenus.tsx honnête depuis le 06/10** : plus aucun chiffre inventé, « en attente » réellement calculé.
6. **Vente directe** : garde serveur récolte obligatoire + keiwa interdit sans consentement (commandes-rest.controller.ts:96-112).
7. **Fail-closed marché** : sous-profil détaillant → vide par défaut (publications-rest:99-104).

## 6. Recommandations de correction

1. **P1 (inchangées du 05/10, toujours à faire)** : dériver `vendeurId` de la publication et recalculer `total = quantite × prix_unitaire` serveur (PRODUCTEUR-02/03=C-08) ; exiger `recolte_id` + plafond sur POST /publications (-04) ; remplacer les DELETE durs par archive tracée (-05).
2. **P1** : BUG-010 — séparer `revenusTotal` (encaissé/livré) de « en attente » dans ProducteurContext et Revenus ; BUG-009 — modale de confirmation + verrou avant annulation.
3. **P1** : Radix Dialog sur les modales producteur (modèle AUTH-05).
4. **P2** : recâbler une validation (DTO) sur les *-rest ; `@Roles('producteur','cooperateur')` sur POST cycles/récoltes ; vérifier `cycle.user_id`.
5. **P2** : outbox producteur (modèle caisse) pour récolte/publication/commande — c'est le chantier BUG-008, le seul « retour terrain » qui manque au producteur.
6. **P2** : migrer les 24 PROD_* en clips ; labels/aria-label/cibles ≥44 px ; charte jetons + garde CI.
7. **P3** : supprimer /revenus ou l'aligner ; propager la localisation ; warnDev ; décider du sort de l'escrow fantôme (ADR avant implémentation).

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Voix | déclarer une récolte yeux fermés | confirmation audible (✅ depuis 06/10, à recetter terrain) |
| IDOR | commande avec vendeur_id tiers | refus serveur (échoue) |
| Argent | encaissement à prix falsifié | recalcul serveur (échoue) |
| Argent | rejeu ×2 du paiement Keiwa | un seul mouvement (tenu, K1) |
| Marché | publication sans récolte | refus/plafond (échoue) |
| Trace | suppression d'une récolte publiée | 409 ou archive (échoue) |
| Offline | récolte sans réseau | mise en file + rejeu (échoue) |
| UX argent | annulation commande | confirmation + verrou (échoue) |
| A11y | modale au clavier | focus trap + ESC (échoue) |

## 8. Tests critiques recommandés

1. Re-test vocal complet du parcours déclarer-récolte (le P0 est corrigé au code — à valider à l'oreille, recette 06/10 non tracée dans BUGS.md).
2. POST /commandes total=1 FCFA pour 1 000 kg → recalcul/refus (échoue).
3. POST /commandes vendeur_id tiers hors vente directe → 403 (échoue).
4. POST /publications quantite_disponible=99999 sans récolte → refus (échoue).
5. Rejeu ×2 POST /commandes/:id/paiement → un seul couple débit/crédit (tenu).
6. Revenus : 1 commande en_attente de 100 k → « Revenu total » ne doit PAS la compter (échoue : BUG-010).
7. Hors ligne : récolte saisie puis réseau coupé → file d'attente rejouée (échoue : BUG-008).
8. Double-tap « Annuler la commande » → une seule annulation, précédée d'une confirmation (échoue).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | C-08/PRODUCTEUR-02/03 : recalcul serveur + dérivation vendeur (commandes) | M |
| P1 | PRODUCTEUR-04 : plafond publication ≤ récolte | M |
| P1 | PRODUCTEUR-05 : archive tracée au lieu des DELETE | S |
| P1 | BUG-009/010 : confirmation annulation + revenus par statut | S |
| P1 | PRODUCTEUR-07 : Radix Dialog | L |
| P2 | Outbox producteur (BUG-008) + clips PROD_* | M |
| P2 | DTO/@Roles/cycle_id + a11y (labels, cibles) | M |
| P3 | /revenus, localisation, warnDev, escrow fantôme | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité | 56/100 | Voix rendue au rôle (+), 2 htmlFor et alertes parlées (+), mais modales sans focus trap, 36 px, aria quasi absent — inchangé |
| Sécurité | 61/100 | Rien changé serveur : IDOR commande, total client, pas de garde de rôle, DELETE durs |
| Argent/intégrité | 64/100 | Revenus réels + KPI livré (+6), encaissement K1 tenu ; offres sans stock, prix non recalculé, annulation fragile |
| Voice-first | 63/100 | P0 corrigé + messages humains + montants dictés + vibrations (+28) ; 24 clips a_migrer, hors-ligne muet |
| Qualité | 66/100 | Ménage des modules morts, messageUtilisateur ; fichiers géants, console.*, hex littéraux |
| **Global** | **61/100** | Au-dessus du seuil PROD 60 pour la première fois — porté par la voix et la fin des chiffres fictifs |

## 11. Conclusion + statut

Une seule grande correction a touché l'acteur depuis le 05/10, mais c'est la bonne : **le P0 voix est fermé** (06/10) et toute la couche « parole » du producteur a été durcie le 07/10 (messages humains, montants en lettres, vibrations). L'écran Revenus ne ment plus. **Aucun correctif serveur** n'est passé sur commandes/publications/récoltes/cycles : les 4 P1 d'autorisation/intégrité du 05/10 (IDOR vendeur, prix non recalculé=C-08, offres sans stock, DELETE durs) sont exactement où ils étaient, preuve ligne par ligne ; les trois bugs ouverts du registre (BUG-008/009/010) n'ont pas bougé et l'outbox caisse des retours terrain PIE n'a pas été étendue au producteur. Le socle bancaire de l'encaissement (K1) et les réservations de stock restent exemplaires.

**Statut : AUDIT COMPLET — CONFORME SOUS CONDITIONS (61/100 > 60). Conditions : traiter les 5 P1 restants (C-08/02/03, -04, -05, BUG-009/010, modales) avant exposition terrain de l'argent réel ; la correction du P0 voix doit être recettée à l'oreille (aucune trace de recette dans les registres).**
