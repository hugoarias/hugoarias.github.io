import { CONVOY, WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';

export default class Convoy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, path, skinKey = 'convoy-hauler', headingOffsetDeg = -90, speed, spriteScale = CONVOY.spriteScale) {
    super(scene, path[0].x, path[0].y, skinKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(spriteScale);
    // Fixed hitbox regardless of skin/scale — cosmetic-only skins shouldn't
    // secretly change the size of the hitbox.
    this.body.setSize(66, 56, true);

    // Same heading/visual-rotation split as Player — this sprite art is drawn
    // nose-down, not nose-right, so the display needs an offset while the
    // true direction of travel (used for velocity) stays unaffected. (Level
    // 2's tank art is drawn already facing right, so it passes 0 here.)
    this.headingOffset = Phaser.Math.DegToRad(headingOffsetDeg);
    this.speed = speed;

    this.path = path;
    this.targetIndex = 1 % path.length;
    this.hp = CONVOY.maxHp;
    this.maxHp = CONVOY.maxHp;
    this.shieldCharges = 0;
    this.maxShieldCharges = 0;
  }

  get isDestroyed() {
    return this.hp <= 0;
  }

  // Returns 'blocked' (a shield charge absorbed the hit, HP untouched) or
  // 'damaged' (HP was reduced) — mirrors Player.hit()'s result pattern.
  damage(amount) {
    if (this.isDestroyed) return 'damaged';
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      return 'blocked';
    }
    this.hp = Math.max(0, this.hp - amount);
    return 'damaged';
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update() {
    if (this.isDestroyed) {
      this.body.velocity.set(0, 0);
      return;
    }

    const target = this.path[this.targetIndex];
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const atFinalWaypoint = this.targetIndex === this.path.length - 1;

    if (dist < 12) {
      if (atFinalWaypoint) {
        // Arrived at the end of the path — hold here instead of chasing the
        // same point back and forth (this used to wrap to path[0] and loop
        // forever; now it just stops).
        this.body.velocity.set(0, 0);
        return;
      }
      this.targetIndex += 1;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.rotation = angle + this.headingOffset;
    this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
  }
}
