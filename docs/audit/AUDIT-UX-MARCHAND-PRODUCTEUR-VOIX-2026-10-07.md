# AUDIT UX — MARCHAND · PRODUCTEUR · VENTE VOCALE (re-état au 2026-10-07)

**Date :** 2026-10-07 · **Référence :** branche `dev` @ `5e773ae` (après lot primitives T8, R1-2..R1-5 fermés)
**Méthode :** audit **statique** de code — 3 explorations parallèles indépendantes (2-a marchand, 2-b producteur, 2-c vente vocale) + spot-checks de l'orchestrateur sur chaque site d'édition retenu (100 % confirmés par lecture directe) + re-état des constats de `AUDIT-UX-ROLES-2026-10-06.md`. Lecture seule. Protocole sandbox : bascules intempestives `dev↔main` neutralisées par re-checkout vérifié devant **chaque** commande (les lectures outils peuvent voir un état périmé — tout le contenu cité a été relu via bash sur `dev`).
**Périmètre :** routes `/marchand`, `/producteur`, wallet keiwa partagé, primitives `components/argent/`, pipeline voix complet (TTS + STT + haptique + gardes). **Hors périmètre :** identificateur (traité le 06/10), backoffice.
**Sévérité :** P0 = argent/erreur/perte de données possible · P1 = friction majeure · P2 = amélioration.

---

## 1. Synthèse exécutive

**Le socle du 06/10 a tenu.** Sur les 12 P0 de l'audit précédent, la grande majorité est corrigée et vérifiée (§2) : PaiementsPage masquée, cotisation et transfert sous relecture, voix ouverte aux 3 rôles (§8.1), porte keiwa restaurée, KPIs `statut` réparés, RecolteForm durci, Stocks PATCH-à-0 fermé. La caisse reste le standard de la maison.

**Il reste deux familles de ruptures :**

1. **La voix dit des choses que l'écran n'écrit pas — et inversement** (T7/ARG-17 non fermés hors caisse) : 9 handlers producteur dictent le message serveur BRUT (parfois un UUID) sans aucun toast ; 3 surfaces dictent un montant « 5 000 FCFA » que le moteur peut épeler chiffre par chiffre ; l'échec générique d'encaissement — au cœur de la caisse — est parlé mais jamais écrit ; le producteur ne sent rien (0 haptique) ; le muet, LA borne §8.1, est un état invisible (aucun réglage hors backoffice).
2. **Des flux d'argent marchand/producteur restent sous la garde atteinte par la caisse** : double-tap possible sur le PIN du MarchéVirtuel (= commandes dupliquées), pas de PIN sur le transfert keiwa, 4e copie PIN (`PinConfirmModal`) sans Radix ni relecture, annulation de commande producteur en un tap (BUG-009), revenus producteur à 4 définitions (BUG-010).

**Décompte restant : 0 nouveau P0 (les P0 détectés ci-dessous sont les résidus documentés des P0 06/10), 9 P1, ~12 P2.** La correction du jour (lots UX-7/UX-8, §6) ferme les P1 voix + les P1 argent marchand les plus dangereux.

## 2. Re-état des constats du 06/10 (preuves du jour)

| Constat 06/10 | Statut au 07/10 | Preuve `dev@5e773ae` |
|---|---|---|
| T2 PaiementsPage morte (M-P0-1) | ✅ CORRIGÉ | `PaiementsPage.tsx:18` drapeau, `:88` redirect, porte retirée `WalletPage.tsx:597` |
| Cotisation 25 000 F un tap (M-P0-2) | ✅ CORRIGÉ | `MaCooperative.tsx:365-377` RelectureArgent+PIN, verrou `:88`, `/auth/pin/verify` `:100`, montant dérivé `:23-28` |
| Transfert irréversible (M-P0-3) | 🟡 PARTIEL | Relecture+verrou+vibrations ✅ (`TransfertPage.tsx:40,112,132,139,482-497`) ; **PIN ✗** (aucune prop pin passée) ; **404≠réseau ✗** (`:78-86`) |
| T1 voix muette hors marchand | ✅ CORRIGÉ (§8.1) | `AppContext.tsx:727-748` — gate retiré, muet seul borne (`:738-739`) ; Tata monté producteur (`routes.tsx:98`, `AppLayout.tsx:117,141-143`) |
| Porte keiwa marchand (M-P1-2) | ✅ CORRIGÉ | `MarchandAccueilVoice.tsx:222` tuile « Mon argent » |
| Annonces MarcheVirtuel (M-P1-3) | ✅ CORRIGÉ (annonces) / ❌ modal PIN inline toujours (`MarcheVirtuel.tsx:1128-1145`), « Montant à payer » `:1138` |
| MesCommandes 6 catch muets écrits (M-P1-4) | 🟡 PARTIEL | garde hors-ligne ✅ (`:194-269`) ; les 6 catch non-réseau dictent le message brut SANS toast (`:198-280`) |
| Tontines vide ≠ erreur (M-P1-5) | ❌ PRÉSENT | `Tontines.tsx:54` `.catch(() => setTontines([]))` → « Aucune tontine » `:79` |
| DepenseForm console+speak seul (M-P1-6) | ❌ PRÉSENT | `DepenseForm.tsx:120` |
| Revenus fabriqués (P-P0-2) | 🟢 ESSENTIELLEMENT CORRIGÉ | filtres vivants `:89-104`, enAttente réel `:110-113`, typo `'recu'` réparée `:119,350`, transactions = commandes `:114-124` ; restent : graphique index→montant `:126-128`, KPI « Croissance » = string `:264-271`, Exporter sans handler `:313-320` |
| Stocks PATCH-à-0 (P-P0-3) | ✅ CORRIGÉ (noyau) | garde `Number.isFinite` + draft onBlur `Stocks.tsx:467-471,908-917` ; reste le dialogue de suppression sous le modal (`z-50` `:974` vs `z-[200]` `:862`) |
| KPIs status/statut (P-P1-7) | ✅ CORRIGÉ | `ProductionKPIBar.tsx:71-77` ; RecolteDetailModal mappé `:16-23,60-63` |
| RecolteForm saisie fragile (P-P1-1) | 🟡 PARTIEL | confirmation backdrop ✅ `:259-265`, conversion d'unité ✅ `:571-577` ; **photo base64 non compressée ✗** (`:228-234`) |
| Validations parlées seules PublierRecolte (P-P1-5) | ✅ CORRIGÉ | `PublierRecolte.tsx:73-97` toast+speak, `isSubmitting` `:330-336` |
| Vente directe stepper ±1 (P-P1-3) | ❌ PRÉSENT | `CommandesProducteurPage.tsx:1278-1305,1366-1371` ; promesse non tenue `:1157` |
| Annulation un tap (P-P1-4 / BUG-009) | ❌ PRÉSENT | `:1642-1686` — 2 boutons, sans confirmation ni raison |
| Double publication vente directe (P-P1-5) | ❌ PRÉSENT | `ajouterCommande` sans verrou `:569-619` |
| Offline absent producteur (P-P1-6 / BUG-008) | ❌ PRÉSENT | 0 `isOnline` dans le rôle, POST directs |
| Scanner QR + « ✗ Rejeté » (P-P1-9) | ❌ PRÉSENT | `WalletPage.tsx:189-401` sans décodage ; `:958-959` tout ≠ completed → Rejeté |
| computeRevenus unique (P-P0-4 / BUG-010) | ❌ PRÉSENT | 4 définitions client vivantes (`ProducteurContext.tsx:605-614`, `CommandesProducteurPage.tsx:459-464`, `:1799-1804`, `ProductionKPIBar.tsx:75-77,103`) + `cloturee→annulee` à l'API `:497` |

## 3. La vente vocale — carte et frictions

**Le pipeline est bon et souverain** (à ne pas casser) : TTS unique `AppContext.speak` (`:726-757`, §8.1, muet = seule borne, niveau de voix B5 qui ne tait jamais l'argent) ; STT 100 % local sherpa-onnx (`useVoiceCore.ts:838-955`, vocabulaire fermé `localIntent.ts`, chemin serveur abandonné) ; VAD adaptative au bruit du marché (`ecouteCaisse.ts:59-127` : silence 2 200 ms, plafond 12 s, marge +6) ; échecs de dictée TOUS parlés et guidés (`:885-935,1046-1064`) ; confirmation orale bornée (2 re-demandes max puis tactile `:897-906`) ; haptique maison `haptique.ts` (5 motifs, « attente » qui refuse de vibrer succès). La vente vocale marchand (MicroVenteCaisse → POSCaisse) est intégralement voircée : relecture dite et affichée depuis la même source, ARG-17, triple canal, file offline idempotente.

**Frictions restantes (F-V) :**
- **F-V1 (P1, T7 caisse)** — l'échec générique d'encaissement est parlé mais jamais écrit : `POSCaisse.tsx:552` (`direMessage('TATA_VENTE_ECHEC')` sans toast ; la branche 4xx, elle, écrit `:547-551`). Mêmes trous : `AjoutProduitGuide.tsx:209-212`, `MicroVenteCaisse.tsx:675-677`. En mode « lecture » (guidage vocal off), l'échec est TOTALEMENT muet.
- **F-V2 (P1, T7 producteur)** — 9 handlers dictent le message serveur BRUT sans toast : `CommandesProducteurPage.tsx:318,334,351,364,516,609,1550,1653,1674` (+ apparié mais brut `:379`) ; 2 UUID dictés (`:314,776`) ; phrase encaissement ≠ toast (`:2426-2428`).
- **F-V3 (P1, ARG-17)** — montants dictés en chiffres : `CommandesProducteurPage.tsx:344`, `MarcheVirtuel.tsx:462` et `:504-506`, `Stocks.tsx:280` — le mécanisme existe (`nombreEnMotsFr`, VOIX-09) mais n'a pas été posé sur ces sites.
- **F-V4 (P1)** — le muet §8.1 est invisible : `toggleVoiceMuted` (AppContext:320) n'est exposé dans AUCUN écran utilisateur (seul le backoffice lit l'état) ; Paramètres ne propose que « Moins bavard ». Une app silencieuse sans explication.
- **F-V5 (P1)** — 0 haptique producteur : ni `vibrerSucces` sur « Paiement encaissé » (`:2424-2431`) ni `vibrerErreur` — en bruit de marché, l'argent encaissé ne se SENT pas.
- **F-V6 (info, baseline préservée)** — les 4 rouges héritées du garde voix-trace-source sont des ÉVOLUTIONS non re-bénies, pas des régressions : VOIX-08 (`useVoiceCore` : grammaire d'acquiescement — « ça » isolé ne valide plus une vente), VOIX-09 (`ObjectifContext` : montants parlés via catalogue i18n), bouton 🐞 Rapport (`AppLayout`, instrument de recette Patrick 28/09). `parole-entree` vert (7/7 §[7]) ; ré-bénédiction = décision Patrick.
- **F-V7 (bonus M)** — pas d'entrée parole de la récolte : RecolteForm/PublierRecolte sans micro alors que toute l'infrastructure offline existe (`BoutonDirePrix`, `intentLocal`) ; pas de « Tu as dit : … » + Réécouter hors caisse.

## 4. Argent marchand — restant

- **N-1 (P1, argent)** — double-tap sur « Valider » du PIN MarchéVirtuel → commandes dupliquées : `MarcheVirtuel.tsx:1140` sans verrou synchrone ni disabled (le défaut exact que BUG-002 a fermé sur TransfertPage). Même trou sur `handlePayment` (chemin sans PIN, `:445-470`, bouton `:1119`).
- **N-2 (P1)** — `PinConfirmModal.tsx` = 4e implémentation PIN (feuille custom sans Radix/AUTH-05, erreurs parlées seules `:62-89`, « verrou » 5 essais côté client) ; porte l'encaissement keiwa des commandes (`ReceptionPaiementModal.tsx:107,413-419`). Migration RelectureArgent+PinArgent = lot à part.
- **N-3 (P2)** — réponses réseau honnêtes manquantes : `MaCooperative.tsx:66,71`, `ProtectionSociale.tsx:58`, `MarcheVirtuel.tsx:225,127`, `HistoriquePage.tsx:193`+`WalletContext.tsx:98-100` (l'échec rend un vide).
- **N-4 (P2)** — « Montant à payer » + « Confirmer le paiement » dans le PIN MarchéVirtuel (`:1135,1138`) contredisent l'honnêteté du reste (le PIN CONFIRME la commande, il ne paie pas — invariant B2, commenté `:502-505`).
- **N-5 (P2)** — clearCart sans confirmation (`POSCaisse.tsx:1420,1454`) ; échec de transfert jamais dicté (`TransfertPage.tsx:136-140`) ; phrases voix wallet hors catalogue (`Recharge/WithdrawWalletModal`) ; jeton `--caisse-alerte` 3,2:1 inchangé à la source (`commerce.css:319`).

## 5. Argent producteur — restant

- **BUG-009 (P1)** : annulation irréversible en un tap, sans relecture ni raison (`:1642-1686`) — le pattern sain existe (`ModifierPublicationModal.tsx:223-262`).
- **BUG-010 (P0/P1)** : 4 définitions des revenus + `cloturee` envoyé comme `annulee` à l'API (`:497`) — fausse les stats ET contredit le modal Revenus qui compte `cloturee` comme encaissé.
- **Vente directe (P1)** : stepper ±1 sans plafond `stockDisponible` ni saisie directe ni verrou anti double-tap (`:569-619,1278-1305`).
- **P2** : dialogue suppression sous modal (`Stocks.tsx:974`), navigate `/producteur/revenus` mort (`:565`), `/producteur/publier-recolte` orpheline (`routes.tsx:106`), « Récupérer keiwa » (`:2162`), montants « 0K F » (`ProducteurModals.tsx:168-342`), photo base64 non compressée (`RecolteForm.tsx:228-234`), QR sans décodage + « ✗ Rejeté » (`WalletPage.tsx`).

## 6. Plan proposé — lots UX-7 à UX-10

| Lot | Contenu | Effort | Exécution |
|---|---|---|---|
| **UX-7 « La voix dit vrai »** | F-V1 (T7 caisse), F-V2 (T7 producteur + UUID), F-V3 (ARG-17), F-V4 (muet lisible), F-V5 (haptique producteur), échec de transfert dicté | S | **Fait le 07/10** (cette session) |
| **UX-8 « Argent marchand sous la garde »** | Verrou anti double-tap MarchéVirtuel (N-1) + PIN honnête (N-4) + TransfertPage trois situations + PIN conditionnel transfert (M-P0-3 complet) | S-M | **Fait le 07/10** ; reste migration `PinConfirmModal` (N-2) |
| **UX-9 « Argent producteur sous la garde »** | BUG-009 (annulation relue+confirmée), vente directe (plafond+saisie+verrou), BUG-010 (`computeRevenus()` unique + `cloturee≠annulee`) | S-M/M | À faire (décision §8.4 pour BUG-010) |
| **UX-10 « Réseau honnête »** | Tontines trois situations (fait), puis MaCooperative/ProtectionSociale/MarcheVirtuel/Historique + badge offline | S/M | Tontines fait ; reste en lot |
| **Bonus voix** | Diction de la récolte (RecolteForm + micro), bandeau « Tu as dit » + Réécouter uniformisés | M | Proposition (GO Patrick) |

Règle rappelée à écrire dans les conventions : **« tout ce qui est parlé doit être écrit, tout ce qui écrit doit être parlé »** — chaque `speak` d'erreur porte son `toast` (même phrase), chaque toast critique son `speak` ; les montants DITS passent par `nombreEnMotsFr` (jamais `toLocaleString` dans une phrase parlée).

## 7. Décisions à trancher (Patrick)

1. **Re-bénir les 4 divergences héritées** du garde voix (VOIX-08 grammaire d'acquiescement = correction d'un défaut de validation de vente ; VOIX-09 catalogue i18n ; bouton 🐞 à retirer quand le pilote est qualifié) — aujourd'hui la baseline les garde volontairement rouges.
2. **Migration `PinConfirmModal` → RelectureArgent+PinArgent** (N-2) : autorisée ? (touches l'encaissement keiwa des commandes — flux marchand sensible.)
3. **BUG-010** : choisir LA définition officielle du revenu producteur et corriger `cloturee→annulee` (`:497`) — impact contrats API.
4. **Offline producteur** (BUG-008) : outbox récolte/publication sur le pattern caisse — L, à planifier.
5. **Diction de la récolte** (bonus) : nouvelle fonctionnalité voix — GO ?

## 8. Limites de l'audit

- **Statique** : aucune exécution d'app ; TTS/STT non écoutés ; contrastes non recalculés.
- **Leçon d'outillage consignée** : l'agent 2-c a signalé « erreur de syntaxe » sur `TantieSagesseModal.tsx:73` — FAUX POSITIF provoqué par l'artefact de transport de la sandbox (les séquences « `[m` sont avalées à l'AFFICHAGE : `const [mode, setMode]` s'affiche `const ode, setMode]`). Vérifié à 3 niveaux : le pattern `const \[mode, setMode\]` matche bien (grep), tsc -b est vert à `5e773ae`, et l'agent 2-b avait déjà prouvé l'artefact à l'octet près (`od -c`) sur `WalletPage.tsx:189`. Règle : toute « erreur de syntaxe » vue en lecture distante se vérifie par grep-de-pattern + tsc avant d'être crue.
- Backend non lu : messages d'erreur réels des endpoints commandes (conditionne la formulation exacte des replis), statuts réels keiwa.
