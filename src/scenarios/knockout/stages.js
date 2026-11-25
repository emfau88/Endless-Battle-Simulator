/* Marble Knockout · Bahnen (R43/M4, M7)
 *
 * Langvideo: zehn Bahnen im Querformat. Short: drei Fassungen (A, B, C) mit je drei Hochformat-Bahnen.
 * Jede Bahn ist eine Bauanleitung build(b, c) für den Builder aus elements.js; c = { W, H, r, d, T, n, short }.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  EBS.KnockoutStages = { long: [], short: { A: [], B: [], C: [] }, gallery: EBS.KnockoutGallery };
})(typeof window !== 'undefined' ? window : globalThis);
