// Dedicated references for intentional Scrap v3 map changes. The shared
// Naval/Marble/Mycelium golden hashes and archived Scrap reference stay separate.
// node scripts/scrap-map-hashes.mjs          compare
// node scripts/scrap-map-hashes.mjs --write  approve intentional map outcomes
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
export const SCRAP_MAP_FILE = join(root, 'test/fixtures/scrap-material-maps.json');
const paths = ['core.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/rules.js',
  'scenarios/scrap/materials.js', 'scenarios/scrap/tactics.js', 'scenarios/scrap/episode.js'];
const sha = value => createHash('sha256').update(value).digest('hex');

export function computeScrapMapHashes() {
  const context = vm.createContext({}); context.window = context;
  for (const path of paths) vm.runInContext(readFileSync(join(root, 'src', path), 'utf8'), context, { filename: path });
  const { EBS } = context, cases = [];
  const params = { rulesVersion: 'v3', arena: 'yard', episodeMode: 'endless', workshop: false,
    repeatRounds: true, endPauseSec: 3 };
  for (const aspect of ['16:9', '9:16']) for (const seed of [42, 7, 314]) {
    const world = aspect === '16:9' ? { w: 1920, h: 1080 } : { w: 1080, h: 1920 };
    const sim = new EBS.Scrap.Episode({ seed, params, world, view: { hud: true, camera: false }, timeScale: 1 });
    const checkpoints = [];
    for (const step of [0, 600, 2400, 7200]) {
      while (sim.step < step) sim.stepOnce();
      const check = sim.checkInvariants();
      if (!check.ok) throw Error(`${aspect}/${seed}/${step}: ${check.errors.join('; ')}`);
      checkpoints.push({ step, phase: sim.phase, round: sim.roundNumber, completedRounds: sim.completedRounds,
        stateHash: sim.stateHash(), roundHash: sim.roundSim.stateHash(),
        roundStateSha256: sha(JSON.stringify(sim.roundSim)), eventsSha256: sha(JSON.stringify(sim.events)) });
    }
    cases.push({ arena: 'yard', aspect, seed, checkpoints }); sim.destroy();
  }
  return { schema: 1, params, timeScale: 1, cases };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const current = computeScrapMapHashes();
  if (process.argv.includes('--write')) {
    writeFileSync(SCRAP_MAP_FILE, JSON.stringify({
      note: 'Intentional M2/M3 Scrapyard geometry reference. Regenerate only after reviewing map/flow changes; never replace archived Scrap prototype or other scenario golden hashes.',
      ...current,
    }, null, 2) + '\n');
    console.log(`Wrote ${current.cases.length} Scrap map cases × 4 checkpoints: ${SCRAP_MAP_FILE}`);
  } else {
    const { note, ...stored } = JSON.parse(readFileSync(SCRAP_MAP_FILE, 'utf8'));
    if (JSON.stringify(stored) !== JSON.stringify(current)) {
      console.error('Scrap map reference differs; inspect the intentional geometry or simulation change.');
      process.exitCode = 1;
    } else console.log('6 Scrap map cases × 4 checkpoints match the reference.');
  }
}
