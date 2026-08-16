# 🔐 Parcours authentification — spécification cible

> **Statut :** spécification (cible à atteindre), pas un état des lieux. Le pendant
> « état actuel » est l'audit `AUDIT-AUTH-NON-LECTRICES` (à committer à côté).
> **Public :** marchandes **peu ou non lectrices**, téléphones **modestes**, souvent
> **hors-ligne**, parfois **partagés**.
> **Langage normatif :** **DOIT** = exigence · **DEVRAIT** = fortement recommandé ·
> **À VALIDER** = décision fondateur ou à tester avec de vraies marchandes avant de coder.
> **Rien n'est « fait »** tant que les 3 sous-parcours (enrôlement, quotidien,
> récupération) ne sont pas **accessibles ET testés** avec de vraies utilisatrices.

---

## 0. Cadre, principes et modèle de menace

### 0.1 Principes fondateurs (non négociables)
1. **Aucune épreuve de lecture, de mémoire ou de transcription** ne DOIT être exigée
   pour se connecter au quotidien (WCAG 2.2 — *Accessible Authentication*). En clair :
   pas de numéro à 10 chiffres à taper, pas de code à lire, pas de dictée de chiffres.
2. **La sécurité passe avant le confort.** Un accès facile qui laisse un tiers entrer
   dans la caisse d'une marchande est un échec, pas une fonctionnalité.
3. **L'identité n'est liée NI à la SIM NI au numéro comme secret.** Le numéro reste la
   **clé de compte** côté serveur (admin, récupération), mais n'est **jamais** un
   facteur d'authentification ni un signal vivant. Changer de SIM ne DOIT rien changer.
4. **Toute action sensible est vérifiée côté serveur.** Un verrou/contrôle côté client
   (ex. `lock` mémoire, `Infinity`) n'est **pas** une protection.
5. **Boutons multi-canal.** Une action clé DOIT être reconnaissable par **couleur +
   forme + position + icône + audio** — jamais « le bouton vert » seul.

### 0.2 Modèle de menace (à cadrer AVANT de coder récupération/partage)
**Acteurs**
| Acteur | Confiance | Menace |
|---|---|---|
| **Marchande** | légitime | se fait verrouiller dehors (perte d'accès) |
| **Identificateur** (agent qui enrôle) | **semi-confiance** | pourrait se connecter **à sa place** |
| **Voisin / client curieux** | hostile ponctuel | épie l'écran / écoute un secret dit à voix haute |
| **Co-utilisateur** (téléphone partagé) | semi-confiance | accède au mauvais compte |
| **Voleur du téléphone** | hostile | entre dans la caisse via une session/secret persistant |

**Biens à protéger :** l'argent et les données de caisse de la marchande ; son compte.
**Hypothèse clé :** l'identificateur est **utile mais pas pleinement fiable** → il ne
DOIT jamais détenir seul de quoi se connecter en tant qu'elle.

### 0.3 Contrainte matérielle honnête (À VALIDER sur le terrain)
La connexion « WebAuthn prioritaire » (empreinte/visage/verrou d'écran) **suppose que
le téléphone a un verrou d'écran ou une biométrie configurés**. Sur des téléphones très
bas de gamme, partagés, ou sans verrou, **ce n'est pas garanti**. Il FAUT donc :
- mesurer, sur un échantillon réel de marchandes, **quelle proportion a un verrou/biométrie** ;
- prévoir un **repli accessible** pour celles qui n'en ont pas (voir §2.4).
> **À VALIDER :** sans cette mesure terrain, « WebAuthn prioritaire » est un pari, pas un fait.

### 0.4 Pré-requis de sécurité immédiat (P0, avant tout le reste)
Le mot de passe par défaut **`0000`** est un **trou de sécurité immédiat** (comptes réels
potentiellement accessibles). Le corriger est un **préalable**, pas une étape de ce parcours :
inventorier les comptes sur `0000`, **forcer la rotation**, rendre le seed de démo
**opt-in** (jamais actif en prod). Tant que ce n'est pas fait, le reste est théorique.

---

## 1. Enrôlement (assisté)

> But : une marchande obtient un accès **à elle**, sans jamais lire/taper son numéro,
> **sur son propre téléphone**, avec un **consentement** et **sans que l'identificateur
> puisse ensuite se connecter à sa place**.

### 1.1 Exigences
1. L'enrôlement DOIT se faire **sur le téléphone de LA MARCHANDE** (celui qu'elle
   utilisera), l'identificateur **assistant** la manœuvre.
   > Changement vs actuel (enrôlement sur le tel de l'identificateur, PIN `0000`).
2. Le **numéro est saisi par l'identificateur** (lettré) — elle ne le tape jamais.
3. Un **consentement explicite** de la marchande DOIT être **capturé et horodaté**
   (au minimum : une confirmation par elle — empreinte/toucher long sur un bouton
   « C'est mon compte » + trace serveur). L'absence de consentement dans le code
   n'équivaut PAS à un consentement humain.
4. Le **secret d'accès enrôlé** est, par ordre de préférence :
   - **(a) Authentificateur de plateforme (WebAuthn)** : empreinte/visage/verrou de
     SON téléphone → un **identifiant découvrable (resident key)** est créé **sur son
     appareil**. C'est ce qui rend la connexion quotidienne **sans numéro**.
   - **(b) Repli non lié à la lecture** si (a) indisponible (voir §1.3).
5. **`0000` est interdit** comme secret durable. Aucun compte ne DOIT rester sur un
   secret par défaut après l'enrôlement.
6. **Anti-abus identificateur :** à l'issue de l'enrôlement, l'identificateur ne DOIT
   pas détenir de quoi se connecter en tant qu'elle. Le facteur (biométrie/plateforme)
   vit **sur le téléphone de la marchande**, pas chez lui.

### 1.2 Le cas « PIN vocal » — À VALIDER (deux problèmes réels)
Un **PIN dicté à voix haute** pose deux problèmes que je dois signaler :
- **Il n'est plus secret** s'il est prononcé devant un client/voisin.
- **La dictée de chiffres n'est pas fiable** (ton propre constat sur Vosk/Sherpa).

**Recommandation :** ne PAS faire de la voix le porteur du secret. Le secret quotidien
DEVRAIT être la **biométrie de plateforme** (§1.1a). Si un « code » de repli est
nécessaire, préférer un secret **non-numérique et non-oral** :
- **mot de passe imagé** (elle choisit et reconnaît 2–3 images parmi d'autres), ou
- **code saisi en privé** au pavé (jamais dicté), annoncé par audio **au casque/à voix
  basse**, pas affiché en clair.
> **À VALIDER (fondateur + terrain) :** garde-t-on l'idée d'un « PIN vocal », et si oui
> uniquement comme *aide à la saisie privée* (pas comme secret prononcé) ? Décision à
> prendre avant de spécifier l'écran.

### 1.3 Repli d'enrôlement (si pas de biométrie sur le téléphone)
Si l'appareil n'a pas d'authentificateur de plateforme utilisable, l'enrôlement DOIT
proposer un secret **accessible** (mot de passe imagé recommandé, §1.2) **choisi par
elle**, jamais `0000`, avec le même consentement tracé.

---

## 2. Connexion quotidienne (WebAuthn prioritaire, numéro caché)

> But : elle ouvre Julaba et **entre sans rien lire ni taper**. Le numéro existe
> côté serveur mais **ne lui est jamais demandé**.

### 2.1 Chemin principal — WebAuthn découvrable (sans identifiant)
1. La connexion quotidienne DOIT utiliser un **authentificateur de plateforme** avec
   **identifiant découvrable** (`residentKey: required`, `userVerification: required`,
   `allowCredentials: []`) → **aucun numéro saisi**, elle valide par empreinte/visage.
2. **WebAuthn n'est PAS « la biométrie »** : c'est un protocole de clé publique ; la
   biométrie ne sert qu'à **déverrouiller la clé locale**, elle ne quitte jamais le
   téléphone. (À écrire ainsi dans l'UI/formation, sans raccourci trompeur.)
3. Le bouton d'entrée DOIT être multi-canal (§0.1.5) et **assisté à l'audio** (« Touche
   ici et pose ton doigt »), pas un simple bouton vert.

### 2.2 Le numéro est « caché », pas supprimé
Le numéro reste la **clé de compte** (admin, récupération). « Caché » = **jamais
demandé à la marchande** dans le flux quotidien. Il n'apparaît que dans les parcours
**assistés** (enrôlement, récupération).

### 2.3 Persistance de session (le point sensible)
1. On NE DOIT PAS stocker de **jeton durable exploitable** (token long-vécu) dans un
   stockage lisible par JS (`localStorage`) : un vol de téléphone donnerait la caisse.
2. Cible : **re-authentification par l'authentificateur de plateforme** plutôt qu'un
   secret persistant. Une session courte est acceptable ; sa **prolongation** DOIT
   repasser par une vérification utilisateur (empreinte), au moins pour les actions
   sensibles (clôture, dépenses, crédit).
3. Le **service worker** sert la coquille hors-ligne (déjà en place) mais **ne DOIT
   pas** servir de coffre à secret.
> **À VALIDER :** durée de session « sans re-toucher l'empreinte » acceptable pour une
> marchande en plein marché (confort) vs risque (téléphone posé/volé). À arbitrer.

### 2.4 Repli si la biométrie échoue ou est absente (question ouverte, tranchée ici)
Ordre de repli, **sans jamais demander le numéro** :
1. **Réessai** biométrie (2 tentatives, guidage audio).
2. **Secret accessible** choisi à l'enrôlement (mot de passe imagé, §1.2) — saisie
   **privée**, jamais dictée.
3. Si échec répété → **parcours de récupération** (§3), assisté.
Le **verrouillage anti-force-brute DOIT être côté serveur** (temporisation), pas un
compteur client.

---

## 3. Récupération (code identificateur, ré-enrôlement assisté)

> Le scénario **le plus dur et le plus cassé aujourd'hui** : réinstallation, téléphone
> **neuf**, cache vidé, téléphone **perdu/volé**. L'identifiant WebAuthn est **lié à
> l'appareil** → il **disparaît** avec lui. Il faut un chemin **sûr et tracé** pour
> ré-obtenir l'accès, **sans re-saisie du numéro par elle** et **sans laisser
> l'identificateur usurper son compte**.

### 3.1 Exigences
1. La récupération DOIT permettre de **ré-enrôler un nouvel authentificateur** sur le
   **nouveau** téléphone de la marchande.
2. Elle s'appuie sur un **code de récupération détenu par l'identificateur/l'agent**,
   **à usage unique, horodaté, tracé côté serveur**, et **vérifié côté serveur**.
3. **Double présence requise :** le ré-enrôlement DOIT exiger **à la fois** le code
   identificateur **et** une **action de la marchande** (consentement, présence) — de
   sorte que **le code seul ne suffit pas** à entrer. L'identificateur ne DOIT jamais
   pouvoir se connecter **en son absence**.
4. **Traçabilité :** chaque récupération DOIT être journalisée (qui, quand, quel compte)
   et **révocable**. Les anciens identifiants de l'appareil perdu DOIVENT être
   **révoqués côté serveur**.
5. **Pas d'auto-détection de la SIM / du numéro.** La SIM n'est **pas** une identité et
   n'est **pas** une primitive web fiable — on ne l'utilise **ni** comme raccourci **ni**
   comme facteur.
6. **Récupération guidée par la voix** (clips « Tata ») DEVRAIT accompagner chaque étape
   (elle ne lit pas).

### 3.2 Anti-abus (rappel du modèle de menace)
Le risque central de la récupération est **l'identificateur qui ré-enrôle à sa place**.
Mitigations obligatoires : code **à usage unique + tracé + révocable**, **présence de la
marchande** exigée, **vérification serveur**, **journalisation**. Un « code + numéro »
sans présence de la marchande est **insuffisant**.

---

## 4. Garde-fous (téléphone partagé, vol, changement SIM)

### 4.1 Téléphone partagé
1. Les identifiants découvrables sont **par appareil** : plusieurs comptes sur un même
   téléphone → un **sélecteur de compte local** DOIT permettre de basculer **sans
   re-saisir de numéro**, chaque compte protégé par sa **propre vérification** (biométrie).
2. Aucun secret d'un compte ne DOIT être lisible depuis un autre compte du même appareil.
> **À VALIDER (terrain) :** fréquence réelle du partage de téléphone chez tes marchandes
> → dimensionne l'effort sur ce cas.

### 4.2 Vol / perte du téléphone
1. **Aucun jeton durable exploitable** ne DOIT rester accessible (cf. §2.3) : un voleur
   ne DOIT pas ouvrir la caisse en rallumant le téléphone.
2. Les identifiants de l'appareil perdu DOIVENT pouvoir être **révoqués côté serveur**.
3. La marchande récupère l'accès via **le parcours de récupération** (§3) sur un nouvel
   appareil ; l'ancien est **désactivé**.

### 4.3 Changement de SIM
Comme l'identité n'est **pas** liée à la SIM (§0.1.3) : un changement de SIM est un
**non-événement** pour l'authentification. Il ne DOIT **ni** verrouiller la marchande
dehors, **ni** ouvrir un raccourci de connexion. **Rien** dans le code ne DOIT lire ou
dépendre de la SIM/du numéro actif.

### 4.4 Force brute / abus
Toute limitation (tentatives, temporisation) DOIT être **appliquée côté serveur**
(le throttler existant, paramétrable), jamais un simple compteur client.

---

## 5. Réponses aux questions ouvertes (tranchées ici, sous réserve de validation)

| Question | Décision cible |
|---|---|
| Connexion = `loginById`+WebAuthn, ou aussi `loginByPhone` ? | **WebAuthn découvrable sans identifiant** au quotidien. `loginByPhone` **seulement** en parcours assisté (récupération), jamais pour elle au quotidien. |
| Persistance = SW / localStorage ? | **Ni l'un ni l'autre comme coffre à secret.** SW = coquille hors-ligne uniquement ; **pas** de jeton durable en localStorage (§2.3). |
| Repli si biométrie échoue ? | Réessai → secret accessible (imagé) en saisie privée → récupération (§2.4). **Jamais** le numéro demandé à elle. |
| Enrôlement sur le tel de l'identificateur ou de la marchande ? | **De la marchande** (§1.1). L'identificateur assiste. |

---

## 6. Ordre de mise en œuvre (P0 → P1) et définition de « fait »

1. **P0 — Sécuriser `0000`** (préalable, §0.4).
2. **P0 — Enrôlement sur le téléphone de la marchande** (§1) : consentement tracé,
   secret non-`0000`, anti-abus.
3. **P0 — Récupération tracée** (§3) : code identificateur à usage unique + présence
   marchande + révocation + journal.
4. **P1 — Connexion WebAuthn sans numéro** (§2) : identifiant découvrable, repli défini.
5. **P1 — Garde-fous** (§4) : partage, vol, SIM, force brute serveur.

**Un sous-parcours n'est « fait »** que lorsqu'il est **accessible** (aucune lecture/
mémoire/dictée exigée), **sûr** (vérifié serveur, anti-abus), **et testé avec de vraies
marchandes** (pas seulement en théorie). Chaque livraison DOIT donner : scénario testé,
avant/après, et la liste exacte des fichiers modifiés.

---

## 7. Ce qui reste à décider par toi (récapitulatif « À VALIDER »)
- **§0.3** Mesurer la part de marchandes avec verrou/biométrie (sinon « WebAuthn
  prioritaire » n'est pas acquis).
- **§1.2** Sort du « PIN vocal » : abandonné au profit de la biométrie + repli imagé, ou
  conservé uniquement comme aide à la saisie privée ?
- **§2.3** Durée de session tolérée sans re-vérification (confort marché vs risque vol).
- **§4.1** Fréquence réelle du téléphone partagé (dimensionnement).

> Ces points ne se tranchent pas au code : ils se tranchent avec toi et sur le terrain.
> C'est le préalable que tu réclamais (modèle de menace + validation utilisateur) avant
> d'implémenter récupération et partage.
