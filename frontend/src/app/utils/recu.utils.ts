// ── Reçu numérique unitaire par vente (écart CDC 8.1.2 « facture/reçu numérique ») ──
// La marchande peut PARTAGER un reçu (WhatsApp via le partage natif) ou le
// TÉLÉCHARGER en PDF, pour chaque transaction. Zéro dépendance serveur.
//
// « 3 TAS DE TOMATE », PAS « 3 × TOMATE » — 19/09/2026. Ce reçu disait
// « 3 × Tomate » : trois quoi ? L'unité n'était nulle part dans la vente, elle
// n'existait que dans le catalogue, modifiable à tout moment. Un reçu est une
// preuve remise à une cliente : il doit dire ce qui a été vendu, pas ce que le
// catalogue affiche aujourd'hui.
//
// « ENREGISTRÉE SUR CE TÉLÉPHONE », PAS « CONFIRMÉE » — OFF-01, 21/09/2026.
// Le reçu se partage même quand la vente n'est pas encore partie : la vente a
// eu lieu devant la cliente, et il est utile de lui remettre une trace. Mais
// tant que le serveur n'a rien accusé, le reçu DOIT le dire, et ne doit
// jamais laisser croire à un état définitif côté serveur. Une vente confirmée
// rend, elle, EXACTEMENT le reçu d'avant (verrouillé à l'octet par
// recuStatutSynchronisation.test.mts) : un reçu qui se mettrait à proclamer
// « confirmée » donnerait un second sens à une donnée qui n'en avait pas et
// rendrait suspects tous les reçus déjà remis.
import { ligneLisible } from './unite.utils';
import type { StatutEnregistrement } from '../types/statutEnregistrement';

interface RecuTx {
  id?: string;
  montant?: number;
  produits?: Array<{ nom?: string; produit?: string; quantite?: number; prix_unitaire?: number; prix?: number; unite?: string }> | any;
  date?: string;
  mode_paiement?: string;
  notes?: string;
  /** L'acheminement de la vente vers le serveur, et rien d'autre.
   *
   *  NOM DISTINCT, ET C'EST VOULU : une vente porte déjà un champ `statut`
   *  (`validee` / `annulee` / `gelee` / `litige`) qui dit son sort COMPTABLE.
   *  Les confondre donnerait deux sens à une même donnée — « Mes ventes »
   *  passe justement des ventes qui portent ce `statut`-là.
   *
   *  ABSENT = on ne dit rien. C'est le repli sûr : toutes les appelantes
   *  d'avant OFF-01 obtiennent le reçu inchangé. Seul `'en_attente'` ajoute
   *  une ligne. */
  statutSynchronisation?: StatutEnregistrement;
}

/** La phrase exacte arrêtée par Patrick pour une vente pas encore partie. */
const MENTION_EN_ATTENTE = 'Vente enregistrée sur ce téléphone — synchronisation en attente.';

function numeroRecu(tx: RecuTx): string {
  const base = (tx.id || '').toString().replace(/[^a-zA-Z0-9]/g, '');
  return base ? base.slice(-6).toUpperCase() : Math.abs(Math.round((tx.montant || 0))).toString().slice(-6);
}

function lignesProduits(tx: RecuTx): string[] {
  const arr = Array.isArray(tx.produits) ? tx.produits : [];
  if (arr.length === 0) return [];
  return arr.map((p) => {
    const nom = p.nom || p.produit || 'Produit';
    const q = p.quantite != null ? p.quantite : 1;
    // Lignes voix (prix_unitaire) ET panier (prix) : même reçu pour les deux circuits.
    const pu = p.prix_unitaire ?? p.prix ?? (tx.montant || 0);
    // L'unité vient de la LIGNE (figée à la vente), jamais du catalogue actuel.
    // Sans unité — ventes d'avant ce correctif — on retombe sur « 3 × Tomate ».
    return `${ligneLisible(q, nom, p.unite)} — ${Number(pu).toLocaleString('fr-FR')} F`;
  });
}

/** Texte du reçu (pour partage natif / copie). */
export function texteRecu(tx: RecuTx, marchand: string): string {
  const d = tx.date ? new Date(tx.date) : new Date();
  const dateStr = d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const lignes = lignesProduits(tx);
  const corps = lignes.length ? '\n' + lignes.join('\n') : '';
  return [
    '🧾 REÇU — Jùlaba',
    `Vendeuse : ${marchand || 'Marchande'}`,
    `Date : ${dateStr}`,
    corps.trim() ? corps.trim() : (tx.notes ? `Article : ${tx.notes}` : ''),
    `TOTAL : ${Number(tx.montant || 0).toLocaleString('fr-FR')} FCFA`,
    tx.mode_paiement ? `Paiement : ${tx.mode_paiement}` : '',
    `Reçu n° ${numeroRecu(tx)}`,
    // UNE SEULE LIGNE, ET SEULEMENT EN ATTENTE. Placée contre l'identité du
    // reçu, juste avant la formule de fin : elle reste dans les deux dernières
    // lignes, donc visible d'un coup d'œil sur WhatsApp, sans rien déplacer.
    tx.statutSynchronisation === 'en_attente' ? MENTION_EN_ATTENTE : '',
    'Merci et à bientôt !',
  ].filter(Boolean).join('\n');
}

/** Partage le reçu via le partage natif du téléphone (WhatsApp…), sinon copie. */
export async function partagerRecu(tx: RecuTx, marchand: string): Promise<'partage' | 'copie' | 'echec'> {
  const texte = texteRecu(tx, marchand);
  try {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: 'Reçu Jùlaba', text: texte });
      return 'partage';
    }
  } catch (e) {
    // partage annulé par l'utilisatrice → ne pas basculer en copie
    if (e instanceof DOMException && e.name === 'AbortError') return 'echec';
  }
  try {
    await navigator.clipboard.writeText(texte);
    return 'copie';
  } catch { return 'echec'; }
}

// Le reçu PDF « à lire » a été retiré : inadapté à des utilisatrices non-lectrices
// (et sa génération figeait l'écran). Le reçu se partage désormais en texte
// (WhatsApp / SMS), lisible/écoutable par le client. Cf. partagerRecu / texteRecu.
