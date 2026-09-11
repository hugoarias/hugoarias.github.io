import { ENEMY, WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';

// Generic "spawn somewhere, walk/fly toward a target, fire when in range"
// actor — reused as-is for both Level 1's TIE Fighter/Bomber (the default
// config below) and Level 2's ground Walker (GroundGameScene passes a
// `config` override to spawn() with WALKER's tuning and the ground world's
// bounds). Movement is just "face the target and move that direction," which
// is why it works unmodified for a ground-locked enemy too — if the enemy
// and its target share the same y, that angle naturally resolves to level
// left/right movement.
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, ENEMY.textureKeys[0]);
    this.bulletGroup = null;
    this.target = null;
    this.nextFireAt = 0;
    this.textureKeys = ENEMY.textureKeys;
    this.moveSpeed = ENEMY.speed;
    this.headingOffsetDeg = ENEMY.headingOffsetDeg;
    this.fireCooldownBase = ENEMY.fireCooldownMs;
    this.fireRange = ENEMY.fireRange;
    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;
  }

  // `config` is optional — omit it (as GameScene.js always does) to keep the
  // default space-ENEMY tuning/bounds above.
  spawn(x, y, target, config) {
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.setPosition(x, y);
    if (config) {
      this.textureKeys = config.textureKeys;
      this.moveSpeed = config.speed;
      this.headingOffsetDeg = config.headingOffsetDeg;
      this.fireCooldownBase = config.fireCooldownMs;
      this.fireRange = config.fireRange;
      this.worldWidth = config.worldWidth;
      this.worldHeight = config.worldHeight;
    }
    this.setTexture(Phaser.Utils.Array.GetRandom(this.textureKeys));
    this.target = target;
    const fireCooldownMs = this.fireCooldownBase * (this.scene.enemyFireRateMultiplier || 1);
    this.nextFireAt = this.scene.time.now + Phaser.Math.Between(400, fireCooldownMs);
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.body.velocity.set(0, 0);
  }

  fireAt(time, targetX, targetY) {
    if (!this.bulletGroup) return;
    const bullet = this.bulletGroup.getFirstDead(false);
    if (!bullet) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    bullet.fire(this.x, this.y, angle, this.bulletSpeed || 300);
    this.nextFireAt = time + this.fireCooldownBase * (this.scene.enemyFireRateMultiplier || 1);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    if (this.x < -60 || this.x > this.worldWidth + 60 || this.y < -60 || this.y > this.worldHeight + 60) {
      this.deactivate();
      return;
    }

    if (!this.target || this.target.isDestroyed) {
      this.body.velocity.set(0, 0);
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.rotation = angle + Phaser.Math.DegToRad(this.headingOffsetDeg);
    const speed = this.moveSpeed * (this.scene.enemySpeedMultiplier || 1);
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (dist <= this.fireRange && time >= this.nextFireAt) {
      this.fireAt(time, this.target.x, this.target.y);
    }
  }
}
