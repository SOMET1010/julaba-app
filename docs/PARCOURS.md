# Cartographie des parcours — écrans, textes, voix

Demande d'Alex (11/08/2026) : le détail de chaque parcours, leurs écrans,
les voix et les textes qui les accompagnent — pour pouvoir RÉPARER des
parcours au-delà des bugs. Croisé avec le document de présentation aux DG
(réunion DGE/ANSUT du 24/07/2026) : les écarts sont en fin de document.

Sources : `routes.tsx` (écrans réels), `onboardingVoix.ts` (8 clips
d'histoire), `tataUiClips.ts` (137 clips UI de la vraie Tata),
`accessMode.ts` (profils lecture/mixte/voix/auto), captures des recettes
(docs/RECETTE.md).

---

## 1. Parcours d'ENTRÉE (commun à toutes)

| # | Écran (route) | Ce qu'on voit | Ce que dit Tata (texte EXACT du clip) |
|---|---|---|---|
| 1 | Atterrissage `/welcome` | Photo marché plein écran, logo Jùlaba, carte DGE + ANSUT, « Commencer », « by icone » en bas à droite | 1re fois : « Bonjour ! Moi, c'est Tata. Je serai avec toi pour vendre, compter ton argent… » (`intro-accueil.mp3`) · habituée : « Re-bonjour ! On y va. » (`intro-retour.mp3`) |
| 2 | Onboarding 1/2 | Portrait Tata, haut-parleur rayonnant, « Moi, c'est Tata », « Suivant » | « Je serai avec toi chaque jour dans ton commerce. On est ensemble. » (`intro-1.mp3`) |
| 3 | Onboarding 2/2 | « Touche et parle », gros micro à ondes + main, pictos micro → 🍅×3 → 1 500 F → ✓, « Commencer » | « Tu peux me parler, ou utiliser le clavier. C'est toi qui décides. » (`intro-3.mp3`) |
| 4 | Choix du mode | 4 cartes : Laisse Julaba choisir (reco) / Je sais lire / Je lis un peu / Je préfère parler | « Comment préfères-tu travailler avec moi ? Le plus simple : laisse-moi choisir, je m'adapte à toi… » (`intro-mode.mp3`) |
| 5 | Installer ma voix (si mixte/voix) | Carte « Ma voix », bouton installer, « Plus tard » | « Pour que je puisse t'écouter et te parler partout, même sans réseau, on installe ma voix une fois… » (`intro-voix.mp3`) |
| 6 | Fin | — | « Bravo ! Nous sommes prêtes. Ouvrons ta boutique. » (`intro-bravo.mp3`) |
| 7 | Connexion `/login` | PAVÉ à gros chiffres (10 points), micro (dictée sherpa), clavier, empreinte | Guidage selon le mode : « Dis ton numéro, ou tape-le. » puis « Entre ton code secret à 4 chiffres » (`ui-035`) |
| 8 | Retour (compte mémorisé) | « Bonjour {Prénom} ! », GRAND bouton empreinte, « Utiliser mon code », « Ce n'est pas moi » | « Touche le grand bouton, ton téléphone va te reconnaître. » / sans biométrie : « Touche le grand bouton et entre ton code. » |
| 9 | Proposition (après 1re connexion au code) | « {Prénom}, veux-tu que Tata te reconnaisse la prochaine fois ? » Oui, je veux / Non | (voix navigateur, même phrase) — refus mémorisé, jamais re-proposé en boucle |

Clips inutilisés depuis le passage à 2 écrans : `intro-2` (« Tu vends.
J'enregistre. Je compte… ») et `intro-4` (« Tout est prêt. Ouvrons ta
boutique. ») — réutilisables ailleurs.

---

## 2. Parcours MARCHANDE (détaillante · demi-grossiste · grossiste)

Écrans (`/marchand/...`) : accueil voix · `caisse` · `cahier` (dépenses) ·
`depense` · `stock` · `marche` (virtuel, selon sous-profil) ·
`recoltes-prevues` · `ventes-passees` · `resume-caisse` · `commandes` ·
`alertes` · `cooperative` (+ `besoin`) · `protection-sociale` · `fidelite` ·
`academy` · `keiwa` (+ transfert/paiements/banque/carte/historique) ·
`profil` · `parametres` · `support`.

**Le fil d'une journée :**
1. **Accueil voix** — « Bonjour Maman {Prénom} » (toucher Tata → elle le dit),
   caisse verte qui SE DIT (« Ta caisse : 1 500 francs »), bouton ☀️ soleil
   (« Mode soleil : tout est plus grand. »), NOUVELLE VENTE, Vendre à la voix,
   4 tuiles (stock, dépenses, ventes, Keiwa).
2. **Caisse** — accueil parlé « Bienvenue sur le terminal de vente. Ajoute
   tes produits au panier » (`ui-004`) ; vente rapide dynamique ; panier :
   quantité tapée (toutes), **prix convenu par ligne (négoce seulement)** ;
   paiement Espèces / Mobile money / Crédit ; BILLETS CFA colorés + « Compte
   juste » ; validation → vibration de succès + total parlé ; reçu WhatsApp.
   Ouverture du jour : « Combien tu as en caisse ce matin ? » (`ui-010`).
3. **Vente à la voix** — dictée sherpa hors-ligne (« 3 tomates 1500 »),
   appariement produit, produit inconnu → Tata propose de l'ajouter
   (prix dicté, refus mémorisé).
4. **Dépenses** — « Dépense enregistrée » (`ui-034`) ; erreurs parlées
   (« Entre un montant valide », `ui-036`).
5. **Marché virtuel** (demi-grossiste/grossiste) — KPIs, producteurs triés
   par distance, « {produit} ajouté au panier » (toast + voix), négociation
   (« Contre-proposition envoyée » `ui-020`, « Contre-offre refusée. »
   `ui-019`) ; marchand sans sous-profil → bandeau d'explication.
6. **Fin de journée** — résumé caisse, clôture ; rapport hebdo.
7. **Protection sociale** — cotisations CNPS (retraite) / CNAM (santé) :
   suivi local, en attente des API officielles (voir Écarts).

**Objectif du jour** : « Dis ton objectif » = dictée sherpa + nombres
bambara (« waa duuru » = 10 000), montant rempli en direct.

---

## 3. Parcours PRODUCTEUR (`/producteur/...`)

Écrans : accueil · `production` · `declarer-recolte` · `recoltes` ·
`stocks` · `publier-recolte` · `commandes` · `academy` · `keiwa` ·
`profil` · `parametres` · `alertes` · `support`.

Fil : accueil (« Bonjour {Prénom} ! Enregistre tes récoltes et ventes
aujourd'hui » — bug « Bonjour undefined » corrigé en v5.0.0.19) → carrousel
Score Jùlaba (1re visite, 5 étapes) → « Création de plantation agricole »
(`ui-021`) → « Déclaration de récolte » (`ui-030`/`ui-031`) → publier au
marché (« Récolte publiée sur le marché » — clip présent) → commandes des
grossistes/coopératives (« Demande acceptée » `ui-023`, « Commande marquée
comme livrée » `ui-012`).

---

## 4. Parcours COOPÉRATIVE (`/cooperative/...`)

Écrans : accueil · `membres` · `stock` · `finances` · `tresorerie` ·
`marche` (MarcheHub) · `commandes` · `academy` · `keiwa` · `profil` ·
`parametres` · `support`.

Fil : accueil (« Bienvenue {Coopérative} ! Gère tes membres et stocks
communs ») → membres (score par membre) → stocks communs (distribution :
NEUTRALISÉE côté backend, voir RESIDUS.md) → MarcheHub achats/ventes →
commandes (« Commandes urgentes » `ui-015`, « Commandes livrées » `ui-014`)
→ trésorerie.

---

## 5. Parcours IDENTIFICATEUR / agent terrain (`/identificateur/...`)

Écrans : dashboard · `identification` (nouveau dossier) ·
`fiche-identification` (fiche dynamique) · `brouillons` · `suivi` ·
`acteurs` (+ `acteur/:numero`) · `demande-mutation` · `identifications` ·
`statistiques` · `rapports` · `academy` · `keiwa` · `parametres` · `support`.

Fil : accueil (« ta zone a N identifications », avertissement « Écran
sensible. Ne pas capturer ») → nouveau dossier (fiche dynamique : identité,
géolocalisation, photos, documents — « Document chargé avec succès. En
attente de vérification » `ui-025`, « Erreur de synchronisation. Fiche
sauvegardée localement. » `ui-038` = travail HORS-LIGNE réel) → brouillons →
envoi au BO pour validation → rapports.

---

## 6. Parcours INSTITUTION (`/institution/...`)

Écrans : accueil (Vue Macro Nationale) · `dashboard` ·
`dashboard-analytics` · `analytics` · `acteurs` · `supervision` ·
`audit-trail` · `academy` · `profil` · `parametres`.

Fil : vue macro (12 acteurs actifs / 13) → analytics → supervision par
territoire → audit trail. Voix quasi absente ici (public lettré, écrans
denses) — choix assumé.

---

## 7. Parcours BACK-OFFICE DGE (`/backoffice/...`)

Login dédié (e-mail ou téléphone + mot de passe, cookies HttpOnly, pied
« Projet DGE × ANSUT · édité par Icone Solution ») → tableau de bord
admin : OPÉRATIONS TERRAIN (Acteurs, Enrôlement — VALIDATION des dossiers,
Supervision, Zones & Territoires, CARTE des acteurs, Modération, Mutations)
· KEIWA WALLET · rapports. Déconnexion parlée : « Au revoir. Déconnexion du
Back-Office. » (`ui-002`).

---

## 8. La VOIX en synthèse

- **8 clips d'histoire** (`onboardingVoix.ts`) — entrée et onboarding,
  vraie voix, robot en secours si le .mp3 manque.
- **137 clips UI** (`tataUiClips.ts`) — messages fixes de l'appli dits par
  la vraie Tata (correspondance exacte, sinon voix de secours) : caisse,
  commandes, documents, erreurs, formation…
- **Montants dynamiques** — toujours voix de synthèse (un montant ne peut
  pas être pré-enregistré) : caisse, totaux, KPI parlés au toucher.
- **Sherpa hors-ligne** (APK) — ELLE parle À l'appli : numéro, code,
  vente dictée, objectif, nombres bambara.
- **Où la voix MANQUE le plus** (opportunités de réparation) :
  1. Marché virtuel : la négociation n'est pas guidée à la voix.
  2. Protection sociale : aucun accompagnement vocal (sujet anxiogène —
     une explication parlée CNPS/CMU aiderait).
  3. Fiche d'identification : l'agent est lettré, mais l'ACTEUR en face ne
     l'est pas toujours — une phrase de consentement parlée serait utile.
  4. Keiwa : transferts/paiements sans confirmation parlée du montant.
  5. Clips `intro-2` / `intro-4` orphelins depuis l'onboarding à 2 écrans.

---

## 9. ÉCARTS avec la présentation DG (24/07/2026)

### Ce que la présentation promet et que l'app TIENT (vérifié en recette)
- Enrôlement, identité numérique, géolocalisation, validation DGE ✓
- Stocks, production, coopératives, ventes, historique ✓
- Marché virtuel + commandes ✓ (négociation présente)
- Back-office DGE : vue nationale, carte, indicateurs, validation ✓
- 7 profils paramétrés ✓ (marchand ×3 sous-profils, producteur,
  coopérative, agent terrain, institution, admin/BO)
- Parcours de bout en bout ✓ (séquence enrôlement → vente → marché →
  reporting déroulée par le seed démo « Hervé → Bénito → COOP → Michelle
  → DG »)

### Écarts et points de vigilance AVANT le pré-pilote
1. **Oreillette / mains libres (kit, diapo 14)** : la promesse « recevoir
   l'assistance vocale en gardant les mains disponibles » suppose un
   MOT-RÉVEIL ou une écoute continue. Or le mot-réveil a été RETIRÉ (résidu
   legacy, cf. RESIDUS.md) — aujourd'hui la voix se déclenche AU TOUCHER.
   Tata PARLE dans l'oreillette, mais l'écoute mains-libres n'existe pas.
   → À trancher : réintroduire un mot-réveil hors-ligne (sherpa) ou
   reformuler la promesse du kit.
2. **Paiement numérique (diapos 3 et 21)** : annoncé « dans un futur
   proche » ; la diapo 21 le classe pourtant dans « CE QUI EST ACQUIS »
   (« Marché virtuel, ventes et paiements »). L'app a Keiwa (UI complète)
   et le backend a bpay/escrow, mais le bout-en-bout paiement réel
   (mobile money) n'a pas été recetté. → Aligner le discours ou prioriser
   la recette paiement.
3. **CNPS/CNAM (diapos 15-16)** : l'écran Protection sociale est un SUIVI
   LOCAL en attente des API officielles — conforme à la dépendance
   « conventions à relancer », mais à dire clairement dans les kits.
4. **Livraison (diapo 3)** : « livraison opérationnelle » — les statuts
   existent (« Commande marquée comme livrée »), il n'y a PAS de module
   logistique (suivi transporteur). Vérifier que la promesse est comprise
   comme un suivi de statut.
5. **120 scénarios de recette (diapo 8)** : référentiel du prestataire ;
   notre recette interne UAT couvre les parcours cœur (docs/RECETTE.md).
   → Demander le cahier des 120 scénarios pour le rejouer.
6. **3 rapports (notes diapo 8)** : hebdo marchand ✓, identificateur ✓,
   back-office : à vérifier à l'écran (non recetté).
7. **Vidéos (diapos 7 et 20)** : hors app — à produire pour la cérémonie.
