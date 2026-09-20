export type ResultatOperationCaisse =
  | { statut: 'confirmee' }
  | { statut: 'en_attente'; operationId: string };

export type TypeOperationCaisse = 'vente' | 'depense';

export type SoumissionOperationCaisse = {
  horsLigne: boolean;
  envoyer: () => Promise<void>;
  enfiler: () => Promise<string>;
  doitEnfiler: (error: unknown) => boolean;
};

/**
 * Une seule frontière décide si une opération est confirmée par le serveur ou
 * seulement conservée sur le téléphone. Les écrans ne doivent jamais déduire
 * ce statut de `navigator.onLine` après coup : une requête peut échouer alors
 * que le navigateur se croit en ligne, ou atteindre le serveur sans recevoir
 * sa réponse.
 */
export async function soumettreOperationCaisse({
  horsLigne,
  envoyer,
  enfiler,
  doitEnfiler,
}: SoumissionOperationCaisse): Promise<ResultatOperationCaisse> {
  if (horsLigne) {
    return { statut: 'en_attente', operationId: await enfiler() };
  }

  try {
    await envoyer();
    return { statut: 'confirmee' };
  } catch (error) {
    if (!doitEnfiler(error)) throw error;
    return { statut: 'en_attente', operationId: await enfiler() };
  }
}

export type PresentationResultatOperation = {
  titre: string;
  detail: string;
  voix: string;
  ton: 'succes' | 'attente';
};

/**
 * Texte commun aux parcours tactiles et vocaux. Le mot « réussie » est réservé
 * à une opération confirmée par le serveur. Une mise en file locale est dite
 * simplement, sans jargon technique et sans faire croire que l'argent est déjà
 * compté dans la caisse centrale.
 */
export function presenterResultatOperation(
  type: TypeOperationCaisse,
  montant: number,
  resultat: ResultatOperationCaisse,
): PresentationResultatOperation {
  const montantDit = Math.round(montant).toLocaleString('fr-FR');

  if (resultat.statut === 'confirmee') {
    if (type === 'vente') {
      return {
        titre: 'Vente réussie',
        detail: 'La vente est enregistrée.',
        voix: `Vente enregistrée. ${montantDit} francs.`,
        ton: 'succes',
      };
    }
    return {
      titre: 'Dépense enregistrée',
      detail: 'La dépense est enregistrée.',
      voix: `Dépense de ${montantDit} francs enregistrée.`,
      ton: 'succes',
    };
  }

  const nom = type === 'vente' ? 'vente' : 'dépense';
  return {
    titre: type === 'vente' ? 'Vente gardée' : 'Dépense gardée',
    detail: `La ${nom} est gardée sur ce téléphone, mais pas encore envoyée. Jùlaba réessaiera quand le réseau reviendra.`,
    voix: `Ta ${nom} de ${montantDit} francs est gardée sur ce téléphone. Elle n'est pas encore envoyée. Jùlaba va réessayer quand le réseau revient.`,
    ton: 'attente',
  };
}
