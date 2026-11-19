/* Tactical arena (v4, in Arbeit). Builds on the material arena (v3); the archived
 * prototype, v2 and v3 stay bit-identical. Everything that changes the flow of a
 * round lives here: start crates (K1), target choice and line of fire (K2),
 * path finding (K3), tank driving and behaviour (K4). Seeded randomness only. */
(function () {
  'use strict';
  const M = EBS.ScrapMaterials;

  class TacticalRound extends M.Round {
    constructor(options) {
      super(options);
      this.rulesVersion = 'v4';
    }
  }

  EBS.ScrapTactics = { Round: TacticalRound };
})();
