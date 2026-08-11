# Spécification — Vente vocale unifiée (Phase 1)

11/08/2026. Exigée par Alex AVANT tout code (validation des 10 décisions).
Statut : SPÉCIFICATION — aucun code Phase 1 n'est écrit tant que ce
document n'est pas validé. Le brouillon d'implémentation du 11/08 a été
JETÉ (il ajoutait au panier dès le retour d'interprétation, sans ligne
provisoire confirmée — contraire aux règles ci-dessous).

## 1. Principe

```
écoute → interprétation → LIGNE PROVISOIRE → répétition → confirmation → ajout au panier
```

- **Aucun appel à `enregistrerVente` depuis la voix.** L'enregistrement
  n'existe qu'à l'ENCAISSEMENT, dans la caisse, pour la voix comme pour
  le tactile.
- **Aucun ajout au panier avant confirmation** de la ligne provisoire.
- **Un seul panier partagé** (`CaisseContext.cart`, persistant —
  `cartStorage`). La voix et le tactile le remplissent à l'identique.
- Le panier existant SURVIT à toute erreur vocale.
- Aucun enregistrement audio conservé ou transmis sans décision explicite
  et information de l'utilisatrice (le tampon micro sert à la
  transcription locale puis est jeté — comportement actuel à préserver).

## 2. Machine d'états

```
        ┌────────────────────────────────────────────────────┐
        ▼                                                    │
  PRET ──toucher micro──▶ ECOUTE ──fin de parole──▶ TRAITEMENT
        ▲                    │ re-toucher = stop         │
        │                    ▼                           ▼
        │                ANNULE ◀──« annule »──── COMPRIS / AMBIGU
        │                    ▲                     │        │
        │                    │              répétition   question
        │                    │              parlée+écran  ciblée
        │                    │                     │        │
        │                    │                     ▼        ▼
        │                    └──« annule »── CONFIRMATION_ATTENDUE
        │                                          │ « oui » / bouton vert
        │                                          ▼
        └──────── AJOUTE (panier commun) ◀── CONFIRME
                       │                          ▲
                       ▼                          │ « non » / bouton orange
              « autre chose ou encaisser ? »   CORRECTION (modifie la ligne
                                               provisoire, JAMAIS le panier)
  ERREUR (bruit, micro, moteur) ─▶ retour PRET, panier intact, message guidé
```

États : `pret · ecoute · traitement · compris · ambigu · correction ·
confirme · ajoute · erreur · annule`. Chaque état a un rendu VISUEL
distinct (écoute ≠ traitement ≠ erreur — audit §13) + un signal sonore
et, quand disponible, une vibration.

## 3. Ligne provisoire (modèle)

```ts
interface LigneProvisoire {
  id: string;                  // uuid local
  nomParle: string;            // ce qu'elle a dit
  produitId: string | null;    // appariement catalogue (null = ligne libre)
  nomAffiche: string;          // nom catalogue ou nomParle propre
  quantite: number;            // ≥ 1
  unite: string;               // 'tas', 'kg', 'sac', 'unite'…
  prixUnitaire: number | null; // null tant que non résolu
  total: number | null;        // = quantite × prixUnitaire une fois résolu
  interpretationPrix: 'unitaire' | 'total' | 'a_confirmer';
  statut: 'a_confirmer' | 'confirmee';
  creeLe: string;              // ISO
}
```

- Une ligne provisoire CONFIRMÉE mais pas encore ajoutée (interruption,
  fermeture du modal) est PERSISTÉE localement et reproposée à la
  réouverture : « On était sur 3 tas de tomates à 500 francs. Je
  l'ajoute ? » Une ligne NON confirmée est jetée sans bruit.
- Module PUR testable au tsx (comme cartStorage/supportLu) :
  `ligneProvisoire.ts` — création, résolution prix, corrections,
  sérialisation. Suite `test:provisoire` au portail verify.

## 4. Grammaire vocale minimale (documentée, pas « conversation libre »)

| Intention | Formulations prises en charge (exemples) |
|---|---|
| Vendre | « [j'ai vendu] 3 tomates à 500 francs » · « 3 tas de tomates 1 500 » · « une cuvette de riz à 14 000 » |
| Quantité | nombre en français ou en chiffres ; nombres bambara (« waa duuru ») pour les MONTANTS |
| Unité | tas, cuvette, sac, kilo, régime, unité — sinon unité par défaut DITE explicitement |
| Prix unitaire | « à 500 francs [chacun/le tas] » |
| Prix total | « le tout à 1 500 » · « pour 1 500 francs » |
| Confirmation | « oui » · « c'est bon » · « c'est ça » · bouton VERT |
| Refus | « non » · bouton ORANGE — ouvre la CORRECTION, jamais une nouvelle vente |
| Corriger quantité | « non, deux » · « c'est deux tas » |
| Corriger prix | « le prix c'est mille » · « à 400 francs » |
| Supprimer la ligne | « enlève » · « enlève les tomates » |
| Annuler l'étape | « annule » · « recommence » — annule la LIGNE PROVISOIRE seulement |
| Article suivant | « j'ajoute » · « autre chose » · bouton « J'ajoute autre chose » |
| Encaisser | « encaisse » · « c'est tout » · bouton « Encaisser N F » |

Règles :
- **« Non » n'est JAMAIS interprété comme une nouvelle vente.** En état
  CONFIRMATION_ATTENDUE/CORRECTION, le vocabulaire de correction PRIME
  sur l'interprétation « vendre ».
- **« Annule » annule l'étape courante** (la ligne provisoire), pas le
  panier, sauf formulation explicite (« vide le panier » → confirmation
  dédiée).
- Hors grammaire → AMBIGU avec question ciblée, jamais d'action.

## 5. Ambiguïté prix unitaire / total (règle obligatoire)

« 3 tomates 1 500 » est ambigu. Résolution :
1. Si la formulation est explicite (« à X chacun », « le tout à X ») →
   résolu.
2. Sinon, si le produit est apparié et que X ≈ prix catalogue → unitaire ;
   si X ≈ 3 × prix catalogue → total. (≈ = ±20 %.)
3. Sinon → question : « 1 500 francs, c'est le prix d'UNE tomate, ou le
   prix des TROIS ? » Boutons : « d'une » / « des trois ». Aucun ajout
   tant que ce n'est pas résolu.

## 6. Dialogues exacts de Tata (à enregistrer en vraie voix)

| Moment | Phrase |
|---|---|
| Invite | « Touche-moi et dis ce que tu as vendu. » |
| Bruit / rien compris | « Je n'ai pas bien entendu. Rapproche le téléphone et redis lentement. » |
| Répétition (unitaire) | « J'ai compris : {q} {produit} à {prix} francs. Total : {total} francs. C'est bon ? » |
| Répétition (total dit) | « J'ai compris : {q} {produit} pour {total} francs. C'est bon ? » |
| Question prix | « {X} francs, c'est le prix d'un seul, ou de tous les {q} ? » |
| Prix manquant | « Et c'est à combien ? » |
| Quantité manquante | « Combien de {produit} ? » |
| Produit ambigu | « C'est lequel ? » (+ 2 photos à l'écran) |
| Correction reçue | « D'accord : {nouvelle ligne}. C'est bon ? » |
| Ajout | « C'est dans le panier. Tu ajoutes autre chose, ou tu encaisses ? » |
| Panier (sur demande) | « Ton panier : {n} articles. Total : {total} francs. » |
| Annulation d'étape | « D'accord, on oublie ça. Le panier n'a pas bougé. » |
| Erreur moteur | « Ma voix ne marche pas ici. Tape ta vente, je t'accompagne. » |

## 7. Interaction avec le panier persistant

- L'ajout passe par `addToCart(produit, quantite)` (produit du catalogue)
  ou une ligne `libre-…` (motif « Autre article » existant) ; prix dicté
  ≠ catalogue → `updateCartItemPrice` (prix convenu, mécanique négoce).
- Le stock se décrémente à l'ENCAISSEMENT uniquement (un seul chemin) —
  selon la décision n°6 : jamais d'écrasement à zéro silencieux ; si
  quantité > stock : avertissement + confirmation + écart tracé (modèle
  d'écart à définir avec le backend AVANT d'activer).
- « Encaisser » navigue vers la caisse avec la feuille panier OUVERTE ;
  l'encaissement (espèces, monnaie annoncée, confirmation multi-signaux)
  est LE MÊME que le tactile.
- Double appui sur « oui » : verrou synchrone (motif `paiementEnCoursRef`
  existant) — une seule ligne ajoutée.

## 8. Différences Web / APK

| Canal | Comportement |
|---|---|
| APK (avec plugin sherpa, cf. REPONSE_SHERPA.md) | Parcours complet ci-dessus, hors-ligne compris. |
| Web / PWA | PAS de reconnaissance (fait établi). Le micro affiche le message honnête et bascule vers la vente TACTILE. Les répétitions/confirmations parlées de Tata fonctionnent (clips + synthèse). |
| APK sans plugin (état ACTUEL) | Identique au Web — d'où le point bloquant sherpa à lever AVANT de promettre ce parcours. |

## 9. Plan de tests

Unitaires (tsx, portail verify) : `ligneProvisoire.test.mts` —
création/résolution/corrections/« non » jamais vendre/« annule » ne touche
pas le panier/persistance-reprise ; extension `venteVocale.test.mts` :
ambiguïté unitaire-total (règle ±20 %), grammaire de correction.

Appareils (APK, quand le plugin existe) et recette navigateur (partie
tactile + dialogues) — les 14 scénarios d'Alex, tous obligatoires :
vente simple · plusieurs articles · prix unitaire · prix total · quantité
corrigée · prix corrigé · article supprimé · parole interrompue · bruit ·
produit inconnu · application fermée (reprise de ligne confirmée) ·
hors-ligne · double appui · reprise du panier.

## 10. Critères de réussite terrain (pré-pilote)

- Une vendeuse NON LECTRICE réalise une vente de 2 articles avec
  correction de prix, sans aide et sans lire.
- Zéro vente enregistrée sans confirmation explicite.
- Zéro perte de panier sur erreur, bruit, fermeture, hors-ligne.
- Temps d'une vente vocale simple ≤ temps de la même vente au tactile
  après une semaine d'usage (sinon la voix ne sert pas).
