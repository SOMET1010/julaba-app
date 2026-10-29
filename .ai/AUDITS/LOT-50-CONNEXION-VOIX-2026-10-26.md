# LOT 50 — AUDIT VOIX DE LA CONNEXION : CE QUI SE DIT, CE QUI RESTE (26/10/2026)

| | |
|---|---|
| date | 26/10/2026 |
| déclencheur | Patrick : « regarde encore si tout est intuitif, et qu'un utilisateur qui ne sait pas lire/écrire, avec la voix puisse se connecter avec les directifs de la voix » puis « mets à jour suivant .ai » |
| périmètre | écran de connexion (`LoginPassword.tsx`, `useCommandesVocales.ts`, `voice-offline/commandesEntree.ts`, `entreeVoix.ts`, `tataUiClips.ts`, `utils/accessMode.ts`) ; commits `339306c0`, `3d420d22`, `e5ebc902`, `8ebe8647` ; décision B5 (11/08/2026) |
| base | dev@8ebe8647 |
| verdict | **La chaîne de connexion à la voix est cohérente pas à pas ; les deux écarts ouverts (confirmation au toucher, zéro commande vocale) sont FERMÉS par `8ebe8647` — « oui » vaut le bouton, « recommencer » redicte, « utiliser les chiffres » ouvre le pavé, preuve E2E zéro toucher jusqu'à /marchand. Le code secret reste au pavé : c'est une DÉCISION (B5), pas un trou — on ne dit pas « 100 % vocal », on dit « tout se dit sauf le secret ».** |

---

## 1. L'AUDIT PATRICK (26/10) — CE QUI EST DÉJÀ COHÉRENT

L'audit demandé (« qui ne sait pas lire/écrire ») passe l'écran pas à pas et
trouve la chaîne parlée SOLIDE du premier écran au code :

- l'accueil de Tantie Nanti Lou se dit, les images de connexion parlent leur
  sens (lot « chaque éventualité », 15 clips, `81165cde`) ;
- les directives de saisie du numéro se disent (`parleSuite` 05→06→07, lot
  « chaque vue », `32da1f70`) — et la question d'adaptation clignote
  (`question-adaptation-voix-26-10`) ;
- la dictée micro du numéro existe sur le navigateur (`webReco.ts`, décision
  du 19/10) et dans l'APK (sherpa) ;
- le numéro se RELIT à l'écran (cinq paires + points de progression) — la
  personne qui ne lit pas voit la longueur, elle entend la relecture ;
- les phrases d'erreur (numéro incomplet, invalide, micro indisponible) se
  disent et CLIGNOTENT, sans double annonce (`e5ebc902` : une seule chaîne
  de voix, les rappels attendent leur tour) ;
- le pavé revient AUTOMATIQUEMENT quand la voix n'y arrive pas — l'observation
  sert l'interface, jamais le son (`339306c0` : « automatique » ne se tait
  JAMAIS, même quand l'usage penche clavier) ;
- le passage vers le code se dit (login-19 → login-23), le pavé image offre
  un retour aux chiffres, « J'ai un code de mon agent » reste atteignable.

## 2. LES TROIS ÉCARTS NOTÉS PAR L'AUDIT

1. **La confirmation du numéro exigeait un TOUCHER** — après la dictée, il
   fallait quand même toucher « C'est mon numéro ». Pour qui ne lit pas, ce
   bouton est une image : l'écran savait parler mais pas ÉCOUTER la réponse.
2. **Le code secret ne se dit pas** — pavé ou biométrie, jamais la voix.
3. **Aucune commande vocale reconnue** — « oui », « recommencer », « utiliser
   les chiffres » ne voulaient rien pour la machine.

L'audit l'a dit honnêtement : tant que ① et ③ restaient ouverts, on ne
pouvait PAS affirmer que la connexion est à la voix.

## 3. LES TROUS ① ET ③ SONT FERMÉS — `8ebe8647` (26/10)

- **Après le rappel (login-78, qui nomme les DEUX gestes), l'écran écoute** :
  « oui » (et les acquiescements par locale, + les phrases du numéro
  elles-mêmes) VAUT le bouton « C'est mon numéro » ;
- « recommencer » redicte le numéro ; « utiliser les chiffres » ouvre le pavé
  — le doute ne profite JAMAIS au oui (grammaire déclarée, `commandesEntree.ts`) ;
- le rouage est DOUBLE (web : reconnaissance du navigateur ; APK : sherpa)
  avec garde anti-écho 600 ms et fenêtre d'écoute de 10 s ; le micro est
  rendu AVANT chaque action (jamais de micro trompeur) ;
- le rappel se RÉ-ARME après chaque dictée réussie, même numéro redicté
  (trou fermé en E2E) ;
- clips 78-81 (Denise, −16 LUFS, 24 kHz mono), registre 253, garde
  `test:commandes-entree` (35 assertions) ;
- **preuve navigateur sans les mains** : « oui » → check-phone → étape code ;
  « recommencer » → redictée ; même numéro → question revenue ; « utiliser
  les chiffres » → pavé ; code 1234 → /marchand. ZÉRO toucher sur la
  confirmation.

Les deux fixes qui l'ont précédé tiennent toujours : `e5ebc902` (une seule
chaîne de voix à l'écran — les rappels attendent leur tour) et `3d420d22`
(l'effacement dit la phrase exacte, sans interjection).

## 4. LE CODE SECRET — UNE DÉCISION, PAS UN TROU (B5, 11/08/2026)

- AUDIT UX B5 (11/08) : le code secret ne se DICTE JAMAIS à voix
  (`LoginPassword.tsx` l.232 « B5 intouché : à l'étape du code, JAMAIS
  d'écoute — un secret ne se dit pas » ; l.733 ; l.1760 — le micro a été
  retiré de l'étape code à dessein).
- La raison tient à la rue : à Akwaba, au marché, la voisine écoute. Faire
  dire « quatre-un-deux-trois » à haute voix pour cocher « 100 % vocal »
  trahirait la personne au profit de la statistique.
- L'alternative VOCALE-ASSISTÉE existe : le pavé à chiffres sous la voix de
  Tata (consignes, erreurs, clignotement) — la personne qui ne lit pas tape
  quatre images-positions et s'auto-valide à 4 chiffres. La biométrie
  (empreinte) est une piste future, pas une décision.

## 5. LA PHRASE JUSTE (à tenir partout, docs et écrans)

> **Tout se dit, sauf le secret.** La connexion se fait sans les mains du
> numéro jusqu'au pavé du code (preuve E2E `8ebe8647`) ; le code se TAPE —
> par sécurité volontaire — dans un pavé qui parle, montre et clignote.

On ne prétend PAS « 100 % vocal » tant que le secret ne se dit pas ; on
prétend, avec preuve, que chaque étape SAIT se dire et ÉCOUTER — et que le
seul silence restant est celui qu'on a CHOISI pour protéger l'argent.

## 6. Gates

- Lot DOCUMENTAIRE : 0 fichier code touché (le diff de ce lot n'a que des `.md`) ;
  le code cité est celui des commits `339306c0`, `3d420d22`, `e5ebc902`,
  `8ebe8647` — leurs gardes : tsc 0, eslint 0, 21 gardes verts, `test:commandes-entree`
  35 assertions (détail dans les messages de commit et `worklog.md`).
- Synchronisation anti-course : `rev-list --count dev..origin/dev` = 0 avant push.

## 7. Ce que ce lot NE fait PAS

- Aucun code modifié ici : ce lot met le cockpit `.ai/` à niveau après les
  lots de voix d'Akoun (9a584805 → 8ebe8647).
- La biométrie du code : piste notée (§4), aucune décision.
- La traduction dioula des clips 78-81 (règle lot B : jamais de traduction
  de travail non validée sur un écran d'entrée).
- `TASKS.xlsx` (binaire) laissé tel quel ; le backlog texte `TASKS.md` garde
  UX-2 « Voix pour tous » TERMINÉ (infra) — la chaîne de connexion est le
  prolongement de ce lot, documentée ICI.
- Recette appareil réel P3 : inchangée, ouverte.
