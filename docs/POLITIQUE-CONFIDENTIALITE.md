# Politique de confidentialité — JULABA

> Cette politique explique, en français simple, quelles informations JULABA
> garde sur vous, pourquoi elle les garde, combien de temps elle les conserve,
> et quels droits vous avez sur ces informations.
>
> Elle est rédigée pour être **lue à voix haute** par l'assistante vocale
> « Tata Nanti Lou » aux utilisatrices qui ne savent pas lire. Si une phrase
> vous semble peu claire, dites-le à Tata ou écrivez-nous (voir §14 — Contact).

---

## 1. Qui sommes-nous

JULABA est un système d'exploitation du commerce informel agricole, conçu en
Côte d'Ivoire pour les commerçantes, producteurs, coopératives et
identificateurs. L'application gère la caisse, le stock, le crédit, le
portefeuille numérique (Keiwa) et le guidage vocal, y compris hors connexion
Internet.

**Éditeur de JULABA** : **ICONE Solutions**, société de droit ivoirien, dont
le siège est à Abidjan, Côte d'Ivoire.

**Responsable du traitement des données** : ICONE Solutions, en sa qualité
d'éditeur de la plateforme JULABA.

**Partenaire réglementaire** : **ANSUT** (Agence Nationale des Services
Universels des Télécommunications/TIC), autorité de tutelle du projet
« Commerce informel » financé par la DGE (Direction Générale de
l'Emploi). L'ANSUT n'a pas accès à vos données personnelles de caisse ;
elle reçoit les indicateurs agrégés nécessaires au suivi du projet.

**Loi applicable** : cette politique est établie conformément à la **loi
ivoirienne n° 2013-450 du 19 juin 2013** relative à la protection des
données à caractère personnel, ainsi qu'aux textes d'application de
l'APIPD (Autorité Ivoirienne de Protection des Données Personnelles).

---

## 2. Données que JULABA collecte sur vous

JULABA ne collecte **que** les données strictement nécessaires au service.
Voici la liste exhaustive :

### 2.1. Données d'identité et de contact

- **Numéro de téléphone** — principal identifiant de connexion.
- **Nom et prénoms** (ou appellation usuelle, si vous n'utilisez pas de nom
  officiel) — pour vous appeler par votre nom dans les messages vocaux.
- **Photo de profil** (optionnelle) — pour vous reconnaître sur l'écran
  d'accueil.
- **Adresse e-mail** (optionnelle) — pour les communications de support
  uniquement.

### 2.2. Données d'activité commerciale

- **Activité exercée** (par exemple : « vente de tomates ») et marché
  ou zone de vente.
- **Stock** : produits, quantités, prix, unités de vente.
- **Transactions financières** : ventes, dépenses, crédits accordés à des
  clientes, remboursements, fermetures de caisse. Ces transactions forment
  un **journal append-only immuable** (voir §5).
- **Mouvements de portefeuille Keiwa** : transferts, paiements, retraits,
  dépôts B-Pay.

### 2.3. Données d'identification officielle (optionnelles, sauf si vous
souhaitez un score financier ou un crédit)

- **Numéro NIN / NNI** (Numéro d'Identification National) — vérifié auprès
  de l'ONECI.
- **Numéro CNPS**, numéro CMU, récépissé d'activité.
- **Date et lieu de naissance, situation matrimoniale, nationalité.**
- **Adresse précise** : région, commune, quartier/village, boîte postale.

### 2.4. Données de localisation

- **Géolocalisation** (optionnelle, demandée à l'enrôlement) — latitude et
  longitude du point de vente. Utilisée uniquement pour cartographier le
  réseau des marchandes et faciliter le suivi terrain.

### 2.5. Données de sécurité et d'usage

- **PIN de déverrouillage** (4 chiffres) — chiffré AES-256-GCM côté serveur,
  jamais lisible en clair, jamais journalisé.
- **Empreintes WebAuthn** (reconnaissance faciale ou digitale) si vous
  activez la biométrie. L'empreinte elle-même reste sur votre téléphone ;
  seule une **assertion cryptographique** est envoyée au serveur.
- **Préférences UX** : langue de Tata Nanti Lou, niveau de voix, taille de
  police, mode sombre, vibrations. Stockées localement sur votre appareil.
- **Journaux d'audit** (audit logs) : qui s'est connecté, quand, depuis quelle
  adresse IP, quelles actions sensibles ont été faites. Conservés pour la
  sécurité du service.

### 2.6. Données vocales

- **Synthèse** : la voix de Tata Nanti Lou est générée à la volée par
  ElevenLabs (États-Unis) ou par un modèle local embarqué dans l'APK
  (Piper/SIWIS). Aucune donnée vocale personnelle n'est stockée à cette
  étape.
- **Reconnaissance vocale (hors-ligne)** : le modèle `sherpa-onnx` tourne
  entièrement sur votre téléphone. Vos commandes vocales ne quittent pas
  l'appareil. Aucun fichier audio n'est envoyé à un serveur.

---

## 3. Finalités — pourquoi JULABA garde chaque donnée

| Donnée | Pourquoi JULABA la garde |
|--------|--------------------------|
| Téléphone | Vous identifier à la connexion ; recevoir des notifications et SMS de support |
| Nom / appellation | Vous appeler par votre nom dans les messages vocaux |
| Photo | Vous reconnaître sur l'écran d'accueil |
| Activité, marché | Adapter l'interface, suggérer des produits courants |
| Stock, transactions, crédit | Tenir votre caisse, votre cahier de dépenses, votre portefeuille Keiwa |
| NIN, CNPS, CMU, récépisse | Calculer un score financier ; permettre une demande de crédit auprès d'un partenaire |
| Date de naissance, lieu, situation matrimoniale | Compléter le dossier de financement si vous en faites la demande |
| Géolocalisation | Cartographier le réseau et faciliter le suivi terrain |
| PIN, biométrie | Protéger l'accès à votre téléphone et à votre portefeuille |
| Préférences UX | Adapter la voix, la police, le thème à votre confort |
| Audit logs | Détecter les usages frauduleux, investiguer un incident, prouver une action |

---

## 4. Base légale du traitement

La loi ivoirienne n° 2013-450 distingue plusieurs fondements juridiques.
JULABA s'appuie sur les suivants :

1. **Exécution d'un contrat** (loi n° 2013-450, art. 8) : la gestion de
   caisse, de stock, de crédit et de portefeuille est le cœur du service
   que vous demandez. Sans ces données, JULABA ne peut pas fonctionner
   pour vous.
2. **Consentement explicite** (art. 7) : photo de profil, géolocalisation,
   adresse e-mail, données d'identification officielle (NIN, etc.). Vous
   pouvez refuser sans perdre l'accès au service de base.
3. **Obligation légale** : conservation des journaux d'audit et des
   transactions financières pour répondre aux exigences de l'ANSUT,
   partenaire réglementaire du projet, et de l'APIPD.
4. **Intérêt légitime** : sécurisation du service (détection d'intrusion,
   prévention de la fraude, verrouillage PIN).

---

## 5. Durée de conservation

### 5.1. Argent et transactions financières

**L'argent est sacré** (Constitution JULABA, principe 7). Toutes les
transactions financières (ventes, dépenses, crédits, mouvements Keiwa)
forment un **journal append-only immuable** : aucun mouvement n'est jamais
effacé, modifié ni écrasé. Toute correction se fait par un **événement
d'annulation tracé**.

Ces données sont conservées **sans limite de durée** tant que le compte
existe, puis rattachées à un compte **anonymisé** si vous demandez la
suppression de votre compte (voir §7). L'argent ne disparaît pas avec
votre identité.

### 5.2. Données personnelles identifiantes

- **Données d'identité, de contact, d'état civil, d'adresse, de documents
  officiels** : conservées tant que le compte est actif, puis
  **anonymisées** à la suppression du compte (voir §7).
- **Photo de profil** : anonymisée à la suppression du compte.
- **Géolocalisation** : purgée à la suppression du compte.
- **Journaux d'audit** : conservés 24 mois pour la sécurité, puis archivés
  anonymisés 5 ans pour les obligations comptables.

### 5.3. Inactifs

Un compte qui n'a pas été utilisé pendant **3 ans** est considéré comme
inactif. Vous recevez un avertissement par SMS 30 jours avant toute
anonymisation automatique, sauf si vous vous reconnectez.

---

## 6. Sécurité

JULABA applique les mesures techniques suivantes, vérifiées par audit et par
tests automatisés (invariants) :

- **Chiffrement AES-256-GCM** pour le PIN (vecteur d'initialisation aléatoire
  12 octets, tag d'authentification). Le PIN n'est jamais lisible, jamais
  choisi par un administrateur, jamais journalisé (SEC-05, SEC-07, SEC-08
  fermés).
- **bcrypt** pour les mots de passe (facteur de coût adapté au matériel).
- **JWT + rotation de refresh tokens** : chaque refresh est à usage unique ;
  un token rejoué déclenche la révocation de toutes les sessions. Limite de
  5 sessions simultanées par utilisatrice.
- **WebAuthn / passkeys** (reconnaissance faciale ou digitale) — optionnel.
- **Verrouillage progressif du PIN** : 3 → 5 min, 6 → 15 min, 9+ → 1 h.
  Jamais de verrouillage définitif.
- **Allow-list de rôles fail-closed** : un compte `super_admin` ne peut
  jamais être créé par une voie publique.
- **Cookies httpOnly + Secure + SameSite** — le JavaScript du navigateur ne
  peut pas lire le jeton de session.
- **Sauvegardes chiffrées AES-256-CBC** : un dump quotidien de la base
  PostgreSQL, chiffré par une passphrase séparée, est conservé 7 jours
  (quotidien) et 35 jours (dimanche).
- **Audit logs en base** : `audit_logs` enregistre userId, action, entité,
  IP, détails — pour investiguer tout incident.
- **Échec rapide en production** : si un secret manquait au démarrage du
  serveur, l'application refuse de démarrer plutôt que de tourner sans
  chiffrement.

---

## 7. Vos droits

Conformément à la loi ivoirienne n° 2013-450 (art. 16 à 21), vous disposez
des droits suivants sur vos données personnelles :

| Droit | Ce que ça signifie concrètement |
|-------|---------------------------------|
| **Accès** | Vous pouvez demander à JULABA la liste des données qu'elle détient sur vous |
| **Rectification** | Vous pouvez corriger une donnée inexacte (nom, téléphone, activité, etc.) |
| **Suppression (droit à l'oubli)** | Vous pouvez demander l'anonymisation de votre compte. Tous les champs personnels identifiants sont purgés : téléphone, e-mail, photo, NIN, CNPS, CMU, récépisse, date/lieu de naissance, situation matrimoniale, adresse, coordonnées GPS, documents d'identification. Votre compte passe au statut `SUPPRIME` |
| **Opposition** | Vous pouvez vous opposer à un traitement spécifique (par exemple la géolocalisation) sans perdre l'accès au service de base |
| **Portabilité** | Vous pouvez demander un export de vos données personnelles au format JSON ou CSV |
| **Limitation** | Vous pouvez demander la suspension temporaire d'un traitement en cas de contestation |

### 7.1. Comment exercer ces droits

- **Depuis l'application** : ouvrez **Paramètres → Mes données**. Vous y
  trouverez des boutons pour demander l'accès, la rectification, la
  suppression et l'opposition. La suppression de compte est protégée par
  votre code de connexion (4 chiffres) pour éviter qu'une autre personne ne
  supprime votre compte à votre insu.
- **Par écrit** : envoyez un message à `dpo@julaba.online` en indiquant
  votre numéro de téléphone et la nature de votre demande.
- **Via l'APIPD** : si vous estimez que JULABA n'a pas répondu
  correctement, vous pouvez saisir l'Autorité Ivoirienne de Protection
  des Données à caractère personnel.

### 7.2. Particularité du droit à l'oubli — l'argent est conservé

Quand vous supprimez votre compte via **Paramètres → Mes données →
Supprimer mon compte**, l'opération suivante se produit, prouvée par un
**invariant exécutable** (cf. `backend/test/invariants/suppression-compte-
anonymisation.spec.ts`) :

- **Tous les champs personnels identifiants sont anonymisés** — votre
  téléphone devient `deleted_<id>`, votre nom devient « Compte Supprimé »,
  votre photo, votre NIN, votre adresse, vos documents d'identification et
  vos coordonnées GPS sont purgés.
- **L'argent et l'historique de transactions sont INTACTS** — conformément
  à la Constitution JULABA (§7, l'argent est sacré), votre portefeuille
  Keiwa et toutes vos `wallet_transactions` restent rattachés au même
  identifiant utilisateur. La suppression de votre identité ne casse jamais
  l'historique financier.

C'est la garantie la plus importante de cette politique : **votre droit à
l'oubli porte sur votre identité, jamais sur votre argent**.

---

## 8. Consentement parlé (pour les non-lectrices)

La plupart des politiques de confidentialité supposent que la personne a lu
et cliqué sur « J'accepte ». Pour les marchandes non-lectrices, ce geste
n'a pas de valeur juridique réelle : il est impossible de consentir à un
texte qu'on n'a pas lu.

JULABA applique la **Décision métier n° 8** (validée le 11/08/2026) :

1. **Lecture audio** : la phrase de consentement est lue à voix haute par
   Tata Nanti Lou, dans la langue de l'utilisatrice.
2. **Ré-audition possible** : la personne peut demander à réécouter la
   phrase autant de fois qu'elle le souhaite.
3. **Affichage des données concernées** : identité, photo, document
   d'identité, position GPS sont montrés à l'écran pendant la demande de
   consentement.
4. **Droit de refus** : la personne peut refuser sans que cela bloque
   l'enrôlement de base (les données optionnelles ne sont alors pas
   collectées).
5. **Agent empêché de confirmer à la place de l'acteur** : aucun
   identificateur ne peut cocher la case de consentement pour la
   marchande. Seule la marchande peut le faire.
6. **Traçabilité** : à chaque consentement, JULABA enregistre la **version
   du texte**, l'**horodatage**, l'**agent présent** (identificateur) et
   la **réponse** (accepté/refusé). Ces métadonnées sont conservées pour
   preuve juridique.

---

## 9. Partage avec des tiers

JULABA ne **vend** jamais vos données personnelles. Vos données sont
partagées uniquement dans les cas suivants :

| Tiers | Données partagées | Raison |
|-------|-------------------|--------|
| **ANSUT** | Indicateurs agrégés (nombre d'utilisatrices actives, volume de transactions en FCFA) | Suivi réglementaire du projet DGE |
| **B-Pay** | Numéro de téléphone, montant de la transaction | Paiement mobile money |
| **ONECI** | Numéro NIN | Vérification de l'identité pour le score financier |
| **ElevenLabs** | Texte à synthétiser (pas de données personnelles identifiantes au-delà du prénom) | Synthèse vocale de Tata Nanti Lou |
| **Render** | Données hébergées sur ses serveurs aux États-Unis | Hébergement de la plateforme |
| **Sentry** | Messages d'erreur techniques anonymisés | Surveillance des bugs |
| **APIPD** | Sur réquisition légale | Contrôle de conformité |

Aucun autre tiers n'a accès à vos données. En particulier, **aucune
régie publicitaire** et **aucun courtier en données** ne reçoit quoi que ce
soit de JULABA.

---

## 10. Transferts hors de Côte d'Ivoire

Vos données sont principalement hébergées par **Render** (États-Unis) pour
le serveur applicatif et la base PostgreSQL, par **Sentry** (États-Unis)
pour la surveillance des erreurs, et par **ElevenLabs** (États-Unis) pour
la synthèse vocale cloud.

Ces transferts sont encadrés par :

- des **garanties contractuelles appropriées** (clauses contractuelles
  types, encadrement technique) avec chaque prestataire ;
- la **minimisation** des données envoyées : seules les données strictement
  nécessaires transitent. En particulier, ElevenLabs ne reçoit jamais votre
  PIN, votre NIN, ni votre historique financier ;
- la possibilité pour JULABA de **rapatrier** l'ensemble des données en
  Côte d'Ivoire à tout moment, à votre demande ou sur décision de l'APIPD.

La **reconnaissance vocale hors-ligne** (sherpa-onnx) tourne entièrement sur
votre téléphone : aucune donnée vocale ne quitte l'appareil.

---

## 11. Cookies et stockage local

JULABA utilise les technologies de stockage suivantes :

- **Cookie `bo_access_token`** (back-office) et **`access_token`**
  (application marchande) : contient le jeton JWT de session, en attribut
  `httpOnly`, `Secure`, `SameSite=None`. Vous ne pouvez pas le lire depuis
  JavaScript ; il est effacé à la déconnexion.
- **Cookie `refresh_token`** : jeton de rafraîchissement à usage unique,
  mêmes attributs de sécurité.
- **localStorage** : préférences UX (langue de Tata, taille de police, mode
  sombre, vibrations). Ces données restent sur votre appareil et ne sont
  jamais envoyées au serveur.
- **IndexedDB / SQLite (mobile)** : cache hors-ligne des transactions,
  synchronisé avec le serveur quand la connexion revient.

JULABA n'utilise **aucun cookie publicitaire** ni **aucun pixel de suivi**
tierce partie.

---

## 12. Mineurs

JULABA est destinée aux **adultes** commerçantes, producteurs,
coopérateurs et identificateurs. JULABA ne collecte pas intentionnellement
de données de mineurs. Si vous êtes parent ou tuteur et que vous constatez
qu'un mineur a créé un compte sans votre autorisation, contactez
`dpo@julaba.online` : nous anonymiserons le compte sans délai.

---

## 13. Modification de cette politique

Cette politique peut être modifiée pour refléter :

- une évolution de la loi ivoirienne ou des directives de l'APIPD ;
- l'ajout ou le retrait d'un partenaire ;
- une évolution du service (nouvelle fonctionnalité, nouveau type de
  donnée).

À chaque modification :

1. le **numéro de version** (en bas de ce document) est incrémenté ;
2. la **nouvelle version** est publiée sur l'application et accessible
   depuis **Paramètres → Mes données → Voir la politique complète** ;
3. les utilisatrices existantes reçoivent une **notification** à la
   prochaine ouverture de session si la modification est substantielle ;
4. le **consentement** est repris selon la procédure du §8 si la
   modification porte sur une donnée collectée par consentement.

---

## 14. Contact — Délégué à la Protection des Données (DPO)

Pour toute question, demande d'exercice de droits, ou notification d'incident
de sécurité :

- **E-mail DPO** : `dpo@julaba.online`
- **Téléphone support** : disponible dans l'application, rubrique **Support**
- **Courrier postal** : ICONE Solutions — DPO JULABA, à l'attention de
  l'éditeur, Abidjan, Côte d'Ivoire (adresse complète sur demande).
- **Partenaire réglementaire ANSUT** : pour les sujets relevant du projet
  « Commerce informel » financé par la DGE.

L'APIPD (Autorité Ivoirienne de Protection des Données à caractère
personnel) peut être saisie à tout moment si vous estimez que JULABA n'a pas
respecté vos droits.

> Le DPO dédié sera nommé formellement avant le pilote national. En
> attendant, l'équipe ICONE Solutions assure la fonction.

---

## 15. Version

- **Version** : v1.0
- **Date d'entrée en vigueur** : 28 septembre 2026
- **Loi applicable** : loi ivoirienne n° 2013-450 du 19 juin 2013 relative
  à la protection des données à caractère personnel
- **Éditeur** : ICONE Solutions (Abidjan, Côte d'Ivoire)
- **Projet** : JULABA — Système d'exploitation du commerce informel
  agricole, financé par la DGE et accompagné par l'ANSUT

---

*Document à lire à voix haute par Tata Nanti Lou pour les utilisatrices
non-lectrices. Pour réécouter ce texte, ouvrez **Paramètres → Mes données**
et touchez le bouton microphone.*
