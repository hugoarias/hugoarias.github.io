import { GAME_WIDTH, GAME_HEIGHT, WEAPON_LEVELS, DODGE } from '../config.js';

const BAR_WIDTH = 240;
const BAR_HEIGHT = 18;

const CONVOY_LOST_FLAVOR = [
  'THE CONVOY REMEMBERS',
  'CARGO: NOT DELIVERED',
  'ESCORT MISSION: FAILED',
  "THAT'S GONNA BE AN INSURANCE CLAIM",
];
const PLAYER_LOST_FLAVOR = ['PILOT ERROR', 'YOU EXPLODED', 'SPACE IS HARD', 'RIP, SPACE FRIEND'];

// Cross-scene state (score, lives, etc.) is broadcast on the global `game.events`
// bus since GameScene and UIScene are separate scene instances. That bus outlives
// any single UIScene instance, so every event this scene listens for must be
// named here and cleared in create() — otherwise a restarted UIScene (Game Over
// → Main Menu → Play) piles up a second set of listeners still pointing at the
// previous instance's already-destroyed Text objects, which crashes the next
// time one of them fires (Text.setText on a destroyed object).
const GLOBAL_EVENTS = [
  'score-changed',
  'lives-changed',
  'chain-changed',
  'weapon-level-changed',
  'dodge-charges-changed',
  'shield-changed',
  'convoy-hp-changed',
  'convoy-shield-changed',
  'difficulty-changed',
  'player-droids-changed',
  'convoy-droids-changed',
  'game-over',
  'level-complete',
  'level-time-changed',
];

function formatClock(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.isGameOver = false;
    this.isLevelComplete = false;
    GLOBAL_EVENTS.forEach((eventName) => this.game.events.off(eventName));

    this.scoreText = this.add.text(16, 14, 'Score: 0', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
    });

    this.chainText = this.add.text(16, 38, 'Chain x1', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffb347',
    });

    this.livesText = this.add.text(16, 64, 'Lives: 3', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffd166',
    });

    this.weaponText = this.add.text(16, 90, `Weapon Lv. 1 / ${WEAPON_LEVELS.length}`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#66ffe0',
    });

    this.dodgeText = this.add.text(16, 116, `Dodge: ${'●'.repeat(DODGE.charges)}`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fd8ff',
    });

    this.shieldText = this.add.text(16, 142, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#4cd3ff',
    });

    this.threatText = this.add.text(16, 168, 'Threat Lv. 1', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ff8c5c',
    });

    this.droidText = this.add.text(16, 194, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c7ffb3',
    });

    this.timeText = this.add
      .text(GAME_WIDTH - 16, 14, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

    const barX = (GAME_WIDTH - BAR_WIDTH) / 2;
    const barY = 16;

    this.add
      .text(GAME_WIDTH / 2, barY - 14, 'CONVOY', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c7c9ff',
      })
      .setOrigin(0.5, 0);

    this.hpBarBg = this.add
      .rectangle(barX, barY, BAR_WIDTH, BAR_HEIGHT, 0x1c1f2b)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.6);

    this.hpBarFill = this.add
      .rectangle(barX + 2, barY + 2, BAR_WIDTH - 4, BAR_HEIGHT - 4, 0x4cff88)
      .setOrigin(0, 0);

    this.convoyShieldText = this.add
      .text(GAME_WIDTH / 2, barY + BAR_HEIGHT + 6, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#4cd3ff',
      })
      .setOrigin(0.5, 0);

    this.convoyDroidText = this.add
      .text(GAME_WIDTH / 2, barY + BAR_HEIGHT + 24, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c7ffb3',
      })
      .setOrigin(0.5, 0);

    this.gameOverContainer = this.add.container(0, 0).setVisible(false);

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setInteractive();

    this.titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#ff5c5c',
      })
      .setOrigin(0.5);

    this.finalScoreText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.dodgeBonusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 46, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#9fd8ff',
      })
      .setOrigin(0.5);

    this.currencyText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 22, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    const restartText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, 'Press R / Enter or Click to Restart', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    const menuText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 42, 'Press M for Main Menu', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#9fd8ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menuText.on('pointerdown', () => this.goToMenu());

    this.gameOverContainer.add([
      overlay,
      this.titleText,
      this.finalScoreText,
      this.dodgeBonusText,
      this.currencyText,
      restartText,
      menuText,
    ]);

    overlay.on('pointerdown', () => this.restart());
    this.input.keyboard.on('keydown-R', () => this.restart());
    this.input.keyboard.on('keydown-ENTER', () => this.restart());
    this.input.keyboard.on('keydown-M', () => this.goToMenu());

    this.levelCompleteContainer = this.add.container(0, 0).setVisible(false);

    const winOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setInteractive();

    this.winTitleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'LEVEL COMPLETE', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#4cff88',
      })
      .setOrigin(0.5);

    this.winScoreText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.winCurrencyText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 22, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    this.winNextLevelText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 6, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9fd8ff',
      })
      .setOrigin(0.5);

    const levelSelectText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Press Enter or Click for Level Select', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#66ffe0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    levelSelectText.on('pointerdown', () => this.goToLevelSelect());

    this.levelCompleteContainer.add([
      winOverlay,
      this.winTitleText,
      this.winScoreText,
      this.winCurrencyText,
      this.winNextLevelText,
      levelSelectText,
    ]);

    winOverlay.on('pointerdown', () => this.goToLevelSelect());
    this.input.keyboard.on('keydown-ENTER', () => this.goToLevelSelect());

    this.game.events.on('score-changed', (score) => {
      this.scoreText.setText(`Score: ${score}`);
    });

    this.game.events.on('lives-changed', (lives) => {
      this.livesText.setText(`Lives: ${lives}`);
    });

    this.game.events.on('chain-changed', (multiplier) => {
      this.chainText.setText(`Chain x${multiplier}`);
    });

    this.game.events.on('weapon-level-changed', ({ level, max }) => {
      this.weaponText.setText(`Weapon Lv. ${level} / ${max}`);
    });

    this.game.events.on('dodge-charges-changed', ({ charges, max }) => {
      const filled = '●'.repeat(charges);
      const empty = '○'.repeat(Math.max(0, max - charges));
      this.dodgeText.setText(`Dodge: ${filled}${empty}`);
    });

    this.game.events.on('shield-changed', ({ charges, max }) => {
      if (max <= 0) {
        this.shieldText.setText('');
        return;
      }
      const filled = '◆'.repeat(charges);
      const empty = '◇'.repeat(Math.max(0, max - charges));
      this.shieldText.setText(`Shield: ${filled}${empty}`);
    });

    this.game.events.on('convoy-hp-changed', ({ hp, maxHp }) => {
      const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
      this.hpBarFill.setSize((BAR_WIDTH - 4) * ratio, BAR_HEIGHT - 4);
      this.hpBarFill.fillColor = ratio > 0.5 ? 0x4cff88 : ratio > 0.2 ? 0xffd166 : 0xff5c5c;
    });

    this.game.events.on('convoy-shield-changed', ({ charges, max }) => {
      if (max <= 0) {
        this.convoyShieldText.setText('');
        return;
      }
      const filled = '◆'.repeat(charges);
      const empty = '◇'.repeat(Math.max(0, max - charges));
      this.convoyShieldText.setText(`Shield: ${filled}${empty}`);
    });

    this.game.events.on('difficulty-changed', (level) => {
      this.threatText.setText(`Threat Lv. ${level}`);
      if (level <= 1) return; // initial state on run start/restart, not a real escalation

      const toast = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'ENEMIES ARE GETTING STRONGER', {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ff5c5c',
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: toast,
        y: toast.y - 24,
        alpha: 0,
        duration: 1800,
        ease: 'Cubic.easeOut',
        onComplete: () => toast.destroy(),
      });
    });

    this.game.events.on('player-droids-changed', (count) => {
      this.droidText.setText(count > 0 ? `Droid: ${'●'.repeat(count)}` : '');
    });

    this.game.events.on('convoy-droids-changed', (count) => {
      this.convoyDroidText.setText(count > 0 ? `Droids: ${'●'.repeat(count)}` : '');
    });

    this.game.events.on('game-over', ({ score, reason, dodgeBonus, earnedCurrency, totalCurrency, sceneKey }) => {
      this.isGameOver = true;
      this.activeSceneKey = sceneKey;
      const flavorPool = reason === 'convoy' ? CONVOY_LOST_FLAVOR : PLAYER_LOST_FLAVOR;
      this.titleText.setText(Phaser.Utils.Array.GetRandom(flavorPool));
      this.finalScoreText.setText(`Final Score: ${score}`);
      this.dodgeBonusText.setText(dodgeBonus > 0 ? `+${dodgeBonus} unused dodge bonus` : '');
      this.currencyText.setText(
        earnedCurrency > 0
          ? `Currency: ${totalCurrency} (+${earnedCurrency} earned)`
          : `Currency: ${totalCurrency}`
      );
      this.gameOverContainer.setVisible(true);
    });

    this.game.events.on('level-time-changed', (remainingMs) => {
      this.timeText.setText(`Time: ${formatClock(remainingMs)}`);
    });

    this.game.events.on('level-complete', (payload) => {
      const { score, dodgeBonus, earnedCurrency, totalCurrency, nextLevelLabel, sceneKey } = payload;
      this.isLevelComplete = true;
      this.activeSceneKey = sceneKey;
      this.winTitleText.setText('LEVEL COMPLETE');
      this.winScoreText.setText(`Final Score: ${score}`);
      this.winCurrencyText.setText(
        earnedCurrency > 0 || dodgeBonus > 0
          ? `Currency: ${totalCurrency} (+${earnedCurrency} earned)`
          : `Currency: ${totalCurrency}`
      );
      this.winNextLevelText.setText(nextLevelLabel ? `▶ ${nextLevelLabel} unlocked!` : '');
      this.levelCompleteContainer.setVisible(true);
    });
  }

  restart() {
    if (!this.isGameOver) return;
    this.isGameOver = false;
    this.gameOverContainer.setVisible(false);
    this.scene.get(this.activeSceneKey).scene.restart();
  }

  goToMenu() {
    if (!this.isGameOver) return;
    this.isGameOver = false;
    this.gameOverContainer.setVisible(false);
    this.scene.stop(this.activeSceneKey);
    this.scene.start('MenuScene');
    this.scene.stop();
  }

  goToLevelSelect() {
    if (!this.isLevelComplete) return;
    this.isLevelComplete = false;
    this.levelCompleteContainer.setVisible(false);
    this.scene.stop(this.activeSceneKey);
    this.scene.start('LevelSelectScene');
    this.scene.stop();
  }
}
