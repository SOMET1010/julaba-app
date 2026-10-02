# GO PILOTE JULABA — matrice de décision de lancement

**Ouverte le 02/10/2026, sur correction de Patrick** : « RC1 Caisse » n'est pas
« RC1 JULABA ». Nous avions figé **une partie très importante du produit en la
prenant pour le produit entier.

| | |
|---|---|
| [`RC1.md`](RC1.md) | la **caisse** est-elle assez bonne ? — figée séparément |
| **ce document** | **JULABA peut-il être lancé** sur le périmètre réel du pilote ? |

**Ce n'est pas une campagne de développement.** La règle est : **réutiliser les
preuves existantes**, et ne tester que les trous. Une grande partie est déjà
prouvée par les suites et audits en place.

**Le périmètre vient du protocole** (`docs/PILOTE.md` §2 et §3), pas d'une idée
du produit : 3 à 5 **marchandes**, 2 semaines, J0 = création de comptes réels,
saisie de 10–20 produits, 3 ventes à la voix, 1 au clavier, 1 dépense,
consulter « mes ventes ».

---

## ⚠ LE TROU QUE LA MATRICE RÉVÈLE D'ABORD

**I4, I5 et I6 sont ROUGES** (`docs/invariants/TABLEAU_DE_BORD.md`) :

| | |
|---|---|
| **I4** | idempotence **crédit** — un crédit rejoué crée **deux dettes** |
| **I5** | idempotence **acompte** — un acompte rejoué encaisse **deux fois** |
| **I6** | traçabilité **crédit** — une vente à crédit **ne laisse aucune trace en caisse** |

Ce sont des défauts d'**argent**, et le pilote se joue **au marché, avec du
réseau instable** — c'est-à-dire exactement les conditions du rejeu.

> **QUESTION BLOQUANTE — À DÉFINIR, et elle appartient à Patrick :**
> **la vente à crédit et l'acompte sont-ils utilisés pendant le pilote ?**
>
> - **Oui** → I4/I5/I6 sont **bloquants** au sens de la §5 (« écrire un montant
>   faux »), et ils remontent avant J0. Ils ne peuvent pas rester en backlog.
> - **Non** → il faut **le garantir**, pas l'espérer : si l'écran est
>   accessible, une marchande l'utilisera. Il faut alors dire comment on
>   l'empêche, et le vérifier.
>
> Le critère n° 2 du feu vert J15 est « **zéro perte ou doublon d'argent sur
> les 2 semaines, rejeux offline compris** ». Il est en contradiction directe
> avec trois invariants rouges.

---

## La matrice

Légende : **preuve existante** = ce qui est déjà vérifié et où.
**À DÉFINIR** = je ne sais pas, et je ne l'invente pas.

### Ce que le pilote utilise

| Module | utilisé au pilote ? | fonction critique | preuve existante | preuve manquante | bloquant ? |
|---|---|---|---|---|---|
| **Inscription / compte réel** (J0) | **oui** | créer un compte marchande réel, recevoir le code par SMS | skill `identifier`, SEC-2 (PIN par SMS, pas de repli BO) | **aucune passe terrain** : la création de compte n'a jamais été jouée de bout en bout sur l'APK | **à vérifier** |
| **Connexion** (numéro + code) | **oui** | entrer dans l'application | `test:verrou-connexion`, `test:entree-numero-voix`, `test:voix-connexion-lot-a` ; **critère 7 de RC1 — Caisse** | — | non |
| **Catalogue / stock** (10–20 produits) | **oui** | saisir l'étal avec la marchande | invariants I1/I3 (atomicité, survente tracée), `test:prix-catalogue`, `test:etal-marchande`, STK-03 (198 `VIV-*`) | **saisie de 10–20 produits jamais chronométrée ni jouée en vrai** à J0 | **à vérifier** |
| **Caisse — vente tactile** | **oui** | vendre | **RC1 — Caisse, critère 1** | — | non |
| **Caisse — vente vocale** | **oui** | vendre sans lire | **RC1 — Caisse, critère 2** + 7 relevés de la fiche vocale | — | non |
| **Caisse — encaissement** | **oui** | le bon montant | **RC1 — Caisse, critère 3** ; invariants argent-4, argent-4b, CAI-02, CAI-09 | — | non |
| **Panier / persistance** | **oui** | ne pas perdre une vente | **RC1 — Caisse, critère 4** (PAN-01, P0.1) | — | non |
| **Hors-ligne / rejeu** | **oui** | réseau instable au marché | **RC1 — Caisse, critère 8** ; **I2 idempotence vente 🟢** ; `test:vente-hors-ligne-statut`, `test:vente-synchronisee`, `test:refus-hors-ligne-commande` | **I7 🟡** — rejeu de file non testé spécifiquement ; **I4/I5 🔴** si crédit/acompte | **voir ci-dessus** |
| **Dépense** (1 à J0) | **oui** | le cahier de dépenses | invariants DEP-01 (libellé), DEP-02 (catégorie), `argent-depense-jour-comptable` ; `test:depense-libelle`, `test:categorie-depense` | **jamais jouée sur l'APK** dans une passe | **à vérifier** |
| **« Mes ventes » / historique** | **oui** | consulter ce qu'elle a vendu | `test:ventes-historique-etat`, `test:resume-periode`, ARG-02 (unité historique) | **jamais jouée sur l'APK** dans une passe | **à vérifier** |
| **Résumé de caisse / clôture** | **oui** | fond de caisse, écart déclaré (§4) | `caisse-fond-declare`, `argent-4b-cloture-encaissements`, CAI-02 | — | non |
| **Packs voix — « Installer ma voix »** | **oui** (question ouverte n°3, J0) | la voix hors-ligne | `test:clips-embarques`, `test:langue-non-prete`, `test:registre-voix`, `test:precache-doctrine` | **le libellé doit être observé en face-à-face** — c'est prévu au protocole, pas encore fait | non (observation) |
| **Profil marchand** | **À DÉFINIR** | — | — | lot « Profil » nommé et daté, hors dossier | **À DÉFINIR** |
| **Paramètres** | **À DÉFINIR** | changer de langue ? | `test:drapeaux-dyu`, `test:routage-audio-session` | — | **À DÉFINIR** |
| **Récupération de compte** | **À DÉFINIR** | code perdu, téléphone perdu | SEC-2 : **pas de repli back-office**, strictement SMS | **que fait-on si une marchande perd son code pendant le pilote ?** | **À DÉFINIR** |
| **Alertes** | **À DÉFINIR** | — | `test:alerte-vivante`, `argent-alerte-rupture-marchande` | — | **À DÉFINIR** |
| **Support** | **À DÉFINIR** | « qui répond au téléphone » (§6) | `test:support` | — | **À DÉFINIR** |

### Infrastructure — prérequis bloquants du protocole §2

| Prérequis | preuve existante | preuve manquante | bloquant ? |
|---|---|---|---|
| APK recetté sur 2–3 téléphones | APK `ca2e817` construit ; rapport terrain F4NT sur Samsung SM-S938B | **la passe RC1 — Caisse n'est pas faite** ; 2–3 téléphones non couverts | **oui, par le protocole** |
| `TRUST_PROXY` calibré | — | `GET /api/v1/health/net` depuis un téléphone **au marché** | **oui, par le protocole** |
| Base en plan payant + sauvegarde quotidienne | secret `BACKUP_DATABASE_URL` présent | **artefact de sauvegarde à constater la veille de J0** | **oui, par le protocole** |
| Sentry branché | — | **une erreur de test doit remonter** | **oui, par le protocole** |
| Supervision `/api/v1/health` | — | **alerte UptimeRobot à configurer** | **oui, par le protocole** |

> Ces cinq-là sont déclarés **bloquants par le protocole lui-même**, pas par
> moi. Aucun n'est constaté à ce jour dans le dépôt.

### Hors pilote — à neutraliser, pas à perfectionner

| Module | pourquoi hors pilote |
|---|---|
| **Keiwa** (portefeuille, transfert, paiements, banque, carte) | **HORS PILOTE**, contrainte permanente |
| **Producteur**, **Coopérative** | le pilote porte sur **3 à 5 marchandes** |
| **Tontines**, **Protection sociale**, **Fidélité**, **Academy**, **Marché virtuel**, **Récoltes prévues**, **Commandes** | hors du déroulé §3 |

> **Hors pilote ne veut pas dire inoffensif.** Ces écrans sont **accessibles
> depuis le menu marchand**. Une marchande qui en ouvre un pendant deux
> semaines d'usage réel peut s'y perdre, ou y faire une action d'argent.
>
> **À DÉFINIR, et c'est un arbitrage de Patrick :** les masque-t-on pour le
> pilote, ou les laisse-t-on visibles en acceptant le risque ?

---

## Comment on sort

**GO PILOTE JULABA** est prononcé quand :

1. **RC1 — Caisse** est figée (les 4 PASS de la fiche de passe + fiche vocale
   sans bloquant §5) ;
2. **aucune ligne de cette matrice n'est marquée « bloquant »** ;
3. **les cinq prérequis §2 sont constatés**, pas supposés ;
4. **les « À DÉFINIR » sont tranchés** — un trou non décidé n'est pas un trou
   fermé.

**Le régime de RC1 s'applique ici aussi** : on ne cherche pas à perfectionner
la plateforme. Pour chaque ligne, une seule question —

> **est-ce que ça empêche une marchande de vendre, d'encaisser, de retrouver
> son panier, ou de croire le montant affiché ?**

Non → `POST-PILOTE`. Oui → avant J0.

**Et un FAIL ne rouvre pas le produit, il rouvre une ligne.**
