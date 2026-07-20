Voici exactement quoi lui répondre, sans ambiguïté.

---

# ✅ RÉPONSES OFFICIELLES + INSTRUCTIONS

Merci pour l’audit intermédiaire.
Voici les décisions officielles.

---

# Q1 — ARCHITECTURE SUPABASE

Réponse :

👉 Oui, Supabase est prévu en phase 2.
👉 Ce déploiement est volontairement **frontend-only avec persistance locale**.

Mais :

* Aucun mock visible en production.
* Aucun fallback démo.
* Aucun comportement “simulation”.

L’application doit paraître 100% réelle même si stockage local.

Le score “Production Readiness” doit être évalué en tenant compte de cette décision.

---

# Q2 — PIN EN CLAIR

Réponse :

👉 Le PIN ne doit PAS être actif en production dans cet état.

Action obligatoire :

* Désactiver la fonctionnalité PIN
  OU
* Hasher le PIN (minimum SHA256)

Si pas hashé → désactivation obligatoire.

---

# Q3 — PROFILESWITCHER

Réponse claire :

👉 Il ne doit jamais être accessible en production.

Action obligatoire immédiate :

```ts
if (import.meta.env.DEV) {
  return <ProfileSwitcher />
}
```

En production → invisible + non importé dynamiquement si possible.

C’est un point critique.

---

# Q4 — ROUTE DUPLIQUÉE /institution/dashboard

Réponse :

👉 La route canonique est celle enfant du layout `/institution`.

La standalone (L.242) est un résidu.
Tu peux la supprimer immédiatement.

---

# Q5 — FICHIERS ORPHELINS

Réponse officielle :

👉 Oui, tu peux supprimer tous les fichiers listés qui ne sont ni importés ni routés.

Exception uniquement si :

* Ils sont utilisés dynamiquement via lazy import
* Ou référencés indirectement

Sinon suppression totale.

Aucune conservation “au cas où”.

---

# 🚨 CORRECTIONS IMMÉDIATES AUTORISÉES

Tu peux exécuter sans attendre :

* Suppression des 43 console.log
* Conditionnement ProfileSwitcher
* Suppression route dupliquée
* Suppression import MarchandAcademy
* Suppression DEFAULT_USER inutilisé
* Suppression moteur IA doublon (`voice/TantieSagesse.tsx`)
* Suppression fichiers orphelins confirmés

---

# 🎯 OBJECTIF FINAL

Après ces corrections :

Je veux un nouveau scoring réaliste.

Objectif minimum :

* Sécurité ≥ 85
* Propreté code ≥ 90
* Production readiness ≥ 90

Nous ne pouvons pas viser 95% tant que backend absent.
Mais nous devons atteindre un frontend production-clean.

---

# ⚠️ IMPORTANT

Après corrections :

1. Re-scan complet projet
2. Vérifier qu’aucun console.log restant
3. Vérifier qu’aucun mock exposé
4. Vérifier qu’aucun outil dev visible
5. Vérifier qu’aucune donnée sensible stockée en clair

Puis fournir :

* Score révisé
* Liste corrections effectuées
* Liste risques restants
* Validation finale Go / No Go déploiement

---

Tu peux commencer les corrections immédiatement.
