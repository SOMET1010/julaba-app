# 📟 Spec d'écran — Récupération guidée (LOT-RECOVERY, front)

> Pendant écran du chantier backend `recuperation.controller.ts` (SPEC-AUTH-CIBLE
> §3.1/3.2, décision du 16/08 §8.4). Public : une marchande qui a perdu son
> téléphone, assistée par un identificateur/agent qui, lui, sait lire et taper.
> **Règle d'or : elle ne lit rien. Chaque étape parle (clips « Tata »), chaque
> bouton se reconnaît au son + à la couleur + à la forme + à la position.**

## 0. Qui fait quoi sur l'écran

| Acteur | Ce qu'il fait | Ce qu'il ne fait JAMAIS |
|---|---|---|
| **La marchande** | écoute, pose son doigt, maintient « C'est mon compte » | taper le numéro, taper le code |
| **L'agent** | tape le numéro de la marchande + le code reçu par SMS | voir un secret s'afficher, passer les marches |

## 1. Entrée (multi-canal, §0.1.5)

- Depuis **EntryGate** : un bouton discret mais trouvable — icône 🔑 « crochets »
  OU pictogramme main tendue, libellé parlé « Tu as perdu ton accès ? Touche ici »,
  en bas de l'écran (position stable), jamais caché derrière un menu.
- Depuis **LoginPassword** en échec répété : même bouton proposé APRÈS le 3ᵉ
  échec (l'échelle d'attente serveur répond déjà — le lien offre la sortie).

## 2. Les trois marches (une par écran, retour possible entre 1 et 2)

### Marche 1 — « Le code de l'agent »
- Audio d'accueil : « Donne le téléphone à la personne qui t'aide. Elle tape
  le code reçu par message. »
- Champs : numéro de la marchande (pavé numérique, l'agent tape) + code
  (4+4, accepte minuscules/espaces/tiret — le serveur normalise).
- Erreur serveur = un SEUL message parlé « Numéro ou code refusé » (l'anti-
  énumération du serveur impose l'uniformité côté client aussi). Verrou
  ATTENTE : le temps annoncé par le serveur est lu à voix haute.
- Succès → **Marche 2** (le jeton reste en mémoire du client, jamais affiché).

### Marche 2 — « C'est mon compte » (LE GESTE D'ELLE)
- Audio : « Maintiens ton doigt sur le gros bouton jusqu'au son. »
- Un SEUL gros bouton, **toucher long ≥ 800 ms**, remplissage visuel pendant
  la pression, son de validation au déclenchement, vibration si disponible.
- À la levée du doigt avant 800 ms : retour au départ, audio « Encore un
  peu : maintiens jusqu'au son. »
- Le client n'appelle `POST consentement` QU'après le geste complet. Le
  serveur horodate — c'est la trace de la double présence (§3.2).

### Marche 3 — « Pose ton doigt » (ré-enrôlement)
- Audio : « Pose ton doigt sur le capteur. C'est ton nouveau téléphone. »
- Le client appelle `POST webauthn/options` puis `navigator.credentials.create`
  avec `residentKey: 'required'`, `userVerification: 'required'`, puis
  `POST re-enroler`.
- Échec du geste : audio « Ce n'est rien, pose ton doigt encore. » — redemander
  les options (nouveau challenge), mêmes marches, rien n'est brûlé.
- Succès : elle est CONNECTÉE (jetons dans le corps de la réponse) → audio
  « C'est bon, tu es revenue. » → routage par rôle (EntryGate).

## 3. Ce que cet écran REFUSE

- Aucun champ tapé par elle (numéro, code : l'agent).
- Aucun code affiché à l'écran (le serveur ne l'envoie de toute façon pas).
- Aucun contournement des marches : sans le jeton consentie, l'appel d'options
  renverra l'erreur serveur — l'écran ne doit même pas proposer le bouton.
- Aucune promesse hors-ligne : ce parcours EST en ligne (serveur), l'écran le
  dit d'entrée si `navigator.onLine === false`.

## 4. Restes tracés (honnêteté)

- Test d'invariants HTTP bout-en-bout (harnais BO + vraie réponse WebAuthn
  générée) : pas écrit dans ce lot — le banc unitaire verrouille la machine à
  états, le harnais reste à monter.
- Clips « Tata » à enregistrer : les textes ci-dessus sont les scripts prêts
  pour la session studio (CLIPS-VOIX-A-ENREGISTRER.md à compléter).
