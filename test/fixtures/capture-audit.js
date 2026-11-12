// Test-only observer: fingerprints the actual JPEG frames sent to FFmpeg.
(function () {
  const api = window.exportAPI, render = api.renderFrames, snapshot = api.snapshot, restart = api.restart;
  let digest = 0, frames = 0;
  api.renderFrames = function (...args) {
    const images = render(...args);
    for (const image of images) { digest = EBS.util.fnv1a(digest + '|' + image); frames++; }
    return images;
  };
  api.snapshot = () => ({ ...snapshot(), captureAudit: { digest, frames } });
  api.restart = function (...args) { digest = 0; frames = 0; return restart(...args); };
})();
