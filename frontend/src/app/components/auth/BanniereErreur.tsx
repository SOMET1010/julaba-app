import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

/**
 * ── AUTH-10 (audit UI auth 05/10/2026) — LA BANNIÈRE D'ERREUR, UNE SEULE FOIS ──
 *
 * L'écran de connexion dessinait TROIS FOIS la même bannière (étape
 * reconnaissance, étape numéro, étape code) : même rôle="alert", même
 * aria-live, mêmes couleurs, même mouvement d'entrée/sortie. Trois copies
 * finissent toujours par diverger — celle qui corrige une teinte oublie les
 * deux autres. Le composant est la SOURCE UNIQUE ; l'écran ne passe que sa
 * clé d'animation, le message et la marge.
 *
 * AUCUNE PAROLE ICI : la bannière affiche, elle ne parle pas — l'écran décide
 * de ce qui est dit (contrat vocal `parle()` intact, garde voix-trace).
 * Couleurs : palette « erreur » de la charte auth (garde authCharte).
 */
export function BanniereErreur({ cle, message, margeBas = 0 }: { cle: string; message: string; margeBas?: number }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={cle}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'hidden', width: '100%' }}
        >
          <div role="alert" aria-live="assertive" style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: margeBas,
          }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontWeight: 500 }}>{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
