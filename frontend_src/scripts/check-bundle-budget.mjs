import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const assetsDir = resolve(process.cwd(), "../frontend/dist/assets");
const MAX_INITIAL_BYTES = 800 * 1024;
const entryPattern = /^index-[^/]+\.js$/;

const files = await readdir(assetsDir);
const entryCandidates = files.filter((file) => entryPattern.test(file));

if (entryCandidates.length === 0) {
  throw new Error("Bundle initial introuvable. Exécutez d’abord npm run build.");
}

const candidatesWithStats = await Promise.all(entryCandidates.map(async (file) => ({ file, stats: await stat(join(assetsDir, file)) })));
const { file: entryFile, stats: entryStats } = candidatesWithStats.reduce((largest, candidate) => (
  candidate.stats.size > largest.stats.size ? candidate : largest
));
const sizeKb = Math.round(entryStats.size / 1024);
const budgetKb = MAX_INITIAL_BYTES / 1024;

console.log(`Bundle initial : ${entryFile} — ${sizeKb} Ko (budget : ${budgetKb} Ko)`);

if (entryStats.size > MAX_INITIAL_BYTES) {
  throw new Error(`Le bundle initial dépasse le budget de ${budgetKb} Ko.`);
}

console.log("Budget de bundle respecté ✅");
