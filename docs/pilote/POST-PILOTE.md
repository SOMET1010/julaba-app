# POST-PILOTE — ce qu'on sait faire et qu'on ne fait pas maintenant

Ouvert le 02/10/2026 avec le jalon [`RC1.md`](RC1.md).

**Rien ici n'est bloquant** au sens de `docs/terrain/CLOTURE-CAISSE-VOCALE.md`
§5 : aucune de ces lignes ne fait écrire un montant faux, ne fait dire un
montant faux, ni n'empêche un des sept gestes d'aboutir.

> **Ce fichier n'est pas un cimetière.** « Documenter une dette ne la ferme
> pas. » Chaque entrée dit ce qui est **su**, pas seulement ce qui est
> souhaité — pour qu'on reparte de la mesure, pas de la mémoire.

---

## Voix et micro

**MIC-02C — le départ sous bruit.** Le seuil adaptatif ouvre à **0,42 s** au
lieu de 1,34 s sous bruit + parole. On capte ~0,9 s de fond avant la voix. Ça
entre dans la transcription, ça ne fabrique pas de montant. Sherpa VAD fait
mieux (1,48 s) — mesuré. → `spike/oss-02-vad/EXPERIENCE-2.md`.

**MIC-02D — les 400 ms d'écoute du fond.** `ECOUTE_PLANCHER_MS` retarde le
début de détection. **Le banc ne pouvait pas le mesurer** : si une marchande
parle immédiatement après l'appui, son premier mot pourrait tomber dedans. Deux
pistes si le terrain le remonte — réduire la durée, ou démarrer le relevé
**avant** l'appui. **Celui-ci peut devenir bloquant** s'il fait perdre une
vente : il remonterait alors dans RC1.

**MIC-02E — l'attente de 2,8 s.** Réglage arbitré, accepté pour le pilote.
Revisitable avec de vraies marchandes plutôt qu'avec huit fichiers.

**OSS-02 — Sherpa VAD, candidat post-pilote.** Rejeté pour le pilote : il
remplacerait **quatre lignes** de seuil contre un pipeline de streaming audio
natif. Redevient pertinent si le terrain montre que le bruit du marché dépasse
ce que le seuil adaptatif encaisse. → `docs/oss/REGISTRE-OSS.md`.

**VOICE-01 — les quatre maillons rouges de `verify`.** `test:voix-trace-source`
sur `useVoiceCore.ts`, `AppLayout.tsx`, `ObjectifContext.tsx`. Refigeage
**réservé à Patrick** (`--regenerer`). Rouge sur HEAD depuis avant ce lot.

**PERF-01 — préchargement audio.** 842 clips, APK de 187 Mo, 11 Mo de collecte
mémoire au démarrage. Constat seul, et le document dit ce qui n'est **pas**
établi — dont : ce préchargement est peut-être **voulu** (sans réseau au
marché, un clip absent est une voix muette). → `docs/dette/PERF-01-prechargement-audio.md`.

**#29 — matrice audio-TTS.** Écrite par Patrick.

---

## Banc de test

**OSS-01 — les 9 flows Maestro restants.** Le banc est **gelé** au statut
« suffisant » : 1 flow vert prouve que la chaîne fonctionne. Les 9 autres ont
des libellés **non mesurés** ; la méthode est connue (sonder l'écran, corriger
sur preuve, un flow par run) et elle est chère. Backlog
d'**industrialisation**, pas préalable au produit. → `docs/oss/REGISTRE-OSS.md`.

**Acquis à ne pas re-prouver** : Maestro lit la WebView Capacitor **sans
`data-testid`**. Aucune instrumentation n'est à ajouter au code de production.

**La gate permanente.** Déclencheur et caractère bloquant : **non tranchés**.
Et le banc pointe la **production** par défaut — `P0-1` et `PAN-01` y
écriraient de vraies lignes d'argent. À régler avant toute automatisation.

**T1, T2, T3 — Maestro ne parle ni n'entend.** Gestes **humains**. Un
dispositif complémentaire (injection audio émulateur, banc physique) les
rendrait automatisables. Lot nommé, après la clôture de la caisse vocale.

---

## Architecture — explicitement acceptés post-pilote par RC1

**OSS-03 TanStack Query** · **OSS-04 EventBus** — repris par Patrick, périmètre
**À DÉFINIR**. **Dexie / SQLite**, **XState**, **ERPNext** — cités à l'audit
OSS, jamais ouverts. **Certains écrans sont encore gros** (`useVoiceCore.ts`
1129 lignes, `MicroVenteCaisse.tsx` 901).

> Règle d'entrée, inchangée : **aucun nouveau framework ni harnais sans
> démonstration préalable d'un gain produit ou de code supprimé.**

---

## Lots nommés et datés, hors dossier

Profil · Express 4/5 · exceljs 4.x · `@capacitor/cli` 9.x · I4 / I5 / I6 ·
CONC-01 · collision STK-03.

---

## Sécurité

**ALERTE-SEC-01** — 29 identifiants en clair dans le dépôt **public**
`akoun-dev/julaba` (`COMPTES-TEST.md`, commit `356f1dc`). **Hors de ce dépôt**,
donc hors RC1 — mais ça ne se périme pas, et ça ne se traite pas en écrivant
quoi que ce soit dans un fichier.

---

## Comment une entrée remonte dans RC1

Une seule voie : **le terrain montre qu'elle empêche une marchande de vendre,
d'encaisser, de retrouver son panier, ou de croire le montant affiché.** Alors
elle cesse d'être une amélioration et devient un bloquant — et on la corrige
avant le pilote.

Pas parce qu'elle est petite. Pas parce qu'on sait comment faire.
