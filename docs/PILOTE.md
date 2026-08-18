# Protocole du pilote — 3 à 5 marchandes

Objectif : décider, **sur des chiffres et des observations**, si Jùlaba passe de
3–5 marchandes à 100. Le pilote dure **2 semaines d'usage réel** au marché,
précédées d'une demi-journée d'installation/formation. Rien ne se décide sur
des impressions de réunion.

## 1. Qui, où, avec quoi

- **3 à 5 marchandes**, choisies pour couvrir les cas et non pour réussir la
  démo : au moins une non-lectrice, au moins une avec un téléphone d'entrée de
  gamme (2–3 Go de RAM), au moins une dont la langue de travail principale
  n'est pas le français (dioula ou baoulé). Des étals de produits différents
  (vivrier, condiments…).
- **Matériel** : leur propre téléphone si possible (c'est le vrai test) ;
  l'APK installé par nos soins ; un téléphone de prêt en secours.
- **Accompagnement** : un binôme (fonctionnel + dev ou opérateur terrain)
  présent la demi-journée J0, puis **2 visites d'observation** (J3–J4 et
  J10–J12) et joignable par téléphone entre les deux.
- **Consentement** : oral, enregistré, en langue de la marchande — usage des
  données, droit d'arrêt à tout moment, aucun impact sur son argent réel.

## 2. Prérequis techniques (bloquants — vérifier AVANT J0)

| Prérequis | Vérification |
|---|---|
| APK construit et recetté sur 2–3 téléphones | scénario vente vocale complet, en bruit |
| `TRUST_PROXY` calibré au dashboard | `GET /api/v1/health/net` depuis un téléphone au marché |
| Base en plan payant + sauvegarde quotidienne active | artefact du workflow présent la veille de J0 |
| Sentry branché (`SENTRY_DSN`) | une erreur de test remonte |
| Supervision `/api/v1/health` (UptimeRobot) | alerte configurée vers l'équipe |

## 3. Déroulé

- **J0 (demi-journée)** : installation, création des comptes réels (PAS les
  comptes de démo), saisie des 10–20 produits de l'étal avec la marchande,
  formation par la pratique : 3 ventes à la voix, 1 vente au clavier,
  1 dépense, consulter « mes ventes ». Test du libellé « Installer ma voix »
  observé en face-à-face (question ouverte n°3 du dossier d'architecture).
- **J1 → J14** : usage réel, sans consigne. L'appli est leur caisse — si
  elles arrêtent de s'en servir, c'est LA donnée du pilote, pas un échec de
  protocole.
- **Visites J3–J4 et J10–J12** : observation silencieuse de 3–5 ventes
  réelles + grille (§ 5) + entretien de 10 minutes.
- **J15** : bilan — extraction des mesures (§ 4), synthèse des grilles,
  décision (§ 6).

## 4. Mesures quantitatives (extraites de la base, par marchande et par jour)

| Mesure | Source | Seuil d'alerte |
|---|---|---|
| Ventes enregistrées / jour | `caisse_transactions` (type=vente) | tendance à la baisse sur 4 jours consécutifs |
| Part des ventes par la voix | `source` de la transaction | < 30 % chez une non-lectrice = la voix ne sert pas |
| Taux d'abandon du guidage vocal | visites (ventes vocales commencées vs confirmées, comptées sur place) | > 40 % d'abandons |
| Rejeux offline réussis | transactions avec `idempotency_key` arrivées avec retard | doublons = 0 (sinon incident) |
| Écart de caisse déclaré | entretien + `fond_final` des sessions | tout écart signalé par la marchande |
| Erreurs backend | Sentry | toute erreur récurrente |
| Crashs / gels de l'appli | observation + entretien | > 1 par jour et par téléphone |

Note voix : le taux de reconnaissance exact n'est pas mesurable
automatiquement (on ne connaît pas ce que la marchande a « voulu » dire) —
il s'observe en visite : sur 10 phrases dictées, combien aboutissent sans
correction ? Noter la langue réellement parlée au micro (question n°1).

## 5. Grille d'observation (une par visite, par marchande)

Pour chaque vente observée : produit dit → compris ? · prix dit → compris ? ·
nombre de corrections (« non, … ») · temps total de la vente · la marchande
a-t-elle regardé l'écran ou seulement écouté ? · le client a-t-il attendu ?
Puis, sur la visite : moments d'agacement, moments de fierté, ce qu'elle
montre à ses voisines, ce qu'elle demande. Verbatims exacts, en sa langue.

## 6. Critères de décision (J15)

**Feu vert (passage à 100 préparé)** — TOUS remplis :
1. ≥ 3 marchandes sur 5 utilisent encore l'appli spontanément en semaine 2 ;
2. zéro perte ou doublon d'argent sur les 2 semaines (rejeux offline compris) ;
3. la non-lectrice réalise une vente vocale complète sans aide en visite 2 ;
4. aucun incident bloquant sans solution identifiée.

**Feu orange** — usage réel mais friction identifiée (voix, langue, UX) :
on corrige, on re-pilote 1 semaine sur le point corrigé. C'est le résultat
le plus probable et c'est un bon résultat.

**Feu rouge** — l'appli est abandonnée dès que l'accompagnement part :
retour au design (le problème est produit, pas technique). Ne PAS passer à
100 pour « voir ».

Le passage à 100 exige en plus : le plan de formation (qui forme 100
personnes, en combien de temps), le support (qui répond au téléphone), et les
mesures du pilote comme référence de comparaison.

## 7. Registre

| Date | Marchande (anonymisée) | Événement / mesure | Suite donnée |
|---|---|---|---|
| _(à remplir pendant le pilote)_ | | | |
