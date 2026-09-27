# Prompt Genspark — lots B et C (15 clips)

À copier-coller tel quel. **Aucun fichier à joindre : les 15 textes sont dans
ce document.**

---

Tu génères la voix française de JÙLABA, une application de caisse pour des
marchandes de vivrier en Côte d'Ivoire **dont beaucoup ne savent pas lire**.
Tout ce qui compte dans cette application se dit à voix haute. Un message qui
ne sort pas est un message qui n'existe pas.

Tu as déjà produit le lot A (82 clips). **Même voix, exactement.** Ces 15
nouveaux clips vont s'enchaîner avec les précédents dans les mêmes écrans : un
changement de timbre, de débit ou de niveau s'entendrait immédiatement.

## 1. Les 15 fichiers à produire

Le nom du fichier est donné : **ne le change pas**. Le texte est donné : **ne
le reformule pas, ne le corrige pas, n'ajoute ni ne retire un mot** — même une
virgule. Un mot d'écart et le clip ne sera jamais joué, sans aucune erreur :
c'est silencieux, et c'est le piège du lot A.

### Lot B — l'écran de connexion (8 clips)

| Fichier | Texte à enregistrer |
|---|---|
| `login-38.wav` | Ça n'a pas bien répondu. Attends un petit moment, puis reprends. |
| `login-39.wav` | Ça n'a pas marché comme il faut. Reprends depuis le début. |
| `login-40.wav` | Ce numéro-là ne commence pas comme un numéro d'ici. Regarde bien le début. |
| `login-41.wav` | Tape les chiffres de ton numéro, un par un. Les ronds en haut vont se remplir. |
| `login-42.wav` | Dis ton numéro, ou tape les chiffres un par un. Les ronds en haut vont se remplir. |
| `login-43.wav` | Entre ton code secret à quatre chiffres. |
| `login-44.wav` | La connexion ne passe pas pour le moment. Attends un peu, puis réessaie. |
| `login-45.wav` | Touche le grand bouton. Ton téléphone va te reconnaître. |

### Lot C — le parcours d'ajout au stock (7 clips)

| Fichier | Texte à enregistrer |
|---|---|
| `stk-10.wav` | Qu'est-ce que tu vends ? |
| `stk-11.wav` | Je n'ai pas son nom. Dis-le, ou tape-le. |
| `stk-12.wav` | C'est trop court pour un nom. Mets au moins deux lettres. |
| `stk-13.wav` | Choisis d'abord comment tu le vends. |
| `stk-14.wav` | Il manque le prix. Tape-le. |
| `stk-15.wav` | Je n'ai pas entendu de produit. Dis-moi ce que tu vends. |
| `stk-16.wav` | Le micro ne répond pas. Touche « Ajouter un produit ». |

## 2. Format technique

| Caractéristique | Valeur |
|---|---|
| Conteneur | `.wav` PCM |
| Profondeur | **16 bits** (24 bits accepté) |
| Échantillonnage | **24 000 Hz** |
| Canaux | **mono** |
| Niveau | **−16 LUFS** intégré, crête **≤ −1 dBTP** |
| Silences | coupés en tête et en queue, **≤ 100 ms** |

**Si ton moteur ne sort pas du 24 kHz** : livre en 44 100 ou 48 000 Hz, la
conversion est faite ensuite. **Ne monte jamais** un 16 kHz vers 24 kHz — on
n'invente pas de l'aigu qui n'a pas été enregistré.

**Dis ce que le moteur a RÉELLEMENT produit**, pas ce qu'il annonce. Sur le lot
A, un fichier livré comme « 24 kHz » était un 16 kHz ré-échantillonné en
silence : le lot entier a dû être refusé et repris.

## 3. La voix

**Une voix féminine ivoirienne, chaleureuse, posée.** Le registre est celui
d'une aînée du marché qui explique à une plus jeune : tutoiement, phrases
courtes, aucune condescendance, aucun jargon.

**Débit ralenti d'environ 10 %** par rapport à une lecture normale. C'est une
application utilisée dans le bruit d'un marché, par des personnes qui n'ont pas
l'habitude qu'une machine leur parle.

### Ce que cette voix n'est pas

**Ce n'est pas un clonage de la voix réelle de Tantie Nanti Lou.** Règle écrite
comme non négociable dans le projet : c'est une voix humaine locale, et Julaba
n'en génère pas d'imitation. Une **voix IA distincte**, sans aucun échantillon
de la comédienne comme référence.

**Cette voix ne se présente jamais.** Aucune de ces 15 phrases ne dit « Moi,
c'est… ». Si un texte te semblait nommer un personnage, **arrête-toi et
signale-le** au lieu de générer.

## 4. Points de direction, clip par clip

**`login-38` et `login-39` se ressemblent — ne les dis pas pareil.** Le geste
diffère : dans l'une on **retente**, dans l'autre on **recommence** depuis le
début. Que l'oreille fasse la différence sans avoir à comprendre pourquoi.

**`login-41` à `login-45` sont les toutes premières phrases** qu'une marchande
entend de l'application. Elles remplacent des clips prototypes aujourd'hui
éteints. C'est le premier contact : ni pressé, ni solennel.

**`stk-11` et `stk-12` ne sont pas le même refus — surtout pas le même ton.**
Dans `stk-11` elle n'a rien tapé : on l'invite. Dans `stk-12` elle a tapé une
seule lettre — **elle a presque fini**. Si `stk-12` sonne comme un reproche ou
comme un retour au départ, la phrase rate : le geste attendu est de CONTINUER,
pas de recommencer. Dis-la comme on encourage quelqu'un à finir son mot.

**`stk-14` est une phrase d'argent.** « Il manque le prix. Tape-le. » Nette,
sans hésitation, sans sourire de politesse. C'est le moment où un zéro
entrerait en caisse et fausserait chaque vente.

**`stk-16` : ne prononce pas les guillemets.** Le texte porte « Touche
« Ajouter un produit ». » — on doit entendre *Touche Ajouter un produit*, le
nom du bouton détaché par une courte respiration, pas par des guillemets lus.

**`stk-10` est très courte** (« Qu'est-ce que tu vends ? »). Attention à ne pas
l'écraser : c'est une vraie question, avec sa montée finale. Et vérifie son
niveau à la main — les mesures de loudness automatiques deviennent fausses sous
0,6 seconde, plusieurs clips courts du lot A ont été perdus comme ça.

## 5. Ce que tu ne fais pas

- **Ne reformule aucun texte**, même si une tournure te paraît maladroite.
  Signale-le, ne le corrige pas.
- **Ne renomme aucun fichier.**
- **Ne ré-enregistre pas de toi-même** parce qu'un mot est sorti différemment :
  signale l'écart, la décision est prise ensuite, clip par clip.

## 6. Ce que tu renvoies

1. Les **15 fichiers `.wav`**.
2. Un **CSV à deux colonnes** :

```csv
fichier,texte_exact_prononce
login-38.wav,"Ça n'a pas bien répondu. Attends un petit moment, puis reprends."
```

Si le moteur a prononcé autre chose que le texte demandé — mot avalé, liaison,
reformulation — **c'est ce qui a été réellement prononcé** qu'il faut écrire.
Ne recopie pas la colonne d'entrée par facilité : ce CSV sert précisément à
repérer les écarts.

3. Une **note courte** : quel moteur, quel échantillonnage et quelle profondeur
ont réellement été produits, quel niveau mesuré, et la liste des fichiers sur
lesquels tu as un doute.

Ce dernier point vaut autant que les fichiers. Un doute signalé coûte une
minute ; un doute gardé pour toi coûte un passage en studio.
