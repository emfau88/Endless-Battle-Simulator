import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const env = vm.createContext({});
env.window = env;
for (const part of ['core', 'canvas-scene', 'scenarios/territory/simulation', 'scenarios/territory/episode',
  'scenarios/territory/short', 'scenarios/territory/wilds', 'scenarios/territory', 'production-presets']) {
  vm.runInContext(read('src/' + part + '.js'), env, { filename: part });
}
const { EBS, HexSim } = env, world = { w: 1920, h: 1080 }, scenario = EBS.getScenario('territory');
const file = JSON.parse(read('presets/territory-meteor-riese-lang.json'));
const make = (seed = file.seed, params = file.params) => scenario.create({ seed, params, world, timeScale: .75 });
const plain = v => JSON.parse(JSON.stringify(v));
const check = sim => { const result = sim.checkInvariants(); assert.ok(result.ok, result.errors.join('\n')); };

test('Großkarte ist eine eigene Langvideo-Vorlage, die Standardkarten behalten ihre Vorlagen', () => {
  assert.deepEqual(plain(EBS.productionPreset('territory', 'long', 81, 'wilds')), file);
  for (const kind of ['short', 'long']) {
    assert.deepEqual(plain(EBS.productionPreset('territory', kind, 42)), JSON.parse(read('presets/production/territory-'+kind+'.json')));
  }
  assert.equal(make().roundSim.tiles.length, 221);
  assert.equal(make(46, {}).roundSim.tiles.length, 169);
  assert.equal(make().roundSim.rules, 'territory-wilds-v1');
  assert.equal(make(46, {}).roundSim.giant, undefined);
  assert.equal(scenario.audioForParams({layout:'landscape'}).events.meteor_impact, undefined);
  const sounds = scenario.audioForParams(file.params).events;
  assert.ok(sounds.meteor_impact && sounds.giant_arrival && sounds.battle && sounds.victory);
  assert.equal(sounds.dispatch, undefined);
  assert.ok(!Object.values(sounds).some(def => def.samples.includes('synth:chime')));
  assert.ok(!sounds.capture.samples.includes('synth:scrap-pickup'));
  assert.deepEqual(plain(scenario.audioForParams({layout:'landscape'}).events.dispatch.samples), ['synth:chime']);
  assert.ok(scenario.audioForParams({layout:'short'}).events.dispatch);
});

test('Meteor schließt und öffnet Wege, der neutrale Riese verdrängt echte Kolonnen, die Vorlage endet nach zehn Minuten', () => {
  const sim = make(), r = sim.roundSim, original = r.tiles.map(t => [...t.neighbors]);
  let cursor = 0, impacts = 0, clears = 0, arrivals = 0, retreats = 0, previousStart = -Infinity;
  const reactions = [], lastFor = new Map();
  for (let i = 0; i < 12*60*60 && sim.phase === 'running'; i++) {
    sim.stepOnce();
    const reaction = sim.hqReactions.last;
    if (reaction && reactions.at(-1) !== reaction) {
      assert.ok(r.factions[reaction.team].alive);
      assert.ok(reaction.at - (reactions.at(-1)?.at ?? -Infinity) >= 65);
      assert.ok(reaction.at - (lastFor.get(reaction.team) ?? -Infinity) >= 95);
      assert.equal(sim.hqReactions.visible(reaction.at + 1).team, reaction.team);
      assert.equal(sim.hqReactions.visible(reaction.at + 2.21), null);
      lastFor.set(reaction.team, reaction.at);
      reactions.push(reaction);
    }
    while (cursor < sim.events.length) {
      const e = sim.events[cursor++], tile = r.tiles[e.tile];
      switch (e.type) {
        case 'meteor_warning':
          assert.ok(e.roundTime - previousStart > 100); previousStart = e.roundTime;
          assert.equal(tile.hq, -1); assert.notEqual(tile.terrain, 'outpost');
          assert.ok(!r.giant?.route.includes(tile.id));
          if (impacts === 0) {
            assert.equal(tile.owner, -1);
            assert.ok(!r.moves.some(m => m.from === tile.id || m.to === tile.id));
            assert.notEqual(reaction?.at, e.videoTime);
          } else {
            assert.equal(reaction.at, e.videoTime); assert.equal(reaction.team, tile.owner);
            assert.equal(reaction.kind, 'alarm');
          }
          break;
        case 'meteor_impact':
          impacts++; assert.equal(r.meteor.closed, true); assert.equal(tile.neighbors.length, 0);
          assert.equal(r.moves.some(m => m.from === tile.id || m.to === tile.id), false);
          for (const id of original[tile.id]) assert.equal(r.tiles[id].neighbors.includes(tile.id), false);
          check(sim); break;
        case 'meteor_clear':
          clears++; assert.deepEqual(r.tiles.map(t => [...t.neighbors]), original);
          check(sim); break;
        case 'giant_arrival':
          arrivals++;
          for (const [j, id] of r.giant.route.entries()) {
            assert.notEqual(r.tiles[id].terrain, 'mountain'); assert.equal(r.tiles[id].hq, -1);
            if (j) assert.ok(original[r.giant.route[j-1]].includes(id));
          }
          break;
        case 'giant_retreat':
          retreats++; assert.equal(e.team, -1); assert.ok(e.amount > 0);
          assert.equal(tile.owner, e.faction); assert.equal(r.tiles[e.to].owner, e.faction);
          assert.ok(r.moves.some(m => m.owner === e.faction && m.kind === 'supply' &&
            m.from === e.tile && m.to === e.to && m.amount === e.amount));
          break;
      }
    }
  }
  assert.equal(impacts, 2); assert.equal(clears, 2); assert.equal(arrivals, 3); assert.equal(retreats, 17);
  assert.ok(reactions.length >= 5 && reactions.length <= 8);
  assert.equal(reactions[0].kind, 'watch'); assert.equal(reactions[0].team, 2);
  assert.ok(reactions.some(cue => cue.kind === 'smirk'));
  assert.equal(sim.completedRounds, 1); check(sim);
  const plan = scenario.createExportPlan(EBS.normalizeConfig(file), world);
  let result;
  do { result = plan.advance(); } while (!result.done);
  assert.equal(result.durationSec, Math.ceil((sim.resultStep/60+9)*30)/30);
  assert.ok(result.durationSec >= 600 && result.durationSec < 605);
});

test('Großkarte wiederholt denselben Seed und leitet neue Runden und Ereignisse aus dem Folgeseed ab', () => {
  const sim = make(46, {...file.params,repeatRounds:true}), replay = make(46, {...file.params,repeatRounds:true});
  for (let i = 0; i < 605*60; i++) { sim.stepOnce(); replay.stepOnce(); }
  assert.equal(sim.roundNumber, 2); assert.equal(sim.stateHash(), replay.stateHash());
  assert.equal(sim.hqReactions.last, null);
  const next = make(EBS.Territory.roundSeed(46, 2));
  assert.equal(sim.roundSeed, next.roundSeed);
  assert.equal(sim.roundSim.nextGiant, next.roundSim.nextGiant);
  assert.equal(sim.roundSim.nextMeteor, next.roundSim.nextMeteor);
  assert.notEqual(next.roundSim.nextGiant, make(46).roundSim.nextGiant);
  assert.ok(HexSim.TEAMS.every(team => sim.roundSim.factions[team.id].alive)); check(sim);
});
