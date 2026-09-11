import { SKINS, CONVOY_SKINS, ENEMY } from '../config.js';
import { preloadSfx } from '../sfx.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    SKINS.forEach((skin) => this.load.image(skin.key, skin.sprite));
    CONVOY_SKINS.forEach((skin) => this.load.image(skin.key, skin.sprite));
    this.load.image('bulletBolt', 'assets/effects/blaster-bolt.png');
    ENEMY.textureKeys.forEach((key) => this.load.image(key, `assets/enemies/${key}.png`));
    preloadSfx(this);
  }

  create() {
    this.makeStarfieldTexture();
    this.makeParticleTexture();
    this.makePowerUpTexture();
    this.makeMissileTexture();
    this.makeLaserTexture();
    this.makeShieldRingTexture();
    this.makePlanetTexture();
    this.makeTankConvoyTexture();
    this.makePlayerTankTexture();
    this.makePlayerTurretTexture();
    this.makeWalkerTexture();
    this.makeGroundTexture();

    this.scene.start('MenuScene');
  }

  makeParticleTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  }

  makePowerUpTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x66ffe0, 1);
    g.fillRoundedRect(3, 3, 14, 14, 4);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRoundedRect(3, 3, 14, 14, 4);
    g.generateTexture('powerup', 20, 20);
    g.destroy();
  }

  makeMissileTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffb347, 1);
    g.fillRoundedRect(0, 4, 18, 6, 3);
    g.fillTriangle(18, 4, 18, 10, 24, 7);
    g.lineStyle(1, 0xffffff, 0.8);
    g.strokeRoundedRect(0, 4, 18, 6, 3);
    g.generateTexture('missile', 24, 14);
    g.destroy();
  }

  makeLaserTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xff5cf0, 1);
    g.fillRoundedRect(0, 0, 34, 4, 2);
    g.generateTexture('laser', 34, 4);
    g.destroy();
  }

  makeShieldRingTexture() {
    const g = this.add.graphics();
    g.lineStyle(3, 0x4cd3ff, 0.8);
    g.strokeCircle(24, 24, 21);
    g.generateTexture('shield-ring', 48, 48);
    g.destroy();
  }

  // A purely decorative distant-planet backdrop (no physics, no interaction —
  // see LEVELS[...].backdrop in config.js). The "shading" is faked without a
  // real gradient: a smaller darker circle offset just enough to stay fully
  // inside the base circle, reading as a terminator line/night side.
  makePlanetTexture() {
    const size = 480;
    const center = size / 2;
    const radius = 220;
    const g = this.add.graphics();

    g.fillStyle(0x3d6e74, 1);
    g.fillCircle(center, center, radius);

    // Night side — offset just enough to stay fully inside the base circle
    // (offset + its own radius === radius), so it never pokes past the edge.
    g.fillStyle(0x1f3d40, 1);
    g.fillCircle(center - 50, center, 170);

    // A couple of lighter terrain patches on the lit side, drawn after the
    // shadow so they stay visible.
    g.fillStyle(0x4a8a86, 1);
    g.fillCircle(center + 70, center - 40, 55);
    g.fillCircle(center + 40, center + 60, 40);

    g.lineStyle(4, 0x7fe8ff, 0.35);
    g.strokeCircle(center, center, radius + 8);

    g.generateTexture('planet-1', size, size);
    g.destroy();
  }

  // Level 2 (GroundGameScene) — placeholder ground-battle art, same
  // procedural-Graphics technique as everything else in this file. Drawn
  // facing right (angle 0) since the tank convoy only ever travels rightward
  // — no headingOffsetDeg twist needed, unlike the nose-up ship art.
  makeTankConvoyTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x33302a, 1);
    g.fillRect(4, 38, 88, 8);
    g.fillStyle(0x8a7d5a, 1);
    g.fillRoundedRect(8, 20, 80, 20, 4);
    g.fillStyle(0x6b6144, 1);
    g.fillCircle(48, 18, 14);
    g.fillRect(48, 15, 40, 6);
    g.generateTexture('tank-convoy', 96, 48);
    g.destroy();
  }

  // Hull only — no turret/barrel here, since the player's turret rotates
  // independently to aim at the mouse (see 'tank-turret' + GroundGameScene,
  // which positions that separate image at this hull's turret mount point).
  makePlayerTankTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x1f5c36, 1);
    g.fillRect(2, 30, 76, 8);
    g.fillStyle(0x2f8f52, 1);
    g.fillRoundedRect(6, 16, 60, 16, 4);
    g.fillStyle(0x256b3d, 1);
    g.fillCircle(36, 16, 10);
    g.generateTexture('tank-player', 80, 40);
    g.destroy();
  }

  // Drawn facing right, pivot (the turret ring) near the texture's left edge —
  // GroundGameScene sets this image's origin to match that pivot so rotating
  // it aims the barrel without the whole sprite sliding around.
  makePlayerTurretTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x256b3d, 1);
    g.fillCircle(14, 7, 12);
    g.fillRect(14, 4, 36, 6);
    g.generateTexture('tank-turret', 50, 14);
    g.destroy();
  }

  // A small radially-spiky "mine-walker" rather than a literal upright biped —
  // it reuses Enemy.js's rotation unchanged (nose-up convention, same as the
  // TIE fighters, via ENEMY.headingOffsetDeg), which would make an upright
  // biped appear to tip on its side when facing left/right; a roughly
  // symmetric spiky drone reads fine at any rotation instead. The one longer
  // spike is the "nose" (drawn pointing up, matching that same convention).
  makeWalkerTexture() {
    const g = this.add.graphics();
    const cx = 28;
    const cy = 28;
    g.lineStyle(4, 0x7a2424, 1);
    [30, 90, 150, 210, 330].forEach((deg) => {
      const rad = Phaser.Math.DegToRad(deg);
      g.lineBetween(cx, cy, cx + Math.cos(rad) * 20, cy + Math.sin(rad) * 20);
    });
    g.lineStyle(5, 0xff5c5c, 1);
    g.lineBetween(cx, cy, cx, cy - 24);
    g.fillStyle(0xb33a3a, 1);
    g.fillCircle(cx, cy, 15);
    g.fillStyle(0xff8080, 1);
    g.fillCircle(cx, cy, 5);
    g.generateTexture('walker-1', 56, 56);
    g.destroy();
  }

  makeGroundTexture() {
    const w = 128;
    const h = 140;
    const g = this.add.graphics();
    g.fillStyle(0x6b5a3d, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0xac9166, 1);
    g.fillRect(0, 0, w, 10);
    g.fillStyle(0x59492f, 1);
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w;
      const y = 14 + Math.random() * (h - 14);
      const r = Math.random() < 0.3 ? 3 : 1.6;
      g.fillCircle(x, y, r);
    }
    g.generateTexture('ground-strip', w, h);
    g.destroy();
  }

  makeStarfieldTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x05070d, 1);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() < 0.15 ? 1.6 : 0.8;
      g.fillCircle(x, y, r);
    }
    g.generateTexture('starfield', 256, 256);
    g.destroy();
  }
}
