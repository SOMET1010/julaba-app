/**
 * SOURCE UNIFIÉE DES ACTEURS JÙLABA
 * Utilisée par :
 *  - IdentificateurHome (barre de recherche)
 *  - Identifications (menu acteurs)
 *  - ActeurDetails (fiche de détails)
 *
 * Le numero est la clé primaire : telephone normalisé sans +225 ni espaces
 * Ex: '+225 07 01 02 03 04' → '0701020304'
 */

export type StatutActeur = 'draft' | 'soumis' | 'approved' | 'rejected';
export type RoleActeur = 'marchand' | 'producteur' | 'cooperative';

export interface ActeurData {
  id: string;
  numero: string;         // clé primaire, format: '0701020304'
  telephone: string;      // format affiché: '+225 07 01 02 03 04'
  nom: string;
  prenoms: string;
  role: RoleActeur;
  activite: string;
  marche: string;
  commune: string;
  statut: StatutActeur;
  type: 'nouveau' | 'modifie' | 'renouvellement';
  dateIdentification: string;
  dateModification: string;
  dateValidation: string | null;
  identificateur: string;
  coordonneesGPS: string;
  documents: string[];
  maZone: boolean;
  historique: { date: string; action: string; par: string; statut: string }[];
}

/** Normalise un numéro de téléphone en clé primaire */
export function normaliserNumero(telephone: string): string {
  return telephone.replace('+225', '0').replace(/\s/g, '');
}

/** Formate un numero brut en affichage lisible */
export function formaterTelephone(numero: string): string {
  const digits = numero.startsWith('0') ? numero : '0' + numero;
  return `+225 ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export const ACTEURS_DATA: ActeurData[] = [
  {
    id: '1',
    numero: '0701020304',
    telephone: '+225 07 01 02 03 04',
    nom: 'Kouassi',
    prenoms: 'Aminata',
    role: 'marchand',
    activite: 'Vente de riz',
    marche: 'Marché de Yopougon',
    commune: 'Yopougon',
    statut: 'soumis',
    type: 'nouveau',
    dateIdentification: '2026-02-27T10:30:00',
    dateModification: '2026-02-28T10:30:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.3563° N, 4.0711° W',
    documents: ['CNI', 'Attestation marché'],
    maZone: true,
    historique: [
      { date: '2026-02-28', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2026-02-27', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '2',
    numero: '0512345678',
    telephone: '+225 05 12 34 56 78',
    nom: 'Yao',
    prenoms: 'Kouadio',
    role: 'producteur',
    activite: 'Production de cacao',
    marche: 'Plantation Bouaké',
    commune: 'Bouaké',
    statut: 'soumis',
    type: 'nouveau',
    dateIdentification: '2026-02-26T14:20:00',
    dateModification: '2026-02-27T14:20:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '7.6897° N, 5.0287° W',
    documents: ['CNI', 'Carte agriculteur'],
    maZone: true,
    historique: [
      { date: '2026-02-27', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2026-02-26', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '3',
    numero: '0723456789',
    telephone: '+225 07 23 45 67 89',
    nom: 'Traoré',
    prenoms: 'Fatou',
    role: 'marchand',
    activite: "Vente d'oignons",
    marche: 'Marché de Cocody',
    commune: 'Cocody',
    statut: 'draft',
    type: 'modifie',
    dateIdentification: '2026-02-26T09:15:00',
    dateModification: '2026-03-01T16:20:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.3599° N, 4.0083° W',
    documents: ['CNI'],
    maZone: true,
    historique: [
      { date: '2026-02-26', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '4',
    numero: '0145678912',
    telephone: '+225 01 45 67 89 12',
    nom: 'Touré',
    prenoms: 'Ibrahim',
    role: 'marchand',
    activite: 'Vente de tomates',
    marche: "Marché d'Abobo",
    commune: 'Abobo',
    statut: 'draft',
    type: 'nouveau',
    dateIdentification: '2026-02-25T16:45:00',
    dateModification: '2026-03-01T10:15:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.4203° N, 4.0500° W',
    documents: ['CNI', 'Attestation marché'],
    maZone: true,
    historique: [
      { date: '2026-02-25', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '5',
    numero: '0598765432',
    telephone: '+225 05 98 76 54 32',
    nom: 'Diabaté',
    prenoms: 'Marie',
    role: 'producteur',
    activite: 'Production de mangues',
    marche: 'Plantation Korhogo',
    commune: 'Korhogo',
    statut: 'soumis',
    type: 'renouvellement',
    dateIdentification: '2026-02-25T11:30:00',
    dateModification: '2026-02-26T11:30:00',
    dateValidation: null,
    identificateur: 'DIABATE Ibrahim (ID002)',
    coordonneesGPS: '9.4592° N, 5.6322° W',
    documents: ['CNI', 'Carte agriculteur'],
    maZone: false,
    historique: [
      { date: '2026-02-26', action: 'Soumission', par: 'DIABATE Ibrahim', statut: 'soumis' },
      { date: '2026-02-25', action: 'Création dossier', par: 'DIABATE Ibrahim', statut: 'draft' },
    ],
  },
  {
    id: '6',
    numero: '0734567890',
    telephone: '+225 07 34 56 78 90',
    nom: 'Koffi',
    prenoms: 'Adjoua',
    role: 'marchand',
    activite: 'Vente de plantain',
    marche: 'Marché de Treichville',
    commune: 'Treichville',
    statut: 'soumis',
    type: 'nouveau',
    dateIdentification: '2026-02-24T13:20:00',
    dateModification: '2026-02-25T13:20:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.3016° N, 4.0117° W',
    documents: ['CNI', 'Attestation marché'],
    maZone: true,
    historique: [
      { date: '2026-02-25', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2026-02-24', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '7',
    numero: '0722456789',
    telephone: '+225 07 22 45 67 89',
    nom: 'KOUASSI',
    prenoms: 'Jean',
    role: 'marchand',
    activite: 'Vente de légumes',
    marche: 'Marché de Cocody',
    commune: 'Cocody',
    statut: 'approved',
    type: 'nouveau',
    dateIdentification: '2024-02-15',
    dateModification: '2024-02-16',
    dateValidation: '2024-02-16',
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.3599° N, 4.0083° W',
    documents: ['CNI', 'Attestation marché'],
    maZone: true,
    historique: [
      { date: '2024-02-16', action: 'Validation', par: 'Institution', statut: 'approved' },
      { date: '2024-02-15', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2024-02-15', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '8',
    numero: '0567891234',
    telephone: '+225 05 67 89 12 34',
    nom: 'Bamba',
    prenoms: 'Awa',
    role: 'producteur',
    activite: 'Production de café',
    marche: 'Plantation Daloa',
    commune: 'Daloa',
    statut: 'draft',
    type: 'nouveau',
    dateIdentification: '2026-02-23T15:40:00',
    dateModification: '2026-03-02T09:10:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '6.8774° N, 6.4502° W',
    documents: ['CNI'],
    maZone: true,
    historique: [
      { date: '2026-02-23', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '9',
    numero: '0722334455',
    telephone: '+225 07 22 33 44 55',
    nom: 'KOFFI',
    prenoms: 'Marie',
    role: 'producteur',
    activite: 'Culture de manioc',
    marche: 'Marché de Cocody',
    commune: 'Cocody',
    statut: 'soumis',
    type: 'nouveau',
    dateIdentification: '2024-02-20',
    dateModification: '2024-02-20',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.3650° N, 4.0120° W',
    documents: ['CNI', 'Attestation village'],
    maZone: true,
    historique: [
      { date: '2024-02-20', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2024-02-20', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: '10',
    numero: '0555123456',
    telephone: '+225 05 55 12 34 56',
    nom: 'TOURE',
    prenoms: 'Awa',
    role: 'producteur',
    activite: 'Culture de bananes',
    marche: 'Village Adzopé',
    commune: 'Adzopé',
    statut: 'approved',
    type: 'renouvellement',
    dateIdentification: '2024-01-10',
    dateModification: '2024-01-11',
    dateValidation: '2024-01-11',
    identificateur: 'DIABATE Ibrahim (ID002)',
    coordonneesGPS: '6.1072° N, 3.8630° W',
    documents: ['CNI'],
    maZone: false,
    historique: [
      { date: '2024-01-11', action: 'Validation', par: 'Institution', statut: 'approved' },
      { date: '2024-01-10', action: 'Soumission', par: 'DIABATE Ibrahim', statut: 'soumis' },
      { date: '2024-01-10', action: 'Création dossier', par: 'DIABATE Ibrahim', statut: 'draft' },
    ],
  },
  {
    id: 'coop-1',
    numero: '0711223344',
    telephone: '+225 07 11 22 33 44',
    nom: 'de Bouaké',
    prenoms: 'Coop. Agro-Femmes',
    role: 'cooperative',
    activite: 'Agricole — Riz, Maïs, Igname (48 membres)',
    marche: 'Siège : Bouaké, Gbêkê',
    commune: 'Bouaké',
    statut: 'soumis',
    type: 'nouveau',
    dateIdentification: '2026-02-20T09:00:00',
    dateModification: '2026-03-01T11:30:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '7.6897° N, 5.0287° W',
    documents: ['Statuts coopérative', 'Récépissé MINADER'],
    maZone: true,
    historique: [
      { date: '2026-03-01', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2026-02-20', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: 'coop-2',
    numero: '0544556677',
    telephone: '+225 05 44 55 66 77',
    nom: 'de Cacao de Soubré',
    prenoms: 'Union des Producteurs',
    role: 'cooperative',
    activite: 'Agricole — Cacao, Café, Hévéa (124 membres)',
    marche: 'Siège : Soubré, Nawa',
    commune: 'Soubré',
    statut: 'draft',
    type: 'nouveau',
    dateIdentification: '2026-02-22T14:00:00',
    dateModification: '2026-02-28T16:45:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '5.7861° N, 6.5972° W',
    documents: ['Statuts coopérative'],
    maZone: true,
    historique: [
      { date: '2026-02-22', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
  {
    id: 'coop-3',
    numero: '0177889900',
    telephone: '+225 01 77 88 99 00',
    nom: 'de Korhogo',
    prenoms: 'Coop. Maraîchère',
    role: 'cooperative',
    activite: 'Maraîchère — Tomate, Oignon, Gombo (32 membres)',
    marche: 'Siège : Korhogo, Poro',
    commune: 'Korhogo',
    statut: 'soumis',
    type: 'nouveau',
    dateIdentification: '2026-02-25T08:30:00',
    dateModification: '2026-03-02T09:15:00',
    dateValidation: null,
    identificateur: 'YAO Marie (ID007)',
    coordonneesGPS: '9.4592° N, 5.6322° W',
    documents: ['Statuts coopérative', 'Récépissé MINADER'],
    maZone: true,
    historique: [
      { date: '2026-03-02', action: 'Soumission', par: 'YAO Marie', statut: 'soumis' },
      { date: '2026-02-25', action: 'Création dossier', par: 'YAO Marie', statut: 'draft' },
    ],
  },
];

/** Map indexée par numero pour accès O(1) */
export const ACTEURS_BY_NUMERO: Record<string, ActeurData> = Object.fromEntries(
  ACTEURS_DATA.map((a) => [a.numero, a])
);
