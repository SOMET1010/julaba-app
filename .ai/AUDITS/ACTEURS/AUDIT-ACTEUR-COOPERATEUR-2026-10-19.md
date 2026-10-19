# AUDIT ACTEUR — COOPERATEUR — 2026-10-19

> **Mission** : 2e vague d'audits statiques par acteur (Task 45-b) — re-vérification de première main des constats du 05/10 (`AUDIT-ACTEUR-COOPERATEUR-2026-10-05.md`), des constats comptables C-02 et C-10 (`AUDIT-COMPTA-ACTEURS-2026-10-12.md`) et du delta 05/10→19/10.
> **Périmètre** : `frontend/src/app/components/cooperative/**` (10 composants), routes `/cooperative/*` (routes.tsx:119-136), `CooperativeContext.tsx`, MaCooperative/BesoinMarchand côté marchand ; backend `cooperatives-rest/` (contrôleur 970 l. + resolver), notifications/notify-member.
> **Méthode** : lecture directe du code `/home/z/julaba-wt` @ 04ae652 (dev) ; git log --since=2026-10-05 file par file ; tous les numéros de ligne relocalisés le 19/10. Auditeur statique, aucune écriture.
> **Auteur** : agent Z.ai Code Task 45-b — 2026-10-19.

## 1. Identité et périmètre

- **Rôle** : `cooperateur` (president/membre) — gère membres, trésorerie, cotisations, stock commun, besoins, commandes groupées, marché coopératif.
- **Frontend** : CooperativeHome, Membres (1 790 l.), TresorerieCooperative, FinancesCooperative, Stock, MarcheHub (~2 500 l.), Commandes, CooperativeModals + `CooperativeContext.tsx`.
- **Backend** : `cooperatives-rest.controller.ts` (970 l., +20 depuis le 05/10 via b5bea70), entités (cooperative, membre, transaction, stock, mouvement), `cooperative-resolver.service.ts`, `notifications.controller.ts` (notify-member).
- **Registres recoupés** : C-02 (CRITIQUE comptabilité) et C-10 (KPI sans filtre) — audit 12/10 ; aucun BUG-xxx dédié coopérative.

### Évolutions depuis le 05/10

Delta `git log --since=2026-10-05` sur le périmètre : **UN SEUL correctif applicatif** :
1. **07/10 `b5bea70` (cherry-pick 748b79b, fusionné via 265062e le 12/10)** : fix fonctionnel 404 — `trouverAdhesion()` accepte l'id UTILISATEUR ou l'id d'ADHÉSION sur PATCH statut/role et DELETE membre (cooperatives-rest.controller.ts:58-73, 517, 536). Correctif légitime mais **aucun des constats P0/P1 du 05/10 ni du C-02 n'est corrigé**.
2. Côté voix, le contexte général s'améliore (speak ouvert aux 3 rôles le 06/10, AppContext.tsx:726-748) — bénéfice indirect pour la coopérative.
3. Rien sur : trésorerie, cotisation, clôture, besoins/consolider, resolveUserCooperative, notify-member, MarcheHub, statuts commandes, a11y, charte. C-02 est **mot pour mot** celui du 12/10.

## 2. Fonctionnalités observées dans le code

| Domaine | État 19/10 | Preuve |
|---|---|---|
| Accueil | KPIs + alerte adhésions en attente (non annoncée) | CooperativeHome.tsx:142-157 |
| Membres | liste réelle + scores Jùlaba, strip PII, actions président réparées le 07/10 | cooperatives-rest.controller.ts:103-145, 58-73 |
| Trésorerie | INSERT `en_attente` + PATCH president `validee`/`annulee` — 2 requêtes séparées | :211-233, 235-257 |
| Besoins | consultation/agrégation, dispatch 2 étapes | :259-319, Commandes.tsx:245-294 |
| Stock commun | apport/distribution transactionnelles + journal append-only | :613-684, 686-780 |
| Marché | publication/retrait, commandes producteurs, clôture | MarcheHub.tsx, :807-834 |
| Cotisation | auto-validée, sans argent | :836-855 |
| Résolution coop | serveur (responsable OU adhésion) — statut d'adhésion ignoré | :75-88 |
| Resolver marché | `cooperative-resolver` filtre `actif=true` (contraste) | cooperative-resolver.service.ts:15-18 |

## 3. Constats détaillés

- **COOPERATEUR-00** : l'audit 28/09 reste partiellement validé (stock canonique + concurrence traités ; ledger trésorerie et traçabilité ouverts) — inchangé au 19/10.
- **COOPERATEUR-01 [P1] — TOUJOURS VALABLE** : `consoliderBesoins` accepte `body.cooperative_id` : `const cooperativeId = body.cooperative_id || coop.id` (cooperatives-rest.controller.ts:402) puis UPDATE dessus (l.404-420) — écriture cross-tenant toujours possible, contradiction maintenue avec createBesoin (:327-329 « jamais à un cooperative_id fourni par le client »).
- **COOPERATEUR-02 [P1] — TOUJOURS VALABLE** : `resolveUserCooperative` (l.75-88) ne lit jamais `cooperative_membres.statut` ni `actif` — membre suspendu/exclu conserve stock/trésorerie/besoins. Le code le documente lui-même à :886-887 (« resolveUserCooperative ne filtre pas par statut ») — auto-aveu inchangé. Contraste : le resolver du marché filtre `actif=true` (cooperative-resolver.service.ts:17).
- **COOPERATEUR-03 [P1] — TOUJOURS VALABLE** : `POST /notifications/notify-member` (`@Roles('cooperateur','marchand','producteur')`) envoie un message arbitraire à n'importe quel `memberId` SANS vérifier l'appartenance à la coopérative de l'appelant (notifications.controller.ts:121-140).
- **COOPERATEUR-04 [P1] — TOUJOURS VALABLE** : MarcheHub envoie `statut: 'acceptee'` (MarcheHub.tsx:964), `'refusee'` (:978), `'en_negociation'` + `prixNegocie` (:1742-1744) — tous hors `CommandeStatut` (en_attente|confirmee|en_livraison|livree|annulee|litige) → 400 systématique ; whitelist PATCH `['statut','dateLivraison','notes']` (commandes-rest.controller.ts:335-338) perd la négociation ; Commandes.tsx:49 définit un enum front parallèle (`brouillon|envoyee|confirmee|en_livraison|livree`) et le groupage (:222-226) exclut `en_attente` — commandes créées invisibles. BESOIN_STATUT_OPTIONS divergent aussi (:107).
- **COOPERATEUR-05 [P1] — TOUJOURS VALABLE** : le formulaire trésorerie envoie `vente_groupee|achat_groupe|commission|frais|subvention` (TresorerieCooperative.tsx:34,143-146) pendant que les KPIs comptent `categorie === 'vente'` et `'cotisation'` (CooperativeContext.tsx:231-240) — « Volume groupé » mort, KPI1 accueil à 0.
- **COOPERATEUR-06 [P1] — TOUJOURS VALABLE** (= C-10 volet coop) : `getTotalCotisations` et `volumeGroupe` comptent transactions `validee` **ET** `annulee` (CooperativeContext.tsx:231-235,240) — aucune filtre statut ; le solde serveur, lui, ne compte que `validee`.
- **COOPERATEUR-07 [P1] — TOUJOURS VALABLE** (= C-02 cœur) : `POST /cotisation` INSERT direct en statut **`validee`** + auto-attribution `cotisation_payee=true` (cooperatives-rest.controller.ts:845-854) — aucun rail de paiement, aucun mouvement wallet, montant non contrôlé (seulement `Number(body.montant || 0)`), **aucune idempotence** (double POST = deux écritures « validées »).
- **COOPERATEUR-08 [P1] — TOUJOURS VALABLE** : le PATCH membres/:id/statut accepte `motif?: string` dans sa signature (l.517) mais ne le lit JAMAIS — `membre.statut = statut; save` (l.525-526), aucune colonne, aucune notification au membre ; le front affiche toujours « notification envoyée ».
- **COOPERATEUR-09 [P1] — TOUJOURS VALABLE** : 0 `role="dialog"`/`aria-modal`/focus trap dans tout `components/cooperative/` (grep 19/10) — 7 familles de modales custom (CooperativeModals, Membres, TresorerieCooperative, FinancesCooperative, MarcheHub…).
- **COOPERATEUR-10 [P1/P2] — TOUJOURS VALABLE** : hex littéraux persistants — Stock.tsx ×19, MarcheHub ×17, Commandes.tsx ×11, Membres.tsx ×10, CooperativeHome ×3 (grep `#2072AF|#2E7D32|#00563B` 19/10) ; aucune charte/garde CI sur l'espace coopérative.
- **COOPERATEUR-11 [P2] — TOUJOURS VALABLE** : dispatch besoin = PATCH (commit immédiat) PUIS distribution (Commandes.tsx:245-294) ; le bon point `persisted === true` est maintenu (l.294-298) mais l'échec de distribution après PATCH laisse le besoin « dispatché » — non atomique.
- **COOPERATEUR-12 [P2] — TOUJOURS VALABLE** : `DELETE /cooperatives/membres/:id` = `membreRepo.delete` dur (l.530-542) sans trace ni réalignement `estMembreCooperative` (le commentaire :880-888 montre que ce flag gouverne la garde de route front).
- **COOPERATEUR-13 [P2] — TOUJOURS VALABLE** : `GET /cooperatives/:id` = `repo.findOne({ where: { id } })` sans garde de périmètre (l.931-933) — seule lecture non scopée du contrôleur (PATCH :id, lui, vérifie le responsable l.961-968).
- **COOPERATEUR-14 [P2] — TOUJOURS VALABLE** : `e.message` brut renvoyé au client : besoins :355, :389, :424, clôture :832, cotisation :857 — fuite d'erreurs SQL.
- **COOPERATEUR-15 [P2] — TOUJOURS VALABLE** : besoins sans DTO : `statut` libre à la création (l.348) et en PATCH (l.370), ce dernier SANS exigence president (l.360-391) — un membre peut s'auto-marquer `livre`.
- **COOPERATEUR-16 [P2] — TOUJOURS VALABLE** : cibles 40 px en série (CooperativeModals.tsx:139,243,339,405,489 `w-10 h-10`), pagination/drawer Membres inchangés.
- **COOPERATEUR-17 [P2] — TOUJOURS VALABLE** : alerte « X adhésions en attente » sans `role="status"` (CooperativeHome.tsx:142-157) ; formulaires sans aria-invalid.
- **COOPERATEUR-18 [P3] — TOUJOURS VALABLE** : `voiceLecture` toujours neutralisée « causait boucle audio infinie » (MarcheHub.tsx:883-886) — atténué par le speak désormais actif pour le rôle, mais le plus grand écran reste sans lecture propre.
- **COOPERATEUR-19 [P3] — TOUJOURS VALABLE** : `ensureCooperativeBesoinsTable` (DDL à la demande) exécuté sur chaque appel besoins (l.264, 326, 362, 398).
- **COOPERATEUR-20 [P3] — TOUJOURS VALABLE** : `getRoleConfig('cooperative')` (CooperativeHome.tsx:46, 86, 159) vs role `cooperateur` ailleurs — vocabulaire de rôle mélangé.
- **C-02 [CRITIQUE] — TOUJOURS VALABLE EN ENTIER** : (a) clôture `UPDATE commandes SET statut_paiement='paye'` sans AUCUN mouvement wallet ni contrôle du mode (:807-819) ; (b) cotisation auto-validée sans argent ni idempotence (:836-855) ; (c) trésorerie INSERT(:226-231)+PATCH(:249-254) en deux requêtes non transactionnelles, sans plafond, sans `validated_by`, sans historique de statut. **Rien n'a changé depuis le 12/10** (preuve : le contrôleur n'a reçu QUE b5bea70).
- **C-16 [P2] — TOUJOURS VALABLE** (transverse) : escrow fantôme inchangé (wallets.service.ts:395-510 sans appelant ; WalletContext.tsx:118-119).

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | État 05/10 → 19/10 |
|---|---|---|---|---|
| C-02 | Argent coopératif déclaratif (cotisation/clôture/trésorerie) | Intégrité argent | P0 | Toujours valable |
| COOPERATEUR-01 | IDOR consoliderBesoins cross-coop | Autorisation | P1 | Toujours valable |
| COOPERATEUR-02 | Membre suspendu = droits complets | Autorisation | P1 | Toujours valable |
| COOPERATEUR-03 | notify-member non vérifié | Spam/phishing | P1 | Toujours valable |
| COOPERATEUR-04 | Statuts commandes divergents (400) | Intégrité fonctionnelle | P1 | Toujours valable |
| COOPERATEUR-05/06 | KPIs argent morts/faux (C-10) | Intégrité argent | P1 | Toujours valable |
| COOPERATEUR-07 | Cotisation sans paiement, non idempotente | Intégrité argent | P1 | Toujours valable |
| COOPERATEUR-08 | Motif suspension perdu | Traçabilité | P1 | Toujours valable |
| COOPERATEUR-09/16 | Modales hors normes, cibles 40 px | A11y | P1/P2 | Toujours valable |
| COOPERATEUR-10 | ~64 hex hors charte | Design system | P1/P2 | Toujours valable |
| COOPERATEUR-11..15, 17 | dispatch/delete/IDOR/SQL/besoins/ARIA | P2 | P2 | Toujours valable |
| COOPERATEUR-18..20 | voix MarcheHub, DDL, rôle | P3 | P3 | Toujours valable |

## 5. Points forts

1. **distribution() reste exemplaire** : transaction SQL + verrou pessimiste, stock jamais négatif, journal append-only, notifications post-commit, contrat `persisted:true` (:686-780) — le meilleur code du rôle, à répliquer sur trésorerie/cotisation.
2. **Apport de stock commun transactionnel** avec verrou (:613-684).
3. **Le seul correctif 07/10 est propre** : `trouverAdhesion` garde le contrôle « président de cette coopérative » et le test de cross-coop (404) est maintenu (b5bea70).
4. **PII maîtrisée** : `stripSensitiveUserFields` sur la liste membres + scores calculés en lot (:130-143).
5. **Attachement serveur** : createBesoin ignore le cooperative_id client (:327-329) ; mutations membres/saisie trésorerie président-only (:219, 246, 520).
6. **CooperativeResolverService** : source de vérité unique pour le marché coopératif avec filtre `actif=true` (cooperative-resolver.service.ts) — le pattern à généraliser à resolveUserCooperative.
7. **create() dureci** : 409 propre sur responsable unique + filet course concurrente (:935-958).
8. **Contexte voix amélioré** : speak ouvert aux 3 rôles (06/10) — les annonces de validation/suspension redeviennent audibles.

## 6. Recommandations de correction

1. **P0 (C-02, inchangé)** : comptabiliser la coopérative — cotisation transactionnelle + idempotente + `en_attente` (ou rail Keiwa) ; clôture exigeant un mouvement wallet ou statut distinct `declare_paye` ; trésorerie atomique avec plafond + `validated_by` + historique.
2. **P0** : COOPERATEUR-01 — supprimer `body.cooperative_id` de consoliderBesoins (miroir createBesoin). **P0** : COOPERATEUR-02 — vérifier `statut='actif'` dans resolveUserCooperative (le resolver existe déjà pour le marché).
3. **P0** : COOPERATEUR-04 — aligner l'enum front sur le backend, mapper `en_attente` dans le groupage, abandonner la négociation fantôme.
4. **P1** : COOPERATEUR-03 (vérifier l'appartenance + rate-limit) ; -05/06 (union de catégories unique + filtre `validee`) ; -07 ; -08 (persister le motif, notifier le membre).
5. **P1** : Radix Dialog + charte coopérative fermée (budget hex 0, modèle authCharte) + garde cibles ≥44 px.
6. **P2** : dispatch atomique, trace adhésion (soft-delete), scoper GET :id, messages d'erreur génériques, whitelist statuts besoins + president.
7. **P3** : réactiver/brancher la voix du MarcheHub via audioManager, migrer la table besoins en migration TypeORM, unifier le nom de rôle.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Argent | double POST /cotisation | une seule écriture, statut en_attente (échoue) |
| Argent | clôture d'une commande livrée | statut `paye` seulement si mouvement wallet (échoue) |
| Trésorerie | validation + crash entre INSERT et PATCH | cohérence du solde (non garanti) |
| KPI | 1 cotisation validée + 1 annulée | total ne compte que la validée (échoue) |
| IDOR | consolider avec cooperative_id étranger | refus (échoue) |
| Autorisation | membre suspendu → POST stock/apport | 403 (échoue) |
| Commandes | créer → accepter → livrer → clôturer | 0×400 (échoue : enum divergent) |
| Membres | suspension avec motif | motif persisté + notification au membre (échoue) |
| A11y | modale « Ajouter un marchand » au clavier | focus trap + ESC (échoue) |

## 8. Tests critiques recommandés

1. Invariant comptable coopérative (style invariants CI) : solde trésorerie = Σ(validees) après 100 PATCH concurrents.
2. IDOR : POST besoins/consolider avec cooperative_id d'une autre coop → refus (échoue).
3. Membre `suspendu` → GET/POST stock, membres, trésorerie → 403 (échoue).
4. Cycle commande complet coopérative avec l'enum backend exact (0×400 — échoue).
5. Clôture → vérifier UN mouvement wallet OU statut `declare_paye` (échoue : « paye » gratuit).
6. notify-member vers un userId hors coop → 403 (échoue).
7. PATCH besoins/:id statut=livre par simple membre → 403 après durcissement.
8. KPI accueil après vente groupée validée + annulée → volume exact.
9. Clavier seul sur les 7 familles de modales (focus trap, ESC, retour focus).
10. Régression b5bea70 : PATCH statut par id utilisateur ET par id adhésion, cross-coop refusée (doit rester vert).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | C-02 : comptabilisation trésorerie/cotisation/clôture (+ invariant CI) | L |
| P0 | COOPERATEUR-01 : fermer l'IDOR consoliderBesoins | S |
| P0 | COOPERATEUR-02 : statut d'adhésion vérifié dans resolveUserCooperative | S |
| P0 | COOPERATEUR-04 : réalignement des statuts commandes front↔back | M |
| P1 | COOPERATEUR-03/05/06/07/08 : notify-member, catégories, KPIs, cotisation, motif | M |
| P1 | COOPERATEUR-09/10/16 : Radix Dialog + charte fermée + cibles 44 px | L |
| P2 | COOPERATEUR-11/12/13/14/15 : atomique, trace, scope, erreurs, validation | M |
| P3 | COOPERATEUR-18/19/20 : voix MarcheHub, migration DDL, rôle | S/M |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité | 45/100 | Modales sans focus trap/ARIA, ~15 cibles < 44 px, alertes non annoncées — inchangé ; bénéfice indirect speak |
| Sécurité | 60/100 | Scoping/sanitisation solides ; IDOR inter-coop, membre suspendu actif, notify-member ouvert — inchangé |
| Argent/intégrité | 50/100 | C-02 mot pour mot : cotisation/clôture sans argent, trésorerie non atomique, KPI faux ou morts (C-10) |
| Voice-first | 50/100 | speak désormais actif pour le rôle (+) mais MarcheHub muet, aucun clip coopérative |
| Qualité code | 62/100 | distribution() modèle, resolver propre, fix 07/10 testé ; fichiers géants, 3 unions dupliquées, DDL à la demande |
| **Global** | **54/100** | Identique au 05/10 : le seul commit applicatif (b5bea70) ne touche aucun constat |

## 11. Conclusion + statut

Entre le 05/10 et le 19/10, l'espace coopérative a reçu **exactement un correctif applicatif** (b5bea70, le 404 des actions membres) et zéro traitement des constats : C-02 est vérifiable ligne à ligne à l'identique (clôture :807-819, cotisation :836-855, trésorerie :226-257), l'IDOR de consolidation (:402), la rétention de droits des membres suspendus (:75-88, auto-documentée), la notify-member ouverte (notifications.controller.ts:121-140) et la désynchronisation des statuts de commande (MarcheHub:964/978/1742) sont tous en l'état. Le verdict de l'audit comptable du 12/10 (« chaîne D — NON PRÊT POUR DE L'ARGENT RÉEL, 40/100 ») reste le bon : l'argent coopératif est déclaratif, non atomique, non idempotent. Les points d'appui réels (distribution transactionnelle, resolver actif, sanitisation) sont précisément les patterns à déployer sur le reste.

**Statut : AUDIT COMPLET — NON CONFORME pour PROD (54/100 < 60, inchangé). Blocants inchangés : C-02 (argent déclaratif) puis COOPERATEUR-01/02/04.**
