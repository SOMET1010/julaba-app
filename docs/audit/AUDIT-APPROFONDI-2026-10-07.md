# Audit approfondi Jùlaba — 07/10/2026

> Code audité : `main@4d91c4b` (RC du 07/10). Audit en lecture seule, mené par 4 agents en parallèle à partir du logigramme (`docs/logigramme/`).
> Axes : **SEC** sécurité et autorisations · **ARG** argent, caisse, hors ligne · **UX** parcours, voix, inclusion · **BO/PRF/DAT/OPS/ARC** back-office, autres profils, données, exploitation, architecture.
> Statut de chaque constat : *reproduit* (test ou requête exécutés), *lu* (déduit du code, à confirmer) ou *prod ?* (dépend d'une valeur de production invisible depuis la session).

## 1. Verdict

La **caisse marchande en ligne** tient : vente, rejeu sans doublon, stock, dépense et clôture sont couverts par 290 invariants verts. La RC est **testable** en interne.

**Elle n'est pas prête pour des marchandes réelles.** Il faut d'abord régler 8 points :
- **SEC-01** : comptes enrôlés avec le code 0000 sans SMS, donc prise de compte possible.
- **ARG-01** : dépense dictée hors ligne enregistrée jusqu'à 3 fois (reproduit).
- **UX-01** : marchande bloquée au changement de code obligatoire.
- **UX-02** : écran d'activation inatteignable.
- **UX-03** : montants épelés à la voix.
- **ARG-04** : clôture affichée réussie alors que le serveur a échoué.
- **SEC-03** : chaque vente diffusée à tous les comptes connectés.
- **SEC-04** : SMS d'hameçonnage envoyé au nom de Jùlaba.

Ce sont des correctifs **S** (moins d'une journée chacun), sauf UX-01 (M).

Côté exploitation, 5 prérequis du GO-PILOTE ne sont pas réunis :
- sauvegarde potentiellement en clair et jamais restaurée (OPS-01) ;
- Sentry qui ne voit pas les erreurs 500 (OPS-02) ;
- `TRUST_PROXY` non posé (OPS-04) ;
- `/health` aveugle à la base (OPS-05) ;
- SMS conditionnés à des variables non vérifiées (OPS-06).

## 2. Plan de lots (ordre d'exécution proposé)

| Lot | But | Constats | Effort | Touche le périmètre d'argent / la prod ? |
|---|---|---|---|---|
| **L1 — Portes d'entrée** (avant tout testeur réel) | On ne prend pas un compte, on n'est pas bloqué à l'entrée | SEC-01, UX-01, UX-02, UX-04, UX-05, UX-06, SEC-02 (code) | 2–3 j | non, mais SEC-01 change le chemin d'enrôlement (décision) |
| **L2 — Argent juste hors ligne** | Aucun montant compté deux fois, perdu ou dit faux | ARG-01, ARG-04, ARG-11/UX-03, ARG-02, ARG-03, UX-13, UX-14, UX-16 | 2–3 j | **oui** (périmètre gelé : fusion par Patrick) |
| **L3 — Fuites** | Ni ventes, ni données personnelles, ni SMS à des tiers | SEC-03, SEC-04, SEC-05, SEC-07, SEC-06, SEC-08, OPS-03 | 2 j | non |
| **L4 — Exploitation GO-PILOTE** | Constater les 5 prérequis | OPS-01, OPS-02, OPS-04, OPS-05, OPS-06, OPS-07, DAT-01 (SQL prod), DAT-02 | 1 j de code + actions Patrick au tableau de bord Render | **prod** (variables, constat SQL) |
| **L5 — Serveur aligné sur le masquage** | Les modules masqués à l'écran sont fermés aussi côté serveur | ARG-05, ARG-10, SEC-14, SEC-09 | 1 j | oui (wallets) |
| **L6 — Voix et inclusion** | Aucune information importante uniquement en texte | UX-07 à UX-29 + **23 phrases à enregistrer** (§5) | 3–4 j + séance d'enregistrement | non |
| **L7 — Back-office et autres profils** | Les écrans BO disent vrai | BO-01 à BO-15, PRF-01 à PRF-04, DAT-03, DAT-05, SEC-11 à SEC-13 (BO-3), SEC-19/BO-03 (arbitrage 5) | 4–5 j | non |
| **L8 — Dette** | Réduire le risque de régression | ARC-01 à ARC-04, DAT-04, DAT-06 à DAT-10, OPS-08 à OPS-10, ARG-06 à ARG-09, ARG-12 à ARG-15, SEC-15 à SEC-24, UX-30 à UX-38 | au fil de l'eau | variable |

## 3. Constats critiques et hauts (détail court)

| ID | Statut | Constat | Preuve | Correctif minimal |
|---|---|---|---|---|
| SEC-01 | lu | `POST /auth/signup` (chemin de la skill `identifier`) crée un compte **actif** avec le code par défaut, sans SMS. Un tiers qui connaît le numéro prend le compte. Le signup public rend aussi « réservé aux connectés » équivalent à « public » | `auth.service.ts:43,53,165` ; `auth.controller.ts:65-75` | Enrôler via `create-with-acteur` ou le BO + code d'activation. Signup public coupé en prod, ou compte créé en `en_attente_activation` |
| ARG-01 | **reproduit** | Dépense dictée hors ligne : au retour du réseau, la phrase est rejouée, la question reposée, chaque « oui » crée une **nouvelle** clé. 1 dépense dictée = 3 enregistrées (6 000 F au lieu de 2 000) | `useOfflineVoiceQueue.ts:89-128` ; `useVoiceCore.ts:463-472,763` ; `CaisseContext.tsx:653` | Passer `depense` par la file durable de la caisse (`offlineLocalIntents`). Ne jamais rejouer du texte pour une intention d'argent |
| UX-01 | lu | Changement de code obligatoire (comptes créés en 0000) : si l'app est tuée, l'ancien code est perdu, il n'existe pas de champ pour le ressaisir, l'erreur est muette et il n'y a pas de sortie. Boucle sans issue | `AppContext.tsx:592-602` ; `ChangePasswordScreen.tsx:51,178` | Étape « ancien code » si absent ; erreurs dites ; bouton « Sortir » |
| UX-02 | lu | `/activation` n'a aucun lien entrant. L'APK n'a pas de barre d'adresse, donc un compte « en attente d'activation » ne peut jamais entrer | `routes.tsx:56` seul | Bouton « J'ai un code de mon agent » sur l'écran du code |
| UX-03 / ARG-11 | lu | Réponses « combien j'ai vendu ? » et confirmation de dépense envoyées en forme écran : « deux zéro zéro zéro francs » | `intentionsCaisse.ts:97-122` ; `localIntent.ts:273` | `tParle` à la place de `t` |
| ARG-04 | lu | `closeDay` avale l'échec serveur et affiche « Journée clôturée avec succès » avec un écart calculé localement | `AppContext.tsx:952-957` | Relancer l'erreur ; succès seulement sur réponse OK |
| ARG-02 | lu | Ventes encore en file à la clôture : faux écart, puis 409 au rejeu, puis lettre morte qu'on ne peut que « Retirer » | `journee-ouverte.ts:41-50` ; `SyncEchecsBanner.tsx:84-90` | Refuser ou avertir la clôture si la file n'est pas vide ; bouton « Réessayer » |
| ARG-03 | lu | `REPLAY_CAP=5` : une vente part en lettre morte après environ 11 min de 5xx, ou dès un 429 | `offlineCaisse.ts:29,508-518` | Pas de plafond pour vente et dépense ; 401, 408 et 429 traités comme transitoires |
| SEC-03 | lu | Websocket : chaque vente et dépense diffusée à la room `all` (tous les comptes, même suspendus) | `events.gateway.ts:51-64,95-97` | `broadcastToUser` + room admin |
| SEC-04 | lu | N'importe quel compte : brouillon d'identification puis PATCH `statut=rejete`, `motif` et `phone` libres. Résultat : SMS officiel « JULABA » au texte choisi, sans limite de débit | `identifications.controller.ts:21,182,485-528` | Téléphone lu en base ; `statut` réservé au BO ; limite de débit |
| SEC-02 | lu / prod ? | Verrou de connexion contournable en parallèle (lecture puis écriture du compteur). Limite par IP commune à tous ou falsifiable selon `TRUST_PROXY` | `auth.service.ts:265-283` ; `main.ts:110-114` | UPDATE atomique ; `TRUST_PROXY=1` après mesure `/health/net` |
| SEC-05 / SEC-07 | lu | Un coopérateur (inscription libre) ajoute une marchande sans son consentement et lit sa fiche complète (NIN, CNPS, CMU, naissance, téléphone). `create-with-acteur` est ouvert à tout compte | `cooperatives-rest.controller.ts` ; `identifications.controller.ts:295` | Adhésion `actif` seulement ; projection minimale ; `@Roles` |
| SEC-06 | lu | ONECI (identité nationale) interrogeable par tout compte connecté | `oneci.controller.ts:5-8` | `@Roles(identificateur, BO)` + limite de débit + audit |
| ARG-05 | lu | Modules masqués à l'écran mais routes serveur ouvertes : `retrait-mobile` réel sans idempotence, recrédit sur un timeout ambigu | `wallets.controller.ts:63-118` | Garde serveur sur le même drapeau |
| OPS-01 | prod ? | Sauvegarde : en clair dans un artefact d'un dépôt **public** si `BACKUP_PASSPHRASE` manque ; job vert s'il n'y a pas d'URL ; aucune restauration essayée | `.github/workflows/sauvegarde-db.yml` | Échec si un secret manque ; restauration à blanc |
| OPS-02 | lu | Sentry backend : les erreurs 500 des routes ne remontent jamais (gestionnaire en commentaire) | `main.ts:274-275` | Filtre d'exception global → `captureException` |
| OPS-03 | lu | Sentry Replay sans masquage : noms, téléphones, montants et photos envoyés | `frontend_src/src/sentry.ts:10-18` | `maskAllText:true, blockAllMedia:true` |
| OPS-04 | prod ? | `TRUST_PROXY` absent : une seule limite de 5 connexions/min partagée par toutes les marchandes | `render.yaml` | Mesure puis `TRUST_PROXY=1` |
| OPS-05 | lu | `/health` ne teste pas la base | `health.controller.ts:17-26` | `SELECT 1` |
| OPS-06 | prod ? | Variables SMS (`ANSUT_*`), numéro de support et WebAuthn non vérifiées au démarrage ; SMS silencieusement non envoyés | `main.ts:85-93` ; `sms.service.ts:31-37` | Fail-fast + valeurs posées |
| OPS-07 | prod ? | Base de prod ambiguë : `julaba-db` Render ou Supabase Paris ? Backend en Oregon | `render.yaml` ; `database.module.ts` | Constat au tableau de bord Render |
| DAT-01 | prod ? | Objets créés seulement par migration (`users.appellation`, index d'idempotence wallet et fidélité…) alors que les migrations sont OFF en prod | `user.entity.ts:76` ; migration `AppellationChoisie` | Requête SQL de constat, puis DDL dans DbInit |
| DAT-02 | lu | `GET /zones` encore fragile (`ct.user_id::uuid`), appelé sur toutes les pages du BO | `zones.service.ts:47-52` | Comparer en `::text` ; agrégats en sous-requêtes |
| BO-01 | lu | Le BO repose sur un cookie tiers (Safari, iOS, navigation privée : écritures cassées) | `backoffice-api.ts:69-71` | Jeton dans tous les appels (`authHeaders`) |
| BO-02 / BO-03 / BO-04 / PRF-01 | lu | Score financier (URL relative), Missions et `/scores` (`'admin'`), Paramètres (pas de PUT), Institution (403 → zéros) | voir rapport BO | lots L7 |

Les constats moyens et bas (environ 70) restent dans les rapports d'axe. Ils sont regroupés dans les lots L5 à L8.

## 4. Ce qui est sain (vérifié)

- Les correctifs BO-0/BO-1 tiennent : vol de wallet, création d'argent, escalade, clé en dur, mots de passe en clair et XSS de la carte sont fermés (invariants `bo0-*`, `bo1-*`).
- Caisse en ligne : idempotence par marchande, atomicité vente + stock, annulation, fond de caisse (290 invariants verts).
- Le masquage #268 couvre toutes les URL, y compris les liens profonds et `/pay`.
- Secrets : aucun secret réel dans `render.yaml` ni `.env.example` ; les 3 secrets de prod sont exigés au démarrage.

## 5. Phrases à enregistrer (voix de Tata, fr-CI) — lot L6

1. « Tape d'abord le code que ton agent t'a donné. »
2. « Ça n'a pas marché. Choisis encore ton nouveau code. »
3. « J'ai un code de mon agent. » / « Tape le code de ton agent, puis choisis ton code secret. »
4. « Ton compte est arrêté pour le moment. Va voir ton agent. »
5. « Ton compte n'est pas encore validé. Ton agent va te prévenir. »
6. « Ton compte n'est pas encore activé. Prends le code de ton agent. »
7. « Ce numéro n'est pas encore dans Jùlaba. Va voir ton agent pour t'inscrire. »
8. « Attends quinze minutes, puis réessaie. » / « Attends une heure, puis réessaie. » / « Attends encore un peu, puis réessaie. »
9. « Tu as oublié ton code ? Appelle ton agent, il va t'aider. »
10. « Ça n'a pas bien répondu. Attends un petit moment, puis reprends. »
11. Valider les 5 clips `tata-reconnaissance-*`.
12. « Une vente faite sans réseau n'a pas été acceptée. Montre ton téléphone à ton agent. »
13. « Ta dépense est gardée sur ton téléphone. Elle partira quand le réseau revient. »
14. « Tu veux vraiment vider le panier ? Touche encore pour confirmer. » / « Panier vidé. »
15. « Ta journée est fermée. » / « Je n'ai pas pu fermer ta journée. Réessaie. » / « Ce montant n'est pas bon. Regarde encore. »
16. « Ça, ce n'est pas encore ouvert. On reste sur ta caisse. »
17. « Je n'ai pas eu le prix. Dis-moi combien. »
18. « Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. » / « Je n'ai rien entendu. Réessaie, parle un peu plus fort. » / « D'accord, j'annule. Pas de souci. »
19. « Le produit n'a pas été ajouté. Réessaie. »
20. « Le réseau est parti. Je garde tout sur ton téléphone. » / « Le réseau est revenu. »
21. « Ta session est finie. Remets ton code pour continuer. »
22. « Pour parler à quelqu'un, touche le téléphone vert. »
23. « Attends une minute, le réseau est chargé, puis réessaie. »

## 6. Décisions attendues de Patrick

1. **Valider le plan de lots** (ordre L1 → L4 avant les testeurs réels).
2. **SEC-01** : couper le signup public en prod et enrôler uniquement par le BO ou un agent avec code d'activation. La skill `identifier` serait réécrite en conséquence.
3. **L2** touche le périmètre d'argent gelé : accepter que l'agent prépare les PR, la fusion restant à Patrick.
4. **L4** : actions au tableau de bord Render (variables `TRUST_PROXY`, `ANSUT_*`, `BACKUP_*`, `SENTRY_DSN`, constat SQL DAT-01, quelle base est la prod).
5. **Arbitrage 5** : permissions Missions et Marketplace, lien compte → institution.
6. **Séance d'enregistrement** des 23 phrases (voix ivoirienne).

## 7. Limites

- Lecture statique, sauf ARG-01, reproduit par un test tsx sur le vrai `useVoiceCore`.
- Aucun accès à la production : les constats marqués *prod ?* sont à vérifier au tableau de bord ou en SQL.
- Aucun parcours joué sur téléphone (voix réelle, WebView, hors ligne).
