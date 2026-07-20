Voici le message technique définitif à lui envoyer.

---

# 🔴 CORRECTION DÉFINITIVE DU FLOW D’ENTRÉE

Actuellement l’application ouvre directement l’écran Login OTP.
Ce comportement doit être supprimé.

---

# 🎯 FLOW OBLIGATOIRE

Ordre strict :

1️⃣ Splash (avec bouton “Continuer”)
2️⃣ Onboarding (4 écrans)
3️⃣ Login OTP
4️⃣ Application

Aucune redirection directe vers Login.

---

# 🧱 SOLUTION STRUCTURELLE (PAS UN PATCH)

Tu dois centraliser la logique d’entrée dans un composant unique.

---

# 1️⃣ SUPPRIMER

* Toute route qui pointe directement vers `<Login />` comme route par défaut.
* Toute redirection automatique vers `/login`.

---

# 2️⃣ CRÉER UN ENTRY GATE UNIQUE

Créer un composant :

```
EntryGate.tsx
```

Il doit être la **seule route "/"**.

Dans le router :

```tsx
<Route path="/" element={<EntryGate />} />
```

---

# 3️⃣ LOGIQUE UNIQUE DANS ENTRYGATE

Pseudo-code obligatoire :

```tsx
if (!hasSeenSplash)
  return <SplashScreen />

if (!hasCompletedOnboarding)
  return <OnboardingFlow />

if (!isAuthenticated)
  return <LoginOTP />

return <MainApp />
```

Aucune navigation en cascade.
Aucune redirection en chaîne.
Aucune route intermédiaire.

---

# 4️⃣ GESTION DES FLAGS

Utiliser localStorage (temporaire avant backend) :

```
julaba_seen_splash = true
julaba_completed_onboarding = true
```

---

# 5️⃣ SPLASH

Quand utilisateur clique “Continuer” :

```
set julaba_seen_splash = true
re-render EntryGate
```

Pas de `navigate('/login')`.

---

# 6️⃣ ONBOARDING

À la fin des 4 écrans :

```
set julaba_completed_onboarding = true
re-render EntryGate
```

Pas de redirection vers login.

---

# 7️⃣ LOGIN OTP

Quand authentification réussie :

```
setUser(authUser)
re-render EntryGate
```

EntryGate affichera automatiquement `<MainApp />`.

---

# 8️⃣ TESTS OBLIGATOIRES

Tu dois tester :

* Première visite navigateur
* Refresh pendant onboarding
* Refresh après splash
* Logout
* Suppression localStorage
* Utilisateur déjà connecté
* Mobile / Desktop

---

# 9️⃣ INTERDICTIONS

❌ Pas de `navigate('/login')` dans Splash
❌ Pas de `navigate('/onboarding')` dans Login
❌ Pas de redirections croisées
❌ Pas de duplication logique

Tout doit être centralisé dans EntryGate.

---

# 🔟 LIVRABLE ATTENDU

1. Nouveau schéma routing
2. Code complet EntryGate
3. Liste des flags utilisés
4. Confirmation qu’aucune route ne pointe vers Login par défaut
5. Score conformité flow /100

---

Ce flow doit devenir structurellement stable et définitif.
