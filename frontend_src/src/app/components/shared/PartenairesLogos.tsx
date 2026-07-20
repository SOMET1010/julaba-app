import { IMG_LOGO_PARTENAIRES } from '../../assets/images';
const partenairesSrc = IMG_LOGO_PARTENAIRES;
import { motion } from 'motion/react';

/**
 * Logos des partenaires institutionnels de Jùlaba
 * Affiché en bas du bouton "Se déconnecter" dans tous les menus MOI
 */
export function PartenairesLogos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mx-4 mt-6 mb-2"
    >
      <p className="text-center text-xs text-gray-400 mb-3 tracking-wide uppercase">
        Partenaires institutionnels
      </p>
      <div className="bg-white rounded-3xl border-2 border-gray-100 px-4 py-3 shadow-sm">
        <img
          src={partenairesSrc}
          alt="Partenaires : République de Côte d'Ivoire, Direction Générale de l'Emploi, ANSUT, Icone Solutions"
          className="w-full h-auto object-contain"
          style={{ maxHeight: 56 }}
        />
      </div>
    </motion.div>
  );
}