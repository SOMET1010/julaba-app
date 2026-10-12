# Logigramme Jùlaba — parcours, écrans et voix dites (constaté sur le code)

> Base de l'audit approfondi demandé par Patrick : « sortir tout le logigramme avec les parcours différents et les voix dites ».
> **Source de vérité : le code de `main@9fb4655`** (React/Capacitor `frontend_src/`, NestJS `backend/`), lu le 07/10/2026. Les documents (`docs/PARCOURS.md`, `docs/parcours/`, `docs/SPEC_VENTE_VOCALE.md`, `docs/REGLE-VOICE-FIRST.md`, `docs/voix/`, `docs/CLIPS-VOIX-A-ENREGISTRER.md`) n'ont servi qu'à orienter la lecture ; là où ils divergent du code, c'est le code qui est décrit.
> Aucun code applicatif n'a été modifié. Les « écarts » ci-dessous sont des **constats sourcés**, pas des correctifs.

## Index

| Fichier | Contenu | Diagrammes |
|---|---|---|
| [`00-entree-auth.md`](00-entree-auth.md) | Porte d'entrée unique `EntryGate`, Akwaba et présentation, connexion (numéro, `check-phone`, code, empreinte, verrou), `/non-enregistre`, `/activation`, `/change-password`, mot de passe oublié, session expirée, déconnexion, proposition biométrique | 7 |
| [`01-marchand.md`](01-marchand.md) | Accueil, caisse tactile, vente vocale (prix dicté/catalogue/manquant/ambigu, produit inconnu), encaissement vocal (relecture, « oui valide », annulation, compte changé), dépense vocale et questions, hors ligne et rejeu, mes ventes et annulation, journée (fond, clôture, réouverture), dépenses, stock et alertes, profil/paramètres/support/mes données, modules hors pilote | 12 |
| [`02-producteur.md`](02-producteur.md) | Accueil, production (cycles, récoltes, publications), déclaration de récolte, stocks/revenus, commandes | 3 |
| [`03-cooperative.md`](03-cooperative.md) | Accueil, membres, marché (achats/ventes), commandes groupées, besoins, stock commun, trésorerie | 3 |
| [`04-identificateur.md`](04-identificateur.md) | Accueil agent, fiche d'identification (7 étapes, 8 pour une coopérative), PIN agent, brouillons, complément de dossier, déblocage de verrou, mutation | 3 |
| [`05-institution.md`](05-institution.md) | Garde de rôle et de modules, supervision, acteurs | 2 |
| [`06-backoffice.md`](06-backoffice.md) | Connexion BO, garde `BORoot`, chaque entrée du menu `BOLayout` avec permission, rôles et contrôles par écran | 3 |
| [`07-voix-transverse.md`](07-voix-transverse.md) | Moteur voix : six portes de parole, clips, TTS hors ligne sherpa (Piper), TTS navigateur, ASR sherpa-onnx, grammaires, confirmation, file hors ligne, langues, packs, règles voice-first, quand l'app se tait | 3 |
| [`annexe-catalogue-voix.md`](annexe-catalogue-voix.md) | Les 542 phrases du catalogue vocal (`i18n/voice/catalog.ts`), par domaine, avec statut, source et nombre d'usages | — |
| [`annexe-clips.md`](annexe-clips.md) | Les 235 fichiers audio embarqués, leur texte exact et s'ils sont atteignables par le code | — |

## Légende

**Diagrammes** (`flowchart TD`) : rectangle = écran ou état ; losange = décision ; libellé d'arête = action de l'utilisateur ou réponse du serveur (codes HTTP, réseau absent, refus, verrou). « 404 » = cible absente de `routes.tsx` (rendu `pages/NotFound` via `routes.tsx:230`). Chaque diagramme est suivi d'une ligne **Sources** `fichier:ligne`.

**Tableaux « Voix »** : *étape | déclencheur | phrase EXACTE dite | texte affiché si différent | condition*. Phrase entre « » = texte littéral du code, ou texte `fr-ci` d'une clé du catalogue (`CLÉ` + `catalog.ts:ligne`) ; `{variable}` = valeur substituée (les montants critiques sont dits en mots par `tParle`, `i18n/voice/runtime.ts:207-262`). **rien** = aucune voix à cet instant.

**Portes de parole** (détail : `07-voix-transverse.md` §1) : **P1** `AppContext.speak` (marchand seulement, jamais de clip) · **P2** `speakMessage(clé)` (passe par P1) · **P3** `useVoiceCore.ttsSpeak` (clip si texte exact, sans garde de rôle) · **P4** voix d'entrée avant connexion (clip seul pour les erreurs) · **P5** `speakClipOrText` direct · **P6** `audioManager` direct. Conditions de silence S1…S12 : `07-voix-transverse.md` §6. Drapeau `VITE_JULABA_VOICE_PREVIEW` : éteint par défaut au build (`.github/workflows/apk.yml:73-75`) ; il n'active que les 15 clips « prototype ».

**Annexes mécaniques** : en fin de chaque fichier, tableau de **tous** les appels vocaux du périmètre (fichier:ligne, fonction, premier argument, clip au texte identique, canal). Expression = phrase construite à l'exécution (voir la source).

## Méthode

1. Routes : lecture de `frontend_src/src/app/routes.tsx` et des gabarits (`AppLayout`, `IdentificateurLayout`, `InstitutionLayout`, `BORoot`/`BOLayout`), de `types/constants.ts` (`ROLE_ROUTES`, `checkRouteAccess`) et `config/roleConfig.ts`.
2. Parcours : lecture des composants de chaque profil (branches d'état, `navigate`, appels API, codes HTTP, `navigator.onLine`), recoupée avec les règles serveur utiles (`backend/src/auth/auth.service.ts`, `backend/src/auth/verrou-pin.ts`, `backend/src/caisse-rest/journee-ouverte.ts`).
3. Voix : extraction par script de chaque appel `speak(`, `speakMessage(`, `dire(`, `direMessage(`, `parle(`, `ttsSpeak(`, `speakAuto(`, `playClip(`… hors tests (472 sites) ; résolution des clés dans `i18n/voice/catalog.ts` (locale `fr-ci` = `frActuel`, `locales/fr-ci/messages.ts:27-31`) ; rapprochement texte ↔ clip par la normalisation même du code (`services/tataUiClips.ts:296-314`) ; lecture des portes de parole pour savoir ce qui est **réellement** joué.
4. Contrôles mécaniques : liens `navigate`/`path`/`route` vers des routes inexistantes ; routes sans lien entrant ; clés vocales appelées mais absentes du catalogue (0) ; entrées `a_migrer` dont le texte a disparu du code (18) ; clips jamais atteignables (198).
5. Validation des diagrammes : les 36 blocs Mermaid ont été rendus avec `npx @mermaid-js/mermaid-cli` (Chromium sans bac à sable) — 0 échec.

Limites : lecture statique (aucun parcours exécuté sur appareil) ; les écrans hors pilote (portefeuille, academy, marché virtuel, tontines…) et les pages back-office sont décrits au niveau écran → actions → réponses, sans chaque champ ; les comportements de la WebView Android (autoplay, `speechSynthesis` muet) sont repris des commentaires du code et des traces, non re-mesurés.

## Compteurs

| Mesure | Valeur | Détail |
|---|---|---|
| Routes déclarées | 163 entrées | `routes.tsx` (dont 6 gabarits, 3 redirections, 4 routes de développement `isDev`) |
| Écrans routés | **153** (149 hors dev) | 116 composants distincts ; + 4 états internes d'`EntryGate` (Welcome, Onboarding, Login 3 étapes) |
| Écrans par profil | marchand 28 · producteur 18 · coopérative 17 · institution 17 · identificateur 22 · back-office 33 · entrée/transverse 18 | |
| Parcours décrits | **36** diagrammes | 7 + 12 + 3 + 3 + 3 + 2 + 3 + 3 |
| Phrases du catalogue vocal | **542** TTS + 26 intentions STT | 141 `migre`, 310 `a_migrer`, 91 `reference` ; 103 clés appelées directement |
| Appels vocaux dans le code | **472** sites | 442 dans les écrans/contextes, 30 dans les services ; 178 phrases littérales distinctes, 66 gabarits, 39 clés directes |
| Appels vocaux muets par construction | **124** | appels P1 dans producteur, coopérative, institution, identificateur, back-office (`AppContext.tsx:729-730`) |
| Clips audio embarqués | **235** mp3 | 137 voix humaine `ui-*` + 83 lot A + 15 prototypes |
| Clips réellement atteignables | **37** (22 + 15 sous drapeau) | 198 jamais joués ; 127 appels disent un texte identique à un clip sans le jouer |

## Écarts constatés (sourcés, classés par gravité)

### Parcours sans issue, refus trompeurs, accès

1. **Toute la voix des rôles non marchands est muette.** `AppContext.speak` sort si `user.role !== 'marchand'` (`frontend_src/src/app/contexts/AppContext.tsx:729-730`) ; `speakMessage` passe par lui (`i18n/voice/renduVoixLocale.ts:40`). 124 appels des écrans producteur/coopérative/BO ne sont jamais entendus, y compris là où le code affirme le besoin (« voix : le producteur ne lit pas le bandeau », `components/producteur/RecolteForm.tsx:263`). Identificateur et institution n'ont en outre aucun appel vocal et reçoivent `julaba_voice_disabled` (`AppContext.tsx:772-782`).
2. **Compte suspendu, rejeté, en attente de validation ou d'activation ⇒ « Ce n'est pas le bon code. Réessaie doucement. »** Le serveur renvoie 401 avec le vrai motif (`backend/src/auth/auth.service.ts:292-295`) ; l'écran l'ignore et affiche le message de mauvais code (`components/auth/LoginPassword.tsx:817-836`), muet en build livré (clip prototype, `services/entreeVoix.ts` `codeErreur`).
3. **`/activation` n'a aucun lien entrant** (seule occurrence : `routes.tsx:56`). Une marchande créée « en attente d'activation » (`FicheIdentificationDynamique.tsx:1858-1866`) qui tente de se connecter tombe sur l'écart 2 : parcours sans issue hors saisie manuelle de l'URL.
4. **`check-phone` ne teste pas `res.ok`** : une réponse 429/500 au corps JSON (`exists` absent) envoie vers « Numéro non enregistré » (`LoginPassword.tsx:471-501`).
5. **Changement de code après rechargement : impasse.** La restauration de session force `window.location.href = '/change-password'` (`AppContext.tsx:592-602`) ; l'ancien code n'est gardé qu'en mémoire « one-shot » (`ChangePasswordScreen.tsx:51-52`) et l'écran à 4 chiffres n'a pas de champ « ancien code » (`:265`) ⇒ 401 « Mot de passe actuel incorrect » en boucle, affiché sans voix (`:140-146`). Aucun « code oublié » n'existe (`:200-203`).
6. **`IdentificateurLayout` n'a aucune garde** d'authentification ni de rôle (`components/identificateur/IdentificateurLayout.tsx`), contrairement à `AppLayout.tsx:47-71` et `InstitutionLayout.tsx:318`.
7. **Back-office : menu filtré, routes non gardées.** `BORoot` ne vérifie que le rôle BO ; la barre mobile `MOBILE_BOTTOM` n'est pas filtrée (`BOLayout.tsx:186-192,1412`) ; 10 écrans n'ont aucun contrôle de droits interne (`06-backoffice.md`, matrice). Le rôle `admin` est accepté par `BOLogin` (`types/constants.ts:93-100`) mais refusé par `BORoot` (`components/backoffice/BORoot.tsx`) : boucle de connexion.
8. **Institution : module Audit toujours bloqué** (`InstitutionLayout.tsx:23,33` exige `audit`, la liste client contient `audit-trail`, `contexts/InstitutionAccessContext.tsx:25-29`) ; modules codés en dur côté client ; écran « Compte suspendu » inatteignable (`statut` jamais renseigné, `:48-56`).

### Liens morts et routes 404

9. Phrase vocale « mes ventes » en caisse → `navigate('/marchand/ventes')` inexistante (`components/marchand/MicroVenteCaisse.tsx:410`).
10. `/producteur/revenus` (`components/producteur/Stocks.tsx:561`) ; `/backoffice/transactions`, `/backoffice/recoltes`, `/backoffice/cooperatives` depuis la fiche acteur (`components/backoffice/BOActeurDetail.tsx:890`, `utils/role-config.ts:83-87`) ; modale Tantie `'/' + role + '/marche'` et `'/commandes'` pour producteur/institution/identificateur (`components/assistant/TantieSagesseModal.tsx:159,162`) ; rôle `consommateur` → `/consommateur` (`types/constants.ts:81`) ; `/marketplace` monté sous `AppLayout` mais refusé à tous les rôles par `checkRouteAccess` (`routes.tsx:159-161`, `types/constants.ts:145-176`) ; config morte `administrateur` → `/institution/transactions` (`config/roleConfig.ts:503`).
11. Routes sans aucun lien entrant : `/activation`, `/producteur/publier-recolte`, `/identificateur/acteurs`, `/identificateur/statistiques`, `/identificateur/dashboard`, `/institution/dashboard`, `/institution/dashboard-analytics` (recherche de chaînes dans tout `frontend_src/src/app`).

### Voix : ce qui est dit n'est pas ce qui est prévu

12. **La vraie voix de Tata n'est jouée que par 37 clips sur 235.** P1/P2 n'appellent jamais le lecteur de clips (`services/audioManager.ts:90-161,322-330`) : 127 appels disent mot pour mot le texte d'un clip existant en synthèse (ex. « Montant total invalide » `POSCaisse.tsx:434` ↔ `ui-081.mp3`). L'en-tête du plugin natif affirme l'inverse (`android/app/src/main/java/com/julaba/app/SherpaTtsPlugin.kt`).
13. **Clés de clip absentes ou mal liées dans le moteur** : `pas_compris`, `rien_entendu` n'existent pas dans `TATA_CLIPS` (`hooks/useVoiceCore.ts:925-926,994` ↔ `services/tataVoice.ts:31-40`) ; la clé `annule` joue `ui-011.mp3` « Commande annulée » à la place de « D'accord, j'annule. Pas de souci. » (`useVoiceCore.ts:799`, la clé prime `:270`) ; `core-err-*`/`core-ack-*` enregistrés pour ces phrases ont d'autres textes et ne sont jamais trouvés.
14. **Recherches et commandes vocales mortes** : `onTranscript` est déclaré (`useVoiceCore.ts:88`) mais jamais appelé ; cinq micros en dépendent (`components/cooperative/Membres.tsx:381`, `MarcheHub.tsx:872`, `Stock.tsx:147`, `components/producteur/Stocks.tsx:359`, `components/shared/SearchBar.tsx:105`) : le champ n'est jamais rempli et le moteur répond à voix haute « Je n'ai pas bien compris… ».
15. **Montants envoyés à la synthèse sous forme écran** (espace fine U+202F, épelés « 2 zéro zéro zéro », défaut décrit `i18n/voice/runtime.ts:179-189`) : question de confirmation de dépense `TATA_CONFIRME_DEPENSE` (`voice-offline/localIntent.ts:273` → `useVoiceCore.ts:755`), réponses aux questions du jour `QUEST_*` (`services/intentionsCaisse.ts:97-122` → `useVoiceCore.ts:833`).
16. **Dépense vocale hors ligne** : mise en file vocale séparée de la file durable de la caisse, message seulement affiché (`voice-offline/offlineVoiceDispatch.ts`, `useVoiceCore.ts:700-704`) ; au rejeu, la question de confirmation est reposée et `sendText` rend `false` (`useVoiceCore.ts:463-473,728-768`) : la commande reste en file (3 essais puis conservée, `hooks/useOfflineVoiceQueue.ts`) et peut être reposée à chaque remontage — risque de double enregistrement si elle est confirmée deux fois (déduction du code).
17. **Dit ≠ affiché** : toast « C'est dans le panier : 2 × piment » quand la voix dit « 2 tas de piment » (`services/vendreVocalUnifie.ts:320` vs `:332`) ; mauvais code « encore 2 essais… » affiché / « Le numéro ou le code n'est pas bon, deh… » dit (`LoginPassword.tsx:818-835`) ; verrou 15 min/1 h : durée affichée, non dite (`:811`) ; micro refusé : « Le micro ne prend pas là… » affiché / « Problème avec le micro — réessaie » dit (`:622`) ; bilan de `resume-caisse` affiché (`RESUME_BILAN_*`) ≠ phrase dite (`RESUME_DETAIL`) (`components/marchand/ResumeCaisse.tsx:285-300`) ; bulle d'erreur caisse « Je n'ai pas compris… » quand la voix explique « La dictée n'est disponible que dans l'application… » (`MicroVenteCaisse.tsx:738`).
18. **Phrase fausse** : l'échec de création d'un produit (ajout guidé) dit `TATA_VENTE_ECHEC` « La vente n'a pas pu être enregistrée. Réessaie. » (`components/marchand/AjoutProduitGuide.tsx:209-210`) ; une dépense mise en file hors ligne est annoncée « Dépense de … francs enregistrée » (`DepenseForm.tsx:118`, `CaisseContext.tsx:654-658`).

### Informations importantes seulement écrites (règle voice-first)

19. Erreurs micro (`useVoiceCore.ts:1025,1063-1068`), « Le micro ne répond pas. Tape le prix. » (`BoutonDirePrix.tsx`), clôture de journée réussie/échouée/montant invalide (`MarchandModals.tsx:583-603`), erreurs serveur du changement de code (`ChangePasswordScreen.tsx:136-178`), écran `/non-enregistre` entier (0 appel), perte/retour réseau (annonces commentées `AppContext.tsx:788,792`), session expirée, journée fermée sur l'accueil (`MarchandAccueilVoice.tsx:369-389`).
20. Connexion : erreurs sans clip exact donc muettes (porte P4) — « Ça n'a pas bien répondu… » (`LoginPassword.tsx:777`), numéro mal tapé au clavier (`:992`), « La connexion ne passe pas… » sans drapeau (`:936`), moteur de dictée pas prêt (`:617`), proposition d'adaptation (`:410`). Proposition de reconnaissance biométrique entièrement muette en build livré (`components/auth/PropositionReconnaissance.tsx:75-183` ignore `doitDireLeTexte`).
21. Animations « Tantie parle » sans son : institution (`InstitutionHome.tsx:64-67`), toast « Tantie Nanti Lou parle... » pendant une phrase muette (`Membres.tsx:394`).
22. Profil « auto » qui penche clavier : l'écran de connexion passe le mode *effectif* et se tait (`LoginPassword.tsx:210`), contrairement à la règle écrite « Automatique ne devient JAMAIS muet » (`utils/accessMode.ts:115-126`).

### Catalogue, clips et commentaires périmés

23. 18 entrées `a_migrer` du catalogue dont le texte n'existe plus dans le code (ex. `STOCK_004`…`STOCK_015`, `MARCHAND_018/019/025/027`, `AUTH_007/009/011`, `CORE_017`) ; `BO_002` corrompu (« {édiate} ») ; `INTRO_ACCUEIL`/`INTRO_HISTOIRE1` ≠ textes de `services/onboardingVoix.ts` ; `AUTH_01…37` ≠ textes des clips `login-*` ; numéros de ligne `source` décalés (ex. `TATA_CONFIRME_VENTE` « `localIntent.ts:139` », réel `:272`). 9 phrases de `MarcheVirtuel.tsx` absentes du catalogue (`:400-890`) malgré l'en-tête « les gates vérifient qu'aucune phrase dite n'en est absente » (`catalog.ts:38-39`).
24. Clips : 7 `intro-*.mp3` référencés mais absents du disque (`services/onboardingVoix.ts:28-91`) ; 8 `ui-*` non indexés ; `chiffre-1.mp3` (« Un ») introuvable par texte (`tataUiClips.ts:308`) ; le clip prototype d'accueil dit encore « Tata » (`public/voix/fr-CI/prototype/manifest.json`, `reenregistrementRequis`) ; `entreeVoix` ne peut jamais constater l'échec d'un clip (`playClip` ne rejette pas) ⇒ clip manquant = silence.
25. Commentaires contredits par le code : `EntryGate.tsx:8` « Onboarding (4 écrans) » (un seul écran) ; `useVoiceCore.ts:1-7` « TTS via ElevenLabs » (aucun appel réseau) ; `CommandesProducteurPage.tsx:613` « STT via Groq Whisper » ; `POSCaisse.tsx:1634-1638` « PAS DE `ouvrirToutSeul` » alors que `:1644` le pose.

### Divers

26. Ouverture de journée : `OpenDayModal` n'est monté nulle part (`MarchandModals.tsx:329`) ; le serveur accepte une vente sans session (`backend/src/caisse-rest/journee-ouverte.ts`).
27. « Vider » le panier : ni confirmation ni voix (`POSCaisse.tsx:1420,1454`).
28. Modale Tantie : une vente dictée sans montant est abandonnée en silence (`TantieSagesseModal.tsx:135`) ; ses suggestions producteur/coopérative/institution (« Créer une plantation agricole »…) ne sont pas comprises par `intentLocal` (`:36-43`).
29. Fiche d'identification : abandon après 60 s sans message (`FicheIdentificationDynamique.tsx:1629`, retours `AbortError` `:1645-1868`) ; aucune file hors ligne.
30. Libellés ≠ destinations : producteur « Déclarer récolte » → `/producteur/production` (`roleConfig.ts:198-204`) ; identificateur « Suivi » → `/identificateur/rapports` (`roleConfig.ts:370`).
31. Build d'essai dioula : `speakMessage` parle (décor dioula, argent en français) mais `useVoiceCore` se tait et affiche « Le pack vocal Dioula n'est pas encore installé… » (`useVoiceCore.ts:279-287,398-410`).
32. Envoi de photos de commande producteur vers Cloudinary, service externe (`CommandesProducteurPage.tsx:557`).

## Ce qui n'a pas pu être établi

- Comportement réel sur appareil (autoplay, voix Piper effectivement chargée, `speechSynthesis` dans la WebView) : non mesuré, repris des commentaires et traces du code.
- Contrôles d'autorisation **serveur** de chaque écran back-office / institution / identificateur : seuls `auth.service.ts`, `verrou-pin.ts` et `journee-ouverte.ts` ont été lus.
- Réponse exacte du serveur sur les erreurs du changement de code et de l'activation (`authService.activerCompte`) : non suivie dans le back-end.
- Écart 16 (double dépense au rejeu) : déduit de la lecture, non reproduit.
- Les écrans hors pilote (portefeuille, academy, tontines, marché virtuel, BO détaillé) ne sont pas décrits champ par champ.
