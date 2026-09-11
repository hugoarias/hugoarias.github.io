export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const PLAYER = {
  speed: 260,
  turnRateDeg: 220,
  bulletSpeed: 520,
  startLives: 3,
  invulnMs: 1500,
  spriteScale: 0.34,
};

export const WEAPON_LEVELS = [
  { count: 1, spreadDeg: 0, cooldownMs: 220 },
  { count: 2, spreadDeg: 10, cooldownMs: 200 },
  { count: 3, spreadDeg: 9, cooldownMs: 180 },
  { count: 4, spreadDeg: 7, cooldownMs: 160 },
];

export const POWERUP = {
  dropChance: 0.25,
  driftSpeed: 40,
  lifespanMs: 9000,
  maxAlive: 10,
  maxLevelBonusScore: 250,
};

export const DODGE = {
  charges: 3,
  invulnMs: 350,
  dashSpeedMultiplier: 2.2,
  dashDurationMs: 220,
  bonusPerUnused: 300,
};

export const CONVOY = {
  maxHp: 100,
  spriteScale: 0.65,
};

// Level 2 (GroundGameScene) — a side-scrolling ground battle. Both tanks and
// the Walker enemy are locked to GROUND_Y (no vertical gameplay at all),
// which is what keeps this a straightforward 1D side-scroller.
export const GROUND_WORLD_WIDTH = 3200;
export const GROUND_WORLD_HEIGHT = GAME_HEIGHT;
export const GROUND_Y = 420;

export const PLAYER_TANK = {
  speed: 200,
  turretTurnRateDeg: 260,
  bulletSpeed: 480,
  startLives: 3,
  invulnMs: 1500,
  spriteScale: 0.6,
  maxWeaponLevel: WEAPON_LEVELS.length,
};

export const TANK_CONVOY = {
  maxHp: 100,
  spriteScale: 0.8,
};

export const WALKER = {
  speed: 90,
  bulletSpeed: 260,
  contactDamage: 20,
  bulletDamage: 10,
  fireCooldownMs: 1600,
  fireRange: 380,
  scoreValue: 100,
  spawnIntervalMs: 1500,
  maxAlive: 16,
  // Same nose-up convention as ENEMY (see makeWalkerTexture's comment) — this
  // is what lets Enemy.js's rotation math be reused unchanged for the Walker.
  headingOffsetDeg: 90,
  textureKeys: ['walker-1'],
};

export const ENEMY = {
  speed: 130,
  contactDamage: 20,
  bulletDamage: 10,
  fireCooldownMs: 1600,
  fireRange: 420,
  scoreValue: 100,
  spawnIntervalMs: 1400,
  maxAlive: 20,
  headingOffsetDeg: 90,
  textureKeys: ['tie-fighter', 'tie-bomber'],
};

export const ENEMY_BULLET_SPEED = 300;

export const EXTEND = {
  scoreInterval: 2000,
  healAmount: 20,
};

export const HITBOX = {
  bullet: { w: 10, h: 6 },
  enemy: { w: 18, h: 18 },
};

export const CHAIN = {
  windowMs: 2500,
  maxMultiplier: 5,
};

export const MISSILE = {
  speed: 340,
  turnRateDeg: 360,
  lifespanMs: 4000,
  maxAlive: 6,
};

// Index 0 = the weapon's first owned tier (upgrade level 1), since level 0
// means "not purchased" for these unlock-style weapons.
export const MISSILE_LEVELS = [{ cooldownMs: 5000 }, { cooldownMs: 4000 }, { cooldownMs: 3200 }];

export const LASER = {
  maxAlive: 4,
};

export const LASER_LEVELS = [
  { cooldownMs: 3000, speed: 700 },
  { cooldownMs: 2400, speed: 750 },
  { cooldownMs: 1900, speed: 800 },
];

export const CONVOY_MISSILE = {
  speed: 320,
  turnRateDeg: 360,
  lifespanMs: 4000,
  maxAlive: 6,
  tint: 0x3bff6e,
};

export const CONVOY_WEAPON_LEVELS = [{ cooldownMs: 2200 }, { cooldownMs: 1700 }, { cooldownMs: 1300 }];

export const DIFFICULTY = {
  rampIntervalMs: 25000,
  maxTier: 8,
  speedPerTier: 0.08,
  fireRatePerTier: 0.07,
  spawnRatePerTier: 0.06,
  damagePerTier: 0.06,
  scorePerTier: 0.08,
  minRateMultiplier: 0.4,
};

export const CURRENCY = {
  scoreToCurrencyDivisor: 10,
};

export const REPAIR_DROID = {
  playerIntervalMs: 10000,
  playerChargePerDroid: 1,
  convoyIntervalMs: 3000,
  convoyHealPerDroid: 5,
};

export const HANGAR_CATEGORIES = [
  { key: 'ship', label: 'SHIP' },
  { key: 'convoy', label: 'CONVOY' },
];

// `implemented: false` levels are permanently locked in LevelSelectScene
// regardless of save data — there's no playable content behind them yet.
export const LEVELS = [
  {
    key: 'level-1',
    label: 'LEVEL 1',
    description: 'Deep Space Escort',
    durationMs: 120000,
    implemented: true,
    sceneKey: 'GameScene',
    // Purely decorative — see BootScene.makePlanetTexture(). Placed away from
    // the convoy's mid-height flight line and the player's spawn corner.
    backdrop: { textureKey: 'planet-1', x: 1900, y: 360 },
  },
  {
    key: 'level-2',
    label: 'LEVEL 2',
    description: 'Ground Assault',
    durationMs: 120000,
    implemented: true,
    sceneKey: 'GroundGameScene',
  },
];

// Per-ship-type loadout: each of the 3 ship skins tracks its own separate
// levels for these (src/save.js's `shipUpgrades[shipKey]`), purchased from
// ShipLoadoutScene rather than a flat Hangar tab — picking a ship is a real
// equipment choice, not just a cosmetic one. `droids`' effective max is
// overridden per-ship by that skin's `droidCapacity` below, not this maxLevel.
export const SHIP_UPGRADES = {
  startWeaponLevel: {
    label: 'Starting Weapon Level',
    amountPerLevel: 1,
    baseCost: 300,
    maxLevel: WEAPON_LEVELS.length - 1,
  },
  missile: {
    label: 'Missile Launcher',
    amountPerLevel: 1,
    baseCost: 400,
    maxLevel: MISSILE_LEVELS.length,
  },
  laser: {
    label: 'Laser Beam',
    amountPerLevel: 1,
    baseCost: 500,
    maxLevel: LASER_LEVELS.length,
  },
  lives: {
    label: 'Starting Lives',
    amountPerLevel: 1,
    baseCost: 150,
    maxLevel: 2,
  },
  dodge: {
    label: 'Starting Dodge Charges',
    amountPerLevel: 1,
    baseCost: 100,
    maxLevel: 5,
  },
  shield: {
    label: 'Shield Charges',
    amountPerLevel: 1,
    baseCost: 250,
    maxLevel: 3,
  },
  droids: {
    label: 'Repair Droid',
    amountPerLevel: 1,
    baseCost: 300,
    maxLevel: 1,
  },
};

// Global (not per-ship) — the convoy has only one loadout regardless of which
// convoy skin is equipped.
export const UPGRADES = {
  convoyHp: {
    category: 'convoy',
    label: 'Convoy Max HP',
    amountPerLevel: 10,
    baseCost: 50,
    maxLevel: 5,
  },
  convoyWeapon: {
    category: 'convoy',
    label: 'Convoy Defense Turret',
    amountPerLevel: 1,
    baseCost: 350,
    maxLevel: CONVOY_WEAPON_LEVELS.length,
  },
  convoyShield: {
    category: 'convoy',
    label: 'Convoy Shield',
    amountPerLevel: 1,
    baseCost: 300,
    maxLevel: 3,
  },
  convoyDroids: {
    category: 'convoy',
    label: 'Repair Droids',
    amountPerLevel: 1,
    baseCost: 200,
    maxLevel: 2,
  },
};

// headingOffsetDeg: the sprite's own nose direction (as drawn) relative to
// "pointing right" (angle 0, the convention every other rotating object in
// this game uses). These sprites are drawn nose-up, so their nose sits at
// -90° when unrotated — rotating them by +90° on top of the movement heading
// brings the nose in line with the direction of travel.
// droidCapacity: how many purchased Repair Droids this ship type can actually
// use at once — the one place equipped skin affects gameplay, not just looks.
// maxWeaponLevel: the highest basic-weapon level (1-indexed, matching
// WEAPON_LEVELS) this ship can ever reach, whether from the persistent
// "Starting Weapon Level" purchase (ShipLoadoutScene) or in-run pickups
// (GameScene.levelUpWeapon) — the X-Wing's 4 wingtip cannons make it the one
// ship that can reach every WEAPON_LEVELS tier; A-Wing/Y-Wing cap lower.
export const SKINS = [
  {
    key: 'ship-awing',
    label: 'A-Wing',
    sprite: 'assets/ships/awing.png',
    headingOffsetDeg: 90,
    cost: 0,
    droidCapacity: 0,
    maxWeaponLevel: 2,
  },
  {
    key: 'ship-ywing',
    label: 'Y-Wing',
    sprite: 'assets/ships/ywing.png',
    headingOffsetDeg: 90,
    cost: 300,
    droidCapacity: 1,
    maxWeaponLevel: 2,
  },
  {
    key: 'ship-xwing',
    label: 'X-Wing',
    sprite: 'assets/ships/xwing.png',
    headingOffsetDeg: 90,
    cost: 550,
    droidCapacity: 1,
    maxWeaponLevel: WEAPON_LEVELS.length,
  },
];

// Only one convoy unit exists — headingOffsetDeg verified empirically in a
// live run (front should lead the direction of travel), same as every other
// reskinned unit from this asset source.
export const CONVOY_SKINS = [
  { key: 'convoy-hauler', label: 'Hauler', sprite: 'assets/convoy/hauler.png', headingOffsetDeg: 90, cost: 0 },
];
