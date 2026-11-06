import { Mic, MicOff } from 'lucide-react';
import { motion } from 'motion/react';

export type EtatVisuelBoutonDireDepense = 'repos' | 'ecoute' | 'indisponible';

interface PropsVisuels {
  etat: EtatVisuelBoutonDireDepense;
  question: string;
  messageIndisponible?: string;
  onClick?: () => void;
}

const styleIndisponible = {
  boxSizing: 'border-box' as const,
  width: '100%',
  minHeight: 68,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--caisse-esp-3)',
  padding: 'var(--caisse-esp-2) var(--caisse-esp-3)',
  border: '2px solid var(--commerce-line)',
  borderRadius: 'var(--caisse-rayon-4)',
  background: 'var(--commerce-paper)',
  color: 'var(--encre)',
  font: 'var(--caisse-font-texte)',
  textAlign: 'center' as const,
};

function Indisponible({ message }: { message: string }) {
  return <div role="status" style={styleIndisponible}>
    <MicOff size={26} aria-hidden="true" />
    <span>{message}</span>
  </div>;
}

function styleBouton(ecoute: boolean) {
  return {
    boxSizing: 'border-box' as const,
    width: '100%',
    minHeight: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--caisse-esp-3)',
    padding: 'var(--caisse-esp-2) var(--caisse-esp-3)',
    border: 'none',
    borderRadius: 'var(--caisse-rayon-4)',
    background: ecoute ? 'var(--commerce-action)' : 'var(--commerce-surface)',
    color: ecoute ? 'var(--commerce-inverse)' : 'var(--commerce-action)',
    boxShadow: ecoute ? 'none' : 'inset 0 0 0 2px var(--commerce-action)',
    cursor: 'pointer',
    font: 'var(--caisse-font-bouton)',
    textAlign: 'center' as const,
  };
}

function BoutonActif({ ecoute, question, onClick }: { ecoute: boolean; question: string; onClick?: () => void }) {
  const icone = ecoute
    ? <motion.span aria-hidden="true" animate={{ scale: [1, 1.18, 1], opacity: [1, 0.78, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        style={{ display: 'inline-flex', flexShrink: 0 }}><Mic size={26} /></motion.span>
    : <><Mic size={26} aria-hidden="true" /><span>{question}</span></>;
  return <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onClick}
    aria-label={question} aria-pressed={ecoute} style={styleBouton(ecoute)}>{icone}</motion.button>;
}

/** Rendu commun à l'écran et à l'aperçu validé. */
export function VisuelBoutonDireDepense(props: PropsVisuels) {
  if (props.etat === 'indisponible') {
    return <Indisponible message={props.messageIndisponible ?? props.question} />;
  }
  return <BoutonActif ecoute={props.etat === 'ecoute'} question={props.question} onClick={props.onClick} />;
}
