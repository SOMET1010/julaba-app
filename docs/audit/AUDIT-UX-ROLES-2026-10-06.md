# AUDIT UX — RÔLES MARCHAND · PRODUCTEUR · IDENTIFICATEUR

**Date :** 2026-10-06 · **Référence :** branche `dev` @ `05b2cbb` (après renommage `frontend/`, Phase 4 et SEC-07)
**Méthode :** audit **statique** de code — 3 explorations parallèles indépendantes (14-a marchand, 14-b producteur, 14-c identificateur) + spot-checks de l'orchestrateur sur les constats majeurs (3/3 confirmés par lecture directe) + synthèse dédupliquée. Lecture seule : zéro modification, zéro exécution d'app/APK.
**Périmètre :** routes `/marchand` (23), `/producteur` (18), `/identificateur` (23), wallet keiwa (partagé, inclus via le parcours marchand/producteur), layouts et socle transversal. **Hors périmètre :** backoffice, institution, coopérative en tant que rôle autonome.
**Sévérité :** P0 = argent/erreur/perte de données possible · P1 = friction majeure · P2 = amélioration.

**Décompte : 12 P0 (dont 1 transversal partagé), 21 P1, ~25 P2.** Les points forts sont nombreux et réels (§6) — le socle caisse est exemplaire ; les ruptures sont concentrées hors du périmètre déjà audité.

---

## 1. Synthèse exécutive

L'app est **deux produits différents selon le rôle**. Sur le parcours marchand — et spécifiquement la caisse — existe une culture UX d'exception : file hors-ligne fail-closed et idempotente, relecture parlée avant encaissement, triple canal voir/entendre/sentir, cibles 44 px argumentées dans le code. Les trois explorations convergent : **cette excellence ne s'est pas propagée aux deux autres rôles**, et même le parcours marchand laisse des surfaces d'argent *sous* la garde atteinte par la caisse.

Les cinq motifs qui reviennent dans les trois rôles (§2) :

| # | Motif transversal | Gravité |
|---|---|---|
| T1 | **La voix Tata est muette hors marchand** — le canal d'assistance principal d'un produit pensé pour des utilisateurs faiblement alphabétisés n'existe que pour un rôle sur trois | P0 |
| T2 | **Des UI promettent des paiements qui n'existent pas** — « Payer maintenant » sans appel réseau ; annonce de succès mobile money déclaratif | P0 |
| T3 | **Les erreurs réseau sont rendues comme des états vides ou des fautes d'identité** — « Aucun compte trouvé » hors ligne, « Aucune tontine » sur échec réseau | P1 |
| T4 | **Contrats front/back non alignés** — qualité de récolte perdue, statuts non mappés (« ✗ Rejeté » pour tout statut ≠ completed), KPIs toujours à 0, cinq définitions divergentes des « revenus » | P0/P1 |
| T5 | **IA fragmentée** — routes doublons, routes orphelines, wallet marchand sans porte, onglet nommé autrement que sa destination | P1 |

Top 5 par gravité : T1 (voix muette), T2 (faux paiements), cotisation coopérative 25 000 F en un tap sans confirmation ni PIN (M-P0-2), brouillon d'identification en `sessionStorage` tué par toute interruption Android (I-P0-1), « Reprendre le dossier » qui rouvre une fiche vierge et garantit le blocage téléphone (I-P0-2).

---

## 2. Constats transversaux

### T1 (P0) — La voix Tata est muette pour producteur et identificateur

**Preuve centrale (confirmée par l'orchestrateur) :** `frontend/src/app/contexts/AppContext.tsx:729-732`
```ts
if (user?.role !== 'marchand') vtrace.ttsIgnoree('AppContext.speak', text, 'role-non-marchand');
if (user?.role !== 'marchand') return;
```
- **Producteur :** ~40 appels `speak()` morts dans le rôle — confirmation d'enregistrement `RecolteForm.tsx:294`, échec `:301`, encaissement `CommandesProducteurPage.tsx:2428` (« Paiement encaissé »), erreurs de publication `PublierRecolteModal.tsx:29-38`, revenus `Revenus.tsx:105-107`. Pour une personne faiblement alphabétisée, le canal n'existe pas.
- **Identificateur :** 0 appel `speak()` dans les 16 fichiers du rôle ; bouton Tata rendu mais **inerte** — `IdentificateurLayout.tsx:28,36` monte `Sidebar`/`BottomBar` sans prop `onMicClick`, et `TantieSagesseModal` n'est montée que dans `AppLayout.tsx:143-147`. L'écran de code d'activation dit « Lis-le à voix haute » (`FicheIdentificationDynamique.tsx:2156`) sans le faire lui-même.
- **Marchand :** la voix existe mais se coupe au `voiceMuted` (`AppContext.tsx:733-734`) — or plusieurs écrans n'affichent l'erreur **qu'à** la voix (T7).

**Reco :** décision explicite — ouvrir `speak()` aux trois rôles (S : retirer la condition) ou assumer le tactile-only et retirer les appels morts + boutons inertes (M). Dans tous les cas : parité du montage Tata dans `IdentificateurLayout`.

### T2 (P0) — Des UI promettent des paiements qui n'existent pas

**PaiementsPage (Keiwa → « Paiements »), constaté indépendamment par les deux agents marchand et producteur, confirmé par l'orchestrateur :** `frontend/src/app/components/wallet/PaiementsPage.tsx:262-269`
```ts
onClick={() => { setModalService(null); setReference(''); setMontant(''); }}
```
L'unique action du modal (CNPS, CIE, SODECI, école…) est de **fermer le modal et vider les champs**. Aucun appel API, aucune validation (référence/montant vides acceptés), aucun reçu. Le CTA s'appelle « Payer maintenant » (l.268) sous un récap montant (l.253-260, `type="number"`). Impact : l'utilisateur croit avoir réglé sa facture — impayé réel, pénalités, défiance.

**Marché virtuel :** `MarcheVirtuel.tsx:448-455` — après validation du formulaire, annonce `Paiement de X francs CFA par ${label} effectué avec succès` alors que `createOrdersFromCart` ne crée que des commandes `en_attente` (l.546-580) ; mobile money/carte sont purement déclaratifs (l.431-437).

**Le contraste interne :** le pilote caisse masque explicitement le mobile money pour ne pas « créer une promesse fonctionnelle contradictoire » (`POSCaisse.tsx:55-60`) — la doctrine existe, elle n'est pas appliquée aux autres surfaces.

**Reco :** masquer `PaiementsPage` derrière un flag (S) ou la transformer en « liste de factures à payer » sans le mot « Payer » (M) ; libeller MarcheVirtuel « Commande passée — à régler à la livraison » et réserver l'annonce de paiement au vrai encaissement Keiwa (S).

### T3 (P1) — Les erreurs réseau rendues comme des états vides ou des fautes d'identité

- Transfert Keiwa : le `catch` de recherche distingue pas 404/réseau — tout rend « Aucun compte Julaba trouvé pour ce numéro. » (`TransfertPage.tsx:100-105`, rendu `:279-282`) ; hors ligne, on accuse un numéro valide d'être absent de Julaba.
- Tontines : `.catch(() => setTontines([]))` → « Aucune tontine pour l'instant » sur échec réseau (`Tontines.tsx:54, 73-78`) — exactement le pattern que CAI-01 a fermé en caisse (`POSCaisse.tsx:1331-1347` : trois situations, trois phrases).
- Historique wallet : « Aucune transaction » sans distinction offline (`HistoriquePage.tsx:193`).
- Identificateur : recherche accueil échoue en toast « La recherche a échoué » (`IdentificateurHome.tsx:165-168`).

**Reco :** appliquer partout la règle caisse — trois situations, trois phrases (vide réel / erreur réseau avec Réessayer / hors ligne), et bloquer les étapes réseau quand `isOnline` est faux.

### T4 (P0/P1) — Contrats front/back non alignés : l'argent dit des choses différentes selon l'écran

- **Cinq définitions des « revenus » producteur :** (a) repli offline somme des commandes non annulée/litige (`ProducteurContext.tsx:604-633`) ; (b) KPI Commandes uniquement `livree` (`CommandesProducteurPage.tsx:459-464`) ; (c) modal Revenus `livree`+`cloturee` (`:1798-1803`) ; (d) `ProductionKPIBar.tsx:53,78` deux autres formules ; (e) `Revenus.tsx:119` `quantite × prixUnitaire` de toutes les récoltes. L'accueil, Commandes et l'onglet Revenus montrent des montants **différents pour la même personne** — famille de défauts que la ligne PERF du plan de réorganisation (unification des registres) traite côté BO : même chantier côté mobile.
- **Revenus fabriqués :** graphique dur-codé `Revenus.tsx:22-30` ; `enAttente = 0` et `croissance = 0` affichés (`:117-118, 209, 246-262`) ; « historique » liste chaque récolte déclarée comme vente cash (`:119`) ; typo `'recu'` écrit `:119` vs comparé `'reçu'` `:341` → badge toujours « ⏳ En attente » ; filtres 7j/30j/3mois qui ne filtrent rien (`:280-299`) ; « Exporter » sans handler (`:305-312`).
- **Qualité de récolte perdue :** `RecolteForm.tsx:164` propose `Excellente|Bonne|Moyenne` casté en `standard|premium|bio` (`:282`) ; les affichages attendent d'autres clés (`MesRecoltesPage.tsx:17-21`, `RecolteDetailModal.tsx:16-23`) → toute récolte s'affiche « Standard »/« Bonne », et le marché hérite de la valeur.
- **Statuts non mappés :** KPIs commandes filtrent `c.status === 'new'|'accepted'|…` alors que le type n'a que `statut` FR (`ProductionKPIBar.tsx:51-54` vs `CommandeContext.tsx:26`) → « Commandes / Urgentes / Livrées » toujours 0 ; idem badges `RecolteDetailModal.tsx:49-50, 268-278`.
- **Wallet :** tout statut ≠ `completed` affiché « ✗ Rejeté » (`WalletPage.tsx:953-954`) — les statuts intermédiaires deviennent des rejets.

**Reco :** une fonction partagée `computeRevenus()` ; une seule énumération de qualité côté API ; mapping central des statuts API → libellés ; écrire les contrats dans `types/` et faire typer, pas caster.

### T5 (P1) — IA fragmentée : doublons, orphelines, portes fermées

- **Identificateur :** `/identificateur/identification` ≡ `/identificateur/fiche-identification` (même composant) mais `hideBottomBar` ne s'applique qu'à la seconde (`IdentificateurLayout.tsx:17`) → par l'ancienne route, la BottomBar recouvre les boutons Continuer/Brouillon ; `useScoreJULABA.ts:515` pointe encore l'ancienne. `/acteurs` ≡ `/identifications` (même composant `Identifications.tsx`, titré « Identifications » `:311`) ; l'onglet « Suivi » ouvre **Rapports** et l'écran `SuiviIdentifications` n'est pas dans la barre (`roleConfig.ts:369-370`) ; `/statistiques` et `/dashboard` orphelines (0 lien entrant) — 4 écrans analytiques au total.
- **Producteur :** `/producteur/publier-recolte` liée depuis aucun écran ; `Stocks.tsx:561` navigue vers `/producteur/revenus` **qui n'existe pas**.
- **Marchand :** wallet keiwa sans porte — tuile « Mon argent » retirée (`MarchandAccueilVoice.tsx:206-218` : « LA ROUTE EXISTE TOUJOURS : seule la porte se ferme »), profil marchand sans Keiwa (`UniversalProfil.tsx:636`), son propre commentaire `:278-280` dit l'inverse ; seul lien vivant : une notification (`NotificationToast.tsx:64`).
- **Callbacks de paiement :** `/pay/success`, `/pay/error`, `/paiement/success`, `/paiement/failed` montent tous `PaySuccessPage` (`routes.tsx`) — à vérifier que le composant lit l'URL, sinon l'erreur s'affiche comme un succès.

**Reco :** une route canonique + redirect par route historique ; un onglet = une destination nommée pareil partout ; arbitrer la porte keiwa marchand (décision, §8.3).

### T6 (P1) — Conscience offline : une caisse exemplaire, deux rôles aveugles

- Caisse : bandeaux, statut « Vente gardée sur le téléphone », lettres mortes, relance programmée (voir Points forts).
- Producteur : **aucun** usage de `navigator.onLine`/`isOnline` dans `components/producteur/` (seule la météo `ProducteurAlertes.tsx:204`) alors qu'`AppContext.tsx:784-802` expose l'état ; écritures = POST directs sans file (`createRecolte` `ProducteurContext.tsx:351-375`, `createPublication` `:481-513`, commandes `CommandeContext.tsx:210-281`) → en champ sans réseau, la déclaration est impossible et la saisie perdue.
- Identificateur : pastille « Mode hors ligne » absente de `IdentificateurLayout` (présente `AppLayout.tsx:120-134`) ; 0 `isOnline` dans le rôle ; le brouillon **local** continue de sauver sans le dire (et il est fragile, I-P0-1).
- Wallet : aucun garde offline (T3).

**Reco :** badge global repris dans les trois layouts (S) ; outbox offline pour la déclaration de récolte et la soumission de fiche (L — même famille que la file caisse, réutiliser le pattern).

### T7 (P1) — « Parlé mais pas écrit » : erreurs rendues uniquement à la voix

- MesCommandes : les six handlers catchent et font `speak(message)` sans `toast` (`MesCommandes.tsx:198-280`) — et le message serveur brut est dicté.
- DepenseForm : échec = `console.warn` + `speak` (`DepenseForm.tsx:120`) — comparer `GestionStock.tsx:622-625` qui fait toast + voix (le bon pattern existe).
- PublierRecolte : validations « Prix invalide », « dépasse le stock » uniquement parlées (`PublierRecolte.tsx:73-84`, `PublierRecolteModal.tsx:28-40`) ; bouton sans `isSubmitting` → double publication possible (`:322-328`).
- `AppContext.speak` est muet si `voiceMuted` (`:733-734`) → une marchande en mode muet au marché bruyant touche « Confirmer la vente », rien ne se passe, rien ne le dit.

**Reco (règle maison à écrire) :** **tout ce qui est parlé doit être écrit, tout ce qui écrit doit être parlé** — chaque `speak` d'erreur a son `toast.error` en français CI, et réciproquement.

### T8 (P1) — Irréversibles en un tap : les patterns sains existent mais ne sont pas partout

- Cotisation coopérative 25 000 F : `MaCooperative.tsx:156-172` — POST direct, montant codé en dur, **aucune confirmation, aucun PIN, aucune vérification de solde** (P0, voir M-P0-2).
- Transfert Keiwa : `TransfertPage.tsx:133-158` — ni PIN, ni relecture, ni ref synchrone anti double-tap (la caisse pose un ref exactement pour ça : `POSCaisse.tsx:208-210, 431`) ; MarcheVirtuel passe par un PIN (`:470-480`).
- Producteur : « Annuler la commande » irréversible en un tap sans raison (`CommandesProducteurPage.tsx:1665-1683`) — alors que le même codebase confirme la suppression de publication « irréversible » (`ModifierPublicationModal.tsx:223-262`).
- Vente directe sans plafond de stock (`CommandesProducteurPage.tsx:1366-1371`) malgré le texte qui promet la déduction (`:1157`).

**Reco :** deux primitives maison obligatoires pour tout mouvement d'argent : (1) écran de relecture « Tu envoies X à Y — tu confirms ? » (voix + texte + vibration attente), (2) ref synchrone + PIN si `pinSecurityEnabled`. Elles existent déjà dans le code — les rendre inévitables.

---

## 3. Rôle MARCHAND

### P0
- **M-P0-1 « Payer maintenant » simulation morte** → voir **T2** (PaiementsPage). Effort S (masquer) / M (reformuler).
- **M-P0-2 Cotisation coopérative : 25 000 F débités en un tap, sans confirmation ni PIN.** `MaCooperative.tsx:156-172` — `await apiRequest(... '/cooperatives/cotisation', { montant: 25000 })` + `toast.success` immédiat ; montant codé en dur ; l'app sait faire mieux (PIN Keiwa `MarcheVirtuel.tsx:444-447`, `ReceptionPaiementModal.tsx:106-108`). Effort S.
- **M-P0-3 Transfert Keiwa irréversible sans étape de confirmation ni verrou anti double-tap** → voir **T8** (détails T8 ; spécifique : le récap final n'apparaît que si montant ≥ 100, `TransfertPage.tsx:451-465`). Effort S.

### P1
- **M-P1-1** Erreur de recherche destinataire = « Aucun compte trouvé » même hors ligne → **T3**. S.
- **M-P1-2** Wallet marchand sans porte (routes vivantes, inaccessibles au tactile) → **T5**. S.
- **M-P1-3** Marché virtuel annonce « Paiement … effectué avec succès » pour du mobile money déclaratif → **T2**. S.
- **M-P1-4** MesCommandes : échecs jamais affichés, message serveur brut dicté → **T7**. S.
- **M-P1-5** Tontines : échec réseau rendu « Aucune tontine pour l'instant » → **T3**. S.
- **M-P1-6** DepenseForm : échec d'enregistrement console + voix seulement → **T7**. S.

### P2
Vider le panier sans confirmation (`POSCaisse.tsx:1420-1424, 1454-1457`) ; champ montant `type="number"` vs pavé montant maison (`PaiementsPage.tsx:254-259`) ; phrases voix wallet en dur hors catalogue i18n (`WithdrawWalletModal.tsx:77-157`, `RechargeWalletModal.tsx:77-197`) vs doctrine clés (`CaisseContext.tsx:349-357`) ; bouton debug « 🐞 Rapport » livré dans l'APK sur tous les écrans (`AppLayout.tsx:149-192`) ; contraste alerte/sable documenté 3,2:1 à corriger à la source (`MarchandAccueilVoice.tsx:299-302`, `styles/commerce.css`) ; HistoriquePage vide ≠ erreur (→ T3).

---

## 4. Rôle PRODUCTEUR

### P0
- **P-P0-1 La voix Tata est muette pour tout le rôle** → voir **T1** (~40 appels morts). Effort S (condition) / L (refonte canal).
- **P-P0-2 L'écran « Revenus » affiche des données fabriquées** — graphique codé en dur, 0 F en attente, récoltes jamais vendues listées comme ventes cash, badge toujours « En attente » (typo accent), filtres morts, Exporter sans handler (`Revenus.tsx:22-30, 117-119, 280-312, 341`). Effort M.
- **P-P0-3 Modifier un stock peut l'écraser à 0 — un PATCH part à chaque frappe.** `Stocks.tsx:899-904` `onChange={(e) => updateStock(selectedStock.id, parseInt(e.target.value) || 0)}` → `parseInt('') = NaN → 0` persisté ; pattern répété `:777, 797, 807, 831` ; et le dialogue de confirmation de suppression rend en `z-50` **derrière** le modal d'édition `z-[200]` (`:960-970` vs `:851-858`). Effort S.
- **P-P0-4 Cinq définitions des « revenus »** → voir **T4**. Effort M.
- **P-P0-5 « Payer maintenant » ne paie rien** → voir **T2**. Effort S / L.

### P1
- **P-P1-1 RecolteForm : aucune protection contre la perte de saisie** — backdrop ferme + `navigate(-1)` sans confirmation (`:316, 255-258`) ; changer d'unité **efface la quantité** (`:561-565`) ; photo en base64 **non compressée** (`:218-228`) alors que deux autres écrans compressent > 500 Ko (`PublierRecolte.tsx:94-105`, `CommandesProducteurPage.tsx:526-541`) → payload multi-Mo en 2G. Effort M.
- **P-P1-2 Qualité déclarée jamais affichée** (énumérations divergentes) → **T4**. S/M.
- **P-P1-3 Vente directe : stepper ±1 kg, sans saisie directe ni plafond de stock** (`CommandesProducteurPage.tsx:1279-1307, 1366-1371`) — 150 kg = 150 taps. S/M.
- **P-P1-4 « Annuler la commande » irréversible en un tap** → **T8**. S.
- **P-P1-5 Validations « argent » annoncées uniquement à la voix** (morte, cf. P-P0-1) ou rien ; double-tap = double publication (`PublierRecolte.tsx:322-328`, `CommandesProducteurPage.tsx:569-611`) → **T7**. S.
- **P-P1-6 Offline absent du rôle, POST directs sans file** → **T6**. S (badge) / L (outbox).
- **P-P1-7 KPIs toujours 0 (`status` vs `statut`) + liens et routes morts** (`ProductionKPIBar.tsx:51-54`, `RecolteDetailModal.tsx:49-50`, `Stocks.tsx:561` → route inexistante, `/publier-recolte` orpheline) → **T4/T5**. S.
- **P-P1-8 Deux systèmes de stock parallèles non réconciliés** (API `/stocks` avec coûts vs `stockDisponible` des récoltes) + **trois « valeurs » différentes dans Stocks lui-même** (`:411` coût, `:494` coût||vente, `:937` vente) + vocabulaire qui change (« Ajouter une commande » ouvre « Nouvelle vente » `:717-725` vs `:1065`). Effort L — décision §8.4.
- **P-P1-9 Wallet : scanner QR sans décodage** (caméra ouverte, aucun `BarcodeDetector|jsQR` dans le fichier, `WalletPage.tsx:185-401`) + statut « ✗ Rejeté » pour tout ≠ completed (`:953-954`). M / S.

### P2
UUID lus à voix haute et `speak('Erreur : '+e.message)` (`CommandesProducteurPage.tsx:314, 775, 318-379, 516`) ; typos/jargon (« Récupérer keiwa » `:2162`, « Livrees » `ProductionKPIBar.tsx:73`, « Rechargement » `WalletPage.tsx:28`) ; registre tutoiement/vouvoiement mélangé (`ProducteurAlertes.tsx:322-363`, `WalletPage.tsx:864`, `PaiementsPage.tsx:108`) ; montants tronqués « 0K F » (`ProducteurModals.tsx:168-342`, 499 F ⇒ « 0K F ») et `4.5k` vs `toLocaleString` (`MesRecoltesPage.tsx:15`) ; UI fantôme (countdown jamais alimenté `CommandesProducteurPage.tsx:764-766, 825-831`, Exporter sans handler) ; labels `text-[10px]` sur sélecteurs clés (`RecolteForm.tsx:402`, `CreerPlantationModal.tsx:176`) ; boutons icônes sans aria (photo/fermer `RecolteForm.tsx:342-347, 473-486`) ; seuil « stock bas » 50 kg fixe vs 20 % ailleurs (`ProducteurAlertes.tsx:312` vs `ProducteurProduction.tsx:718`) ; couleur d'onglet `#00563B` ≠ vert producteur (`StocksWrapper.tsx:68`) ; polling 30 s sans check offline (`ProducteurProduction.tsx:74-84`) ; « Modifier la récolte » PATCHe `/publications/{id}` même sans publication (`RecolteDetailModal.tsx:359-372`) ; escrow `bloquerArgent/libererArgent` = stubs (`WalletContext.tsx:113-127` — à auditer séparément).

---

## 5. Rôle IDENTIFICATEUR

### P0
- **I-P0-1 Le brouillon auto vit en `sessionStorage` : tué par toute interruption, et invisible dans « Mes brouillons ».** `FicheIdentificationDynamique.tsx:979-980, 1016` (`julaba:fiche-draft:${profil}` en sessionStorage) ; `MesBrouillons.tsx:196` ne lit que le serveur ; sauvegarde serveur verrouillée avant l'étape 4 (`:2476` `disabled={isSubmitting || step < 3}`) → sur le terrain (appel entrant, batterie, kill Android → WebView détruite), **les étapes 1-3 (photo incluse) sont perdues** et rien n'apparaît dans MesBrouillons ni dans le compteur d'accueil (`IdentificateurHome.tsx:50-54`). Reco : `localStorage`/IndexedDB + entrée « locale (à synchroniser) » dans MesBrouillons + Brouillon dès l'étape 1. Effort M.
- **I-P0-2 « Reprendre le dossier » (rejeté/en attente) ouvre une fiche VIERGE → re-saisie totale puis blocage garanti.** `ActeurDetails.tsx:689-701` navigue sans state (ni `resumeDraft`, ni `mode:'complement'`) ; la fiche détectera « Ce numéro est déjà utilisé » (`:1410`, toast `:1847-1848`) ; le mode complément **existe** (`:1667`) mais n'est déclenché que par `FicheActeurDetailModal.tsx:407-436`. Le dossier rejeté ne peut jamais être resoumis via ce bouton. Effort S.
- **I-P0-3 « Modifier » depuis la liste Acteurs envoie `mode:'edit'` que le formulaire ne lit jamais** → parcours de création sur un acteur existant. `Identifications.tsx:968-985` ; le formulaire ne teste que `'complement'` (`:1667`, 0 occurrence de `'edit'`) ; la soumission part en création `create-with-acteur` (`:1837`) → échec téléphone garanti, ou doublon si le backend ne contraint pas l'unicité. Reco : traiter `'edit'` en PATCH ou router vers `ModalEditerActeur` (qui fait un vrai PATCH, `ActeurDetails.tsx:733-756`). Effort S-M.
- **I-P0-4 Session expirée au moment de l'envoi : l'agent voit le jeton brut `NOT_AUTHENTICATED` après 20-30 min de saisie.** `api-client.ts:180` → consommé tel quel : « Erreur de création acteur : NOT_AUTHENTICATED » (`FicheIdentificationDynamique.tsx:1845-1851`, idem brouillon `:1587`) ; et `IdentificateurLayout` ne contient **aucune garde d'auth** (confronter `AppLayout.tsx:47-71`). Reco : intercepter → « Session expirée, reconnecte-toi » + redirect ; garde utilisateur dans le layout. Effort S.

### P1
- **I-P1-1 Voix Tata totalement morte sur le rôle** (0 `speak()`, bouton Tata sans effet) → **T1**. M.
- **I-P1-2 Aucune conscience hors-ligne** (pas de badge, erreurs génériques, vérification téléphone retombe silencieusement à `idle` `:1072-1076`) → **T6**. S / L (file d'envoi).
- **I-P1-3 Consentement de la personne identifiée jamais affiché avant signature** — 0 match `consent|accord|autorise` dans le fichier ; l'étape finale propose signature doigt/nom (`:5508, 5575`) sans trace d'information sur l'usage des données KYC (photo, NNI, GPS) — risque juridique/terrain. Reco : encart lisible/énonçable avant signature + clip voix. Effort S.
- **I-P1-4 IA incohérente : onglet « Suivi » ouvre Rapports, onglet « Acteurs » ouvre un écran titré « Identifications », SuiviIdentifications hors barre** → **T5**. S.
- **I-P1-5 Double route du formulaire avec comportements de layout différents** (BottomBar recouvre les boutons par l'ancienne route) → **T5**. S.
- **I-P1-6 Étape Documents : 7 pièces empilées, toutes optionnelles, sans hiérarchie** (`:2933-3034`, validation `:1384-1387`) — scroll fatigant au pire endroit (zone de perte maximale, cf. I-P0-1). Reco : replier « Autres documents » derrière un « Ajouter une autre pièce ». S.

### P2
Routes orphelines `/statistiques` et `/dashboard` (4 écrans analytiques → fusionner) ; bouton mort « Acteurs (bientôt) » désactivé en pleine page (`Identifications.tsx:375-384`) ; « Ma zone assignée » → navigue vers Suivi sans rapport (`UniversalParametres.tsx:895-896`) ; bloc input PIN dupliqué mot pour mot (`:5621-5690`) ; pastilles d'étapes < 44 px avec labels 0,55 rem (`:2369-2404`) ; quota `sessionStorage` dépassé = `console.warn` silencieux (`:1017-1019`) — l'agent croit être sauvegardé ; NNI/téléphone en clair avec répétition dans les listes (`ActeurDetails.tsx:554, 574`, `Identifications.tsx:590, 678`) — masquage/révélation progressive à poser ; carte Leaflet sans repli offline (`ActeurDetails.tsx:281-285`) ; retour `navigate(-1)` sur deep-link (`SubPageLayout.tsx:56`) ; reverse-geocode sans districts embarqués pour le terrain offline (`:400-533`).

---

## 6. Points forts (le socle à ne pas casser)

**Marchand / caisse — le standard de la maison :**
1. File hors-ligne fail-closed, idempotente et toujours racontée : clé d'idempotence réutilisée au rejeu (`CaisseContext.tsx:51-58, 607-639`), refus d'enfiler sans utilisateur réel (`offlineCaisse.ts:271-306`), statut écran « Vente gardée sur le téléphone » (`POSCaisse.tsx:1843-1856`), bandeaux qui ne disent jamais « tout est parti » (`SyncEchecsBanner.tsx:28-96`).
2. Encaissement relu avant décision par une machine à états pure — relecture dite et affichée depuis la même source (`POSCaisse.tsx:558-665`), forme parlée ≠ forme écran (ARG-17).
3. Triple canal systématique : voir/entendre/sentir, vibration d'attente qui refuse de « vibrer succès » (`POSCaisse.tsx:509-528`).
4. Accessibilité concrète : cibles 44 px partout, `role="status"`/`aria-live` argumentés (`:986, 1188-1193`), Mode Soleil, montants masquables, tabular-nums.
5. Clôture de journée honnête : champ de comptage vide par défaut (`MarchandModals.tsx:570-637`), avertissement « chiffres incomplets » si des ventes dorment en file.
6. Historique qui ne ment pas (HIST-01) : bandeau ventes gardées, état « ventes pas lues » avec Réessayer, annulation en deux temps avec stock rendu.

**Producteur :**
1. `RecolteForm` pensé terrain : unités locales (tas, sacs, cagettes) avec conversion kg en direct (`:168-176, 626-640`), récapitulatif avant validation (`:721-756`), bouton désactivé pendant l'envoi.
2. Le pattern « confirmation avant engagement » existe et est bien fait deux fois : `PublierRecolteModal` (plafond stock, `isSubmitting`, durée 3/7/14 j) et `ModifierPublicationModal` (« Retirer du marché définitivement » explicite).
3. `WalletPage` durcie par les audits antérieurs : PIN faible interdit, session expirée ≠ code faux, solde masquable, détail tx avec soldes avant/après.
4. Langage fr-CI simple et imagé sur le cœur métier : « 1 hectare = 1 terrain de foot » (`CreerPlantationModal.tsx:221-223`), statuts traduits en mots.
5. Clôture de saison bien scénarisée (partielle vs totale, conséquences expliquées, alertes retard).

**Identificateur :**
1. Pipeline photo exemplaire : validation MIME, rejet > 20 Mo, compression canvas 800 px q0.7, re-contrôle post-compression, `revokeObjectURL` systématique (`FicheIdentificationDynamique.tsx:1091-1122`).
2. GPS rigoureux : double capture avec affinage, bounding-box Côte d'Ivoire, messages distincts permission/indisponible/timeout (`:1151-1188`).
3. Écran de succès + code d'activation (ADR-002) : code monospace, consigne d'usage unique, pas d'auto-navigation tant que le code n'est pas acquitté (`:2115-2161, 1936-1946`).
4. Accessibilité réelle : `Field` propage `aria-invalid`/`aria-describedby` via cloneElement (`:571-597`), erreurs `role="alert"`, `aria-current="step"`, `prefers-reduced-motion`, signature clavier alternative.
5. Anti-doublons en amont : vérif téléphone à la volée, funnel « non enrôlé → nouvelle fiche », lookup NNI ONECI transparent, bannières « écran sensible » sur les trois écrans à données perso.

---

## 7. Plan d'action suggéré (lots)

| Lot | Contenu | Effort | Dépend |
|---|---|---|---|
| **UX-1 « Promesses d'argent »** | T2 (PaiementsPage, MarcheVirtuel) + M-P0-2 cotisation + M-P0-3 transfert (relecture + ref synchrone + PIN) | S-M | Aucune |
| **UX-2 « Voix pour tous »** | T1 — décision puis exécution (ouvrir `speak()` aux 3 rôles ; parité Tata dans `IdentificateurLayout`) | S à L | Décision §8.1 |
| **UX-3 « Perdu = retrouvé »** | I-P0-1 brouillon localStorage + I-P0-2/I-P0-3 modes complément/edit + P-P1-1 (RecolteForm : confirmation backdrop, quantité conservée, compression photo) | M | Aucune |
| **UX-4 « Le réseau dit la vérité »** | T3 + T6 (badge global, phrases trois-situations, gardes offline, outbox récolte/fiche) | S → L | Pattern caisse existant |
| **UX-5 « Contrats alignés »** | T4 (revenus uniques, qualité, statuts, KPIs) — à coupler à la ligne PERF du plan de réorganisation (unification registres) | M | §8.4 partiellement |
| **UX-6 « IA/routing nettoyage »** | T5 (routes canoniques + redirects, onglets renommés, portes keiwa, callbacks /pay à vérifier) | S | Décisions §8.3/§8.5 |

Règle transversale à écrire dans les conventions : **« tout ce qui est parlé doit être écrit, tout ce qui écrit doit être parlé »** (T7) — chaque `speak` d'erreur a son `toast`, chaque toast critique a son `speak`.

## 8. Décisions à trancher (Patrick)

1. **Voix :** ouvrir `speak()` aux producteurs et identificateurs, ou assumer le tactile-only et retirer appels morts + boutons inertes ? (T1 — impact produit majeur, coût S vs M)
2. **PaiementsPage :** masquer (flag) ou transformer en « rappels de factures » sans promesse de paiement ? (T2)
3. **Keiwa marchand :** porte unique (tuile « Mon argent » ou ligne profil) ou retrait des routes marchand ? Le commentaire d'`UniversalProfil` et le code se contredisent. (T5/M-P1-2)
4. **Stocks producteur :** fusionner les deux systèmes (API `/stocks` vs stock des récoltes) ou assumer la séparation avec des noms distincts ? (P-P1-8)
5. **Identificateur :** fusionner les 4 écrans analytiques (Suivi/Statistiques/Rapports/Dashboard) et choisir la route canonique du formulaire ? (T5)
6. **Consentement signé :** texte court fr-ci + case avant signature, doublé d'un clip voix ? (I-P1-3 — au-delà de l'UX : conformité)

## 9. Limites de l'audit

- **Statique** : aucune exécution d'app/APK ; le scénario « app tuée → sessionStorage perdu » est le comportement standard du WebView Capacitor mais non mesuré sur device ; contrastes non calculés (seul le ratio documenté dans le code est cité) ; TTS/clips non écoutés.
- **Backend non lu** : comportement réel de `create-with-acteur` sur téléphone existant (409 vs upsert — conditionne la gravité exacte de I-P0-3), statuts réels de l'API keiwa, contenu sandbox de `/oneci/lookup` non vérifiés.
- **Lecture partielle** : quelques fichiers longs lus par balisage (`RapportsIdentificateur` 1 811 l., sidebar desktop, `PayPage`) ; catalogue voix (1 500+ clés) parcouru par sondes, pas exhaustivement.
- Le rebasculage sandbox de HEAD sur `main` a contraint les explorations à travailler sur l'arbre `dev` (snapshot/lecture immunisée) ; toutes les citations file:ligne correspondent au contenu `dev` @ `05b2cbb`.

---

## Annexe — inventaire des écrans parcourus

**Marchand (14-a)** : POSCaisse (1901 l.), CaisseContext (1053 l.), voice-offline (offlineCaisse, incidentsHorsLigne), SyncEchecsBanner, wallet (Transfert, Paiements, Wallet, Withdraw/Recharge modals, Historique), MarchandModals (CloseDayModal), DepenseForm, MarchandHome/MarchandAccueilVoice, MarchandDepenses, GestionStock, VentesPassees, ResumeCaisse, MesCommandes, MarcheVirtuel, Tontines, MaCooperative, BesoinMarchand, ProtectionSociale, RecoltesPrevues, Fidelite, MarchandAlertes, MesDonnees, UniversalProfil, UniversalParametres, AppLayout, BottomBar, useVoiceCore, accessMode, useMontantsPrives.
**Producteur (14-b)** : les 19 fichiers `components/producteur/` intégraux + WalletPage, PaiementsPage + AppContext, ProducteurContext, CommandeContext, WalletContext.
**Identificateur (14-c)** : les 16 fichiers `components/identificateur/` (14 814 l. — FicheIdentificationDynamique 5 753 l. en tête) + IdentificateurLayout, AppLayout, Sidebar, BottomBar, roleConfig, routes.tsx, api-client.
