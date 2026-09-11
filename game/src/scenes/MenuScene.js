import { GAME_WIDTH } from '../config.js';
import { loadSave } from '../save.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 110, 'CONVOY ESCORT', { fontFamily: 'monospace', fontSize: '38px', color: '#ffffff' })
      .setOrigin(0.5);

    this.currencyText = this.add
      .text(centerX, 156, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffd166' })
      .setOrigin(0.5);

    const hangarText = this.add
      .text(centerX, 220, '🛠️ HANGAR', { fontFamily: 'monospace', fontSize: '26px', color: '#66ffe0' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    hangarText.on('pointerdown', () => this.openHangar());
    this.input.keyboard.on('keydown-S', () => this.openHangar());

    this.playText = this.add
      .text(centerX, 280, '▶ PLAY', { fontFamily: 'monospace', fontSize: '30px', color: '#4cff88' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.playText.on('pointerdown', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());

    this.add
      .text(centerX, 340, 'Aim: Mouse   Fire: Click / Space   Dodge: Shift', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#7a7f9a',
      })
      .setOrigin(0.5);

    this.refresh();
  }

  refresh() {
    const save = loadSave();
    this.currencyText.setText(`Currency: ${save.currency}`);
  }

  openHangar() {
    this.scene.start('HangarScene');
  }

  startGame() {
    this.scene.stop('MenuScene');
    this.scene.start('LevelSelectScene');
  }
}
