import { GAME_WIDTH, GAME_HEIGHT, UPGRADES, SKINS, CONVOY_SKINS, HANGAR_CATEGORIES } from '../config.js';
import { loadSave, writeSave } from '../save.js';

const ROW_SPACING = 30;
const CONTENT_TOP = 170;
const TAB_SPACING = 150;
const SKIN_SLOT_SPACING = 150;

// Which Hangar tabs also show a skin picker below their upgrade rows, and what
// each one is driven by — generic enough that adding a third skin-picker tab
// later would just mean adding an entry here. `opensLoadout` is what makes the
// Ship picker different: selecting a ship there is a real equipment choice
// (weapons/droids/etc. are tracked per-ship), so it drills into
// ShipLoadoutScene instead of just selecting in place like the Convoy picker.
const SKIN_PICKERS = {
  ship: { skinsList: SKINS, saveProp: 'skins', label: 'SHIP SKINS', opensLoadout: true },
  convoy: { skinsList: CONVOY_SKINS, saveProp: 'convoySkins', label: 'CONVOY SKINS', opensLoadout: false },
};

export default class HangarScene extends Phaser.Scene {
  constructor() {
    super('HangarScene');
  }

  init(data) {
    this.initialCategory = data?.category || HANGAR_CATEGORIES[0].key;
  }

  create() {
    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 34, 'HANGAR', { fontFamily: 'monospace', fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5);

    this.currencyText = this.add
      .text(centerX, 66, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffd166' })
      .setOrigin(0.5);

    this.tabTexts = {};
    const tabStartX = centerX - ((HANGAR_CATEGORIES.length - 1) * TAB_SPACING) / 2;
    HANGAR_CATEGORIES.forEach((cat, i) => {
      const x = tabStartX + i * TAB_SPACING;
      const text = this.add
        .text(x, 108, cat.label, { fontFamily: 'monospace', fontSize: '17px', color: '#66ffe0' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.setCategory(cat.key));
      this.tabTexts[cat.key] = text;
    });

    this.contentObjects = [];

    const backText = this.add
      .text(centerX, GAME_HEIGHT - 32, '◀ Back to Menu (Esc)', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9fd8ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backText.on('pointerdown', () => this.goBack());
    this.input.keyboard.on('keydown-ESC', () => this.goBack());

    this.setCategory(this.initialCategory);
  }

  setCategory(key) {
    this.activeCategory = key;
    Object.entries(this.tabTexts).forEach(([catKey, text]) => {
      const active = catKey === key;
      text.setColor(active ? '#ffffff' : '#66ffe0');
      text.setFontStyle(active ? 'bold' : 'normal');
    });
    this.renderContent();
  }

  renderContent() {
    this.contentObjects.forEach((obj) => obj.destroy());
    this.contentObjects = [];

    const save = loadSave();
    this.currencyText.setText(`Currency: ${save.currency}`);

    const upgradeEntries = Object.entries(UPGRADES).filter(([, def]) => def.category === this.activeCategory);

    let y = CONTENT_TOP;
    upgradeEntries.forEach(([key, def]) => {
      const text = this.add
        .text(GAME_WIDTH / 2, y, '', { fontFamily: 'monospace', fontSize: '17px', color: '#66ffe0' })
        .setOrigin(0.5);
      this.styleUpgradeRow(text, key, def, save);
      text.on('pointerdown', () => this.purchaseUpgrade(key));
      this.contentObjects.push(text);
      y += ROW_SPACING;
    });

    const skinPicker = SKIN_PICKERS[this.activeCategory];

    if (upgradeEntries.length === 0 && !skinPicker) {
      const empty = this.add
        .text(GAME_WIDTH / 2, y, 'Nothing here yet.', {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#7a7f9a',
        })
        .setOrigin(0.5);
      this.contentObjects.push(empty);
      y += ROW_SPACING;
    }

    if (skinPicker) {
      // No upgrade rows preceded this on the Ship tab (those moved into
      // ShipLoadoutScene) — start the picker right under the tabs instead of
      // leaving a big gap where the rows used to be.
      const pickerTop = upgradeEntries.length === 0 ? CONTENT_TOP : y + 24;
      this.renderSkinPicker(save, pickerTop, skinPicker);
    }
  }

  styleUpgradeRow(text, key, def, save) {
    const level = save.upgrades[key];
    if (level >= def.maxLevel) {
      text.setText(`${def.label}: MAX`);
      text.setColor('#888888');
      text.disableInteractive();
    } else {
      const cost = def.baseCost * (level + 1);
      const affordable = save.currency >= cost;
      text.setText(`▲ ${def.label} Lv.${level}/${def.maxLevel} — ${cost}g`);
      text.setColor(affordable ? '#66ffe0' : '#555577');
      text.setInteractive({ useHandCursor: true });
    }
  }

  renderSkinPicker(save, topY, { skinsList, saveProp, label, opensLoadout }) {
    const labelText = this.add
      .text(GAME_WIDTH / 2, topY, label, { fontFamily: 'monospace', fontSize: '14px', color: '#c7c9ff' })
      .setOrigin(0.5);
    this.contentObjects.push(labelText);

    const swatchY = topY + 62;
    const startX = GAME_WIDTH / 2 - ((skinsList.length - 1) * SKIN_SLOT_SPACING) / 2;
    const skinsSave = save[saveProp];

    skinsList.forEach((skin, i) => {
      const x = startX + i * SKIN_SLOT_SPACING;
      const owned = skinsSave.owned.includes(skin.key);
      const selected = skinsSave.selected === skin.key;

      const highlight = this.add
        .rectangle(x, swatchY, 120, 96, 0xffffff, 0.05)
        .setStrokeStyle(2, 0x66ffe0, selected ? 1 : 0);
      const icon = this.add.sprite(x, swatchY - 16, skin.key).setScale(0.65);
      const nameText = this.add
        .text(x, swatchY + 14, skin.label, { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' })
        .setOrigin(0.5);

      const stateLabel = selected ? 'SELECTED' : owned ? 'OWNED' : `${skin.cost}g`;
      const stateColor = selected ? '#66ffe0' : owned ? '#9fd8ff' : save.currency >= skin.cost ? '#ffd166' : '#555577';
      const stateText = this.add
        .text(x, swatchY + 30, stateLabel, { fontFamily: 'monospace', fontSize: '11px', color: stateColor })
        .setOrigin(0.5);

      const hitZone = this.add
        .rectangle(x, swatchY, 128, 104, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.selectOrBuySkin(skinsList, saveProp, skin.key, opensLoadout));

      this.contentObjects.push(highlight, icon, nameText, stateText, hitZone);
    });
  }

  purchaseUpgrade(key) {
    const save = loadSave();
    const def = UPGRADES[key];
    const level = save.upgrades[key];
    if (level >= def.maxLevel) return;
    const cost = def.baseCost * (level + 1);
    if (save.currency < cost) return;

    save.currency -= cost;
    save.upgrades[key] += 1;
    writeSave(save);
    this.renderContent();
  }

  selectOrBuySkin(skinsList, saveProp, key, opensLoadout) {
    const save = loadSave();
    const skin = skinsList.find((s) => s.key === key);
    const bag = save[saveProp];
    const owned = bag.owned.includes(key);

    if (!owned) {
      if (save.currency < skin.cost) return;
      save.currency -= skin.cost;
      bag.owned.push(key);
    }

    bag.selected = key;
    writeSave(save);

    if (opensLoadout) {
      this.scene.start('ShipLoadoutScene', { shipKey: key });
      return;
    }
    this.renderContent();
  }

  goBack() {
    this.scene.stop('HangarScene');
    this.scene.start('MenuScene');
  }
}
