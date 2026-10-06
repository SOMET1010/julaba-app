export type DocumentStatus = 'empty' | 'pending' | 'verified' | 'rejected';

export interface DocumentData {
  id: string;
  type: string;
  title: string;
  status: DocumentStatus;
  imageUrl: string | null;
  uploadedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  expirationDate: string | null;
  isLocked: boolean;
  details: { [key: string]: string };
  qrCode?: string;
}

export const getStatusColor = (status: DocumentStatus): 'green' | 'blue' | 'orange' | 'red' => {
  switch (status) {
    case 'verified':
      return 'green';
    case 'pending':
      return 'orange';
    case 'rejected':
      return 'red';
    case 'empty':
    default:
      return 'orange';
  }
};

export const getStatusLabel = (status: DocumentStatus): string => {
  switch (status) {
    case 'verified':
      return 'Vérifié';
    case 'pending':
      return 'En vérification';
    case 'rejected':
      return 'Rejeté';
    case 'empty':
    default:
      return 'À compléter';
  }
};
