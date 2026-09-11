import { PLAYER, DODGE } from '../config.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, skinKey = 'ship-xwing', headingOffsetDeg = 90) {
    super(scene, x, y, skinKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0);
    this.setScale(PLAYER.spriteScale);
    // Fixed hitbox regardless of skin/scale — cosmetic-only skins shouldn't
    // secretly change the size of the hitbox. Local (pre-scale) pixel size,
    // chosen so the scaled result lands close to the old ~20x14 footprint.
    this.body.setSize(56, 40, true);

    // The sprite art is drawn nose-up (angle -90° in this game's "0 = right"
    // convention), not nose-right like every other rotating object here. We
    // track the true movement heading separately from the displayed rotation
    // so gameplay (aiming, firing) stays exact while only the visible sprite
    // gets the extra +90° twist needed to make its nose match the heading.
    this.heading = 0;
    this.headingOffset = Phaser.Math.DegToRad(headingOffsetDeg);

    this.lives = PLAYER.startLives;
    this.invulnerableUntil = 0;
    this.lastFiredAt = 0;
    this.dodgeCharges = DODGE.charges;
    this.maxDodgeCharges = DODGE.charges;
    this.dashUntil = 0;
    this.shieldCharges = 0;
    this.maxShieldCharges = 0;
  }

  get isInvulnerable() {
    return this.scene.time.now < this.invulnerableUntil;
  }

  // Returns 'invulnerable' (hit ignored), 'blocked' (a shield charge absorbed
  // it), or 'damaged' (a life was lost) — callers decide what feedback to play.
  hit() {
    if (this.isInvulnerable) return 'invulnerable';
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.invulnerableUntil = this.scene.time.now + PLAYER.invulnMs;
      return 'blocked';
    }
    this.lives -= 1;
    this.invulnerableUntil = this.scene.time.now + PLAYER.invulnMs;
    return 'damaged';
  }

  tryDodge(time) {
    if (this.dodgeCharges <= 0) return false;
    this.dodgeCharges -= 1;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + DODGE.invulnMs);
    this.dashUntil = time + DODGE.dashDurationMs;
    return true;
  }

  update(input) {
    const maxStep = Phaser.Math.DegToRad(PLAYER.turnRateDeg) * (this.scene.game.loop.delta / 1000);
    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, input.targetX, input.targetY);
    this.heading = Phaser.Math.Angle.RotateTo(this.heading, targetAngle, maxStep);
    this.rotation = this.heading + this.headingOffset;

    const isDashing = this.scene.time.now < this.dashUntil;
    const speed = PLAYER.speed * (isDashing ? DODGE.dashSpeedMultiplier : 1);
    this.scene.physics.velocityFromRotation(this.heading, speed, this.body.velocity);

    // blink while invulnerable
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
