import {
  GROUND_WORLD_WIDTH,
  GROUND_WORLD_HEIGHT,
  GROUND_Y,
  PLAYER_TANK,
  TANK_CONVOY,
  WALKER,
  WEAPON_LEVELS,
  POWERUP,
  DODGE,
  CHAIN,
  CURRENCY,
  EXTEND,
  HITBOX,
  DIFFICULTY,
  LEVELS,
} from '../config.js';
import PlayerTank from '../objects/PlayerTank.js';
import Convoy from '../objects/Convoy.js';
import Enemy from '../objects/Enemy.js';
import Bullet from '../objects/Bullet.js';
import PowerUp from '../objects/PowerUp.js';
import { playSfx } from '../sfx.js';
import { loadSave, writeSave } from '../save.js';

const MARGIN = 200;

const KILL_QUIPS = ['BONK!', 'SCRAPPED!', 'SCRAP METAL!', 'YEETED!', 'POOF!', 'ZAPPED!'];

// Level 2 — a side-scrolling ground battle. Structurally modeled on
// GameScene.js (spawn timer, difficulty ramp, chain/score/currency,
// stopAllTimers/finalizeRun/triggerGameOver/triggerLevelComplete, the same
// HUD event emissions) but with a ground-locked PlayerTank instead of a
// free-flying Player, a single Walker enemy instead of TIE Fighter/Bomber,
// and no missile/laser/repair-droid systems (see the project plan notes for
// why this scope was kept deliberately small for a first pass).
export default class GroundGameScene extends Phaser.Scene {
  constructor() {
    super('GroundGameScene');
  }

  init(data) {
    this.levelKey = data?.levelKey || 'level-2';
  }

  create() {
    this.levelConfig =
      LEVELS.find((level) => level.key === this.levelKey) ||
      LEVELS.find((level) => level.sceneKey === 'GroundGameScene');
    this.gameOver = false;
    this.score = 0;
    this.nextExtendScore = EXTEND.scoreInterval;
    this.chainMultiplier = 1;
    this.lastKillAt = -Infinity;
    this.difficultyTier = 0;
    this.enemySpeedMultiplier = 1;
    this.enemyFireRateMultiplier = 1;

    this.physics.world.setBounds(0, 0, GROUND_WORLD_WIDTH, GROUND_WORLD_HEIGHT);

    // Simple two-band dusk sky (no texture needed) + a tiled ground strip.
    this.add.rectangle(0, 0, GROUND_WORLD_WIDTH, GROUND_Y * 0.55, 0x1c2340).setOrigin(0, 0).setDepth(-10);
    this.add
      .rectangle(0, GROUND_Y * 0.55, GROUND_WORLD_WIDTH, GROUND_Y * 0.45, 0x5c4552)
      .setOrigin(0, 0)
      .setDepth(-10);
    this.add
      .tileSprite(0, GROUND_Y, GROUND_WORLD_WIDTH, 140, 'ground-strip')
      .setOrigin(0, 0)
      .setDepth(-6);

    // A straight left-to-right crossing, timed to take the whole level
    // duration — same approach as Level 1's convoy fix (speed derived from
    // distance/durationMs so it's still moving right up until the timer
    // completes it).
    const tankPath = [
      { x: MARGIN, y: GROUND_Y },
      { x: GROUND_WORLD_WIDTH - MARGIN, y: GROUND_Y },
    ];
    const crossingDistance = Phaser.Math.Distance.Between(
      tankPath[0].x,
      tankPath[0].y,
      tankPath[tankPath.length - 1].x,
      tankPath[tankPath.length - 1].y
    );
    const convoySpeed = crossingDistance / (this.levelConfig.durationMs / 1000);
    // Tank art is drawn already facing right (headingOffsetDeg 0), unlike the
    // nose-up ship art Level 1's Convoy uses.
    this.convoy = new Convoy(this, tankPath, 'tank-convoy', 0, convoySpeed, TANK_CONVOY.spriteScale);
    this.convoy.maxHp = TANK_CONVOY.maxHp;
    this.convoy.hp = this.convoy.maxHp;

    this.playerTank = new PlayerTank(this, tankPath[0].x + 100, GROUND_Y, 'tank-player');
    this.weaponLevel = 0;
    this.maxWeaponLevel = PLAYER_TANK.maxWeaponLevel;

    // The turret rotates independently to aim — see PlayerTank.js's header
    // comment and BootScene.makePlayerTurretTexture().
    this.turretSprite = this.add
      .image(this.playerTank.x, this.playerTank.y, 'tank-turret')
      .setOrigin(0.28, 0.5)
      .setScale(PLAYER_TANK.spriteScale)
      .setDepth(1);

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
      defaultKey: WALKER.textureKeys[0],
      maxSize: WALKER.maxAlive,
      runChildUpdate: true,
    });

    this.powerUps = this.physics.add.group({
      classType: PowerUp,
      defaultKey: 'powerup',
      maxSize: POWERUP.maxAlive,
      runChildUpdate: true,
    });

    this.prewarmGroup(this.playerBullets, HITBOX.bullet.w, HITBOX.bullet.h, 0x3bff6e);
    this.prewarmGroup(this.enemyBullets, HITBOX.bullet.w, HITBOX.bullet.h, 0xff2d2d);
    this.prewarmGroup(this.enemies, HITBOX.enemy.w, HITBOX.enemy.h);
    this.prewarmGroup(this.powerUps);

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

    this.physics.add.overlap(this.playerBullets, this.enemies, this.onPlayerBulletHitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.convoy, this.onEnemyBulletHitConvoy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.playerTank, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.enemies, this.convoy, this.onEnemyRamConvoy, null, this);
    this.physics.add.overlap(this.enemies, this.playerTank, this.onEnemyRamPlayer, null, this);
    this.physics.add.overlap(this.playerTank, this.powerUps, this.onPlayerCollectPowerUp, null, this);

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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dodgeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.cameras.main.setBounds(0, 0, GROUND_WORLD_WIDTH, GROUND_WORLD_HEIGHT);
    this.cameras.main.startFollow(this.playerTank, true, 0.08, 0.08);

    this.game.events.emit('score-changed', this.score);
    this.game.events.emit('lives-changed', this.playerTank.lives);
    this.game.events.emit('convoy-hp-changed', { hp: this.convoy.hp, maxHp: this.convoy.maxHp });
    this.game.events.emit('weapon-level-changed', { level: this.weaponLevel + 1, max: this.maxWeaponLevel });
    this.game.events.emit('dodge-charges-changed', {
      charges: this.playerTank.dodgeCharges,
      max: this.playerTank.maxDodgeCharges,
    });
    this.game.events.emit('chain-changed', this.chainMultiplier);
    // No shield/repair-droid systems this level — these stay blank on the HUD.
    this.game.events.emit('shield-changed', { charges: 0, max: 0 });
    this.game.events.emit('convoy-shield-changed', { charges: 0, max: 0 });
    this.game.events.emit('difficulty-changed', this.difficultyTier + 1);
    this.game.events.emit('player-droids-changed', 0);
    this.game.events.emit('convoy-droids-changed', 0);
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

  scheduleNextSpawn() {
    const delay = WALKER.spawnIntervalMs * this.getSpawnRateMultiplier();
    this.spawnTimer = this.time.delayedCall(delay, () => {
      this.spawnWalker();
      this.scheduleNextSpawn();
    });
  }

  spawnWalker() {
    if (this.gameOver || this.convoy.isDestroyed) return;
    const walker = this.enemies.getFirstDead(true);
    if (!walker) return;
    walker.bulletGroup = this.enemyBullets;
    walker.bulletSpeed = WALKER.bulletSpeed;
    const frontX = Math.max(this.playerTank.x, this.convoy.x);
    const x = Phaser.Math.Clamp(
      frontX + Phaser.Math.Between(420, 700),
      0,
      GROUND_WORLD_WIDTH - 40
    );
    walker.spawn(x, GROUND_Y, this.convoy, {
      textureKeys: WALKER.textureKeys,
      speed: WALKER.speed,
      headingOffsetDeg: WALKER.headingOffsetDeg,
      fireCooldownMs: WALKER.fireCooldownMs,
      fireRange: WALKER.fireRange,
      worldWidth: GROUND_WORLD_WIDTH,
      worldHeight: GROUND_WORLD_HEIGHT,
    });
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

  reportConvoyHp() {
    this.game.events.emit('convoy-hp-changed', { hp: this.convoy.hp, maxHp: this.convoy.maxHp });
    if (this.convoy.isDestroyed) this.triggerGameOver('convoy');
  }

  reportPlayerHit() {
    this.game.events.emit('lives-changed', this.playerTank.lives);
    if (this.playerTank.lives <= 0) this.triggerGameOver('player');
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
    if (this.playerTank.lives <= 0) {
      this.cameras.main.shake(160, 0.012);
      this.deathEmitter.explode(30, this.playerTank.x, this.playerTank.y);
      this.tweens.add({ targets: this.playerTank, scale: 1.6, alpha: 0, duration: 300, ease: 'Cubic.easeOut' });
    } else {
      this.cameras.main.shake(60, 0.004);
      this.damageEmitter.explode(10, this.playerTank.x, this.playerTank.y);
    }
    playSfx(this, 'sfx-hit', { rate: Phaser.Math.FloatBetween(0.9, 1.1) });
    this.reportPlayerHit();
  }

  // Same "resolve which arg is which" caution as GameScene.js — Arcade
  // Physics doesn't reliably preserve (object1, object2) order for a lone
  // Sprite vs. a Group.
  onPlayerBulletHitEnemy(a, b) {
    const [bullet, enemy] = a instanceof Enemy ? [b, a] : [a, b];
    bullet.deactivate();
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
    this.addScore(Math.round(WALKER.scoreValue * this.chainMultiplier * this.getScoreMultiplier()));

    if (Math.random() < POWERUP.dropChance) {
      const powerUp = this.powerUps.getFirstDead(true);
      if (powerUp) powerUp.spawn(x, y);
    }
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
    const [playerTank, powerUp] = a instanceof PowerUp ? [b, a] : [a, b];
    powerUp.deactivate();
    this.pickupEmitter.explode(10, playerTank.x, playerTank.y);
    playSfx(this, 'sfx-pickup', { rate: Phaser.Math.FloatBetween(0.95, 1.1) });
    this.levelUpWeapon();
  }

  levelUpWeapon() {
    if (this.weaponLevel < this.maxWeaponLevel - 1) {
      this.weaponLevel += 1;
      this.game.events.emit('weapon-level-changed', { level: this.weaponLevel + 1, max: this.maxWeaponLevel });
    } else {
      this.addScore(POWERUP.maxLevelBonusScore);
    }
  }

  onEnemyBulletHitConvoy(a, b) {
    const [bullet, convoy] = a instanceof Convoy ? [b, a] : [a, b];
    bullet.deactivate();
    this.resolveConvoyDamageResult(convoy.damage(WALKER.bulletDamage * this.getDamageMultiplier()));
  }

  onEnemyBulletHitPlayer(a, b) {
    const [bullet, playerTank] = a instanceof PlayerTank ? [b, a] : [a, b];
    bullet.deactivate();
    this.resolvePlayerHitResult(playerTank.hit());
  }

  onEnemyRamConvoy(a, b) {
    const [enemy, convoy] = a instanceof Convoy ? [b, a] : [a, b];
    enemy.deactivate();
    this.resolveConvoyDamageResult(convoy.damage(WALKER.contactDamage * this.getDamageMultiplier()));
  }

  // No shield system this level — Convoy.damage() will only ever return
  // 'damaged' here (shieldCharges is permanently 0), but this stays result-
  // based rather than assuming that, in case a shield gets added later.
  resolveConvoyDamageResult(result) {
    if (result === 'damaged') this.handleConvoyDamage();
  }

  onEnemyRamPlayer(a, b) {
    const [enemy, playerTank] = a instanceof PlayerTank ? [b, a] : [a, b];
    enemy.deactivate();
    this.resolvePlayerHitResult(playerTank.hit());
  }

  resolvePlayerHitResult(result) {
    if (result === 'damaged') this.handlePlayerDamage();
  }

  stopAllTimers() {
    this.spawnTimer.remove(false);
    if (this.difficultyTimer) this.difficultyTimer.remove(false);
    if (this.levelTimer) this.levelTimer.remove(false);
    if (this.levelTimeTicker) this.levelTimeTicker.remove(false);
  }

  // Shared "run just ended" reward logic — same as GameScene.js's, for both a
  // loss (triggerGameOver) and a win (triggerLevelComplete).
  finalizeRun() {
    const dodgeBonus = this.playerTank.dodgeCharges * DODGE.bonusPerUnused;
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
    const offset = 26;

    for (let i = 0; i < count; i++) {
      const bullet = this.playerBullets.getFirstDead(true);
      if (!bullet) break;
      const angle = this.playerTank.heading + (i - (count - 1) / 2) * spreadRad;
      const bx = this.playerTank.x + Math.cos(angle) * offset;
      const by = this.playerTank.y + Math.sin(angle) * offset;
      bullet.fire(bx, by, angle, PLAYER_TANK.bulletSpeed);
    }
    this.playerTank.fire(time);
    playSfx(this, 'sfx-fire', { rate: Phaser.Math.FloatBetween(0.95, 1.1), volume: 0.35 });
  }

  update(time) {
    if (this.gameOver) return;

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const moveDir = (this.cursors.right.isDown || this.keyD.isDown ? 1 : 0) - (this.cursors.left.isDown || this.keyA.isDown ? 1 : 0);
    this.playerTank.update({ targetX: worldPoint.x, targetY: worldPoint.y, moveDir });
    this.convoy.update();

    this.turretSprite.setPosition(this.playerTank.x, this.playerTank.y);
    this.turretSprite.setRotation(this.playerTank.heading);

    const wantsToFire = pointer.isDown || this.spaceKey.isDown;
    const { cooldownMs } = WEAPON_LEVELS[this.weaponLevel];
    if (wantsToFire && this.playerTank.canFire(time, cooldownMs)) {
      this.fireBullet(time);
    }

    if (Phaser.Input.Keyboard.JustDown(this.dodgeKey) && this.playerTank.tryDodge(time)) {
      this.dodgeEmitter.explode(14, this.playerTank.x, this.playerTank.y);
      playSfx(this, 'sfx-dodge', { rate: Phaser.Math.FloatBetween(0.95, 1.05) });
      this.game.events.emit('dodge-charges-changed', {
        charges: this.playerTank.dodgeCharges,
        max: this.playerTank.maxDodgeCharges,
      });
    }
  }
}
