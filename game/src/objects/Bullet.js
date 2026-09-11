export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
  }

  fire(x, y, rotation, speed) {
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.setPosition(x, y);
    this.setRotation(rotation);
    this.scene.physics.velocityFromRotation(rotation, speed, this.body.velocity);
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
    // Read the current scene's actual physics world bounds rather than
    // hardcoding Level 1's — this class is reused as-is for Level 2's much
    // wider (and shorter) ground world.
    const bounds = this.scene.physics.world.bounds;
    if (this.x < bounds.x - 20 || this.x > bounds.right + 20 || this.y < bounds.y - 20 || this.y > bounds.bottom + 20) {
      this.deactivate();
    }
  }
}
