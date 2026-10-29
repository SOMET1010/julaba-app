# AUDIT — Voice-first et accessibilité (Jùlaba)

- **Dépôt** : SOMET1010/julaba-app · **Branche auditée** : dev · **Commit observé** : `4947b870`
- **Date** : 2026-10-29 · **Origine** : audit externe remis par Patrick (verbatim ci-dessous)
- **Score proposé par l'auditeur** : 52/100
- **Verdict auditeur** : NON — le parcours complet n'est pas encore accessible de bout en bout

> NOTE DU TRAITEMENT (29/10, même jour) : cet audit a été reçu comme INTRANT,
> pas comme vérité. Chaque écart cité a été re-vérifié contre le code de
> `a96c11b1` (HEAD du 29/10, 6 commits après le commit observé). Les
> contre-vérifications figurent dans `PLAN-CORRECTION-VOICE-FIRST-2026-10-29.md`.
> Cinq affirmations de l'audit sont CONTRADITES par le code actuel (voix de
> /non-enregistre, états suspendu/attente parlés, seed 123456 interdit,
> typecheck vert dans un environnement sain, AUTH-RECOVERY-01 déjà consigné).

---

## TEXTE INTÉGRAL DE L'AUDIT (verbatim, non modifié)

### 1. Verdict exécutif

Verdict global : NON — le parcours complet n'est pas encore accessible de bout en bout

Une marchande peu ou non lectrice peut utiliser une partie importante de la caisse, notamment la vente vocale, la confirmation, l'hors-ligne et le panier persistant. En revanche, elle ne dispose pas d'un parcours garanti sans lecture/écriture depuis l'authentification jusqu'à toutes les fonctionnalités :

- chemin heureux quotidien : partiellement accessible si le compte est déjà mémorisé sur son téléphone ;
- première connexion / activation : non accessible sans aide lettrée, car le flux demande un code d'activation et un PIN numérique saisis dans des champs textuels ;
- WebAuthn : présent mais pas usernameless, car l'API demande d'abord le téléphone et utilise residentKey: preferred, non required ;
- récupération après perte/réinstallation : manquante, sans ré-enrôlement guidé, présence de la marchande, révocation et code à usage unique ;
- caisse vocale marchand : la partie la plus mature, mais la preuve terrain réelle n'est pas disponible dans cet environnement ;
- producteur, coopérative, wallet/Keiwa, marché, identification et back-office : couverture vocale inégale, avec des zones textuelles, des erreurs non parlées ou des fonctionnalités uniquement documentées ;
- la voix Dioula/Bambara n'est pas disponible dans le runtime, et plusieurs montants dynamiques restent dépendants d'un moteur de synthèse locale réellement disponible sur l'APK.

### Domaines (scores auditeur)

| Domaine | Score | Verdict |
|---|---|---|
| Caisse / vente vocale marchand | 78 | Bon socle, preuve appareil manquante |
| Hors-ligne / panier / idempotence | 75 | Bien couvert par le code et les tests source |
| Authentification quotidienne | 55 | Accessible seulement sur chemin heureux |
| Enrôlement / activation | 35 | Numéro assisté, mais saisie de codes et consentement incomplet |
| Récupération / téléphone perdu | 10 | Parcours cible non implémenté |
| Couverture vocale des autres rôles | 35 | Partielle, plusieurs zones textuelles |
| Accessibilité WCAG / multi-canal | 65 | Bons garde-fous, mais pas de test axe/lecteur d'écran terrain |
| Preuve de recette réelle | 20 | Maestro valide les fichiers, pas la parole ni le son |

### 2. Ce qui est effectivement solide

#### 2.1 Entrée et guidage vocal

Le point d'entrée est centralisé par EntryGate et propose Welcome, onboarding puis connexion (frontend/src/app/components/auth/EntryGate.tsx). Les clips d'entrée, les boutons d'écoute, les pictogrammes, le mode soleil, la taille de texte et l'haptique sont présents. Le dépôt fournit aussi une nomenclature de clips et des tests de présence audio.

Le test statique test:coffre-web passe : les jetons ne sont pas écrits en localStorage sur le Web hors du coffre mobile dédié, et les cookies httpOnly sont utilisés côté Web. Les tests statiques test:verrou-connexion, test:canal-code et test:recuperation-admin passent également.

Réserve : le fait qu'une consigne soit déclarée et qu'un fichier MP3 existe ne prouve pas que le son est audible sur l'APK, après déverrouillage audio, avec le volume et le routage réels du téléphone.

#### 2.2 Caisse marchand et vente vocale

Le pipeline de vente vocale est cohérent dans frontend/src/app/hooks/useVoiceCore.ts, frontend/src/app/voice-offline/localIntent.ts, offlineCaisse.ts et useOfflineVoiceQueue.ts :

- écoute → interprétation → confirmation → ajout au panier ;
- panier commun voix/tactile ;
- confirmation avant opération financière ;
- verrou contre le double appui ;
- file hors-ligne durable ;
- idempotence et séparation des utilisateurs dans la file ;
- erreurs vocales et retour tactile prévus ;
- clips Tata prioritaires, avec repli audio local selon le runtime.

Les flows .maestro sont syntaxiquement valides : 19 flows validés, aucun identifiant en dur, commandes et runFlow résolus. Cela prouve la qualité du banc, pas l'exécution vocale.

Les scénarios T1/T2/T3 sont explicitement marqués partiels dans .maestro/README.md : Maestro ne sait ni injecter une parole dans le micro ni mesurer la sortie audio. La vente vocale doit donc encore être validée sur Android réel avec les cinq gestes terrain décrits dans le dépôt.

#### 2.3 Hors-ligne

La politique docs/RUNTIME_VOCAL_HORS_LIGNE.md est claire : STT local, compréhension locale, clips embarqués et file de synchronisation. Les tests source couvrent de nombreux cas d'idempotence, de rejeu et de cloisonnement par utilisateur. C'est une force importante pour le contexte de marché et de connectivité intermittente.

Limite : la règle voice-first n'est pas complètement satisfaite pour les réponses dynamiques si aucun clip composable ou moteur TTS local disponible ne peut prononcer un montant. Le document docs/REGLE-VOICE-FIRST.md reconnaît que les montants variables sont un verrou produit.

### 3. Écarts critiques de l'authentification

#### P0-AUTH-01 — Récupération non accessible et non sécurisée

Constat : après perte, réinstallation, vidage du cache ou changement de téléphone, le parcours retombe sur numéro + PIN. Aucun parcours complet de récupération guidé par Tata ne permet de ré-enrôler un nouvel authentificateur avec double présence de la marchande.

Preuves citées : docs/AUDIT-AUTH-NON-LECTRICES.md:36-44 ; docs/SPEC-AUTH-CIBLE.md:151-181 ; docs/AUDIT-AUTH-NON-LECTRICES.md:49-60 ; frontend/src/app/components/auth/LoginPassword.tsx.

Impact : la personne ne sachant pas lire/écrire est bloquée ou doit dicter/saisir son numéro de 10 chiffres ; un identificateur pourrait potentiellement reprendre le compte si le secret lui est connu.

Action demandée : implémenter le parcours de récupération serveur vérifié, code unique/TTL/révocable, présence de la marchande, consentement vocal/tactile tracé, révocation des credentials perdus et guidage audio à chaque étape.

#### P0-AUTH-02 — Enrôlement/activation encore dépendant de saisies textuelles

ActivationScreen.tsx:21-24,75-90,116-149 demande un code d'activation, un PIN numérique et sa confirmation dans des champs textuels. Le document cible exige enrôlement sur le téléphone de la marchande, consentement explicite horodaté, secret choisi par elle, jamais 0000, aucun secret détenu par l'identificateur (docs/SPEC-AUTH-CIBLE.md:60-105).

#### P1-AUTH-03 — WebAuthn non usernameless

backend/src/auth/auth.controller.ts:850-871 utilise `residentKey: 'preferred'`, `userVerification: 'preferred'` ; :912-940 exige body.phone. La cible docs/SPEC-AUTH-CIBLE.md:108-121 exige `residentKey: required`, `userVerification: required`, `allowCredentials: []`, sans numéro demandé au quotidien.

#### P1-AUTH-04 — Téléphone partagé non traité comme un vrai sélecteur sécurisé

docs/SPEC-AUTH-CIBLE.md:185-193 ; docs/AUDIT-AUTH-NON-LECTRICES.md:31-34,58. Risque : mauvaise personne dans le mauvais compte, ou retour forcé au numéro/PIN.

#### P1-AUTH-05 — Messages d'erreur d'authentification parfois faux ou muets

docs/logigramme/00-entree-auth.md:103-116,125-131,143-149,151-166 : compte suspendu/rejeté/en attente ramené à « mauvais code » ; numéro invalide non parlé ; états réseau/JSON non vocalisés ; /non-enregistre sans appel vocal.

### 4. Matrice des fonctionnalités métier

(Conservée telle quelle — vente simple 78, hors-ligne 75, panier persistant partiel, dépenses/stock/ventes passées partiels, crédit désactivé pilote, Keiwa partiel, marché/négociation partiel, producteur insuffisant, coopérative partiel, identificateur partiel, institution non cible, back-office non adapté, support/paramètres partiel. Détails dans le texte reçu de l'auditeur, résumé suffisant pour le suivi.)

### 5. Accessibilité : points positifs et limites

Positifs : primitives Radix + focus-visible ; ARIA ; cibles ≥ 44 px avec garde CI ; mode soleil/sombre/taille ; haptique ; modes lecture/voix/mixte ; micros labellisés ; clips d'erreur et verrou ; anti-jargon ; coffre de session testés.

Gaps (.ai/ACCESSIBILITY_GUIDE.md:34-44, .ai/A11Y_BUGS.md) : multiplicité des systèmes de modales ; absence de test axe-core/pa11y/Lighthouse bloquant ; i18n UI absente (Dioula/Bambara) ; skip-link manquant sur AppLayout ; BottomBar sans alternative clavier documentée ; couleurs hardcodées ; console.* en production.

### 6. Tests exécutés et limites de l'auditeur

Réussites : node .maestro/valider.mjs (19 flows) ; test:coffre-web ; test:verrou-connexion ; test:canal-code ; test:recuperation-admin ; build backend.

Non-preuves (environnement de l'auditeur cassé) : tsx manquant, @esbuild/linux-x64 manant, conflit de symlink workspace, TS5101 sur baseUrl, vite absent, aucun appareil Android. « Ces résultats ne prouvent pas que les tests source échouent fonctionnellement. »

### 7. Plan de correction priorisé (auditeur)

- **P0** : 1) récupération sûre guidée (code unique, TTL, révocation, double présence) ; 2) enrôlement sur le téléphone de la marchande (consentement, secret choisi par elle) ; 3) éliminer les secrets par défaut en production (rotation 0000/123456, seeds opt-in) ; 4) garantir la vérité des écrans d'argent (aucun « succès » sans confirmation serveur).
- **P1** : 1) WebAuthn réellement usernameless (residentKey required, userVerification required, allowCredentials []) ; 2) sélecteur de comptes local (téléphone partagé) ; 3) montants dynamiques locaux ; 4) entrée vocale récoltes/publications/négociation/dépenses/wallet ; 5) zones producteur (offline, annulation, revenus, anti-double-tap) ; 6) uniformiser les erreurs (aucune réponse brute, aucun UUID parlé).
- **P2** : 1) workspace/typecheck/build dans CI ; 2) axe-core/Playwright + clavier + lecteur d'écran ; 3) flows Maestro sur Android réel avec injection audio ; 4) recette avec de vraies utilisatrices non lectrices ; 5) mesurer compris/entendu/visible/confirmé/synchronisé.

### 8. Conclusion de livraison (auditeur)

La branche dev contient un socle sérieux et beaucoup de garde-fous, en particulier pour la caisse vocale marchand et l'hors-ligne. Elle ne peut toutefois pas être déclarée conforme à la promesse « guidée depuis l'authentification jusqu'à toutes les fonctionnalités pour des personnes ne sachant ni lire ni écrire ».
