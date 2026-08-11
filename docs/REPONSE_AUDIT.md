# Réponse d'architecte à l'audit UX (docs/AUDIT_UX.md)

11/08/2026. Chaque point de l'audit a été confronté au CODE et aux
RECETTES déjà déroulées (docs/RECETTE.md). Verdict global : l'audit est
juste — deux bloquants sont CONFIRMÉS dans le code, deux sont déjà
partiellement couverts, et la matrice des capacités peut être remplie
dès maintenant pour le Web (l'APK reste à recetter sur appareil).

## 1. Vérifications des bloquants

| ID | Verdict | Preuve |
|---|---|---|
| B1 panier double | **CONFIRMÉ** | `VenteVocaleModal` appelle `enregistrerVente(montant, [ligne], "cash")` DIRECTEMENT — la vente vocale n'entre jamais dans le panier de `CaisseContext`, elle est enregistrée immédiatement en espèces, sans étape panier ni choix de paiement. Deux caisses de fait. → Phase 1. |
| B2 canaux confondus | **CONFIRMÉ** | Prouvé en recette : sherpa ne marche PAS au navigateur (moteur natif APK uniquement, message « la voix marche dans l'application ») ; les clips et la synthèse marchent au Web. Matrice remplie §3. |
| B3 crédit non atomique | **CONFIRMÉ** | Backend : `credits.controller.ts` est un registre SÉPARÉ de `caisse-rest.controller.ts` (transactions). Aucune transaction commune vente + stock + dette. → Phase 3. |
| B4 mobile money non recetté | **CONFIRMÉ** | Le bouton « Mobile money » est visible dans la caisse (capture recette séance 1) ; aucun bout-en-bout opérateur recetté. → à masquer/marquer « pilote » (décision n°5). |
| B5 PIN dicté | **CONFIRMÉ** | `LoginPassword.tsx` : une configuration de dictée `max: 4` permet de DICTER le code secret à voix haute (même rouage que le numéro). → à retirer : la dictée reste pour le NUMÉRO (avec avertissement), jamais pour le code. |
| B6 erreurs vocales non définies | **PARTIEL** | Il existe des reprises (bruit → silence → filet 15 s, panier conservé) mais AUCUNE correction vocale (« non, deux », « annule ») ni répétition systématique avant ajout. → Phase 1. |

## 2. Vérifications des majeurs

| ID | Verdict | État |
|---|---|---|
| M1 entrée trop longue | Confirmé | Aujourd'hui : atterrissage + 2 écrans + mode + voix + connexion = 5-6 gestes. Cible E0→E3 : l'onboarding v5.0.0.18 a déjà réduit 4 écrans → 2 ; reste à fusionner le choix du mode (M2) et déplacer l'installation voix (M3). |
| M2 4 modes abstraits | Confirmé | `accessMode` a DÉJÀ un mode `auto` (recommandé en tête) — la cible « adaptatif d'office, réglage aux paramètres » est un retrait d'écran, pas une construction. |
| M3 voix avant la valeur | Confirmé | `InstallerOffline` est proposé dans l'onboarding. À déplacer après la première vente guidée / sur Wi-Fi. |
| M4 clips ≠ couverture | Accepté | PARCOURS.md §8 listait déjà les manques ; le critère devient « tâches réalisables sans lire » (critères §13 de l'audit). |
| M5 journée bloque | **INFIRMÉ à vérifier** | La recette a VENDU sans toucher au fond de caisse (Adjoua, séance 1) : la vente n'est pas bloquée. Le fond est un modal facultatif de l'accueil. Reste la décision n°1 (obligatoire comptable ou informatif). |
| M6 un seul onboarding | Confirmé | Le BO a déjà son login séparé ; institution passe encore par l'entrée terrain. → Phase 4. |
| M7 stock/produit inconnu | Partiel | Produit inconnu : la proposition d'ajout au catalogue EXISTE (v5.0.0.4, refus mémorisé) mais pas la « ligne libre » sans catalogue ; vente > stock : non cadré. → Phases 1-2 + décision n°6. |
| M8 consentement | Confirmé | Rien dans la fiche d'identification. La phrase recommandée est actée ; trace = décision n°8. |

## 3. Matrice de capacités par canal — remplie (état au 11/08)

| Capacité | Web mobile | PWA | APK |
|---|---|---|---|
| Tata lit des clips fixes | **OUI** (recetté) | OUI (mêmes assets, pré-cachés sw) | OUI — à re-vérifier appareil |
| Synthèse des montants | **OUI** (recetté) | OUI | OUI — à re-vérifier appareil |
| Reconnaissance vocale en ligne | NON (retirée : un seul moteur, sherpa) | NON | NON (sherpa = hors-ligne) |
| Reconnaissance sherpa hors-ligne | **NON** (prouvé) | NON | **ABSENTE — plugin natif à construire** (cf. REPONSE_SHERPA.md : ni moteur ni modèle dans l'APK) |
| Vente espèces en ligne | **OUI** (recettée bout-en-bout) | OUI | à recetter |
| Vente espèces hors-ligne | Panier local OUI (cartStorage) ; l'ENREGISTREMENT hors-ligne + synchro idempotente : à recetter | idem | idem |
| Crédit hors-ligne | NON CONFIRMÉ (et non atomique, cf. B3) | idem | idem |
| Mot-réveil mains libres | ABSENT | ABSENT | ABSENT (retiré ; décision n°10) |
| Biométrie « Tata me reconnaît » | **OUI** (recettée, authenticator virtuel) | selon appareil | selon appareil — à recetter |

## 4. Positions d'architecte sur les 10 décisions (à valider par Alex)

1. Fond de caisse : **informatif** — ne bloque jamais une vente (déjà le
   cas) ; utile seulement si la clôture réconcilie les espèces.
2. Crédit atomique : **OUI, prérequis** — transaction unique backend
   (vente + mouvement de stock + dette) avant tout retour du crédit en
   caisse. D'ici là : crédit = sous-parcours séparé.
3. Langues : **français recetté** ; bambara = nombres seulement (dictée
   montants) ; dioula suspendu (décision du 11/08). Le dire tel quel.
4. Canaux pré-pilote : **APK d'abord** (kit smartphone) ; le Web sert la
   démo et le BO. La PWA n'est pas un canal promis.
5. Mobile money : **masqué en pré-pilote** derrière un drapeau, réaffiché
   quand le bout-en-bout opérateur est recetté (aligne diapo 21).
6. Vente > stock : **autorisée avec avertissement parlé + écart tracé**
   (jamais de blocage de vente, jamais de zéro silencieux).
7. Annulation : **la marchande annule sa DERNIÈRE vente le jour même** ;
   au-delà : correction tracée (avoir), jamais de suppression.
8. Consentement : **phrase parlée + bouton « J'accepte » horodaté avec
   l'identité de l'agent** dans le dossier ; à confirmer juridiquement.
9. Mentions partenaires : **au démarrage + à propos/paramètres** ; pas
   sur les écrans de travail quotidiens.
10. Mains-libres : **promesse retirée des supports** tant que le
    mot-réveil hors-ligne n'existe pas ; l'oreillette reste utile (Tata
    parle dedans) — le dire ainsi dans les kits.

## 5. Plan d'exécution (aligné sur l'audit)

- **Phase 0 (fait dans ce lot)** : audit gravé, vérifications code,
  matrice remplie, positions posées. Reste : validation d'Alex sur les
  10 décisions + cahier des 120 scénarios prestataire à récupérer.
- **Phase 1 — vente unifiée (prochain lot de code, v5.0.0.20+)** :
  1. la vente vocale ALIMENTE LE PANIER (`addToCart`) au lieu
     d'`enregistrerVente` direct ; 2. répétition parlée avant ajout ;
  3. corrections vocales de base (« non », « annule », quantité/prix) ;
  4. retrait de la dictée du CODE (B5, immédiat).
- **Phase 2** : encaissement (monnaie annoncée systématique, états
  hors-ligne, idempotence recettée).
- **Phase 3** : crédit atomique (backend d'abord).
- **Phase 4** : entrée courte (mode adaptatif d'office, voix après la
  première vente), entrée « administration » séparée.
- **Phase 5-6** : autres rôles puis services conditionnels, selon l'audit.
