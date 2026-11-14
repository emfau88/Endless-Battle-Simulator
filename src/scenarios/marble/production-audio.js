/* Progressive Marble Factory: the existing event mixer owns playback and export.
 * These isolated assets follow listening variant C, led by Kenney recordings.
 * No audio clock or random source touches physics.
 * Short, density-limited gestures follow actual work; there is no perpetual motor loop.
 * Polishing/coating remain logical production events but intentionally have no
 * sound mapping: their former broad noise layers were removed. */
(function () {
  'use strict';
  const production = EBS.MarbleProduction = EBS.MarbleProduction || {};
  production.audioEvents = {
    factoryRoll: {
      label: 'Produktion · Rollen',
      samples: ['mw-soft-glass-0', 'mw-soft-wood-0', 'mw-soft-wood-1'],
      gain: .16, ref: 1, detune: .3, semis: -1, minGap: .7,
      variant: 'material', variants: {
        steel: { samples: ['mw-soft-metal-0', 'mw-soft-metal-1'], gain: .13, semis: -1 },
        rubber: { samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: .20, semis: 2 },
      },
    },
    factoryImpact: {
      label: 'Produktion · Materialkontakt',
      samples: ['mw-soft-glass-0', 'mw-soft-glass-1', 'mw-soft-glass-2'],
      gain: .48, ref: 1, detune: .25, minGap: .4, scale: [0, 0, .25, .25, .5, .5],
      variant: 'material', variants: {
        steel: { samples: ['mw-soft-metal-0', 'mw-soft-metal-1'], gain: .42, semis: -1, scale: [0, 0, .25, .25, .5, .5] },
        rubber: { samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: .48, semis: 1, scale: [0, 0, .25, .25, .5, .5] },
      },
    },
    factoryFeed: {
      label: 'Produktion · Vereinzelung', samples: ['mw-soft-wood-0', 'mw-soft-wood-1'],
      gain: .32, semis: 0, detune: .2, minGap: .35,
    },
    factoryPress: {
      label: 'Produktion · Presse', samples: ['mw-soft-wood-1', 'mw-soft-wood-2'],
      gain: .40, semis: -1, detune: .25, minGap: .55,
    },
    factoryScan: {
      label: 'Produktion · Prüfung', samples: ['mw-soft-switch-0', 'mw-soft-switch-1'],
      gain: .18, semis: 1, detune: .2, minGap: .65,
    },
    factorySort: {
      label: 'Produktion · Sortierweiche', samples: ['mw-soft-switch-1', 'mw-soft-wood-0'],
      gain: .30, semis: 0, detune: .25, minGap: .4,
    },
    factoryUpgrade: {
      label: 'Produktion · Ausbau', samples: ['mw-soft-wood-2'],
      gain: .40, semis: -1, detune: .1, minGap: 2,
    },
    factoryComplete: {
      label: 'Produktion · Auftrag fertig', samples: ['mw-soft-glass-1'],
      gain: .30, semis: -2, detune: 0, minGap: 10,
    },
  };
})();
