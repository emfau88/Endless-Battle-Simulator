/* Progressive Marble Factory: the existing event mixer owns playback, variation,
 * loudness normalization and export. No audio clock or random source touches physics.
 * Short, density-limited gestures follow actual work; there is no perpetual motor loop. */
(function () {
  'use strict';
  const production = EBS.MarbleProduction = EBS.MarbleProduction || {};
  production.audioEvents = {
    factoryRoll: {
      label: 'Produktion · Rollen',
      samples: ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002'],
      gain: .11, ref: 1, detune: 1.2, semis: -4, minGap: .58,
      variant: 'material', variants: {
        steel: { samples: ['impactMetal_light_002', 'impactMetal_light_003'], gain: .12, semis: -9 },
        rubber: { samples: ['impactSoft_medium_000'], gain: .14, semis: -9 },
      },
    },
    factoryImpact: {
      label: 'Produktion · Materialkontakt',
      samples: ['impactGlass_medium_000', 'impactGlass_medium_001'],
      gain: .34, ref: 1, detune: .65, minGap: .16, scale: [0, 2, 4, 7, 9, 12],
      variant: 'material', variants: {
        steel: { samples: ['impactMetal_light_000', 'impactTin_medium_000'], gain: .28, semis: -8, scale: [0, 0, 2, 2, 4, 4] },
        rubber: { samples: ['impactSoft_medium_000'], gain: .40, semis: -7, scale: [0, 1, 2, 3, 4, 5] },
      },
    },
    factoryFeed: {
      label: 'Produktion · Vereinzelung', samples: ['impactMetal_light_000', 'impactMetal_light_001'],
      gain: .13, semis: -4, detune: .5, minGap: .2,
    },
    factoryPolish: {
      label: 'Produktion · Polierbürsten', samples: ['synth:myco-breeze'],
      gain: .085, semis: -5, detune: .6, minGap: .9,
    },
    factoryPress: {
      label: 'Produktion · Presse', samples: ['impactWood_medium_000', 'impactWood_medium_001'],
      gain: .21, semis: -9, detune: .6, minGap: .35,
    },
    factoryCoat: {
      label: 'Produktion · Beschichtung', samples: ['synth:myco-breeze'],
      gain: .065, ref: 1, semis: 5, detune: .5, minGap: .8,
    },
    factoryScan: {
      label: 'Produktion · Prüfung', samples: ['impactGlass_light_001', 'impactGlass_light_002'],
      gain: .075, semis: 9, detune: .2, minGap: .3,
    },
    factorySort: {
      label: 'Produktion · Sortierweiche', samples: ['impactPlate_light_000'],
      gain: .15, semis: -2, detune: .5, minGap: .18,
    },
    factoryUpgrade: {
      label: 'Produktion · Ausbau', samples: ['impactWood_heavy_000'],
      gain: .24, semis: -5, detune: .25, minGap: 2,
    },
    factoryComplete: {
      label: 'Produktion · Auftrag fertig', samples: ['synth:chime'],
      gain: .18, semis: -5, detune: 0, minGap: 10,
    },
  };
})();
