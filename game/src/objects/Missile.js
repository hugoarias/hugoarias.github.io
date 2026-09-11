import { WORLD_WIDTH, WORLD_HEIGHT, MISSILE } from '../config.js';

export default class Missile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'missile');
    this.target = null;
    this.speed = MISSILE.speed;
    this.turnRateDeg = MISSILE.turnRateDeg;
    this.lifespanMs = MISSILE.lifespanMs;
    this.spawnedAt = 0;
  }

  // turnRateDeg/lifespanMs default to the player's MISSILE tuning but can be
  // overridden per spawn — the convoy's turret fires the same pooled class
  // with its own CONVOY_MISSILE tuning instead.
  spawn(x, y, rotation, target, speed, turnRateDeg = MISSILE.turnRateDeg, lifespanMs = MISSILE.lifespanMs) {
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.setPosition(x, y);
    this.setRotation(rotation);
    this.target = target;
    this.speed = speed;
    this.turnRateDeg = turnRateDeg;
    this.lifespanMs = lifespanMs;
    this.spawnedAt = this.scene.time.now;
    this.scene.physics.velocityFromRotation(rotation, speed, this.body.velocity);
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.body.velocity.set(0, 0);
    this.target = null;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    if (this.target && this.target.active) {
      const turnStep = Phaser.Math.DegToRad(this.turnRateDeg) * (delta / 1000);
      const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetAngle, turnStep);
      this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);
    }

    const expired = time - this.spawnedAt > this.lifespanMs;
    const offWorld = this.x < -60 || this.x > WORLD_WIDTH + 60 || this.y < -60 || this.y > WORLD_HEIGHT + 60;
    if (expired || offWorld) this.deactivate();
  }
}
