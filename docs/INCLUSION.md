# Inclusion — référence du projet Julaba

Réflexion actée le 11 août 2026 (session connexion inclusive + audit voix).
Ce document est la source de vérité du projet sur l'inclusivité. À relire avant
tout nouveau chantier UX, et à mettre à jour dans la même PR que le code quand
une décision change.

Principe fondateur (« Loi Julaba ») : chaque chose se VOIT, s'ENTEND, se TOUCHE.
Tata s'adapte à la personne, jamais l'inverse. Ce document pousse ce principe
au-delà de la lecture, vers toutes les formes d'exclusion observées au marché.

---

## 1. Décisions actées

- **Moteur vocal unique : sherpa-onnx (natif, APK).** Vosk est retiré du code
  (décision du 11/08/2026). Raison : conflit de double moteur — sur l'APK, la
  dictée en direct utilisait encore Vosk WASM et imposait un téléchargement de
  ~40 Mo alors que sherpa-onnx natif est déjà embarqué et lit « 12 500 »
  directement, hors-ligne. Conséquence assumée : sur le web (navigateur), la
  dictée hors-ligne n'existe plus — le clavier reste le filet, et la voix
  complète vit dans l'application Android.
- **Langue : bambara prioritaire, dioula en suspens.** Le bambara est bien
  documenté (ressources, corpus, proximité mandingue) ; le dioula reste
  l'objectif terrain mais attend un corpus exploitable. Les deux langues sont
  proches : le travail bambara préparera le dioula.
- **Le vocabulaire de l'interface parle le langage de la marchande.** Jamais
  « biométrie », « authentification », « WebAuthn », « crédential », « erreur
  serveur ». On dit le geste (« pose ton doigt », « regarde ton téléphone ») et
  le résultat (« Tata t'a reconnue »). Déjà appliqué à l'écran de connexion.

---

## 2. Les axes d'exclusion, du plus critique au plus structurel

### 2.1 La langue (plafond de verre actuel)

L'app affiche trois langues (français, dioula, bambara) mais le cœur vocal est
français : clips de Tata, intentions de vente, extraction des nombres. Une
marchande peu francophone peut « choisir bambara » et devoir quand même parler
français à Tata. L'inclusion linguistique prime sur l'inclusion de lecture :
une non-lectrice francophone est déjà bien servie ; une bambaraphone peu
francophone reste dehors.

Chemin réaliste (lots) :
1. **Nombres bambara** : module pur d'extraction (kɛmɛ fila = 200…) branché sur
   la sortie sherpa, très testable — même méthode que `venteVocale.ts`.
2. **Clips de Tata en bambara** : le système de clips (`public/voix/tata/`) est
   déjà un simple répertoire de .mp3 ; enregistrer la comédienne en bambara.
3. **Commandes courtes bambara** (vocabulaire fermé : vendre, dépense, solde).
4. La phrase libre reste en français tant que le modèle STT ne couvre pas le
   bambara ; mesurer avant d'aller plus loin. Modèle sherpa bambara/multilingue :
   chantier natif (APK), à instruire séparément.

### 2.2 L'argent qui se dit et se touche — pas seulement des chiffres

Savoir compter de tête (excellent chez les marchandes) n'implique pas savoir
déchiffrer « 12 500 » écrit. Deux règles :
- **Tout montant affiché doit pouvoir être entendu d'un toucher.** Déjà vrai
  pour la caisse du jour ; à généraliser (panier, reçu, historique).
- **Le montant reçu en billets, pas en chiffres.** À l'encaissement, toucher
  l'image du billet de 10 000 F (+ 2 × 500…) au lieu de taper « 11000 » : c'est
  le geste réel du marché. La monnaie à rendre peut aussi s'afficher en
  billets/pièces à rendre. Les coupures CFA sont peu nombreuses et très
  reconnaissables. Lot 100 % frontend.

### 2.3 La double exclusion silencieuse : sourdes et malentendantes

Le paradoxe d'une app « voix d'abord » : elle exclut celles qui n'entendent
pas. Une sourde lectrice s'en sort (mode lecture) ; une sourde non-lectrice est
doublement exclue. La réponse n'est ni la voix ni le texte : **pictogrammes,
couleur, vibration, animation.** Règle à ériger : toute confirmation parlée a
un équivalent visuel ET haptique fort (l'écran « Vente réussie » — plein écran
vert, grand check — est le standard ; y ajouter la vibration, et l'appliquer à
toute confirmation ou erreur importante).

### 2.4 Le corps réel au marché : soleil, yeux, mains

- **Plein soleil** : les marchés sont dehors ; la palette orange/crème et les
  textes 10-11 px sont probablement illisibles à midi sur un écran d'entrée de
  gamme. Prévoir un **mode fort contraste / gros texte**, proposé par Tata
  comme le mode d'accès (pas caché dans les réglages).
- **Presbytie** : clientèle vieillissante ; aucune information essentielle sous
  14 px.
- **Mains prises, mouillées, écrans fissurés** : grandes cibles (≥ 44 px —
  les touches 72 px actuelles sont bonnes) ; le mot-réveil mains libres reste
  la bonne direction quand il sera hors-ligne.

### 2.5 L'inclusion sociale : l'argent est une affaire privée

Au marché, l'écran est public. Le voisin d'étal lit les recettes à distance,
un code se vole par-dessus l'épaule (la reconnaissance visage/doigt y répond),
et maîtriser qui, dans le foyer, voit les revenus est une question d'autonomie
économique. Règles : solde masquable partout (pas seulement l'accueil),
montants chuchotés ou tus dans les contextes exposés, téléphone partagé prévu
d'office (fait : liste de comptes mémorisés, « Ce n'est pas moi »).

### 2.6 Celles qui n'ont pas de smartphone

Beaucoup de marchandes ont un téléphone à touches. Le backend possède déjà un
module SMS. Question de périmètre à trancher avec l'ANSUT (pas par défaut) :
un canal SMS/USSD pour le noyau minimal (« vente 500 », solde du jour), pour ne
pas faire du smartphone le ticket d'entrée. Chantier lourd (opérateurs).

---

## 3. Rendre l'inclusion vérifiable

L'inclusion ne doit pas vivre que dans la culture du projet : elle s'outille,
comme le panier (`cartStorage`) et les comptes (`comptesMemorises`).

### 3.1 Liste anti-jargon (interdite dans les chaînes UI)

biométrie, biométrique, authentification, authentifier, WebAuthn, credential,
crédential, token, jeton (visible), erreur serveur, requête, synchronisation
(préférer « mise à jour »), session expirée (préférer « reconnecte-toi »).
Cible : un test automatique qui balaie les chaînes UI et échoue si un mot
interdit apparaît.

### 3.2 Checklist « parcours sans lecture » (à cocher par écran, à chaque PR)

1. L'écran peut-il être traversé sans lire un seul mot ? (tout se dit, tout
   s'icône)
2. Toute confirmation/erreur a-t-elle un équivalent visuel + haptique ?
3. Tout montant peut-il être entendu d'un toucher ?
4. Les cibles font-elles ≥ 44 px, les infos essentielles ≥ 14 px ?
5. L'écran reste-t-il utilisable si la personne n'entend pas ? ne voit pas
   bien ? est au soleil ?
6. Un échec (réseau, capteur, quota) retombe-t-il sur un chemin qui marche,
   dit avec des mots simples ?

### 3.3 État des lieux (11/08/2026)

- Fait : profils d'accès app-wide (lecture/mixte/voix/auto qui apprend),
  voix hors-ligne (sherpa natif), clips de la vraie Tata, offline-first caisse
  (file durable, idempotence), connexion « Tata me reconnaît » (lots 1-2),
  solde masquable, grandes cibles, humour local (messages d'attente).
- Fait le 11/08/2026 (même session) :
  - Vosk retiré, sherpa-onnx moteur unique (dictée en direct refaite en
    pseudo-live sur le natif ; ~46 Mo économisés pour la marchande).
  - Nombres bambara → chiffres : module pur `nombresBambara.ts` (unités,
    dizaines, kɛmɛ, ba/waa, dɔrɔmɛ = 5 F), `npm run test:bambara`. Prêt à
    brancher sur la sortie sherpa quand le modèle bambara sera embarqué.
  - Billets CFA à l'encaissement : montant reçu composé en coupures touchées
    (dites à voix haute), monnaie à rendre décomposée en coupures
    (`utils/fcfa.ts`, `npm run test:fcfa`).
  - Test anti-jargon automatique : `npm run test:jargon` (chaînes UI de
    src/app, hors back-office/dev/identificateur) — 0 violation.
  - Confirmations sensorielles : vibration succès/erreur/tic
    (`utils/haptique.ts`) sur la caisse, la connexion et la proposition de
    reconnaissance ; total du panier parlé au toucher.
  - Mode SOLEIL : zoom global 1.1 + gris pâles relevés (`confortVisuel.ts`,
    `styles/soleil.css`, `npm run test:confort`) — bouton ☀️ sur l'accueil
    marchande + interrupteur dans les Paramètres. À valider en plein soleil
    sur WebView Android.
- À faire (ordre recommandé) : clips bambara (studio, comédienne de Tata) →
  montants parlés généralisés (reçu, historique) → modèle STT bambara dans
  l'APK (chantier natif) → checklist §3.2 cochée par écran à chaque PR →
  v2 du contraste (refonte en variables CSS pour dépasser le zoom).
