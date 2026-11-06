import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { intentLocal } from './localIntent.js';
import { estActionDepenseValide, lireDepenseVocale, phraseDepenseVocale } from './depenseVocale.js';
import { demarrerCaptureVocale, type DependancesCaptureVocale } from './captureVocale.js';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const verifier = (condition: boolean, libelle: string) => {
  console.log(`  ${condition ? '✓' : '✗'} ${libelle}`);
  if (!condition) echecs++;
};

console.log('\nCommandes de dépense sur le formulaire vocal\n');

const transport = lireDepenseVocale('Transport marché 300 francs');
verifier(transport?.montant === 300, 'le montant dicté sans verbe est lu dans le contexte dépense');
verifier(transport?.description === 'transport marché', 'le motif libre est conservé sans le montant');

const taxi = lireDepenseVocale('J’ai dépensé mille cinq cents francs pour le taxi');
verifier(taxi?.montant === 1500, 'le montant en toutes lettres est lu');
verifier(taxi?.description === 'taxi', 'les mots de commande sont retirés du motif');

verifier(lireDepenseVocale('300 francs') === null, 'un montant seul ne crée pas une dépense');
verifier(lireDepenseVocale('transport marché') === null, 'un motif sans montant ne crée pas une dépense');
verifier(lireDepenseVocale('Vends trois tomates à 500 francs') === null, 'une vente ne devient pas une dépense');
verifier(intentLocal('transport marché 300 francs') === null, 'le parseur vocal générique reste inchangé hors formulaire');
verifier(estActionDepenseValide({ type: 'depense', montant: 1 }), 'une action dépense à montant positif est valide');
verifier(!estActionDepenseValide({ type: 'depense', montant: 0 }), 'un montant nul est refusé');
verifier(!estActionDepenseValide({ type: 'depense', montant: -1 }), 'un montant négatif est refusé');
verifier(!estActionDepenseValide({ type: 'vendre', montant: 1 }), 'une vente ne valide pas une dépense');
verifier(!estActionDepenseValide({ type: 'depense', montant: '300' }), 'un montant texte est refusé');

if (transport) {
  const normalisee = intentLocal(phraseDepenseVocale(transport));
  verifier(normalisee?.action.type === 'depense', 'la phrase explicite atteint la confirmation financière existante');
}

const formulaire = readFileSync(join(ici, '..', 'components', 'marchand', 'DepenseForm.tsx'), 'utf-8');
const bouton = readFileSync(join(ici, '..', 'components', 'marchand', 'BoutonDireDepense.tsx'), 'utf-8');
const controleur = readFileSync(join(ici, '..', 'hooks', 'controleurCaptureDepense.ts'), 'utf-8');
const visuel = readFileSync(join(ici, '..', 'components', 'marchand', 'BoutonDireDepenseVisuel.tsx'), 'utf-8');
const capture = readFileSync(join(ici, 'captureVocale.ts'), 'utf-8');
const boutonsDuParcours = ['BoutonDireProduit', 'BoutonDireNom', 'BoutonDireUnite', 'BoutonDirePrix', 'BoutonDireQuantite'];
verifier(formulaire.includes('<BoutonDireDepense'), 'le formulaire utilise son écoute dédiée');
verifier(formulaire.includes('sendText(phraseDepenseVocale(depense))'), 'la commande est reliée à la confirmation et à l’enregistrement');
verifier(formulaire.includes('motifVocalEnAttenteRef.current || action.description?.trim()'), 'le motif dit traverse jusqu’à l’enregistrement sans modifier le parseur financier global');
verifier(bouton.includes('VisuelBoutonDireDepense') && visuel.includes('aria-pressed={ecoute}'),
  'le bouton réutilise le rendu validé, en exposant son état d’écoute');
verifier(controleur.includes('demarrerCaptureVocale('), 'la dépense délègue sa capture au cycle partagé');
for (const nom of boutonsDuParcours) {
  const source = readFileSync(join(ici, '..', 'components', 'marchand', `${nom}.tsx`), 'utf-8');
  verifier(source.includes('demarrerCaptureVocale('), `${nom} partage le même démarrage de capture`);
}
verifier(capture.includes('recoWebDispo') && capture.includes('demarrerRecoWeb') && capture.includes('startLiveDictation'), 'le cycle commun garde Web Speech et Sherpa natif');
verifier(controleur.includes('CONTRAINTES_MICRO_DICTEE'), 'le micro conserve les contraintes anti-écho');
verifier(controleur.includes('this.silence = setTimeout'), 'la transcription se conclut après une pause, sans attente longue');
verifier(controleur.includes('this.conclure?.()'), 'la dépense conclut le moteur partagé après une pause');
verifier(controleur.includes('this.arreter = capture.annuler') && /fermer\(annuler = true/.test(controleur),
  'le geste d’arrêt et le démontage annulent la session avant de libérer le micro');

const evenements: string[] = [];
const optionsWeb: Parameters<DependancesCaptureVocale['demarrerWeb']>[0][] = [];
const depsWeb: DependancesCaptureVocale = {
  webDispo: () => true,
  demarrerWeb: (options) => {
    optionsWeb.push(options);
    return { conclure: async () => { evenements.push('web-conclure'); }, annuler: () => { evenements.push('web-annuler'); } };
  },
  demarrerSherpa: async () => { throw new Error('Sherpa ne doit pas démarrer si le Web est prêt'); },
};
const stream = {} as MediaStream;
const webCapture = await demarrerCaptureVocale(stream, {
  interim: (texte, moteur) => evenements.push(`${moteur}-interim:${texte}`),
  conclure: (texte, moteur) => evenements.push(`${moteur}-final:${texte}`),
}, depsWeb);
optionsWeb[0]?.interim?.('bus');
optionsWeb[0]?.conclure('bus marché');
await webCapture.conclure();
await webCapture.annuler();
verifier(webCapture.moteur === 'web' && evenements.join('|') === 'web-interim:bus|web-final:bus marché|web-conclure|web-annuler',
  'Web Speech transmet résultats et deux modes d’arrêt sans démarrer Sherpa');

const callbacksSherpa: ((texte: string, estFinal: boolean) => void)[] = [];
const depsSherpa: DependancesCaptureVocale = {
  webDispo: () => true,
  demarrerWeb: () => null,
  demarrerSherpa: async (_flux, onText) => {
    callbacksSherpa.push(onText);
    return { stop: async () => { evenements.push('sherpa-stop'); } };
  },
};
const sherpaCapture = await demarrerCaptureVocale(stream, {
  interim: (texte, moteur) => evenements.push(`${moteur}-interim:${texte}`),
  conclure: (texte, moteur) => evenements.push(`${moteur}-final:${texte}`),
}, depsSherpa);
callbacksSherpa[0]?.('transport', false);
callbacksSherpa[0]?.('transport marché', true);
await sherpaCapture.conclure();
verifier(sherpaCapture.moteur === 'sherpa'
  && evenements.slice(-3).join('|') === 'sherpa-interim:transport|sherpa-final:transport marché|sherpa-stop',
  'un démarrage Web nul retombe sur Sherpa et normalise partiel/final et arrêt');

const annulationSherpa: string[] = [];
const resultatsSherpaApresStop: ((texte: string, estFinal: boolean) => void)[] = [];
const depsAnnulationSherpa: DependancesCaptureVocale = {
  webDispo: () => false,
  demarrerWeb: () => null,
  demarrerSherpa: async (_flux, onText) => {
    resultatsSherpaApresStop.push(onText);
    return {
      stop: async () => {
        onText('frais marché 300', true);
        annulationSherpa.push('stop-finalise');
      },
    };
  },
};
const captureAnnulee = await demarrerCaptureVocale(stream, {
  conclure: (texte) => annulationSherpa.push(`livre:${texte}`),
}, depsAnnulationSherpa);
await captureAnnulee.annuler();
resultatsSherpaApresStop[0]?.('résultat tardif', true);
verifier(annulationSherpa.join('|') === 'stop-finalise',
  'annuler Sherpa supprime le final de stop et tout résultat tardif');

console.log(echecs === 0 ? '\nToutes les vérifications passent.\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
