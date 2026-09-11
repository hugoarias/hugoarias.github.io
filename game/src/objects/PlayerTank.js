import { PLAYER_TANK, DODGE } from '../config.js';

// Level 2's player-controlled vehicle. Modeled on Player.js (lives, invuln
// window, dodge charges, canFire/fire) but movement differs: this hull never
// rotates and only moves left/right (ground-locked, no heading-based flight).
// Aim direction is still tracked here (`heading`, turn-rate-limited exactly
// like Player.js) but is applied to a separate turret Image the owning scene
// manages — see BootScene.makePlayerTurretTexture()'s comment for why.
export default class PlayerTank extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey = 'tank-player') {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0);
    this.setScale(PLAYER_TANK.spriteScale);
    this.body.setSize(70, 30, true);

    this.heading = 0;
    this.facing = 1;

    this.lives = PLAYER_TANK.startLives;
    this.invulnerableUntil = 0;
    this.lastFiredAt = 0;
    this.dodgeCharges = DODGE.charges;
    this.maxDodgeCharges = DODGE.charges;
    this.dashUntil = 0;
  }

  get isInvulnerable() {
    return this.scene.time.now < this.invulnerableUntil;
  }

  // Same result convention as Player.hit() — this level has no shield
  // charges, so it's always 'invulnerable' or 'damaged'.
  hit() {
    if (this.isInvulnerable) return 'invulnerable';
    this.lives -= 1;
    this.invulnerableUntil = this.scene.time.now + PLAYER_TANK.invulnMs;
    return 'damaged';
  }

  tryDodge(time) {
    if (this.dodgeCharges <= 0) return false;
    this.dodgeCharges -= 1;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + DODGE.invulnMs);
    this.dashUntil = time + DODGE.dashDurationMs;
    return true;
  }

  // input: { targetX, targetY } (mouse world position, for turret aim) and
  // moveDir (-1/0/1 from left/right key state).
  update(input) {
    const maxStep = Phaser.Math.DegToRad(PLAYER_TANK.turretTurnRateDeg) * (this.scene.game.loop.delta / 1000);
    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, input.targetX, input.targetY);
    this.heading = Phaser.Math.Angle.RotateTo(this.heading, targetAngle, maxStep);

    if (input.moveDir !== 0) {
      this.facing = input.moveDir;
      this.setFlipX(this.facing < 0);
    }

    const isDashing = this.scene.time.now < this.dashUntil;
    const speedMultiplier = isDashing ? DODGE.dashSpeedMultiplier : 1;
    this.body.setVelocityX(input.moveDir * PLAYER_TANK.speed * speedMultiplier);
    this.body.setVelocityY(0);

    if (this.isInvulnerable) {
      this.setAlpha(Math.sin(this.scene.time.now / 60) > 0 ? 1 : 0.25);
    } else {
      this.setAlpha(1);
    }
  }

  canFire(time, cooldownMs) {
    return time - this.lastFiredAt >= cooldownMs;
  }

  fire(time) {
    this.lastFiredAt = time;
  }
}
