import { GAME_WIDTH, GAME_HEIGHT, SKINS, SHIP_UPGRADES } from '../config.js';
import { loadSave, writeSave } from '../save.js';

const ROW_SPACING = 26;
const CONTENT_TOP = 172;

// Per-ship equipment screen — drilled into from the Hangar's Ship tab. Each
// ship skin tracks its own separate levels for these (save.shipUpgrades),
// so picking a ship is a real loadout choice, not just a cosmetic one.
export default class ShipLoadoutScene extends Phaser.Scene {
  constructor() {
    super('ShipLoadoutScene');
  }

  init(data) {
    this.shipKey = data?.shipKey || SKINS[0].key;
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const skin = SKINS.find((s) => s.key === this.shipKey) || SKINS[0];

    this.add.sprite(centerX, 58, skin.key).setScale(0.8);

    this.add
      .text(centerX, 104, `${skin.label} LOADOUT`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.currencyText = this.add
      .text(centerX, 132, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffd166' })
      .setOrigin(0.5);

    this.rowTexts = {};
    Object.keys(SHIP_UPGRADES).forEach((key, i) => {
      const y = CONTENT_TOP + i * ROW_SPACING;
      const text = this.add
        .text(centerX, y, '', { fontFamily: 'monospace', fontSize: '16px', color: '#66ffe0' })
        .setOrigin(0.5);
      // Interactivity is (re)established in refresh(), after setText() —
      // Phaser sizes the default hit area from the text's current bounds at
      // the moment setInteractive() is called, so it must run after content.
      text.on('pointerdown', () => this.purchase(key));
      this.rowTexts[key] = text;
    });

    const backText = this.add
      .text(centerX, GAME_HEIGHT - 32, '◀ Back to Hangar', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9fd8ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backText.on('pointerdown', () => this.goBack());
    this.input.keyboard.on('keydown-ESC', () => this.goBack());

    this.refresh();
  }

  // 'droids' and 'startWeaponLevel' have per-ship effective caps (droidCapacity,
  // maxWeaponLevel on the SKINS entry) instead of SHIP_UPGRADES' flat maxLevel —
  // every other upgrade uses that flat config maxLevel regardless of ship.
  effectiveMaxLevel(key, skin) {
    if (key === 'droids') return skin.droidCapacity || 0;
    if (key === 'startWeaponLevel') return Math.min(SHIP_UPGRADES.startWeaponLevel.maxLevel, skin.maxWeaponLevel - 1);
    return SHIP_UPGRADES[key].maxLevel;
  }

  refresh() {
    const save = loadSave();
    const skin = SKINS.find((s) => s.key === this.shipKey) || SKINS[0];
    const bag = save.shipUpgrades[this.shipKey];
    this.currencyText.setText(`Currency: ${save.currency}`);

    Object.entries(SHIP_UPGRADES).forEach(([key, def]) => {
      const level = bag[key];
      const maxLevel = this.effectiveMaxLevel(key, skin);
      const text = this.rowTexts[key];

      if (maxLevel <= 0) {
        text.setText(`${def.label}: N/A on this ship`);
        text.setColor('#555555');
        text.disableInteractive();
      } else if (level >= maxLevel) {
        text.setText(`${def.label}: MAX`);
        text.setColor('#888888');
        text.disableInteractive();
      } else {
        const cost = def.baseCost * (level + 1);
        const affordable = save.currency >= cost;
        text.setText(`▲ ${def.label} Lv.${level}/${maxLevel} — ${cost}g`);
        text.setColor(affordable ? '#66ffe0' : '#555577');
        text.setInteractive({ useHandCursor: true });
      }
    });
  }

  purchase(key) {
    const save = loadSave();
    const skin = SKINS.find((s) => s.key === this.shipKey) || SKINS[0];
    const def = SHIP_UPGRADES[key];
    const maxLevel = this.effectiveMaxLevel(key, skin);
    const bag = save.shipUpgrades[this.shipKey];
    const level = bag[key];
    if (level >= maxLevel) return;

    const cost = def.baseCost * (level + 1);
    if (save.currency < cost) return;

    save.currency -= cost;
    bag[key] += 1;
    writeSave(save);
    this.refresh();
  }

  goBack() {
    this.scene.stop('ShipLoadoutScene');
    this.scene.start('HangarScene', { category: 'ship' });
  }
}
