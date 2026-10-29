import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..');
const sourceCatalogue = join(racine, 'src/app/services/tataUiClips.ts');
const dossierAudio = join(racine, 'public/voix/tata');
const sortie = join(racine, 'public/voix/registre-tata-fr-ci.json');

const source = readFileSync(sourceCatalogue, 'utf8');
const clips = [...source.matchAll(/\{ file: "([^"]+)", text: "((?:\\.|[^"])*)" \}/g)].map((m) => ({
  file: m[1],
  text: JSON.parse(`"${m[2]}"`),
}));
const fichiers = readdirSync(dossierAudio).filter((f) => f.endsWith('.mp3')).sort();
const mappes = new Set(clips.map((c) => c.file.split('/').at(-1)));

// La CI n'installe pas ffprobe. En mode contrôle, elle n'a pas besoin de
// recalculer la durée : elle vérifie le contrat utile au runtime (mapping,
// texte, présence, taille et empreinte), ainsi que la présence d'une durée
// positive déjà enregistrée. La génération complète reste volontairement un
// outil de maintenance qui utilise ffprobe.
if (process.argv.includes('--check')) {
  const actuel = JSON.parse(readFileSync(sortie, 'utf8'));
  const parFichier = new Map(actuel.clips.map((c) => [c.fichier, c]));
  const erreurs = [];
  for (const clip of clips) {
    const file = clip.file.split('/').at(-1);
    const entree = parFichier.get(clip.file);
    if (!file || !fichiers.includes(file)) { erreurs.push(`absent : ${clip.file}`); continue; }
    if (!entree) { erreurs.push(`non enregistré : ${clip.file}`); continue; }
    const contenu = readFileSync(join(dossierAudio, file));
    const sha256 = createHash('sha256').update(contenu).digest('hex');
    if (entree.texte_exact !== clip.text) erreurs.push(`texte différent : ${clip.file}`);
    if (entree.sha256 !== sha256) erreurs.push(`empreinte différente : ${clip.file}`);
    if (entree.octets !== contenu.byteLength) erreurs.push(`taille différente : ${clip.file}`);
    if (!(entree.duree_ms > 0)) erreurs.push(`durée absente : ${clip.file}`);
  }
  const orphelins = fichiers.filter((f) => !mappes.has(f));
  if (actuel.couverture?.fichiers_mp3 !== fichiers.length) erreurs.push('compte fichiers_mp3 obsolète');
  if (actuel.couverture?.clips_mappes !== clips.length) erreurs.push('compte clips_mappes obsolète');
  if (JSON.stringify(actuel.couverture?.fichiers_orphelins) !== JSON.stringify(orphelins)) erreurs.push('liste des orphelins obsolète');
  if (actuel.clips.length !== clips.length) erreurs.push('nombre d’entrées obsolète');
  if (erreurs.length) {
    console.error(`Registre vocal invalide :\n- ${erreurs.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Registre voix cohérent : ${clips.length} clips mappés, ${fichiers.length} fichiers, ${orphelins.length} orphelins.`);
  process.exit(0);
}

function metadata(file) {
  const chemin = join(dossierAudio, file);
  const contenu = readFileSync(chemin);
  const sha256 = createHash('sha256').update(contenu).digest('hex');
  const secondes = Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', chemin,
  ], { encoding:'utf8' }).trim());
  return { sha256, octets: contenu.byteLength, duree_ms: Math.round(secondes * 1000) };
}

const items = clips.map((clip) => {
  const file = clip.file.split('/').at(-1);
  if (!file || !fichiers.includes(file)) throw new Error(`Clip mappé absent : ${clip.file}`);
  return {
    id: file.replace(/\.mp3$/, ''),
    locale: 'fr-CI',
    role: 'guide-ivoirienne',
    texte_exact: clip.text,
    fichier: clip.file,
    criticite: 'a_classer',
    validation_humaine: 'a_documenter',
    consentement: 'a_relier_au_dossier_de_production',
    ...metadata(file),
  };
});

const registre = {
  schema_version: 1,
  pack_id: 'julaba-tata-fr-ci-historique',
  statut_release: 'audit_requis',
  langue_complete: false,
  avertissement: "Ce registre prouve présence, texte mappé et empreinte. Il ne certifie ni l'accent, ni le consentement, ni la compréhension humaine.",
  provenance: {
    source: 'clips historiques versionnés dans Jùlaba',
    proprietaire: 'à documenter',
    autorisation_de_publication: 'à documenter',
    validation_par_locutrice_ivoirienne: 'à documenter',
  },
  couverture: {
    fichiers_mp3: fichiers.length,
    clips_mappes: items.length,
    fichiers_orphelins: fichiers.filter((f) => !mappes.has(f)),
    intros_manquantes: [
      'intro-accueil.mp3', 'intro-retour.mp3', 'intro-1.mp3', 'intro-2.mp3', 'intro-3.mp3',
      'intro-4.mp3', 'intro-mode.mp3', 'intro-voix.mp3', 'intro-bravo.mp3',
    ],
  },
  clips: items,
};

const rendu = `${JSON.stringify(registre, null, 2)}\n`;
writeFileSync(sortie, rendu);
console.log(`Registre écrit : ${sortie}`);
