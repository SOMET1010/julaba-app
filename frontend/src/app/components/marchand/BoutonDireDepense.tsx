import { useBoutonDireDepense } from '../../hooks/useBoutonDireDepense';
import { VisuelBoutonDireDepense, type EtatVisuelBoutonDireDepense } from './BoutonDireDepenseVisuel';

export { VisuelBoutonDireDepense, type EtatVisuelBoutonDireDepense } from './BoutonDireDepenseVisuel';

interface Props {
  dire: (texte: string) => void | Promise<void>;
  question: string;
  onTranscription: (texte: string) => void;
  onErreur: (message: string) => void;
}

export function BoutonDireDepense({ dire, question, onTranscription, onErreur }: Props) {
  const { ecoute, messageMicroIndisponible, ecouter } = useBoutonDireDepense({
    dire, question, onTranscription, onErreur,
  });
  const etat: EtatVisuelBoutonDireDepense = messageMicroIndisponible ? 'indisponible' : ecoute ? 'ecoute' : 'repos';
  return <VisuelBoutonDireDepense etat={etat} question={question}
    messageIndisponible={messageMicroIndisponible ?? undefined} onClick={() => { void ecouter(); }} />;
}
