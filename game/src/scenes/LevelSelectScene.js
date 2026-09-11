import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config.js';
import { loadSave } from '../save.js';

const TILE_SPACING = 180;
const TILE_Y = GAME_HEIGHT / 2 - 20;

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 60, 'SELECT LEVEL', { fontFamily: 'monospace', fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5);

    const save = loadSave();
    const unlocked = save.levels.unlocked;
    const startX = centerX - ((LEVELS.length - 1) * TILE_SPACING) / 2;

    LEVELS.forEach((level, i) => {
      const x = startX + i * TILE_SPACING;
      const playable = level.implemented && unlocked.includes(level.key);

      const tile = this.add
        .rectangle(x, TILE_Y, 150, 170, 0xffffff, 0.05)
        .setStrokeStyle(2, playable ? 0x66ffe0 : 0x3a3d55);

      this.add
        .text(x, TILE_Y - 55, level.label, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: playable ? '#ffffff' : '#555577',
        })
        .setOrigin(0.5);

      this.add
        .text(x, TILE_Y - 10, level.description, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: playable ? '#c7c9ff' : '#555577',
          wordWrap: { width: 130 },
          align: 'center',
        })
        .setOrigin(0.5);

      const stateLabel = playable ? '▶ PLAY' : level.implemented ? 'LOCKED' : 'COMING SOON';
      this.add
        .text(x, TILE_Y + 60, stateLabel, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: playable ? '#4cff88' : '#7a7f9a',
        })
        .setOrigin(0.5);

      if (playable) {
        tile.setInteractive({ useHandCursor: true });
        tile.on('pointerdown', () => this.startLevel(level));
      }
    });

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
  }

  startLevel(level) {
    this.scene.stop('LevelSelectScene');
    // UIScene must (re)start before the level's own scene — that scene's
    // create() ends by synchronously emitting the initial HUD state (score,
    // weapon level, etc.), and UIScene.create() is what clears any stale
    // listeners left over from a previous run before registering fresh ones.
    // Starting the gameplay scene first meant those events either had no
    // listener yet (HUD showed its hardcoded defaults instead of the real
    // starting state) or, on a second run, hit a stale listener still
    // pointing at the previous UIScene's already-destroyed Text objects and
    // crashed.
    this.scene.start('UIScene');
    this.scene.start(level.sceneKey, { levelKey: level.key });
  }

  goBack() {
    this.scene.stop('LevelSelectScene');
    this.scene.start('MenuScene');
  }
}
