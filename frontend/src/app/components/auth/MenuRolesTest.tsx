/**
 * MENU « TESTER LES AUTRES RÔLES » — l'atelier du testeur (demande du 12/10).
 *
 * SUR LA PAGE DE CONNEXION, un bouton rond sombre `<>` en haut à droite :
 * il ouvre un petit menu qui saute DIRECTEMENT sur un autre univers —
 * sans retaper un numéro à la main.
 *
 * POURQUOI PRÉ-REMPLIR LE NUMÉRO : l'identification d'un rôle passe par le
 * COMPTE (le serveur décide du rôle, l'écran ne le devine pas). « Tester le
 * rôle identificateur » veut donc dire : se connecter avec le compte de test
 * identificateur. Le menu remplit le numéro du compte de recette, le testeur
 * n'a plus que « C'est mon numéro » et le code à 4 chiffres.
 * BackOffice, lui, a SA porte : /backoffice/login (écran distinct).
 *
 * COMPTES DE RÉFÉRENCE : backend/src/database/seed-demo.service.ts (SEED_DEMO).
 * Si le seed change, changer ces numéros.
 *
 * PORTÉE : `import.meta.env.DEV` uniquement — outil de test, jamais livré
 * dans un build remis à une marchande (même doctrine que ProfileSwitcher).
 * SILENCIEUX volontairement : la traçabilité vocale de LoginPassword fige les
 * appels de parole de l'écran — ce menu n'en ajoute AUCUN.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, IdCard, Monitor, Users } from 'lucide-react';

/** Comptes de recette par univers (seed démo du backend, mot de passe 1234). */
const COMPTES_TEST = {
  identificateur: '0710101010', // Hervé Koffi — identificateur
  cooperative: '0970707070', // COOP-CACAO Daloa — coopérateur
} as const;

export function MenuRolesTest({ onChoisirNumero }: { onChoisirNumero: (numero: string) => void }) {
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const racineRef = useRef<HTMLDivElement | null>(null);

  // Fermer au clic extérieur ET à Échap : le menu flotte au-dessus de l'écran,
  // il doit toujours avoir une sortie évidente au clavier comme au doigt.
  useEffect(() => {
    if (!ouvert) return;
    const surClic = (e: MouseEvent) => {
      if (racineRef.current && !racineRef.current.contains(e.target as Node)) setOuvert(false);
    };
    const surEchap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surEchap);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surEchap);
    };
  }, [ouvert]);

  if (!import.meta.env.DEV) return null;

  const choisir = (numero: string) => {
    setOuvert(false);
    onChoisirNumero(numero);
  };

  const items = [
    {
      id: 'identificateur',
      label: 'Identificateur',
      icone: <IdCard aria-hidden="true" size={20} />,
      couleur: '#C46210',
      action: () => choisir(COMPTES_TEST.identificateur),
    },
    {
      id: 'backoffice',
      label: 'BackOffice',
      icone: <Monitor aria-hidden="true" size={20} />,
      couleur: '#4A3F3A',
      action: () => {
        setOuvert(false);
        navigate('/backoffice/login');
      },
    },
    {
      id: 'cooperative',
      label: 'Espace coopérative',
      icone: <Users aria-hidden="true" size={20} />,
      couleur: '#2F6FB2',
      action: () => choisir(COMPTES_TEST.cooperative),
    },
  ];

  return (
    <div ref={racineRef} style={{ position: 'absolute', top: 12, right: 12, zIndex: 500 }}>
      <motion.button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-label="Tester les autres rôles"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        whileTap={{ scale: 0.92 }}
        style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'var(--commerce-ink)', color: '#FFFFFF',
          border: 'none', display: 'grid', placeItems: 'center',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(51,37,51,0.25)',
        }}
      >
        <Code2 aria-hidden="true" size={22} />
      </motion.button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            role="menu"
            aria-label="Tester les autres rôles"
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute', top: 52, right: 0, minWidth: 216,
              background: 'var(--commerce-surface)', borderRadius: 16,
              border: '1px solid #F0E0CD', boxShadow: '0 8px 24px rgba(120,60,20,0.16)',
              padding: 6, transformOrigin: 'top right',
            }}
          >
            {items.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={item.action}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F0E3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ color: item.couleur, display: 'grid', placeItems: 'center' }}>{item.icone}</span>
                <span style={{ fontSize: 15, fontWeight: 650, color: '#3D332B' }}>{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
