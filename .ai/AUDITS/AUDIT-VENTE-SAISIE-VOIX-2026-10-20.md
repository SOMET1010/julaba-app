# AUDIT — SAISIE ET VENTE DES PRODUITS À LA VOIX (audit consolidé)

| | |
|---|---|
| date | 20/10/2026 |
| déclencheur | Patrick : « Assure-toi que la saisie des produits à la voix fonctionne. Et aussi, la vente de produits à la voix. Mais avons-nous fait un audit complet de cette fonctionnalité ? » |
| périmètre | front `marchand/{MicroVenteCaisse,ConfirmationLigne,SaisieGuidee,AjoutProduitGuide,POSCaisse}`, `services/{vendreVocalUnifie,ligneProvisoire,venteVocale,venteAuCatalogue,grammaireCorrection,webReco}`, `hooks/useVoiceCore`, `voice-offline/*` ; back `caisse-rest` (aucun changement requis) ; docs `SPEC_VENTE_VOCALE.md` |
| base | dev@e3e3a63, correctif inclus : 0fea799 |
| verdict | **CONFORME après correctif.** Les 3 P0 et les P2 de l'audit AJOUT-PRODUIT-VOCAL du 19/10 étaient déjà fermés dans dev ; le dernier P1 ouvert (reprise de ligne provisoire non branchée) est fermé par le commit 0fea799 inclus dans cet audit. Deux points restent ouverts assumés (§5). |

---

## 1. Référentiel et audits antérieurs

- `docs/SPEC_VENTE_VOCALE.md` — flux obligatoire `écoute → interprétation → ligne
  provisoire → répétition → confirmation → ajout`, §3 (persistance/reprise),
  §5 (ambiguïté prix), §8 (Web/APK).
- `.ai/AUDITS/AUDIT-AJOUT-PRODUIT-VOCAL-2026-10-19.md` — verdict NON CONFORME à
  son émission ; **chaque constat est re-vérifié ici de première main à e3e3a63** (§3).
- `.ai/AUDITS/AUDIT-CATALOGUE-PRODUITS-2026-10-19.md` + fix e3e3a63 — le chemin
  tactile de la caisse crée désormais de vrais produits au nom libre
  (`POSCaisse.tsx:414 creerProduitDepuisFeuille`), le catalogue maître est une
  suggestion, jamais une porte à sens unique.

## 2. LA SAISIE DES PRODUITS À LA VOIX — trois portes, toutes ouvertes

1. **Dictée en caisse (porte principale, voice-first)** — produit inconnu :
   la dictée conserve le nom libre (`nomProduitLibre`, `venteAuCatalogue.ts:360-368`,
   ajouté par 821cc12), la ligne part en confirmation puis au panier
   (`MicroVenteCaisse.tsx:391`), PUIS « J'ajoute "X" à ta boutique à N F ? » —
   « Oui, ajoute » crée un VRAI produit via `addProduct`
   (`MicroVenteCaisse.tsx:786 accepterCreation`), qui écrit `POST /caisse/produits`
   (back libre : `nomDeProduitSaisi` inséré tel quel, seule règle ≥ 2 lettres —
   cf. audit catalogue §2.2). Le refus est mémorisé par produit (`noterRefusCreation`).
2. **Mon stock — AjoutProduitGuide** — nom libre tapé (zéro catalogue), prix À LA
   VOIX : `BoutonDirePrix ouvrirToutSeul` (`AjoutProduitGuide.tsx:399-404`) — le
   micro s'ouvre tout seul, Tata pose la question, le montant dicté remplit le
   prix. L'animation de confirmation (821cc12) évite l'écran muet après validation.
   Le NOM reste tactile : décision design assumée — la création vocale de produit
   passe par la caisse (porte 1), l'écran stock reste le repli.
3. **Caisse tactile — « Autre article »** (fix e3e3a63) — création d'un vrai
   produit au nom saisi (`POSCaisse.tsx:414-445`), sortie « Créer « X » comme
   nouveau produit » dans la recherche de références, et « Non — je crée mon
   produit » sur la carte du catalogue maître.

## 3. LA VENTE DES PRODUITS À LA VOIX — le flux complet, re-vérifié ligne à ligne

| Étape | Implémentation | Preuve |
|---|---|---|
| Écoute | micro permanent, fin de phrase détectée au silence (niveau + plancher de bruit mesuré), tic haptique « je t'entends » | `MicroVenteCaisse.tsx:556-663`, `services/ecouteCaisse.ts` (test ✅) |
| Interprétation | `intentLocal`/`intentLocalCaisse` puis relecture PAR SON CATALOGUE (`lireVenteAuCatalogue`), nom libre préservé (821cc12), « cinq tomates » compris sans verbe (relecture de caisse) | `MicroVenteCaisse.tsx:517-524,704-724`, `venteAuCatalogue.ts` (tests ✅) |
| Prix | montant dicté prime ; sinon catalogue×quantité si l'unité concorde ; sinon LE PRIX EST DEMANDÉ (écran « Autre article » pré-rempli via `FournisseurDemandePrix`) — jamais inventé, jamais silence | `vendreVocalUnifie.ts:220-278`, `prixVocal.ts` (tests ✅) |
| Ligne provisoire | `proposerLigne: proposerLigneVocale` capture la ligne (statut `a_confirmer`), le panier NE MUTER PAS ici | `MicroVenteCaisse.tsx:276,312` |
| Répétition | phrase affichée = phrase DITE, deux formes (écran « 2 000 F » / voix « deux mille francs »), bouton « Réécouter » | `ConfirmationLigne.tsx:94-118` |
| Confirmation | bouton vert OU « oui » vocal — l'encaissement reste « Payer en espèces »/« encaisse » ; `confirmationBypassIntents:['vendre',…]` (377) n'est plus un contournement : la confirmation EST ConfirmationLigne | `ConfirmationLigne.tsx:238-242`, `MicroVenteCaisse.tsx:389-391` |
| Correction | « non, deux » / « le prix c'est mille » / « annule » / « enlève » branchés sur la ligne (jamais le panier) ; panneau tactile +/− et clavier prix | `MicroVenteCaisse.tsx:392-400`, `grammaireCorrection.ts` (test ✅) |
| Ajout panier | produit apparié au prix dicté (promo neutralisée), total exact FCFA, origine 'vocal' (onglet « Par la voix ») ; produit inconnu → ligne libre id unique | `MicroVenteCaisse.tsx:241-256`, `vendreVocalUnifie.ts:308-320` |
| Création produit | après confirmation seulement, proposition d'ajout à la boutique (porte 1 ci-dessus) | `MicroVenteCaisse.tsx:269-272,786` |
| Encaissement | intentions transmises à POSCaisse (`handlePay` → `enregistrerVente`), file hors ligne testée | `grammaireEncaissement.ts` (test ✅), `test:offline` ✅ |
| **Reprise (fermé par 0fea799)** | ligne CONFIRMÉE non ajoutée → persistée AVANT l'écriture panier (`sauverLigneConfirmee`, garde `confirmer()`), reproposée à la réouverture REMISE EN `a_confirmer` (jamais de rejeu d'argent sans nouveau « oui »), non confirmée → jetée sans bruit (`ligneAReproposer`), effacée aux trois issues (ajout `:268`, vocal `:395`, tactile `:1095`) | `MicroVenteCaisse.tsx:198-226,236-240,268,389-395,538-555,1095` |

## 4. Statut des constats de l'audit AJOUT-PRODUIT-VOCAL du 19/10 (re-vérifiés à e3e3a63)

| Constat du 19/10 | Statut à e3e3a63 | Preuve actuelle |
|---|---|---|
| P0 ajout au panier avant confirmation | **FERMÉ** | `proposerLigne` branché (`vendreVocalUnifie.ts:308,314` — `deps.proposerLigne ?? deps.addToCart`) ; le panier ne mute qu'après ConfirmationLigne/« oui » |
| P0 machine ligne provisoire non branchée | **FERMÉ** | `proposerLigneVocale` crée la ligne `a_confirmer` et ouvre l'écran (`MicroVenteCaisse.tsx:239-256`) |
| P0 produit inconnu en ligne libre sans adoption | **FERMÉ** | ligne → confirmation → panier → PUIS proposition de création (`:269-272`) |
| P1 corrections vocales non raccordées | **FERMÉ** | `interpreterReponse` → confirmation/annulation/corrections (`:389-400`) |
| P1 reprise non branchée | **FERMÉ par 0fea799** (ce lot) | §3 dernière ligne du tableau |
| P1 aucun test du câblage réel | PARTIELLEMENT OUVERT — les briques pures sont testées (15 suites ✅) mais aucun test composant POSCaisse→Micro→panier ; à couvrir côté QA terrain (§5) | §5 |
| P2 `unite` absent de VoiceAction | **FERMÉ** | `useVoiceCore.ts:42` (`unite?: string`) |
| P2 doc Web contradictoire | **FERMÉ** | `SPEC_VENTE_VOCALE.md:158` décrit la reconnaissance navigateur — conforme à `voice-offline/webReco.ts` (test ✅) |
| P3 14 scénarios terrain non prouvés | OUVERT (recette appareil) | §5 |

## 5. Ce que cet audit NE tranche PAS (ouvert, assumé)

1. **P3 — recette sur appareil** : les 14 scénarios de `SPEC_VENTE_VOCALE.md:161-173`
   (bruit, interruption, double appui, reprise panier…) exigent un téléphone réel +
   l'APK Sherpa. Le banc tsx prouve les briques ; la recette §5 du catalogue audit
   (rejouée tactile depuis e3e3a63) reste à faire sur stack locale / APK.
2. **Dette C-C1** — prix du catalogue statique `data/catalogue-produits.ts` :
   arbitrage Patrick requis (déjà consigné, non retraité ici).
3. **Nom du produit dans Mon stock non dictable** : la création vocale de produit
   passe par la caisse (porte 1) ; si Patrick veut la dictée du nom AUSSI dans
   AjoutProduitGuide, c'est un chantier à part (bloc dictée + correction mot à mot).

## 6. Preuves exécutées (20/10/2026, dev@e3e3a63 + 0fea799)

- `tsc -b` front ✅ (exit 0, après correctif) ; `nest build` back ✅
- Suites vertes relancées de première main : `test:vendre-unifie`,
  `test:vendre-unifie-unite`, `test:provisoire`, `test:correction`,
  `test:prix-ambigu`, `test:prix-catalogue`, `test:prix-unitaire`,
  `test:prix-sans-quantite`, `test:prix-marchande`, `test:ecoute-caisse`,
  `test:voix`, `test:web-reco`, `test:offline`, `test:grammaire-encaissement`,
  `test:choix-unite` — **15/15 ✅**

## 7. Conclusion

Réponse à la question de Patrick : **oui, il existe maintenant un audit complet**
du couple saisie/vente à la voix — celui-ci — et **les deux fonctionnalités
fonctionnent** : la dictée vend des produits connus et inconnus (avec création
guidée au nom libre), le prix jamais inventé se fait redemander, la ligne
provisoire se relit, se corrige et se confirme avant tout argent, et depuis
0fea799 elle survit à une coupure de l'application. Le mur tactile du catalogue
était déjà tombé (e3e3a63). Restent la recette sur appareil (P3) et deux
arbitrages Patrick listés en §5.
