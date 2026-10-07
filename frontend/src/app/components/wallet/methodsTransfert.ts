import { IMG_LOGO_WAVE, IMG_LOGO_ORANGE_MONEY, IMG_LOGO_MTN, IMG_LOGO_MOOV } from '../../assets/images';

/**
 * Catalogue des moyens de transfert (REVIEW-001/R1-2 — découpage de
 * TransfertPage lors de l'extraction R1-3) : données seules, aucun JSX.
 * Wave/Orange/MTN/Moov/banque sont « Bientôt » — la porte keiwa est la
 * seule active (décision §8.3 : UNE porte vers l'argent).
 */
export interface Method {
  id: string;
  logo?: string;
  imgLogo?: string;
  color: string;
  textColor?: string;
  name: string;
  sub: string;
  featured: boolean;
  badge: string;
  disponible: boolean;
}

export const METHODS: Method[] = [
  { id: 'julaba', logo: 'JL',  color: '#B74725',         name: 'Compte Julaba',    sub: 'Instantané · Sans frais', featured: true,  badge: '', disponible: true },
  { id: 'wave',   logo: 'WV',  imgLogo: IMG_LOGO_WAVE,          color: '#00b9f5', name: 'Wave',             sub: 'Rapide · Sans frais',     featured: false, badge: 'Bientôt', disponible: false },
  { id: 'orange', logo: 'OM',  imgLogo: IMG_LOGO_ORANGE_MONEY,  color: '#FF6600', name: 'Orange Money',     sub: 'Disponible partout',      featured: false, badge: 'Bientôt', disponible: false },
  { id: 'mtn',    logo: 'MTN', imgLogo: IMG_LOGO_MTN,           color: '#FFCC00', textColor: '#333', name: 'MTN MoMo', sub: 'Réseau étendu', featured: false, badge: 'Bientôt', disponible: false },
  { id: 'moov',   logo: 'MV',  imgLogo: IMG_LOGO_MOOV,          color: '#0057A8', name: 'Moov Money',       sub: 'Faibles commissions',     featured: false, badge: 'Bientôt', disponible: false },
  { id: 'banque', logo: 'BQ',  color: '#2d7a4f', name: 'Virement bancaire', sub: 'Sous 24h ouvrées',       featured: false, badge: 'Bientôt', disponible: false },
];
