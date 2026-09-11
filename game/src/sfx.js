// Real short SFX clips (CC0, see /assets/CREDITS.md), loaded once at boot.
// 'sfx-dodge' deliberately shares a file with 'sfx-kill' (zap.ogg) under its
// own cache key — the two are told apart by playing at different pitch
// ranges at each call site, and loading the same tiny file twice is cheap.
const SFX_FILES = {
  'sfx-kill': 'assets/sfx/zap.ogg',
  'sfx-hit': 'assets/sfx/shield-down.ogg',
  'sfx-gameover': 'assets/sfx/lose.ogg',
  'sfx-pickup': 'assets/sfx/two-tone.ogg',
  'sfx-dodge': 'assets/sfx/zap.ogg',
  'sfx-missile': 'assets/sfx/laser2.ogg',
  'sfx-laser': 'assets/sfx/laser1.ogg',
  // 'sfx-fire' (the player's basic blaster) deliberately shares laser1.ogg
  // with 'sfx-laser' under its own key — same reuse trick as sfx-dodge above.
  'sfx-fire': 'assets/sfx/laser1.ogg',
  'sfx-shield': 'assets/sfx/shield-up.ogg',
};

// Call from a scene's preload() — Phaser's audio loader needs the loading
// phase, unlike the old procedurally-synthesized tones which needed nothing
// but a WebAudio context and could be built synchronously in create().
export function preloadSfx(scene) {
  Object.entries(SFX_FILES).forEach(([key, path]) => {
    if (!scene.cache.audio.exists(key)) scene.load.audio(key, path);
  });
}

export function playSfx(scene, key, { rate = 1, volume = 0.5 } = {}) {
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { rate, volume });
}
