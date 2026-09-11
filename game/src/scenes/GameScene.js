import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER,
  CONVOY,
  ENEMY,
  ENEMY_BULLET_SPEED,
  EXTEND,
  HITBOX,
  WEAPON_LEVELS,
  POWERUP,
  DODGE,
  CHAIN,
  CURRENCY,
  UPGRADES,
  MISSILE,
  MISSILE_LEVELS,
  LASER,
  LASER_LEVELS,
  CONVOY_MISSILE,
  CONVOY_WEAPON_LEVELS,
  DIFFICULTY,
  SKINS,
  CONVOY_SKINS,
  REPAIR_DROID,
  SHIP_UPGRADES,
  LEVELS,
} from '../config.js';
import Player from '../objects/Player.js';
import Convoy from '../objects/Convoy.js';
import Enemy from '../objects/Enemy.js';
import Bullet from '../objects/Bullet.js';
import PowerUp from '../objects/PowerUp.js';
import Missile from '../objects/Missile.js';
import { playSfx } from '../sfx.js';
import { loadSave, writeSave } from '../save.js';

const CONVOY_MARGIN = 320;

const KILL_QUIPS = ['BONK!', 'SCRAPPED!', 'SPACE DUST!', 'YEETED!', 'POOF!', 'ZAPPED!'];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelKey = data?.levelKey || LEVELS[0].key;
  }

  create() {
    this.levelConfig = LEVELS.find((level) => level.key === this.levelKey) || LEVELS[0];
    this.gameOver = false;
    this.score = 0;
    this.nextExtendScore = EXTEND.scoreInterval;
    this.chainMultiplier = 1;
    this.lastKillAt = -Infinity;
    this.difficultyTier = 0;
    this.enemySpeedMultiplier = 1;
    this.enemyFireRateMultiplier = 1;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'starfield')
      .setOrigin(0, 0)
      .setDepth(-10);

    if (this.levelConfig.backdrop) {
      const { textureKey, x, y } = this.levelConfig.backdrop;
      this.add.image(x, y, textureKey).setDepth(-5);
    }

    // A straight left-to-right crossing, timed to take the whole level
    // duration — the convoy's speed is derived from distance/durationMs
    // rather than a fixed constant, so it's still moving right up until the
    // level's timer completes it (see Convoy.update()'s "hold at final
    // waypoint" logic for the small rounding gap at the very end).
    const convoyPath = [
      { x: CONVOY_MARGIN, y: WORLD_HEIGHT / 2 },
      { x: WORLD_WIDTH - CONVOY_MARGIN, y: WORLD_HEIGHT / 2 },
    ];
    const convoyCrossingDistance = Phaser.Math.Distance.Between(
      convoyPath[0].x,
      convoyPath[0].y,
      convoyPath[convoyPath.length - 1].x,
      convoyPath[convoyPath.length - 1].y
    );
    const save = loadSave();
    // A save from before a skin roster change (e.g. Milestone 12's reskin) can
    // point at a texture key that no longer exists — fall back to the first
    // valid skin rather than handing Player/Convoy a missing texture.
    const skinEntry = SKINS.find((skin) => skin.key === save.skins.selected) || SKINS[0];
    const convoySkinEntry =
      CONVOY_SKINS.find((skin) => skin.key === save.convoySkins.selected) || CONVOY_SKINS[0];

    const convoySpeed = convoyCrossingDistance / (this.levelConfig.durationMs / 1000);
    this.convoy = new Convoy(this, convoyPath, convoySkinEntry.key, convoySkinEntry.headingOffsetDeg, convoySpeed);
    this.player = new Player(
      this,
      convoyPath[0].x + 70,
      convoyPath[0].y + 70,
      skinEntry.key,
      skinEntry.headingOffsetDeg
    );

    this.convoy.maxHp = CONVOY.maxHp + save.upgrades.convoyHp * UPGRADES.convoyHp.amountPerLevel;
    this.convoy.hp = this.convoy.maxHp;
    this.convoy.shieldCharges = save.upgrades.convoyShield * UPGRADES.convoyShield.amountPerLevel;
    this.convoy.maxShieldCharges = this.convoy.shieldCharges;
    this.convoyWeaponLevel = save.upgrades.convoyWeapon;
    this.convoyDroidCount = save.upgrades.convoyDroids;

    // Per-ship loadout — whichever ship is equipped owns its own separate set
    // of purchased levels (src/save.js's shipUpgrades[shipKey]).
    const shipUpg = save.shipUpgrades[skinEntry.key];
    this.player.lives = PLAYER.startLives + shipUpg.lives * SHIP_UPGRADES.lives.amountPerLevel;
    this.player.dodgeCharges = DODGE.charges + shipUpg.dodge * SHIP_UPGRADES.dodge.amountPerLevel;
    this.player.maxDodgeCharges = this.player.dodgeCharges;
    this.player.shieldCharges = shipUpg.shield * SHIP_UPGRADES.shield.amountPerLevel;
    this.player.maxShieldCharges = this.player.shieldCharges;
    // The equipped ship's own maxWeaponLevel caps both this starting value and
    // any further in-run level-ups from pickups (see levelUpWeapon()) — e.g.
    // the X-Wing can reach every WEAPON_LEVELS tier, A-Wing/Y-Wing cap lower.
    this.maxWeaponLevel = skinEntry.maxWeaponLevel;
    this.weaponLevel = Math.min(
      shipUpg.startWeaponLevel * SHIP_UPGRADES.startWeaponLevel.amountPerLevel,
      this.maxWeaponLevel - 1
    );
    this.missileLevel = shipUpg.missile;
    this.laserLevel = shipUpg.laser;
    // Purchase isn't skin-gated, usability is: the equipped ship's own
    // droidCapacity caps how many of the purchased droids actually do anything.
    this.playerDroidCount = Math.min(shipUpg.droids, skinEntry.droidCapacity || 0);

    this.playerBullets = this.physics.add.group({
      classType: Bullet,
      defaultKey: 'bulletBolt',
      maxSize: 60,
      runChildUpdate: true,
    });

    this.enemyBullets = this.physics.add.group({
      classType: Bullet,
      defaultKey: 'bulletBolt',
      maxSize: 60,
      runChildUpdate: true,
    });

    this.enemies = this.physics.add.group({
      classType: Enemy,
      defaultKey: ENEMY.textureKeys[0],
      maxSize: ENEMY.maxAlive,
      runChildUpdate: true,
    });

    this.powerUps = this.physics.add.group({
      classType: PowerUp,
      defaultKey: 'powerup',
      maxSize: POWERUP.maxAlive,
      runChildUpdate: true,
    });

    this.missiles = this.physics.add.group({
      classType: Missile,
      defaultKey: 'missile',
      maxSize: MISSILE.maxAlive,
      runChildUpdate: true,
    });

    this.lasers = this.physics.add.group({
      classType: Bullet,
      defaultKey: 'laser',
      maxSize: LASER.maxAlive,
      runChildUpdate: true,
    });

    this.convoyMissiles = this.physics.add.group({
      classType: Missile,
      defaultKey: 'missile',
      maxSize: CONVOY_MISSILE.maxAlive,
      runChildUpdate: true,
    });

    this.prewarmGroup(this.playerBullets, HITBOX.bullet.w, HITBOX.bullet.h, 0x3bff6e);
    this.prewarmGroup(this.enemyBullets, HITBOX.bullet.w, HITBOX.bullet.h, 0xff2d2d);
    this.prewarmGroup(this.enemies, HITBOX.enemy.w, HITBOX.enemy.h);
    this.prewarmGroup(this.powerUps);
    this.prewarmGroup(this.missiles);
    this.prewarmGroup(this.lasers);
    this.prewarmGroup(this.convoyMissiles);

    this.killEmitter = this.add.particles(0, 0, 'spark', {
      lifespan: 300,
      speed: { min: 60, max: 160 },
      scale: { start: 0.9, end: 0 },
      tint: 0x3bff6e,
      emitting: false,
    });
    this.damageEmitter = this.add.particles(0, 0, 'spark', {
      lifespan: 350,
      speed: { min: 80, max: 200 },
      scale: { start: 1.1, end: 0 },
      tint: 0xff2d2d,
      emitting: false,
    });
    this.pickupEmitter = this.add.particles(0, 0, 'spark', {
      lifespan: 350,
      speed: { min: 60, max: 150 },
      scale: { start: 1, end: 0 },
      tint: 0x66ffe0,
      emitting: false,
    });
    this.dodgeEmitter = this.add.particles(0, 0, 'spark', {
      lifespan: 250,
      speed: { min: 100, max: 220 },
      scale: { start: 1, end: 0 },
      tint: 0x9fd8ff,
      emitting: false,
    });
    this.deathEmitter = this.add.particles(0, 0, 'spark', {
      lifespan: 500,
      speed: { min: 120, max: 280 },
      scale: { start: 1.4, end: 0 },
      tint: [0xff5c5c, 0xffb347, 0xffffff, 0x9fd8ff],
      emitting: false,
    });
    this.shieldEmitter = this.add.particles(0, 0, 'spark', {
      lifespan: 300,
      speed: { min: 80, max: 180 },
      scale: { start: 1, end: 0 },
      tint: 0x4cd3ff,
      emitting: false,
    });

    this.shieldRing = this.add.sprite(this.player.x, this.player.y, 'shield-ring').setDepth(5);
    this.shieldRing.setVisible(this.player.shieldCharges > 0);

    this.convoyShieldRing = this.add
      .sprite(this.convoy.x, this.convoy.y, 'shield-ring')
      .setScale(1.8)
      .setDepth(5);
    this.convoyShieldRing.setVisible(this.convoy.shieldCharges > 0);

    this.physics.add.overlap(this.playerBullets, this.enemies, this.onPlayerBulletHitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.convoy, this.onEnemyBulletHitConvoy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.enemies, this.convoy, this.onEnemyRamConvoy, null, this);
    this.physics.add.overlap(this.enemies, this.player, this.onEnemyRamPlayer, null, this);
    this.physics.add.overlap(this.player, this.powerUps, this.onPlayerCollectPowerUp, null, this);
    this.physics.add.overlap(this.missiles, this.enemies, this.onMissileHitEnemy, null, this);
    this.physics.add.overlap(this.lasers, this.enemies, this.onLaserHitEnemy, null, this);
    this.physics.add.overlap(this.convoyMissiles, this.enemies, this.onMissileHitEnemy, null, this);

    this.scheduleNextSpawn();

    this.difficultyTimer = this.time.addEvent({
      delay: DIFFICULTY.rampIntervalMs,
      loop: true,
      callback: this.increaseDifficulty,
      callbackScope: this,
    });

    this.levelStartTime = this.time.now;
    this.levelTimer = this.time.addEvent({
      delay: this.levelConfig.durationMs,
      callback: this.triggerLevelComplete,
      callbackScope: this,
    });
    this.levelTimeTicker = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: this.reportLevelTimeRemaining,
      callbackScope: this,
    });

    if (this.missileLevel > 0) {
      const tier = MISSILE_LEVELS[this.missileLevel - 1];
      this.missileTimer = this.time.addEvent({
        delay: tier.cooldownMs,
        loop: true,
        callback: this.fireMissile,
        callbackScope: this,
      });
    }

    if (this.laserLevel > 0) {
      const tier = LASER_LEVELS[this.laserLevel - 1];
      this.laserTimer = this.time.addEvent({
        delay: tier.cooldownMs,
        loop: true,
        callback: this.fireLaser,
        callbackScope: this,
      });
    }

    if (this.convoyWeaponLevel > 0) {
      const tier = CONVOY_WEAPON_LEVELS[this.convoyWeaponLevel - 1];
      this.convoyWeaponTimer = this.time.addEvent({
        delay: tier.cooldownMs,
        loop: true,
        callback: this.fireConvoyMissile,
        callbackScope: this,
      });
    }

    if (this.playerDroidCount > 0) {
      this.playerRepairTimer = this.time.addEvent({
        delay: REPAIR_DROID.playerIntervalMs,
        loop: true,
        callback: this.repairPlayerShield,
        callbackScope: this,
      });
    }

    if (this.convoyDroidCount > 0) {
      this.convoyRepairTimer = this.time.addEvent({
        delay: REPAIR_DROID.convoyIntervalMs,
        loop: true,
        callback: this.repairConvoyHull,
        callbackScope: this,
      });
    }

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dodgeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.game.events.emit('score-changed', this.score);
    this.game.events.emit('lives-changed', this.player.lives);
    this.game.events.emit('convoy-hp-changed', { hp: this.convoy.hp, maxHp: this.convoy.maxHp });
    this.game.events.emit('weapon-level-changed', { level: this.weaponLevel + 1, max: this.maxWeaponLevel });
    this.game.events.emit('dodge-charges-changed', {
      charges: this.player.dodgeCharges,
      max: this.player.maxDodgeCharges,
    });
    this.game.events.emit('chain-changed', this.chainMultiplier);
    this.game.events.emit('shield-changed', {
      charges: this.player.shieldCharges,
      max: this.player.maxShieldCharges,
    });
    this.game.events.emit('convoy-shield-changed', {
      charges: this.convoy.shieldCharges,
      max: this.convoy.maxShieldCharges,
    });
    this.game.events.emit('difficulty-changed', this.difficultyTier + 1);
    this.game.events.emit('player-droids-changed', this.playerDroidCount);
    this.game.events.emit('convoy-droids-changed', this.convoyDroidCount);
    this.reportLevelTimeRemaining();
  }

  reportLevelTimeRemaining() {
    const remainingMs = Math.max(0, this.levelConfig.durationMs - (this.time.now - this.levelStartTime));
    this.game.events.emit('level-time-changed', remainingMs);
  }

  prewarmGroup(group, hitboxW, hitboxH, tint) {
    for (let i = 0; i < group.maxSize; i++) {
      const member = group.create(0, 0, group.defaultKey);
      if (hitboxW && hitboxH) member.body.setSize(hitboxW, hitboxH, true);
      if (tint) member.setTint(tint);
      member.deactivate();
    }
  }

  randomEdgePoint() {
    const edge = Phaser.Math.Between(0, 3);
    const pad = 60;
    switch (edge) {
      case 0: // top
        return { x: Phaser.Math.Between(0, WORLD_WIDTH), y: -pad };
      case 1: // right
        return { x: WORLD_WIDTH + pad, y: Phaser.Math.Between(0, WORLD_HEIGHT) };
      case 2: // bottom
        return { x: Phaser.Math.Between(0, WORLD_WIDTH), y: WORLD_HEIGHT + pad };
      default: // left
        return { x: -pad, y: Phaser.Math.Between(0, WORLD_HEIGHT) };
    }
  }

  scheduleNextSpawn() {
    const delay = ENEMY.spawnIntervalMs * this.getSpawnRateMultiplier();
    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnEnemy();
      this.scheduleNextSpawn();
    });
  }

  spawnEnemy() {
    if (this.gameOver || this.convoy.isDestroyed) return;
    const enemy = this.enemies.getFirstDead(true);
    if (!enemy) return;
    enemy.bulletGroup = this.enemyBullets;
    enemy.bulletSpeed = ENEMY_BULLET_SPEED;
    const pos = this.randomEdgePoint();
    enemy.spawn(pos.x, pos.y, this.convoy);
  }

  getSpawnRateMultiplier() {
    return Math.max(DIFFICULTY.minRateMultiplier, 1 - this.difficultyTier * DIFFICULTY.spawnRatePerTier);
  }

  getDamageMultiplier() {
    return 1 + this.difficultyTier * DIFFICULTY.damagePerTier;
  }

  getScoreMultiplier() {
    return 1 + this.difficultyTier * DIFFICULTY.scorePerTier;
  }

  increaseDifficulty() {
    if (this.gameOver || this.difficultyTier >= DIFFICULTY.maxTier) return;
    this.difficultyTier += 1;
    this.enemySpeedMultiplier = 1 + this.difficultyTier * DIFFICULTY.speedPerTier;
    this.enemyFireRateMultiplier = Math.max(
      DIFFICULTY.minRateMultiplier,
      1 - this.difficultyTier * DIFFICULTY.fireRatePerTier
    );
    this.game.events.emit('difficulty-changed', this.difficultyTier + 1);
  }

  addScore(amount) {
    this.score += amount;
    this.game.events.emit('score-changed', this.score);
    while (this.score >= this.nextExtendScore) {
      this.convoy.heal(EXTEND.healAmount);
      this.nextExtendScore += EXTEND.scoreInterval;
      this.reportConvoyHp();
    }
  }

  // Pure state sync to the HUD — no shake/particles/sfx here, since this also
  // runs for a heal (from addScore's extend) where "damage" juice would be wrong.
  reportConvoyHp() {
    this.game.events.emit('convoy-hp-changed', { hp: this.convoy.hp, maxHp: this.convoy.maxHp });
    if (this.convoy.isDestroyed) this.triggerGameOver('convoy');
  }

  reportPlayerHit() {
    this.game.events.emit('lives-changed', this.player.lives);
    if (this.player.lives <= 0) this.triggerGameOver('player');
  }

  handleConvoyDamage() {
    if (this.convoy.isDestroyed) {
      this.cameras.main.shake(160, 0.012);
      this.deathEmitter.explode(30, this.convoy.x, this.convoy.y);
      this.tweens.add({ targets: this.convoy, scale: 1.6, alpha: 0, duration: 300, ease: 'Cubic.easeOut' });
    } else {
      this.cameras.main.shake(80, 0.006);
      this.damageEmitter.explode(12, this.convoy.x, this.convoy.y);
    }
    playSfx(this, 'sfx-hit', { rate: Phaser.Math.FloatBetween(0.85, 1.05) });
    this.reportConvoyHp();
  }

  handlePlayerDamage() {
    if (this.player.lives <= 0) {
      this.cameras.main.shake(160, 0.012);
      this.deathEmitter.explode(30, this.player.x, this.player.y);
      this.tweens.add({ targets: this.player, scale: 1.6, alpha: 0, duration: 300, ease: 'Cubic.easeOut' });
    } else {
      this.cameras.main.shake(60, 0.004);
      this.damageEmitter.explode(10, this.player.x, this.player.y);
    }
    playSfx(this, 'sfx-hit', { rate: Phaser.Math.FloatBetween(0.9, 1.1) });
    this.reportPlayerHit();
  }

  // Arcade Physics does not reliably preserve the (object1, object2) order you
  // pass to add.overlap() when one side is a lone Sprite and the other a Group —
  // it can hand the callback either order depending on internal type detection.
  // Resolve which argument is which by type instead of trusting position.
  onPlayerBulletHitEnemy(a, b) {
    const [bullet, enemy] = a instanceof Enemy ? [b, a] : [a, b];
    bullet.deactivate();
    this.killEnemy(enemy);
  }

  onMissileHitEnemy(a, b) {
    const [missile, enemy] = a instanceof Enemy ? [b, a] : [a, b];
    missile.deactivate();
    this.killEnemy(enemy);
  }

  onLaserHitEnemy(a, b) {
    // The laser pierces — it stays active and keeps flying, only the enemy dies.
    const enemy = a instanceof Enemy ? a : b;
    this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    const { x, y } = enemy;
    enemy.deactivate();
    this.killEmitter.explode(10, x, y);
    playSfx(this, 'sfx-kill', { rate: Phaser.Math.FloatBetween(0.9, 1.2) });
    this.spawnKillQuip(x, y);

    const time = this.time.now;
    if (time - this.lastKillAt <= CHAIN.windowMs) {
      this.chainMultiplier = Math.min(CHAIN.maxMultiplier, this.chainMultiplier + 1);
    } else {
      this.chainMultiplier = 1;
    }
    this.lastKillAt = time;
    this.game.events.emit('chain-changed', this.chainMultiplier);
    this.addScore(Math.round(ENEMY.scoreValue * this.chainMultiplier * this.getScoreMultiplier()));

    if (Math.random() < POWERUP.dropChance) {
      const powerUp = this.powerUps.getFirstDead(true);
      if (powerUp) powerUp.spawn(x, y);
    }
  }

  findNearestActiveEnemy(x, y) {
    let nearest = null;
    let nearestDist = Infinity;
    this.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    });
    return nearest;
  }

  fireMissile() {
    if (this.gameOver) return;
    const target = this.findNearestActiveEnemy(this.player.x, this.player.y);
    if (!target) return;
    const missile = this.missiles.getFirstDead(true);
    if (!missile) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    missile.spawn(this.player.x, this.player.y, angle, target, MISSILE.speed);
    playSfx(this, 'sfx-missile', { rate: Phaser.Math.FloatBetween(0.95, 1.05) });
  }

  fireConvoyMissile() {
    if (this.gameOver) return;
    const target = this.findNearestActiveEnemy(this.convoy.x, this.convoy.y);
    if (!target) return;
    const missile = this.convoyMissiles.getFirstDead(true);
    if (!missile) return;
    const angle = Phaser.Math.Angle.Between(this.convoy.x, this.convoy.y, target.x, target.y);
    missile.spawn(
      this.convoy.x,
      this.convoy.y,
      angle,
      target,
      CONVOY_MISSILE.speed,
      CONVOY_MISSILE.turnRateDeg,
      CONVOY_MISSILE.lifespanMs
    );
    missile.setTint(CONVOY_MISSILE.tint);
    playSfx(this, 'sfx-missile', { rate: Phaser.Math.FloatBetween(0.95, 1.05) });
  }

  fireLaser() {
    if (this.gameOver) return;
    const laser = this.lasers.getFirstDead(true);
    if (!laser) return;
    const tier = LASER_LEVELS[this.laserLevel - 1];
    const angle = this.player.heading;
    const offset = 22;
    const lx = this.player.x + Math.cos(angle) * offset;
    const ly = this.player.y + Math.sin(angle) * offset;
    laser.fire(lx, ly, angle, tier.speed);
    playSfx(this, 'sfx-laser', { rate: Phaser.Math.FloatBetween(0.95, 1.1) });
  }

  spawnKillQuip(x, y) {
    const quip = Phaser.Utils.Array.GetRandom(KILL_QUIPS);
    const text = this.add
      .text(x, y, quip, { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  onPlayerCollectPowerUp(a, b) {
    const [player, powerUp] = a instanceof PowerUp ? [b, a] : [a, b];
    powerUp.deactivate();
    this.pickupEmitter.explode(10, player.x, player.y);
    playSfx(this, 'sfx-pickup', { rate: Phaser.Math.FloatBetween(0.95, 1.1) });
    this.levelUpWeapon();
  }

  levelUpWeapon() {
    if (this.weaponLevel < this.maxWeaponLevel - 1) {
      this.weaponLevel += 1;
      this.game.events.emit('weapon-level-changed', { level: this.weaponLevel + 1, max: this.maxWeaponLevel });
    } else {
      // Already maxed — never waste a pickup, convert it to score instead.
      this.addScore(POWERUP.maxLevelBonusScore);
    }
  }

  onEnemyBulletHitConvoy(a, b) {
    const [bullet, convoy] = a instanceof Convoy ? [b, a] : [a, b];
    bullet.deactivate();
    this.resolveConvoyDamageResult(convoy.damage(ENEMY.bulletDamage * this.getDamageMultiplier()));
  }

  onEnemyBulletHitPlayer(a, b) {
    const [bullet, player] = a instanceof Player ? [b, a] : [a, b];
    bullet.deactivate();
    this.resolvePlayerHitResult(player.hit());
  }

  onEnemyRamConvoy(a, b) {
    const [enemy, convoy] = a instanceof Convoy ? [b, a] : [a, b];
    enemy.deactivate();
    this.resolveConvoyDamageResult(convoy.damage(ENEMY.contactDamage * this.getDamageMultiplier()));
  }

  resolveConvoyDamageResult(result) {
    if (result === 'damaged') this.handleConvoyDamage();
    else if (result === 'blocked') this.handleConvoyShieldBlock();
  }

  handleConvoyShieldBlock() {
    this.shieldEmitter.explode(12, this.convoy.x, this.convoy.y);
    playSfx(this, 'sfx-shield', { rate: Phaser.Math.FloatBetween(0.95, 1.05) });
    this.game.events.emit('convoy-shield-changed', {
      charges: this.convoy.shieldCharges,
      max: this.convoy.maxShieldCharges,
    });
  }

  onEnemyRamPlayer(a, b) {
    const [enemy, player] = a instanceof Player ? [b, a] : [a, b];
    enemy.deactivate();
    this.resolvePlayerHitResult(player.hit());
  }

  resolvePlayerHitResult(result) {
    if (result === 'damaged') this.handlePlayerDamage();
    else if (result === 'blocked') this.handleShieldBlock();
  }

  handleShieldBlock() {
    this.shieldEmitter.explode(12, this.player.x, this.player.y);
    playSfx(this, 'sfx-shield', { rate: Phaser.Math.FloatBetween(0.95, 1.05) });
    this.game.events.emit('shield-changed', {
      charges: this.player.shieldCharges,
      max: this.player.maxShieldCharges,
    });
  }

  // Passive regen from Repair Droids — quiet by design (a small particle
  // puff, no repeated SFX ping every few seconds over a multi-minute run).
  repairPlayerShield() {
    if (this.gameOver || this.player.shieldCharges >= this.player.maxShieldCharges) return;
    this.player.shieldCharges = Math.min(
      this.player.maxShieldCharges,
      this.player.shieldCharges + this.playerDroidCount * REPAIR_DROID.playerChargePerDroid
    );
    this.shieldEmitter.explode(4, this.player.x, this.player.y);
    this.game.events.emit('shield-changed', {
      charges: this.player.shieldCharges,
      max: this.player.maxShieldCharges,
    });
  }

  repairConvoyHull() {
    if (this.gameOver || this.convoy.hp >= this.convoy.maxHp) return;
    this.convoy.heal(this.convoyDroidCount * REPAIR_DROID.convoyHealPerDroid);
    this.shieldEmitter.explode(4, this.convoy.x, this.convoy.y);
    this.reportConvoyHp();
  }

  stopAllTimers() {
    this.spawnTimer.remove(false);
    if (this.missileTimer) this.missileTimer.remove(false);
    if (this.laserTimer) this.laserTimer.remove(false);
    if (this.convoyWeaponTimer) this.convoyWeaponTimer.remove(false);
    if (this.difficultyTimer) this.difficultyTimer.remove(false);
    if (this.playerRepairTimer) this.playerRepairTimer.remove(false);
    if (this.convoyRepairTimer) this.convoyRepairTimer.remove(false);
    if (this.levelTimer) this.levelTimer.remove(false);
    if (this.levelTimeTicker) this.levelTimeTicker.remove(false);
  }

  // Shared "run just ended" reward logic — same dodge-bonus/currency award for
  // a loss (triggerGameOver) and a win (triggerLevelComplete).
  finalizeRun() {
    const dodgeBonus = this.player.dodgeCharges * DODGE.bonusPerUnused;
    if (dodgeBonus > 0) {
      this.score += dodgeBonus;
      this.game.events.emit('score-changed', this.score);
    }

    const save = loadSave();
    const earnedCurrency = Math.floor(this.score / CURRENCY.scoreToCurrencyDivisor);
    save.currency += earnedCurrency;
    writeSave(save);

    return { dodgeBonus, earnedCurrency, totalCurrency: save.currency };
  }

  triggerGameOver(reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.stopAllTimers();
    this.physics.pause();

    const { dodgeBonus, earnedCurrency, totalCurrency } = this.finalizeRun();

    playSfx(this, 'sfx-gameover');
    this.game.events.emit('game-over', {
      score: this.score,
      reason,
      dodgeBonus,
      earnedCurrency,
      totalCurrency,
      sceneKey: this.scene.key,
    });
  }

  triggerLevelComplete() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.stopAllTimers();
    this.physics.pause();

    const { dodgeBonus, earnedCurrency, totalCurrency } = this.finalizeRun();

    // Unlock whatever comes next in LEVELS (even if it's not playable yet —
    // see LEVELS' `implemented` flag — so the unlock is already in place the
    // moment that level ships, with no extra wiring needed then).
    const currentIndex = LEVELS.findIndex((level) => level.key === this.levelKey);
    const nextLevel = currentIndex >= 0 ? LEVELS[currentIndex + 1] : null;
    if (nextLevel) {
      const save = loadSave();
      if (!save.levels.unlocked.includes(nextLevel.key)) {
        save.levels.unlocked.push(nextLevel.key);
        writeSave(save);
      }
    }

    playSfx(this, 'sfx-pickup');
    this.game.events.emit('level-complete', {
      score: this.score,
      levelKey: this.levelKey,
      dodgeBonus,
      earnedCurrency,
      totalCurrency,
      nextLevelLabel: nextLevel ? nextLevel.label : null,
      sceneKey: this.scene.key,
    });
  }

  fireBullet(time) {
    const { count, spreadDeg } = WEAPON_LEVELS[this.weaponLevel];
    const spreadRad = Phaser.Math.DegToRad(spreadDeg);
    const offset = 20;

    for (let i = 0; i < count; i++) {
      const bullet = this.playerBullets.getFirstDead(true);
      if (!bullet) break;
      const angle = this.player.heading + (i - (count - 1) / 2) * spreadRad;
      const bx = this.player.x + Math.cos(angle) * offset;
      const by = this.player.y + Math.sin(angle) * offset;
      bullet.fire(bx, by, angle, PLAYER.bulletSpeed);
    }
    this.player.fire(time);
    playSfx(this, 'sfx-fire', { rate: Phaser.Math.FloatBetween(0.95, 1.1), volume: 0.35 });
  }

  update(time) {
    if (this.gameOver) return;

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.player.update({ targetX: worldPoint.x, targetY: worldPoint.y });
    this.convoy.update();

    this.shieldRing.setPosition(this.player.x, this.player.y);
    this.shieldRing.setVisible(this.player.shieldCharges > 0);

    this.convoyShieldRing.setPosition(this.convoy.x, this.convoy.y);
    this.convoyShieldRing.setVisible(this.convoy.shieldCharges > 0);

    const wantsToFire = pointer.isDown || this.spaceKey.isDown;
    const { cooldownMs } = WEAPON_LEVELS[this.weaponLevel];
    if (wantsToFire && this.player.canFire(time, cooldownMs)) {
      this.fireBullet(time);
    }

    if (Phaser.Input.Keyboard.JustDown(this.dodgeKey) && this.player.tryDodge(time)) {
      this.dodgeEmitter.explode(14, this.player.x, this.player.y);
      playSfx(this, 'sfx-dodge', { rate: Phaser.Math.FloatBetween(0.95, 1.05) });
      this.game.events.emit('dodge-charges-changed', {
        charges: this.player.dodgeCharges,
        max: this.player.maxDodgeCharges,
      });
    }
  }
}
