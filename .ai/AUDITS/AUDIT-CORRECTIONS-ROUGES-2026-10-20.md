# LOT — « CONTINUE LES CORRECTIONS » : FIN DES ROUGES HÉRITÉS (saisie/vente voix)

| | |
|---|---|
| date | 20/10/2026 |
| déclencheur | Patrick : « Passe a la suite des corrections » — suite de l'audit consolidé AUDIT-VENTE-SAISIE-VOIX-2026-10-20 (§5 : points ouverts assumés) |
| périmètre | banc `refusHorsLigneCommande.test.mts`, garde `accueilHonnete.test.mts`, écran `auth/LoginPassword.tsx`, garde `modulesPilote.test.mts`, runner `scripts/verify-tout.mjs`, registre `docs/langues/INVENTAIRE-VOIX.md` |
| base | dev@3c4bc40 (HEAD origin/dev au démarrage du lot — re-vérifié par fetch, la session parallèle avait poussé 5 commits au-delà de 821cc12 : 82c7471, 2ba6c01, f3d42a7, ab6da32, 3c4bc40) |
| verdict | **FERMÉ — les 5 rouges hérités du §5.4 sont tous verts à la fin du lot** ; CONNUS aménagé (1 rouge guéri en moins) ; dette C-C1 restée INTACTE (décision Patrick requise, cf. §5). |

---

## 1. Ce que ce lot a fait, constat par constat (preuves de première main à dev@3c4bc40)

### R1 — `test:refus-hors-ligne-commande` : CORRIGÉ (banc, pas produit)

**Symptôme** : `ReferenceError: toast is not defined` à `direEchecReseau` — le banc
extrait le VRAI source de `MesCommandes.tsx` par eval et l'exécute avec des deps
espionnées ; le source a évolué (toast sonner ajouté, `MesCommandes.tsx:22` import,
`:191,194,208…` usage) sans que le banc suive. Le banc plantait AVANT de prouver.

**Correctif** (banc seul — le produit était déjà conforme T7 : il dit ET écrit la
même phrase) : `refusHorsLigneCommande.test.mts` `environnement()` pose désormais un
espion `toast: { error: (m) => ecrits.push(String(m)) }` et les trois sections
gagnent leurs assertions d'ÉCRIT :
- B4-1 : « ce qui est écrit est compréhensible » + « l'écran écrit la même phrase qu'il dit (T7) »
- B4-2 : « l'échec de transport est écrit comme il est dit (T7) »
- B4-3 : « le message du serveur est écrit tel quel »

La garde ressort PLUS FORTE qu'avant le rouge : elle verrouille désormais la
cohérence dit/écrit qu'elle ignorait.

### R2 — `test:accueil-honnete` : RECALÉ sur la décision en vigueur

**Symptôme** : section [PILOTE] rouge — « l'accueil n'ouvre plus Keiwa » et « la
tuile “Mon argent” a disparu » alors que `MarchandAccueilVoice.tsx:225` porte la
tuile.

**Enquête** : conflit de décisions datées.
- 24/09 (CIBLE-UX-MARCHANDE-PILOTE.md) : tuile retirée — Keiwa verrouillé, écran muet.
- **06/10, arbitrage §8.3 d'AUDIT-UX-ROLES-2026-10-06 sur délégation explicite** :
  tuile RESTAURÉE (commit `UX-6/M-P1-2`, preuve `.ai/COMMIT_LOG.md:41` « la tuile
  “Mon argent” restore la porte keiwa (porte unique accueil, arbitrage §8.3) ») —
  le défaut racine (« écran muet ») avait été traité à la source (Tata parle aux
  trois rôles, UX-2/T1), et keiwa n'avait PLUS AUCUNE porte marchande.

**Correctif** : la garde est recalée sur la décision ACTUELLE — assertions inversées
(`/marchand/keiwa` DOIT être atteignable, tuile « Mon argent » DOIT être là), le
commentaire d'historique 24/09→06/10 reste dans la garde. La fonction `lire()`
filtrant les commentaires, les assertions passent par le code ACTIF (`label:
'Mon argent'`, `navigate('/marchand/keiwa')`) — pas par un commentaire.

### R3 — `test:voix-connexion-lot-a` : CORRIGÉ (produit — vrai bug d'écran muet)

**Symptôme** : section [4] rouge — « effacement : l'écran dit ce texte — un mot
d'écart et direEntreeTexte ne trouve plus la clé ».

**Enquête** : l'écran disait
`parlerAvantConnexion('connexion', 'Tu es en train d\'effacer le numéro hein !')`
(`LoginPassword.tsx:1041`) :
1. ce texte ne correspond à AUCUN clip → `direEntreeTexte` (qui retrouve la clé
   PAR LE TEXTE) n'aurait rien trouvé ;
2. l'appel ne passait PAS le canal `direEntreeTexte` (défaut = voix machine) ;
3. il nomme « numéro » — violant la règle du lot A que la garde verrouille en
   [5] : un effacement ne nomme ni chiffre, ni numéro, ni code.

Le clip existe pourtant : `login-24.mp3`, AUTH_24 « C'est effacé net. »
(`entreeVoix.ts:146-148`, `loginVoiceScript.ts:55`, dioula « A josila. »).

**Correctif produit** : `LoginPassword.tsx:1047-1049` — `void parle('C\'est effacé net.')`
(« C'est effacé net. » littéral, mot pour mot le clip ; `parle()` est la porte
canonique de l'écran, canal `direEntreeTexte`, clip exact, zéro voix machine).
Le texte prévenant de relecture se garde : `rendreALaMain('numero','effacement')`
inchangé.

**Régression vérifiée** : régénération de `INVENTAIRE-VOIX.md` requise (+1 site,
+1 phrase littérale auth) — `npm run i18n:inventaire`, garde `test:i18n-source`
repassée verte (430→431 sites, 241→242 phrases).

### R4 — `test:modules-pilote` : RECALÉ (plancher 40 → 38)

**Symptôme** : « 38 routes d'argent hors pilote trouvées » vs assertion `>= 40`.

**Enquête** : le 19/10, IDENTIFICATEUR-16 (commit `b91f6a8`) a RETIRÉ de l'espace
identificateur ses 6 routes keiwa (keiwa, transfert, paiements, banque, carte,
historique) — décision, pas érosion. Les autres assertions de la section [5]
passe toutes : « toutes couvertes par MODULES_HORS_PILOTE », « rien n'est
supprimé : la caisse ET Keiwa sont toujours déclarées ».

**Correctif** : plancher recalé à 38 avec le commentaire d'historique ; le plancher
continue de traquer l'ÉROSION silencieuse (une route qui disparaît sans décision
recale la garde, elle ne la franchit pas).

### R5 — `test:prix-marchande` (dette C-C1) : DÉJÀ VERT — rien à faire

Le nom cité par l'audit consolidé (« test:prix-de-la-marchande ») n'existe pas ;
la vraie suite est `test:prix-marchande`, elle est VERTE à dev@3c4bc40 : le
catalogue garde ses ordres de grandeur (« on n'efface pas une donnée, on cesse de
la prendre pour une autre » — section [5] du banc). La dette C-C1 est documentée
DANS le test lui-même. **Décision Patrick toujours requise pour vider les prix de
`data/catalogue-produits.ts`** — non tranché ici, non tranché ailleurs.

## 2. Aménagement de CONNUS (`scripts/verify-tout.mjs`)

`test:i18n-empreintes-argent` sort de la liste CONNUS : redevu vert de première
main (relance exit 0 à dev@3c4bc40) — l'empreinte intentLocal s'était réalignée
au fil des lots voix du 19-20/10 (821cc12, 82c7471, 2ba6c01, f3d42a7). L'historique
de la guérison reste dans le commentaire du runner (règle VER-01 : « la liste
CONNUS doit maigrir, pas dormir »). Restent 2 CONNUS : voix-trace-source (VOICE-01,
refigeage réservé à Patrick) et garde-argent (état de référence).

## 3. Ce que ce lot NE fait PAS (inchangé, assumé)

1. **P3 — recette sur appareil** (14 scénarios SPEC_VENTE_VOCALE.md:161-173) :
   exige un téléphone réel + l'APK Sherpa. Reste ouvert, inchangé.
2. **Dette C-C1** — prix du catalogue statique : décision Patrick requise (§1 R5).
3. **Correction vocale mot à mot** (« non, pas kasso, gombo ») : chantier à part
   si Patrick la veut (audit consolidé §5.3).
4. **2 CONNUS restants** : voix-trace-source, garde-argent (voir §2).
5. Correction d'un écran d'effacement : le PIN (code) effacé ne parle pas —
   comportement préexistant, hors lot, non régressé.

## 4. Gates exécutés (première main, dev@3c4bc40 + lot)

- `tsc -b --force` front : exit 0
- eslint sur les 5 fichiers touchés : 0 erreur
- Suites relancées vertes : refus-hors-ligne-commande, accueil-honnete,
  voix-connexion-lot-a, modules-pilote, i18n-source (après régénération),
  i18n-locales, i18n-empreintes-argent, web-reco, lien-activation, auth-charte,
  charte-marchande, retour-frappe, micro-contraint, parole-entree, fcfa
- `verify` complet : cf. trace exécutée (§6) — l'objectif est 0 rouge hors CONNUS

## 5. Correction méthodologique du doc précédent

L'audit consolidé citait « test:prix-de-la-marchande » : le script réel est
`test:prix-marchande` — et il était déjà vert à 3c4bc40 (le lot ab6da32 l'avait
fermé). Le §6 de ce jour supprime l'ambiguïté.
