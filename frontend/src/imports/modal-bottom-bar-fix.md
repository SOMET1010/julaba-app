Voici le prompt technique exact à lui envoyer pour corriger définitivement le problème.

---

# 🔴 CORRECTION DÉFINITIVE — BOTTOM BAR & MODALS

Problème actuel :

La Bottom Bar reste visible et passe au-dessus ou sous les modals.
C’est inacceptable.
Un modal doit toujours être **au-dessus de tout**, sans exception.

Je veux une correction **structurelle globale**, pas un patch local.

---

# 🎯 OBJECTIF

Dans toute l’application :

* Dès qu’un modal s’ouvre
  → Bottom Bar masquée automatiquement
  → Scroll body bloqué
  → Focus piégé dans le modal
  → Aucun conflit de z-index
  → Aucun comportement spécifique par profil

Cela doit fonctionner pour **100% des modals existants et futurs**.

---

# 1️⃣ AUDIT COMPLET DES MODALS

Tu dois :

* Scanner tout le projet
* Lister tous les composants Modal
* Lister tous les Dialog
* Lister tous les Portals
* Lister tous les overlays custom
* Vérifier s’il existe plusieurs implémentations

Livrable :

Tableau :

| Fichier | Type | Utilise Portal | Z-index | Conforme |

---

# 2️⃣ CRÉER UN MODAL MANAGER GLOBAL (OBLIGATOIRE)

Implémenter :

```tsx
<ModalProvider>
   <App />
</ModalProvider>
```

Créer un `ModalContext` avec :

```
isModalOpen: boolean
openModal()
closeModal()
```

---

# 3️⃣ BOTTOM BAR DOIT RÉAGIR AU CONTEXTE

Dans BottomBar :

```tsx
const { isModalOpen } = useModal()

if (isModalOpen) return null
```

La Bottom Bar doit disparaître automatiquement.

Pas de condition manuelle dans chaque écran.

---

# 4️⃣ FORCER LES MODALS EN PORTAL ROOT

Tous les modals doivent être rendus via :

```tsx
createPortal(modal, document.body)
```

Interdiction d’avoir un modal imbriqué dans une page avec z-index local.

---

# 5️⃣ NORMALISER LES Z-INDEX

Définir une hiérarchie unique :

```
Header: 40
Sidebar: 45
BottomBar: 50
Overlay: 90
Modal: 100
```

Supprimer tous les z-index arbitraires dans le code.

---

# 6️⃣ BLOQUER LE SCROLL GLOBAL

Quand modal ouvert :

```tsx
document.body.style.overflow = 'hidden'
```

Quand fermé :

```tsx
document.body.style.overflow = ''
```

---

# 7️⃣ EMPÊCHER TOUT CONFLIT PAR PROFIL

Tester sur :

* Marchand
* Producteur
* Coopérative
* Institution
* Identificateur

Vérifier que chaque modal masque la bottom bar.

---

# 8️⃣ TESTS OBLIGATOIRES

Pour chaque profil :

* Ouvrir modal simple
* Ouvrir modal imbriqué
* Ouvrir modal via IA
* Ouvrir modal via dropdown
* Ouvrir modal depuis bottom bar
* Ouvrir modal depuis sidebar

Vérifier :

* Bottom bar disparaît
* Modal toujours au-dessus
* Aucun clignotement
* Aucun scroll arrière-plan
* Fermeture correcte

---

# 9️⃣ SUPPRIMER LES CORRECTIONS LOCALES

Si dans certains écrans tu as ajouté :

```
style={{ zIndex: 9999 }}
```

Les supprimer.

La correction doit être globale et centralisée.

---

# 🔟 LIVRABLE FINAL

Je veux :

1. Liste complète des modals
2. Nouveau schéma hiérarchique z-index
3. Confirmation que 100% passent par ModalProvider
4. Capture avant/après
5. Score conformité modals /100

---

Ce problème ne doit plus jamais réapparaître.

Aucune exception autorisée.

Corriger structurellement.
