// ─────────────────────────────────────────────────────────────────────────────
// Voix « Tata Nanti Lou » — messages FIXES de l'appli, dits dans la VRAIE voix.
//
// GÉNÉRÉ à partir des 137 clips post-produits (silences coupés, volume harmonisé
// à -16 LUFS, débit ralenti ~10 %). Chaque entrée relie le TEXTE exact prononcé
// par l'appli au clip audio correspondant, embarqué (hors-ligne, zéro cloud).
//
// Utilisé par useVoiceCore : quand l'appli s'apprête à dire un de ces messages,
// on joue la voix de Tata au lieu de la voix de synthèse. Correspondance EXACTE
// (après normalisation) → aucun risque de jouer le mauvais clip ; si ça ne
// correspond pas, l'appli garde sa voix de secours habituelle.
// ─────────────────────────────────────────────────────────────────────────────

export interface TataUiClip { file: string; text: string; }

export const TATA_UI_CLIPS: TataUiClip[] = [
  { file: "/voix/tata/ui-001.mp3", text: "Alertes basses ignorées" },
  { file: "/voix/tata/ui-002.mp3", text: "Au revoir. Déconnexion du Back-Office." },
  { file: "/voix/tata/ui-003.mp3", text: "Besoin mis à jour" },
  { file: "/voix/tata/ui-004.mp3", text: "Bienvenue sur le terminal de vente. Ajoute tes produits au panier" },
  { file: "/voix/tata/ui-005.mp3", text: "Bonjour ! Tu veux écrire ou parler avec moi ?" },
  { file: "/voix/tata/ui-006.mp3", text: "Bonne réponse !" },
  { file: "/voix/tata/ui-007.mp3", text: "Ce client a droit à sa récompense !" },
  { file: "/voix/tata/ui-008.mp3", text: "Chargement du document en cours" },
  { file: "/voix/tata/ui-009.mp3", text: "Choisissez un nouveau document" },
  { file: "/voix/tata/ui-010.mp3", text: "Combien tu as en caisse ce matin ?" },
  { file: "/voix/tata/ui-011.mp3", text: "Commande annulée" },
  { file: "/voix/tata/ui-012.mp3", text: "Commande marquée comme livrée" },
  { file: "/voix/tata/ui-013.mp3", text: "Commande refusée." },
  { file: "/voix/tata/ui-014.mp3", text: "Commandes livrées" },
  { file: "/voix/tata/ui-015.mp3", text: "Commandes urgentes" },
  { file: "/voix/tata/ui-016.mp3", text: "Connexion refusée. Vérifie tes identifiants." },
  { file: "/voix/tata/ui-017.mp3", text: "Connexion rétablie" },
  { file: "/voix/tata/ui-018.mp3", text: "Contact mis à jour" },
  { file: "/voix/tata/ui-019.mp3", text: "Contre-offre refusée." },
  { file: "/voix/tata/ui-020.mp3", text: "Contre-proposition envoyée" },
  { file: "/voix/tata/ui-021.mp3", text: "Création de plantation agricole" },
  { file: "/voix/tata/ui-022.mp3", text: "Création en cours..." },
  { file: "/voix/tata/ui-023.mp3", text: "Demande acceptée" },
  { file: "/voix/tata/ui-024.mp3", text: "Demande refusée" },
  { file: "/voix/tata/ui-025.mp3", text: "Document chargé avec succès. En attente de vérification" },
  { file: "/voix/tata/ui-026.mp3", text: "Document sauvegardé avec succès" },
  { file: "/voix/tata/ui-027.mp3", text: "Document supprimé" },
  { file: "/voix/tata/ui-028.mp3", text: "Document tourné" },
  { file: "/voix/tata/ui-029.mp3", text: "Début de la formation" },
  { file: "/voix/tata/ui-030.mp3", text: "Déclaration de récolte" },
  { file: "/voix/tata/ui-031.mp3", text: "Déclarer une récolte" },
  { file: "/voix/tata/ui-032.mp3", text: "Déconnexion en cours" },
  { file: "/voix/tata/ui-033.mp3", text: "Dépense de" },
  { file: "/voix/tata/ui-034.mp3", text: "Dépense enregistrée" },
  { file: "/voix/tata/ui-035.mp3", text: "Entre ton code secret à 4 chiffres" },
  { file: "/voix/tata/ui-036.mp3", text: "Entre un montant valide" },
  { file: "/voix/tata/ui-038.mp3", text: "Erreur de synchronisation. Fiche sauvegardée localement." },
  { file: "/voix/tata/ui-039.mp3", text: "Erreur lors de l'enregistrement" },
  { file: "/voix/tata/ui-040.mp3", text: "Erreur lors de l'enregistrement de la vente" },
  { file: "/voix/tata/ui-042.mp3", text: "Erreur lors de la modification" },
  { file: "/voix/tata/ui-043.mp3", text: "Erreur lors de la publication" },
  { file: "/voix/tata/ui-044.mp3", text: "Erreur lors de la publication, réessaie" },
  { file: "/voix/tata/ui-045.mp3", text: "Erreur lors du rechargement" },
  { file: "/voix/tata/ui-046.mp3", text: "Erreur lors du retrait" },
  { file: "/voix/tata/ui-047.mp3", text: "Erreur réseau. Réessaie." },
  { file: "/voix/tata/ui-048.mp3", text: "Erreur, réessaie" },
  { file: "/voix/tata/ui-049.mp3", text: "Export en cours" },
  { file: "/voix/tata/ui-050.mp3", text: "Fiche mise à jour" },
  { file: "/voix/tata/ui-051.mp3", text: "Fiche mise à jour et synchronisée" },
  { file: "/voix/tata/ui-052.mp3", text: "Format de fichier invalide. Utilise une image." },
  { file: "/voix/tata/ui-053.mp3", text: "Identité mise à jour" },
  { file: "/voix/tata/ui-054.mp3", text: "Image trop lourde. Maximum 2 mégaoctets." },
  { file: "/voix/tata/ui-055.mp3", text: "Indique le nom du produit" },
  { file: "/voix/tata/ui-056.mp3", text: "Informations personnelles enregistrées avec succès" },
  { file: "/voix/tata/ui-057.mp3", text: "J'ai compris" },
  { file: "/voix/tata/ui-058.mp3", text: "Je n'ai pas compris. Tape ton numéro, ou réessaie." },
  { file: "/voix/tata/ui-060.mp3", text: "La commande du marchand a été acceptée." },
  { file: "/voix/tata/ui-061.mp3", text: "La quantité doit être supérieure à zéro" },
  { file: "/voix/tata/ui-063.mp3", text: "Le montant doit être un multiple de 100 francs" },
  { file: "/voix/tata/ui-064.mp3", text: "Le montant doit être un multiple de 5 francs" },
  { file: "/voix/tata/ui-065.mp3", text: "Le montant minimum est de 200 FCFA" },
  { file: "/voix/tata/ui-066.mp3", text: "Le montant saisi est invalide" },
  { file: "/voix/tata/ui-067.mp3", text: "Le produit a été retiré de votre marketplace." },
  { file: "/voix/tata/ui-068.mp3", text: "Le stock disponible ne peut pas dépasser la quantité totale de la récolte" },
  { file: "/voix/tata/ui-069.mp3", text: "Livraison déclarée. Le marchand va confirmer la réception." },
  { file: "/voix/tata/ui-070.mp3", text: "Ma Plantation" },
  { file: "/voix/tata/ui-071.mp3", text: "Mes revenus" },
  { file: "/voix/tata/ui-072.mp3", text: "Mes récoltes" },
  { file: "/voix/tata/ui-073.mp3", text: "Mode hors ligne" },
  { file: "/voix/tata/ui-074.mp3", text: "Mode édition activé" },
  { file: "/voix/tata/ui-075.mp3", text: "Modification en cours..." },
  { file: "/voix/tata/ui-076.mp3", text: "Modifications annulées" },
  { file: "/voix/tata/ui-077.mp3", text: "Modifier la récolte" },
  { file: "/voix/tata/ui-078.mp3", text: "Mon Historique de ventes" },
  { file: "/voix/tata/ui-079.mp3", text: "Mon Marché" },
  { file: "/voix/tata/ui-080.mp3", text: "Montant invalide" },
  { file: "/voix/tata/ui-081.mp3", text: "Montant total invalide" },
  { file: "/voix/tata/ui-082.mp3", text: "Numéro Mobile Money invalide. Dix chiffres requis" },
  { file: "/voix/tata/ui-083.mp3", text: "Numéro de téléphone invalide. Format attendu : 07XXXXXXXX" },
  { file: "/voix/tata/ui-084.mp3", text: "Ouverture de ton Wallet Jùlaba" },
  { file: "/voix/tata/ui-087.mp3", text: "Ouverture des détails de la certification JULABA" },
  { file: "/voix/tata/ui-088.mp3", text: "Ouverture du Wallet Jùlaba" },
  { file: "/voix/tata/ui-089.mp3", text: "Ouvre le formulaire de rechargement Mobile Money" },
  { file: "/voix/tata/ui-090.mp3", text: "Ouvre le formulaire de retrait Mobile Money" },
  { file: "/voix/tata/ui-091.mp3", text: "Ouvre ta journée pour activer ta caisse" },
  { file: "/voix/tata/ui-092.mp3", text: "Paiement confirmé ! Ton Keiwa est rechargé." },
  { file: "/voix/tata/ui-093.mp3", text: "Paiement en cours — confirme sur ton téléphone" },
  { file: "/voix/tata/ui-094.mp3", text: "Paiement récupéré ! L'argent est dans ton Keiwa." },
  { file: "/voix/tata/ui-095.mp3", text: "Paramètres sauvegardés" },
  { file: "/voix/tata/ui-097.mp3", text: "Photo modifiée" },
  { file: "/voix/tata/ui-098.mp3", text: "Plantation créée avec succès !" },
  { file: "/voix/tata/ui-099.mp3", text: "Prix invalide" },
  { file: "/voix/tata/ui-100.mp3", text: "Problème avec le micro — réessaie" },
  { file: "/voix/tata/ui-101.mp3", text: "Publication en cours..." },
  { file: "/voix/tata/ui-102.mp3", text: "Publication modifiée avec succès !" },
  { file: "/voix/tata/ui-103.mp3", text: "Publication sur le marché en cours" },
  { file: "/voix/tata/ui-104.mp3", text: "Quantité invalide" },
  { file: "/voix/tata/ui-106.mp3", text: "Recharger votre keiwa" },
  { file: "/voix/tata/ui-107.mp3", text: "Remplis tous les champs obligatoires" },
  { file: "/voix/tata/ui-109.mp3", text: "Retour au choix du montant" },
  { file: "/voix/tata/ui-110.mp3", text: "Retour au choix du service" },
  { file: "/voix/tata/ui-111.mp3", text: "Retrait confirmé ! Ton solde a été mis à jour." },
  { file: "/voix/tata/ui-112.mp3", text: "Réception confirmée. Passons au paiement." },
  { file: "/voix/tata/ui-113.mp3", text: "Récolte publiée avec succès !" },
  { file: "/voix/tata/ui-114.mp3", text: "Saisir un autre montant" },
  { file: "/voix/tata/ui-115.mp3", text: "Saisis le nom du produit" },
  { file: "/voix/tata/ui-116.mp3", text: "Saisis une quantité valide" },
  { file: "/voix/tata/ui-117.mp3", text: "Signalement de problème" },
  { file: "/voix/tata/ui-118.mp3", text: "Solde insuffisant" },
  { file: "/voix/tata/ui-119.mp3", text: "Suivre une nouvelle plantation" },
  { file: "/voix/tata/ui-120.mp3", text: "Ta demande a été envoyée" },
  { file: "/voix/tata/ui-121.mp3", text: "Ton streak a été réinitialisé" },
  { file: "/voix/tata/ui-122.mp3", text: "Ton streak est sauvé grâce au bouclier !" },
  { file: "/voix/tata/ui-123.mp3", text: "Toute ta production est au-dessus du seuil. Tout va bien !" },
  { file: "/voix/tata/ui-124.mp3", text: "Toutes les commandes" },
  { file: "/voix/tata/ui-125.mp3", text: "Trop de tentatives incorrectes. Réessaie dans 5 minutes." },
  { file: "/voix/tata/ui-126.mp3", text: "Tu vas être redirigé vers Wave pour confirmer le paiement" },
  { file: "/voix/tata/ui-127.mp3", text: "Téléchargement de la carte" },
  { file: "/voix/tata/ui-128.mp3", text: "Vente confirmée" },
  { file: "/voix/tata/ui-129.mp3", text: "Vente refusée" },
  { file: "/voix/tata/ui-130.mp3", text: "Verso de la carte" },
  { file: "/voix/tata/ui-131.mp3", text: "Voici tes céréales en production" },
  { file: "/voix/tata/ui-132.mp3", text: "Voici tes fruits en production" },
  { file: "/voix/tata/ui-133.mp3", text: "Voici tes légumes en production" },
  { file: "/voix/tata/ui-134.mp3", text: "Voici tes tubercules en production" },
  { file: "/voix/tata/ui-135.mp3", text: "Voici tous tes produits en production" },
  { file: "/voix/tata/ui-136.mp3", text: "Votre besoin a été soumis à la coopérative" },
  { file: "/voix/tata/ui-137.mp3", text: "À bientôt sur Jùlaba" },
];

// Normalisation pour comparer le texte prononcé au texte enregistré :
// minuscules, sans accents, sans ponctuation, espaces compactés.
export function normalizeForClip(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDEX = new Map<string, string>();
for (const c of TATA_UI_CLIPS) {
  const k = normalizeForClip(c.text);
  if (k.length >= 3 && !INDEX.has(k)) INDEX.set(k, c.file);
}

/** URL du clip Tata pour un texte donné (correspondance exacte normalisée), sinon null. */
export function tataUiClipForText(text: string): string | null {
  return INDEX.get(normalizeForClip(text)) ?? null;
}
