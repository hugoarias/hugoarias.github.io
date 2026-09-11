import { POWERUP } from '../config.js';

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'powerup');
    this.spawnedAt = 0;
  }

  spawn(x, y) {
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.setPosition(x, y);
    this.spawnedAt = this.scene.time.now;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.scene.physics.velocityFromRotation(angle, POWERUP.driftSpeed, this.body.velocity);
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.body.velocity.set(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    this.rotation += 0.002 * delta;

    const expired = time - this.spawnedAt > POWERUP.lifespanMs;
    // Read the current scene's actual physics world bounds — see Bullet.js's
    // identical fix for why this can't be a hardcoded Level 1 import.
    const bounds = this.scene.physics.world.bounds;
    const offWorld =
      this.x < bounds.x - 40 || this.x > bounds.right + 40 || this.y < bounds.y - 40 || this.y > bounds.bottom + 40;

    if (expired || offWorld) this.deactivate();
  }
}
