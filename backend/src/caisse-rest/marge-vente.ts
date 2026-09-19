/**
 * LA MARGE D'UNE VENTE — la règle, côté serveur.
 *
 * Arbitrage de Patrick, 19/09/2026 : une ligne sans prix d'achat ne vaut ni
 * zéro coût, ni zéro information. Elle n'apporte donc NI gain NI perte. On
 * calcule ce qu'on sait réellement, et on dit ce que ce chiffre ne couvre pas.
 *
 * CE QUI ÉTAIT FAUX. Le contrôleur agrégeait `prix_achat` sur TOUTES les
 * lignes — une ligne sans coût y contribuant 0 — puis faisait
 * `montant_total − coût_total`. Sur un panier Riz (acheté 400, vendu 500) +
 * Piment (vendu 300, coût inconnu), cela donnait 800 − 400 = 400 : le prix de
 * vente ENTIER du Piment devenait du bénéfice, comme s'il avait été offert.
 * La bonne réponse est 100.
 *
 * DEUX IMPLÉMENTATIONS, UNE SEULE RÈGLE. Le téléphone a la sienne
 * (`services/margeVente.ts`) pour recalculer les ventes anciennes. Les deux
 * sont tenues par le MÊME fichier de données,
 * `tests/fixtures/argent-panier-mixte.json` : aucune des deux ne peut rester
 * verte en se trompant seule. C'est la condition qui rend la duplication
 * acceptable — sans elle, ce serait exactement la double vérité qu'on traque.
 */

export interface LigneMarge {
  quantite?: number | string;
  prix?: number | string;
  total?: number | string;
  prix_achat?: number | string;
  prixAchat?: number | string;
}

export interface ResumeMarge {
  /** Somme des (total − coût × quantité) des SEULES lignes coûtées. */
  montant: number;
  /** Combien de lignes avaient un prix d'achat connu. */
  lignesCoutees: number;
  /** Combien n'en avaient pas. > 0 ⇒ le montant ci-dessus est PARTIEL. */
  lignesSansCout: number;
}

const nombre = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function resumeMargeDesLignes(lignes: unknown): ResumeMarge {
  if (!Array.isArray(lignes)) return { montant: 0, lignesCoutees: 0, lignesSansCout: 0 };
  let montant = 0;
  let lignesCoutees = 0;
  let lignesSansCout = 0;
  for (const l of lignes as LigneMarge[]) {
    const cout = nombre(l?.prix_achat ?? l?.prixAchat);
    const qte = nombre(l?.quantite) || 1;
    if (cout <= 0) {
      // Coût inconnu : la ligne ne participe à RIEN. Ni son prix de vente
      // (ce serait inventer un gain), ni un coût nul (ce serait le même
      // mensonge écrit autrement).
      lignesSansCout++;
      continue;
    }
    // `total` fait foi : il porte le montant réellement convenu, qui ne
    // retombe pas toujours sur prix × quantité (500 F pour 3 tas ne se
    // divise pas juste en FCFA).
    const total = nombre(l?.total) || nombre(l?.prix) * qte;
    montant += total - cout * qte;
    lignesCoutees++;
  }
  return { montant, lignesCoutees, lignesSansCout };
}

/** Le coût des seules lignes dont on connaît le coût. */
export function coutDesLignesCoutees(lignes: unknown): number {
  if (!Array.isArray(lignes)) return 0;
  return (lignes as LigneMarge[]).reduce((s, l) => {
    const cout = nombre(l?.prix_achat ?? l?.prixAchat);
    if (cout <= 0) return s;
    return s + cout * (nombre(l?.quantite) || 1);
  }, 0);
}
