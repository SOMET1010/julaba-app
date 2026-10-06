# AUDIT INTERFACE AUTH — 2026-10-05

## 1. Identité et périmètre

- **Objet** : interface d'authentification frontend (parcours d'entrée complet)
- **Type** : audit UI/UX + code statique + recette runtime (navigateur réel)
- **Fichiers audités** : `frontend/src/app/components/auth/` (8 fichiers, 3 100 lignes) + supports (`comptesMemorises.ts`, `entreeVoix.ts`, `paroleEntree.ts`, `login.css`, `voiceTrace.ts`, `voiceDebug.ts`, scripts de garde)
- **Écrans couverts** : EntryGate (`/`), Welcome/OnboardingSlides, Ton numéro, Ton code secret, Activation (`/activation`), Changement de mot de passe (`/change-password`), Numéro non enregistré (`/non-enregistre`), PropositionReconnaissance (modale post-login)
- **Référentiels** : `ACCESSIBILITY_GUIDE.md` (§4/§5/§6), `DESIGN_SYSTEM.md` (§9), `PROJECT_CONTEXT.md` (§1 doctrine voice-first, §8 règles critiques), `CONSTITUTION.md`
- **Méthode** : lecture statique ligne à ligne (agent Audit) + exécution réelle des parcours dans un navigateur headless + exécution des gardes CI auth
- **Auditeur** : AGENT AUDIT (système multi-agents)
- **Limitation** : audio non vérifiable headless (audibilité des clips inférée du code + catalogue) ; lecteur d'écran (NVDA/VoiceOver) non testé ; les 3 confits visuels testés sur tokens CSS mais pas validés œil humain.

## 2. Synthèse exécutive

- **Score global interface auth : 66/100** 🟠 (au-dessus du seuil PROD 60, en-dessous du standard interne 75)
- L'auth est **fonctionnellement solide et sûre** (PIN jamais journalisé, verrou serveur, fail-closed, PII masquée) avec une **discipline vocale réelle** (clips attestés, porte de parole unique).
- Deux **trous voice-first concrets** sur l'écran qui connecte : les messages de **verrouillage dynamiques sont silencieux** (le pire message possible à perdre pour une non-lectrice) et le bouton **« Réécouter mon numéro » ne dit rien** par construction.
- Une **garde rouge orpheline** (`test-entree-unique`) contredit les routes réelles — incohérence de gouvernance à trancher.
- **Dette design system concentrée** : ~70 couleurs hardcodées, modale custom sans focus trap, 3 cibles tactiles < 44 px, un fichier de 1 652 lignes.

## 3. Scores par dimension

| Dimension | Score | Justification courte |
|---|---:|---|
| Accessibilité (a11y .ai) | 68/100 | ARIA dense, haptique, focus mgmt réels ; mais verrou silencieux, modale non Radix, 3 cibles < 44 px mesurées, aucun garde a11y automatisé couvrant l'auth |
| Sécurité | 74/100 | PIN jamais logué ni stocké, verrou serveur, fail-closed, PINS_INTERDITS activation ; déduits : PIN dans `history.state`, refresh token localStorage, TEST_PHONES prod |
| Conformité design system | 58/100 | `login.css` conforme tokens ; mais ~70 hex inline, SVG dessinés main ×4, HTML brut au lieu de `ui/`, aucun garde couleurs sur l'auth |
| Qualité du code | 66/100 | Commentaires de décision exemplaires, modules purs testés ; mais 1 652 lignes, bannière ×3, pavé ×2, doc divergente du comportement |
| **Recette runtime (navigateur)** | **Pas de blocant** | Parcours complet numéro→PIN→marchand OK, /non-enregistre OK, zéro erreur console, clavier Tab/Enter OK |

## 4. Preuves runtime (navigateur headless, 2026-10-05, build v5.0.0.20)

| # | Test exécuté | Résultat |
|---|---|---|
| R1 | EntryGate `/` : boutons vocaux labellisés, heading h1 | ✅ conforme |
| R2 | Onboarding : « Réécouter Tantie Nanti Lou » + « Continuer » | ✅ conforme |
| R3 | Écran numéro : pavé 109×64 px, boutons ARIA explicites, `C'est mon numéro` disabled < 10 chiffres, empreinte disabled sans compte mémorisé | ✅ conforme |
| R4 | Saisie Michelle (+2250726262626) → PIN faux ×6 : message serveur en `role="alert"` — « Ce n'est pas le bon code. Attention : encore 2 essais… » | ✅ ARIA, ❌ inaudible (AUTH-03) |
| R5 | Mesure cibles : **« Modifier » 44×16,5 px** ❌, **bascule images 149×30 px** ❌, **modale « Fermer » 32×32 px** ❌ ; pavé/effacer/Oui conformes | ❌ AUTH-09/AUTH-05 confirmés |
| R6 | Clavier seul : Tab focus « Chiffre 1 »→« Chiffre 2 », Enter active | ✅ conforme |
| R7 | ESC sur modale PropositionReconnaissance : **reste ouverte** (pas de trap, pas d'ESC handler) | ❌ AUTH-05 confirmé |
| R8 | Numéro inconnu → `/non-enregistre` : PII masquée « XXXXXX 6780 », alert ARIA, sortie claire | ✅ conforme |
| R9 | Login complet PIN 1234 → `/marchand`, dashboard Michelle, modale reconnaissance affichée | ✅ fonctionnel |
| R10 | Console + page errors sur tout le parcours | ✅ **zéro erreur** |

## 5. Résultats des gardes CI auth (exécutés)

| Garde | État | Lecture |
|---|---|---|
| `test:verrou-connexion` | ✅ VERT | serveur décide, écran affiche et dit (syntaxique) |
| `test:comptes` (comptesMemorises) | ✅ VERT | 7 groupes : LRU, quota, biométrie, oubli |
| `test:tokens` | ✅ VERT | cohérence tokens.css, aucun token fantôme |
| `test:entree-unique` | ❌ **ROUGE (4 échecs)** | orphelin hors `verify` ; `routes.tsx:43-44` monte Welcome/LoginPassword en direct ; arbitrage Patrick dans `maillons-verify.json:147` |
| `test:nom-tantie-nanti-lou` | ❌ **ROUGE** | orphelin ; 14 occurrences hors `auth/` (dont `services/loginVoiceScript.ts`) |

## 6. Constats (priorisés)

### P1 — Majeurs

**AUTH-01 · Garde « entrée unique » rouge et hors CI.** `test-entree-unique.mjs` interdit de monter `<Welcome/>`/`<LoginPassword/>` hors EntryGate ; `routes.tsx:43-44` le fait. La garde est orpheline (hors `verify-tout.mjs`) et l'écart arbitré dans `maillons-verify.json:147`. « Une garde qui ne s'exécute pas n'est pas une garde » (`verify-tout.mjs:24`). **Reco** : trancher — réécrire la garde pour légaliser les 2 routes (avec pourquoi), ou remettre les `Navigate`.

**AUTH-02 · PIN transmis via `location.state` vers /change-password.** `LoginPassword.tsx:933` `navigate('/change-password', { state: { codeActuel: pwd } })` — React Router persiste dans `window.history.state` (survit au reload). L'intention produit est bonne (ne pas redemander), le canal est en cause. **Reco** : canal mémoire one-shot (contexte/module) ou `{ replace: true }` + effacement après lecture.

**AUTH-03 · Messages de verrouillage dynamiques inaudibles.** Le verrou dit « attends N minutes » via `parle(message)` (`LoginPassword.tsx:885-900`), mais `direEntreeTexte` (`entreeVoix.ts:396-398`) refuse toute phrase sans clip exact — les messages interpolés ne matchent rien. Pour une non-lectrice, le délai d'attente du verrou (règle §8.4 : 3→5 min, 6→15 min, 9+→1 h) n'est dit à **aucune** étape dynamique. Le garde `test-verrou-connexion` ne vérifie que la présence de `parle(message)`, pas l'audibilité. **Reco** : grammaire segmentée en clips (« attends / cinq / minutes ») ou synthèse contrôlée ; renforcer le garde texte→clip.

**AUTH-04 · « Réécouter mon numéro » muet par construction.** `LoginPassword.tsx:1298-1301` : bouton unique-but-vocal → `parle(chiffresEpeles(phone))` → phrase dynamique sans clip → silence (`entreeVoix.ts:383-391` : repli volontairement absent pour ne pas énoncer le numéro au marché). Idem la « relecture toujours dite » promise l.671-679 (`parleSuite`). **Reco** : feedback non audio (surbrillance chiffre par chiffre + haptique) ou clip générique ; ou retirer l'affordance.

**AUTH-05 · Modale PropositionReconnaissance non conforme (confirmé runtime R5/R7).** Dialog custom `motion.div` (`PropositionReconnaissance.tsx:96-101`) : pas de focus trap, pas d'ESC (vérifié), pas de retour focus ; « Fermer » 32×32 px (< 44) ; **clic backdrop = refus définitif mémorisé** (`noterRefusProposition`) — un tap mal placé supprime la proposition pour toujours. **Reco** : Radix `Dialog` (DS §9), cible ≥ 44 px, backdrop non-refusant.

### P2 — Mineurs

| ID | Constat | Preuve | Reco |
|---|---|---|---|
| AUTH-06 | JWT access + refresh en localStorage (décision documentée en code) | `LoginPassword.tsx:790-791, 958-959` | registre dette ; à terme cookie httpOnly même-domaine |
| AUTH-07 | TEST_PHONES actifs en prod + énumération check-phone (assumé, backlog) | `LoginPassword.tsx:104-146` | log serveur des accès TEST_PHONES, réponse uniforme |
| AUTH-08 | ~70 couleurs hardcodées dans l'auth (LoginPassword 41, ChangePwd 11, PropoReco 10, UnregPhone 4, Activation 3) — aucun garde équivalent à `caisseCharte` | grep fichiers auth | garde `authCharte.test.mts` ou migration tokens |
| AUTH-09 | Cibles < 44 px mesurées runtime : « Modifier » 16,5 px, bascule images 30 px ; garde `test-cible-tactile` ne scanne que POSCaisse | R5 | corriger CSS + étendre la garde à l'auth |
| AUTH-10 | `LoginPassword.tsx` 1 652 lignes : catalogue voix, dev-mode disséminé ×4, dictée, check-phone, login, pavé ×2, bannière ×3, SVG dupliqué | blocs l.41-1652 | extraire `ErrorBanner`, `LoginKeypad`, `useDicteeLive`, `useDevMode` (contrat vocal `parle()` inchangé, l.1022-1031) |
| AUTH-11 | Pas d'`aria-invalid`/`aria-describedby` (Activation, ChangePwd) ; `autoComplete` absent des 3 champs ChangePwd ; PIN `one-time-code` discutable | `ActivationScreen.tsx:138`, `ChangePasswordScreen.tsx:397` | associer erreurs + autocomplete |
| AUTH-12 | UI 100 % français hardcodé ; la voix i18nisée (fr-ci/dyu-ci/bm/bci) mais pas le texte | `LoginPassword.tsx:1146, 1442` | i18n visuel à terme (dette repo connue) |
| AUTH-13 | Transcripts STT (numéro dicté) persistés localStorage 200 événements + inclus au rapport dev partageable (PIN non concerné) | `voiceTrace.ts:71-72`, `voiceDebug.ts:178-180` | masquer les 6 derniers chiffres au dump |
| AUTH-14 | 13 `console.warn` auth — vérifié : aucun PIN/password/montant ✅ ; bruit prod | EntryGate ×4, LoginPassword ×5, ChangePwd ×2 | préservé (conforme §8.7), silencier en prod |
| AUTH-15 | SVG inline dessinés main ×4 au lieu de lucide/Tabler | `LoginPassword.tsx:1403, 1433, 1590` | icônes DS |
| AUTH-16 | Surfaces inline `#fff`/`#FFF9F2` → rendu hybride mode sombre | `LoginPassword.tsx:1411, 1454, 1519` | tokens `--commerce-paper` |
| AUTH-17 | « Vérification... » sans `aria-live`/`role="status"` | `LoginPassword.tsx:1370-1380` | `role="status"` |

## 7. Points forts confirmés (statique + runtime)

1. **PIN jamais journalisé** — vérifié : 13 `console.*` sans données sensibles, dictée du code supprimée et justifiée (`LoginPassword.tsx:713-717`), `vlog` ne trace que l'URL (§8.7 ✅)
2. **Aucun PIN/jeton dans `comptesMemorises`** — type fermé phone/prénom/photo/biométrie, validateur strict, testé (7 groupes verts)
3. **Verrou PIN serveur-driven** — échelle d'attente serveur, écran affiche ET dit (garde vert), runtime R4 confirme le compte d'essais serveur
4. **Rôles fail-closed** — rôle inconnu → logout forcé + toast + retour login (`EntryGate.tsx:92-100`, §8.8 ✅)
5. **P0.0/ADR-002 incarné** — activation par code à usage unique, PIN posé par la marchande, `PINS_INTERDITS = {'0000','1234'}`, double saisie + voix
6. **Masquage PII confirmé runtime** — « Le numéro XXXXXX 6780 n'est pas encore enregistré » (R8)
7. **ARIA dense et correct** — `aria-label` systématiques, `aria-pressed` micro/œil, bannières `role="alert" aria-live="assertive"`
8. **Haptique systématique** — `vibrerErreur/Succes` + retour de frappe à chaque touche des 2 étapes
9. **Focus management réel** — focus auto champ tel, focus PIN post-transition, nettoyage complet timers/micro au démontage
10. **Architecture vocale disciplinée** — porte de parole unique pré-connexion (`paroleEntree.ts:35`), clips tricolores honnêtes `atteste/lotA/prototype`
11. **Fail-closed réseau maîtrisé** — check-phone en échec ne bloque pas (décision C7), retry auto ×2, 429/locked traités
12. **Zéro erreur console** sur tout le parcours runtime (R10)

## 8. Checklist a11y .ai (ACCESSIBILITY_GUIDE §6)

- [x] Voice-first pensé dès la conception (clips attestés, porte unique) — **mais** 4 trous vocaux dynamiques (AUTH-03/04)
- [ ] Cible tactile ≥ 44 px — **3 boutons en dessous mesurés** (AUTH-09)
- [x] Contrastes tokens `--encre*`/`--commerce-*` conformes — **mais** surfaces inline hors système (AUTH-16)
- [x] Navigation clavier pavé/formulaires (R6) — **mais** modale non claviersable proprement (AUTH-05)
- [x] ARIA labels/rôles/alertes denses et corrects
- [ ] Modale : focus trap + retour focus — **non conforme** (AUTH-05)
- [x] Formulaires : `<label htmlFor>` présents — **mais** erreurs non associées (AUTH-11)
- [x] Notifications critiques en `role="alert" aria-live="assertive"` — **mais** « Vérification... » sans live (AUTH-17)
- [x] `reduce_animations` honoré (`MotionConfig`, `App.tsx:58`) ; entrées 0,6 s à revérifier (AUTH-A8)
- [ ] Pas de couleur hardcodée — **non conforme** (~70 hex, AUTH-08)
- [ ] Test lecteur d'écran — non réalisé (limitation d'audit)
- [x] Pas de `console.*` sensible (AUTH-14)

## 9. Actions prioritaires

1. **AUTH-02** — sortir le PIN de `history.state` (canal mémoire one-shot) *(sécurité, rapide)*
2. **AUTH-03 + AUTH-04** — rendre audibles le verrou et la réécoute (grammaire segments/clips) + renforcer `test-verrou-connexion` texte→clip *(voice-first, cœur produit)*
3. **AUTH-05** — Radix Dialog + backdrop non-refusant + cibles 44 px *(a11y, risque produit : refus accidentel définitif)*
4. **AUTH-01** — trancher la garde entrée unique et resynchroniser test↔routes *(gouvernance)*
5. **AUTH-08/09** — garde charte/cible étendu à l'auth (cliquer-modifiable : 3 boutons CSS d'abord)
6. **AUTH-10** — découpage `LoginPassword.tsx` en 4 modules (sans toucher au contrat vocal)

## 10. Matrice de recette auth (statut après audit)

| Domaine | Critère | Statut |
|---|---|---|
| Connexion | numéro+PIN → dashboard rôle correct | ✅ R9 |
| Verrou PIN | serveur décide, écran affiche | ✅ R4 (audibilité ❌ AUTH-03) |
| Compte inconnu | /non-enregistre, PII masquée, sortie claire | ✅ R8 |
| Activation | code usage unique, PIN interdits, double saisie | ✅ statique |
| WebAuthn | disabled sans compte mémorisé | ✅ R3 |
| Session | tokens persistés, refresh rotation | ✅ (AUTH-06 assumé) |
| Fail-closed | rôle inconnu, réseau en échec | ✅ statique |
| Clavier | Tab/Enter sur pavé | ✅ R6 |
| Console | zéro erreur, zéro fuite PIN | ✅ R10 + statique |
| Design system | tokens/cibles/modale | ⚠️ AUTH-05/08/09/16 |

## 11. Suivi — CORRECTIONS P1 APPLIQUÉES (05/10/2026, même journée)

Les 5 constats P1 ont été corrigés le jour même. Tableau de clôture (preuves : gardes CI + recette navigateur, citées en colonne 3) :

| Constat | Correction appliquée | Preuve de clôture |
|---|---|---|
| **AUTH-01** · garde entrée unique rouge/orpheline | **Tranché : les ROUTES se mettent au niveau de la garde.** `/welcome` et `/login` renvoient à `/` par `Navigate replace` (routes.tsx) — EntryGate reste le seul juge du splash, de l'onboarding et du rôle. La garde est **réinscrite dans la chaîne `verify`** (maillons-verify.json) et retirée de `horsVerify`. | `test:entree-unique` ✅ VERT · runtime : `/login` → `/` (EntryGate, splash affiché) |
| **AUTH-02** · PIN dans `history.state` | **Canal mémoire one-shot** `services/codeActuelMemoire.ts` : dépôt juste avant `navigate('/change-password')`, lecture consommatrice (one-shot), expiration 60 s, zéro stockage/URL/historique. Nouvelle garde `test:canal-code` (inscrite dans `verify`). | `test:canal-code` ✅ VERT · runtime : `history.state.usr = null`, aucun `codeActuel` |
| **AUTH-03** · verrou inaudible | **Clips existants, jamais de durée inventée** : palier 5 min → `ui-125` (VRAIE voix, « Réessaie dans 5 minutes ») ; paliers 15 min+ → `login-30` (lot A, geste sans durée fausse) ; `verrouCinqMinutes`/`dernierEssai`/`mauvaisCodeAttention` ajoutés à `ENTREE_VOICE_CLIPS`. Découverte en corrigeant : le clip `codeErreur` générique est un « prototype » muet en production → les 2 essais restants disent `login-28` (lot A). **Garde renforcée** : plus de `parle(message)` possible, chaque clé référencée doit exister avec son fichier embarqué. | `test:verrou-connexion` ✅ VERT (11 vérifs dont texte→clip + fichiers) · runtime : 3 échecs sur Bénito → bannière « Attends 5 minutes » + **requête GET `/voix/tata/ui-125.mp3` (206)** capturée = clip réellement joué ; 2ᵉ essai Michelle → **login-28.mp3 (206)** |
| **AUTH-04** · réécoute muette | **Feedback non audio** (reco 1 de l'audit) : surbrillance chiffre par chiffre + tick haptique par chiffre (`relireNumero`), bouton renommé « Revoir mon numéro » (icône œil, jamais le haut-parleur qui promettait un son), 44×44 px. Le même balayage remplace la relecture muette de la dictée ; `parleSuite` ne reçoit plus de segment sans clip. NUM-02 respecté : le numéro n'est JAMAIS énoncé. | runtime : 10 chiffres rendus, 1 illuminé pendant le balayage, 0 après fin ; annulation à toute frappe + au démontage |
| **AUTH-05** · modale non conforme | **Radix Dialog** (`@radix-ui/react-dialog` 1.1.23) : focus trap natif, ESC actif, retour de focus, `aria-modal="true"` exposé, question en vrai `Title`. **Fond non-refusant** : ESC / Fermer / tap sur le fond ferment SANS noter de refus — seuls « Non » (et l'échec d'enrôlement) mémorisent. « Fermer » 32→**44×44 px** ; focus initial sur « Oui, je veux ». | runtime : ESC ferme ✅ ; modale REVENU après reload après ESC **et** après tap fond = refus non noté ✅ ; Tab reste dans la modale ✅ ; Fermer mesuré 44×44 ✅ ; focus initial « Oui, je veux » ✅ |

**Coût de gouvernance assumé du lot** : la référence voix-trace (`scripts/fixtures/parole-3917bb7.json`) a été mise à jour de façon **chirurgicale** — seule l'entrée `appels['components/auth/LoginPassword.tsx']` a été recalculée (17 → 15 appels : les 2 `parle(message)` verrou/avertissement, la relecture muette de la dictée et `parle(chiffresEpeles(phone))` disparaissent ; script one-shot `scripts/maj-reference-parole-login.mjs`, diff consultable). Les 4 empreintes rouges VOICE-01, propriété de Patrick, n'ont **pas** été re-figées (`test:voix-trace-source` : mêmes 4 échecs qu'avant lot, zéro nouveau).

**Ne pas oublier** : le test du verrou a laissé le compte démo de Bénito (`+2250960606060`) en verrou serveur de 5 minutes — il s'est levé seul.

**P2 restants** : AUTH-06..17 inchangés (voir §6) — prochain lot suggéré : AUTH-08/09 (garde charte/cible étendu à l'auth) puis AUTH-10 (découpage LoginPassword, ~1 700 lignes au 05/10).

## 12. Suivi — CORRECTIONS P2 APPLIQUÉES (05/10/2026, même journée)

Les 9 P2 actionnables en frontend ont été corrigés le jour même. Les 3 autres (AUTH-06, AUTH-07, AUTH-12) sont des dettes assumées hors périmètre frontend — inscrites au registre (`DEBT_REPORT.md`) avec AUTH-14. Tableau de clôture (preuves : gardes CI vertes + recette navigateur) :

| Constat | Correction appliquée | Preuve de clôture |
|---|---|---|
| **AUTH-08** · ~70 couleurs en dur, aucun garde | **Charte auth FERMÉE + garde** `authCharte.test.mts` (modèle `caisseCharte`, inscrite dans `verify`) : 31 valeurs nommées avec leur rôle, budgets hex FIGÉS par fichier (26 LoginPassword → 8 PropoReco → 0 Activation), jetons consommés vérifiés déclarés, migrations exigées vertes. Migration au passage : `#B74725`→`var(--commerce-action)` (×9), `#F5D6BD`→`var(--commerce-apricot)` (×2). | `test:auth-charte` ✅ VERT (31 vérifs) · une couleur nouvelle échoue désormais |
| **AUTH-09** · cibles < 44 px, garde limité à POSCaisse | « Modifier » 44×16,5→**85×44 px** (police 13), bascule images 149×30→**≥44 px**, + minHeight 44 sur « Changer de compte », cadenas-écoute, boutons suggestion, tutoriel dev. **Garde `test-cible-tactile` étendu à l'auth** : Modifier, bascule images, Revoir mon numéro, Fermer (modale). | garde ✅ VERT (4 cibles auth ≥ 44) · runtime : Modifier mesuré **85×44**, Revoir **44×44** |
| **AUTH-10** · LoginPassword 1 759 lignes | **Découpage en 4 modules, contrat vocal inchangé** : `hooks/useDicteeLive.ts` (rouage STT : micro, partielles, filets, nettoyage — canal « voix » signalé par `onCanalVoix`), `hooks/useDevMode.ts` (5 tapes cachées), `components/auth/BanniereErreur.tsx` (bannière ×3 → ×1), `components/auth/PaveSaisie.tsx` (pavé ×2 → ×1, `empreinteDisabled` séparé pour préserver la logique d'activation). LoginPassword : **1 759 → 1 525 l.**, la POLITIQUE vocale reste dans l'écran. | inventaire `parle()` de LoginPassword **15/15 identique** (comparaison mécanique à la référence) · tsc ✅ · parcours complet runtime ✅ |
| **AUTH-11** · formulaires sans aria-invalid/describedby, sans autoComplete | ChangePasswordScreen : `autoComplete` current-password/new-password/new-password + `aria-invalid` + `aria-describedby` → `change-pwd-erreur` sur les 3 champs. ActivationScreen : idem → `activation-erreur` ; le code d'activation reçu par SMS passe en `autoComplete="one-time-code"` (ici le VRAI sens). | tsc ✅ · attributs présents dans le DOM livré |
| **AUTH-13** · transcripts STT non masqués au dump | `voiceTrace.masquerChiffresSensibles()` : toute séquence ≥ 7 chiffres (séparateurs tolérés) garde ses 4 PREMIERS chiffres, les 6 suivants → `•`. Appliqué À LA SOURCE (`sttFin`, `intention` → localStorage masqué) ET défensivement au dump (`vlogDump` : anneau, transcripts, journal de dictée, intentions) pour les entrées persistées antérieures. Idempotent ; diagnostic STT préservé (longueur + préfixe). | test tsx : `0726262626`→`0726••••••`, `07 26 26 26 26`→`07 26 •• •• ••`, mots intacts, idempotent ✅ |
| **AUTH-15** · 4 SVG dessinés main | Icônes lucide du DS : `Keyboard` (bascule), `Delete` ×2 (effacement des 2 pavés → 1 seul usage dans PaveSaisie), `Check` (coche), `Play` (tutoriel dev). | plus aucun `<svg>` dessiné main dans l'auth · tsc ✅ |
| **AUTH-16** · surfaces `#fff`/`#FFF9F2` hors système | LoginPassword : 5 surfaces → jetons (`--commerce-surface` ×4, `--commerce-paper` pour le plateau du pavé — surchargés proprement en sombre). **Exception DOCUMENTÉE** : la feuille de la modale reste `#fff` littéral — ses textes sont des bruns littéraux, la passer au jeton sombre les rendrait illisibles (commentaire in situ ; la migration commence par les textes → `--encre`). | garde [5] ✅ · garde [4] exige les jetons consommés |
| **AUTH-17** · « Vérification... » sans live | `role="status"` + `aria-live="polite"` sur le conteneur de l'attente. | présent dans le DOM · tsc ✅ |
| **AUTH-14** · 13 `console.warn` auth | **Non corrigé de code — préservé conformément à §8.7** (aucun PIN/password/montant, déjà vérifié §7.1) ; l'écoute de bruit prod est inscrite au registre de dette avec AUTH-07 (log serveur TEST_PHONES). | DEBT_REPORT.md → AUTH-14 |

**Coût de gouvernance assumé** : le garde `test-cible-tactile` change de périmètre (POSCaisse + auth) — la fenêtre de recherche autour des marqueurs est documentée en tête de section. Les budgets AUTH-08 figent l'état MESURÉ post-migration ; baisser un budget le même commit est le progrès attendu.

**État des gardes après lot** (toutes exit 0 sauf les 4 rouges VOICE-01 connus, propriété Patrick — zéro nouveau) : typecheck ✅ · auth-charte ✅ · cible-tactile ✅ · comptes ✅ · tokens ✅ · verrou-connexion ✅ · entree-unique ✅ · canal-code ✅ · parole-entree ✅ · entree-numero-voix ✅ · clips-embarqués ✅ · route-access ✅ · maillons-orphelins ✅ · voix-trace-source = 4 rouges connus.

**Recette navigateur post-lot** (agent-browser, 390×844) : EntryGate → onboarding → écran numéro (pavé PaveSaisie complet) → numéro Michelle → « Revoir mon numéro » mesuré 44×44 → PIN → « Modifier » mesuré 85×44 → login 1234 → `/marchand` → modale Radix (`aria-modal`, focus « Oui, je veux », feuille blanche documentée, ESC ferme) → **zéro erreur console**.

**Restant (dette, hors lot)** : AUTH-06 (tokens localStorage → cookie httpOnly), AUTH-07 (énumération check-phone + log serveur TEST_PHONES), AUTH-12 (i18n visuel), AUTH-14 (silencier console en prod), + le trou AUTH-ERR (clips verrou > 2 essais restants) du lot P1.

## 13. Suivi — CORRECTIONS P2 SERVEUR APPLIQUÉES (05/10/2026, même journée)

Les 2 dettes P2/P3 actionnables restantes (AUTH-07 côté serveur, AUTH-14 côté frontend) ont été fermées à leur tour. AUTH-06 et AUTH-12 restent au registre : ce sont des décisions d'architecture (cookie httpOnly en contexte mobile cross-domaine) et de produit (i18n visuel du repo entier), pas des corrections de lot. Tableau de clôture (preuves : garde CI + preuves runtime curl/backend) :

| Constat | Correction appliquée | Preuve de clôture |
|---|---|---|
| **AUTH-07** · énumération check-phone + TEST_PHONES non journalisés | **Nouveau module `backend/src/auth/anti-enumeration.ts`** (les deux outils portés ensemble, décision documentée) : **1. Échéance de réponse uniforme** — check-phone retient son début, interroge, puis répond à `plancher 300 ms + gigue 80 ms` tirée INDÉPENDAMMENT du résultat (hit DB, miss et appel malformé coûtent la même chose depuis l'extérieur ; le contrôleur n'a plus de voie rapide `return {exists:false}` — tout passe par le service). **2. Journalisation TEST_PHONES** — liste miroir ANSUT côté serveur (6 numéros), chaque accès `login` ET `check-phone` logué en WARN, numéro MASQUÉ via `masquerTelephone` (jamais le numéro complet dans un journal). Le corps de réponse reste distinct (`exists`), c'est le parcours produit `/non-enregistre` — seul le TEMPS est uniformisé ; les protections frontend (regex, compteurs) restent. | garde `test:enum-check-phone` ✅ VERT (10 vérifs dont **miroir exact des 2 listes** frontend↔backend) · curl : `0726262626`→200 en 396 ms, `0999999999`→200 en 375 ms, appel malformé→200 en 331 ms (avant : retour instantané) · log backend : `WARN [AuthService] check-phone: accès TEST_PHONE 08 •• •• 40 40` et `login: accès TEST_PHONE 08 •• •• 40 40 depuis 127.0.0.1` |
| **AUTH-14** · 13 `console.warn` auth dans le build livré | **Robinet `utils/warnDev.ts`** : `console.warn` en développement, no-op dans le build livré (`import.meta.env.DEV` est résolu AU BUILD par Vite — le branchement disparaît du bundle, rien à désactiver à l'exécution). Les 13 appels convertis (EntryGate ×5, LoginPassword ×5, ChangePasswordScreen ×2, UnregisteredPhone ×1). §8.7 préservé : les messages restent en dev, et l'audit avait déjà vérifié qu'aucun ne porte de PIN/mot de passe/montant. | garde `test:warn-dev` ✅ VERT (robinet DEV-gated + zéro `console.warn` brut sur les 12 fichiers du périmètre auth) |

**Gouvernance du lot** : 2 nouvelles gardes inscrites dans `maillons-verify.json` (après `test:auth-charte`) et dans `package.json`. Le bloc « BACKLOG ESCALATION P0 BACKEND » de `LoginPassword.tsx` est mis à jour (items 1 et 3 → FAIT côté serveur, avec pointeur vers `anti-enumeration.ts`) ; la sous-dette « liste TEST_PHONES serveur autoritaire par environnement » (le « valider liste autorisée » du bloc) reste au registre. La garde énonce l'incident en tête de fichier, comme les autres.

**État des gardes après lot** (exit 0) : typecheck ✅ · auth-charte ✅ · cible-tactile ✅ · comptes ✅ · tokens ✅ · verrou-connexion ✅ · entree-unique ✅ · canal-code ✅ · maillons-orphelins ✅ · **enum-check-phone ✅** · **warn-dev ✅**.

**Recette navigateur post-lot** (agent-browser, 390×844) : EntryGate → onboarding → écran numéro → numéro Michelle → check-phone (délai uniforme invisible, écran de chargement ~350 ms) → PIN 1234 → `/marchand` → modale Radix (role=dialog, aria-modal, focus « Oui, je veux », ESC ferme) → logout (cookies+storage) → numéro inconnu 0412345678 → **`/non-enregistre` avec PII masquée « XXXXXX 5678 »** → zéro erreur page.

**Restant au registre (DEBT_REPORT.md)** : AUTH-06 (tokens localStorage → cookie httpOnly — décision d'architecture mobile, « à terme »), AUTH-12 (i18n visuel — dette repo XL), AUTH-14b (log serveur TEST_PHONES : écoute du bruit prod), AUTH-ERR (clip lot A « Ce n'est pas le bon code », propriété voix), + liste TEST_PHONES autoritaire par environnement.

## 14. Suivi — DERNIER LOT AUTH : AUTH-06 TRANCHÉE (ADR-002) + SOUS-DETTES (05/10/2026, même journée)

Les dettes restantes du registre ont été traitées à leur tour. La décision d'architecture AUTH-06 a été TRANCHÉE et son reste web implémenté ; la liste TEST_PHONES serveur est devenue AUTORITAIRE par environnement ; le runbook d'écoute ops est livré. Restent au registre AUTH-12 (i18n visuel XL, hors périmètre auth) et AUTH-ERR (clip voix lot A, propriété voix — Patrick). Tableau de clôture :

| Constat | Correction appliquée | Preuve de clôture |
|---|---|---|
| **AUTH-06** · jetons access+refresh en localStorage (web) | **ADR-002 (`.ai/ADR/`) tranche la voie DUELLE** : sur WEB la session vit dans les cookies httpOnly que le backend posait déjà (`access_token` 24 h, `refresh_token` 7 j, stratégie `cookieOrBearer`, restauration `checkSession` déjà cookie-first) — le frontend web n'écrit PLUS les jetons dans aucun stockage JS ; sur APK natif (cookies cross-domaine bloqués) le comportement est INCHANGÉ (localStorage + Bearer, rotation avec successeur). L'écriture est concentrée dans **UN SEUL module** `utils/stockerJetonsSiMobile.ts` qui ne fait rien quand Capacitor est absent ; LoginPassword (2 sites) l'appelle ; les lectures/purges existantes restent (chemin APK + tolérance des jetons hérités lus sans réécriture — ils meurent à leur rotation). Posture CSRF documentée dans l'ADR (JSON-only → préflight obligatoire, CORS en liste d'origines, SameSite prod None+Secure) ; durcissement futur (vérif `Origin` serveur sur mutations auth) inscrit. | garde **`test:coffre-web`** ✅ (9 vérifs : coffre unique, porte `isNativePlatform`, zéro `setItem` des clés hors coffre, LoginPassword ×2 + citation ADR, lectures api-client conservées) · **recette navigateur** : connexion Awa (marchande) → `localStorage` `access:null, refresh:null` ✅, cookies `access_token`+`refresh_token` présents ✅ → **reload → session restaurée sur `/marchand` par cookie seul, localStorage toujours vide** ✅ → logout → 0 cookie auth restant ✅ · tsc backend+frontend ✅ |
| **AUTH-07-sous-dette** · liste TEST_PHONES serveur à tenir À DEUX MAINS | **Liste AUTORITAIRE par environnement** : `AUTH_TELEPHONES_TEST` (10 chiffres locaux, séparés `,`/espace/`;`) fait foi dans `anti-enumeration.ts` ; le Set en dur devient le REPLI de développement (renommé `TELEPHONES_TEST_CODE`). Lecture PARESSEUSE au premier usage (le dotenv de ConfigModule tourne APRÈS l'import du module — sinon l'env est lue à vide). Le démarrage journalise `TEST_PHONES actifs : source=env, 6 numéros (masqués)` — jamais les numéros. `backend/.env` dev posé avec les 6 numéros, aligné sur le miroir. | garde **`test:enum-check-phone`** étendue ✅ (15 vérifs : charge env + filtre 10 chiffres + accesseur CHARGÉ + journal de boot sans PII + **alignement .env↔miroir** + miroir code↔frontend) · **runtime** : boot → `source=env, 6 numéros` ✅ ; `check-phone` recette `0840404040`→200 en 386 ms, réel `0726262626`→200 en 325 ms (échéance uniforme intacte) ; WARN `accès TEST_PHONE 08 •• •• 40 40` pour l'un, RIEN pour l'autre ✅ |
| **AUTH-14b** · écoute ops du log TEST_PHONES | **Runbook livré** : `HANDOFF/SECURITY_TO_TEAM.md` §« Écoute ops — accès recette ANSUT » — ce qui se journalise (WARN, numéro masqué), quelle liste est active (journal de boot `source=env|code`), commandes de comptage (dev + prod), seuil d'alerte proposé (> 10 accès/24 h/numéro hors recette planifiée ; TOUT `source=code` en prod = .env incomplet). Branchement réel à la centralisation de logs prod noté (Sandbox sans Sentry/monitoring). | section présente dans le handoff ✅ · registre DEBT_REPORT mis à jour ✅ |

**Gouvernance du lot** : nouveau garde `test:coffre-web` inscrit dans `package.json` + `maillons-verify.json` (après `test:warn-dev`) ; `test:enum-check-phone` étendue sur place. Le bloc « BACKLOG ESCALATION » de LoginPassword met à jour l'item 3 (liste autoritaire FAITE → `AUTH_TELEPHONES_TEST`) et ajoute l'item 4 (ADR-002, coffre). **Découverte d'environnement** : le sandbox a été RECONSTRUIT entre les lots (15:27) — PostgreSQL, `backend/.env` et les serveurs étaient perdus ; reconstitués (cluster zonky 16.4 recréé, `.env` régénéré avec nouveaux secrets dev, seed démo frais) — la base fraîche a un jeu démo DIFFÉRENT (Awa Koné `+2250700000009` marchande, mot de passe 1234).

**État des gardes après lot** (exit 0) : typecheck ✅ · lint ✅ · tsc backend ✅ · coffre-web ✅ · enum-check-phone ✅ (étendue) · warn-dev ✅ · entree-unique ✅ · canal-code ✅ · verrou-connexion ✅ · cible-tactile ✅ · comptes ✅ · tokens ✅ · auth-charte ✅ · maillons-orphelins ✅ · api-authorization ✅ · parole-entree ✅ · clips-embarques ✅.

**Recette navigateur post-lot** (agent-browser, 390×844) : EntryGate → tutoriel → écran numéro → 0700000009 → check-phone (uniforme, invisible) → PIN 1234 → `/marchand` (Awa Koné) → modale Radix fermée sans refus → **localStorage vide + cookies auth présents** → **reload → session restaurée par cookie, localStorage toujours vide** → console sans erreur → logout → retour EntryGate, 0 cookie auth.

**Restant au registre (DEBT_REPORT.md)** : AUTH-12 (i18n visuel — dette repo XL), AUTH-ERR (clip lot A « Ce n'est pas le bon code », propriété voix — Patrick), + sous-dette CSRF (vérification serveur `Origin` sur mutations auth, inscrite dans ADR-002).
