import BaseScene from './BaseScene.js';

const CHAR_DELAY = 30;

const OVERLORD_LINES = [
  '"Oxygen depleted. Productivity terminated. As expected."',
  '"Bunker-7 has ceased operations. The quota was not met."',
  '"You had one directive. The survivors did not survive."',
  '"Resource depletion complete. Requisitioning a replacement."',
  '"The bunker is quiet now. Efficiency: zero. As forecasted."',
];

export default class GameOverScene extends BaseScene {
  constructor() {
    super('GameOverScene');
  }

  preload() {
    this.load.image('bunker', 'assets/images/bunker.png');
    this.load.audio('wind', 'assets/sounds/wind.mp3');
  }

  create() {
    super.create();

    const incoming  = this.scene.settings.data || {};
    const missions  = incoming.missions  ?? 0;
    const civilians = incoming.civilians ?? 0;

    const { width, height } = this.scale;

    // Full dark background
    this.add.rectangle(0, 0, width, height, 0x080808).setOrigin(0, 0);

    // Bunker image — desaturated, very dark overlay
    if (this.textures.exists('bunker')) {
      this.add.image(width / 2, height / 2, 'bunker')
        .setDisplaySize(width, height)
        .setAlpha(0.18);
    }

    // ── Header ────────────────────────────────────────────────────
    this.add.text(12, 10, '// TERMINAL FAILURE', {
      fontFamily: 'monospace', fontSize: '12px', color: '#333333',
    });

    // ── Main verdict ──────────────────────────────────────────────
    this.add.text(width / 2, 100, 'BUNKER-7 LOST', {
      fontFamily: 'monospace', fontSize: '42px', color: '#ffffff',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, 156, 'OXYGEN DEPLETED — ALL CIVILIANS PERISHED', {
      fontFamily: 'monospace', fontSize: '13px', color: '#666666',
    }).setOrigin(0.5, 0);

    // ── Divider ───────────────────────────────────────────────────
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x222222);
    gfx.lineBetween(40, 196, width - 40, 196);

    // ── Final stats ───────────────────────────────────────────────
    const statY = 224;
    const stats = [
      { cx: width * 0.3, value: String(missions),  label: 'MISSIONS COMPLETED' },
      { cx: width * 0.7, value: String(civilians),  label: 'SURVIVORS REMAINING' },
    ];

    for (const { cx, value, label } of stats) {
      this.add.text(cx, statY, value, {
        fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
      }).setOrigin(0.5, 0);

      this.add.text(cx, statY + 60, label, {
        fontFamily: 'monospace', fontSize: '11px', color: '#444444',
      }).setOrigin(0.5, 0);
    }

    // ── Overlord parting message ──────────────────────────────────
    const quote = OVERLORD_LINES[Math.floor(Math.random() * OVERLORD_LINES.length)];
    const quoteObj = this.add.text(width / 2, 340, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#888888',
      wordWrap: { width: width - 120 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this._typewrite(quoteObj, quote);

    // ── Restart ───────────────────────────────────────────────────
    const btn = this.add.text(width / 2, height - 60, 'start over', {
      fontFamily: 'monospace', fontSize: '16px', color: '#444444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#444444'));
    btn.on('pointerdown', () => this._restart());
    this.input.keyboard.once('keydown-SPACE', () => this._restart());

    // Wind — eerie, very low
    this._playMuffledWind(0.08);
  }

  _restart() {
    // Reset registry to initial values
    this.registry.set('missions',  0);
    this.registry.set('oxygen',    100);
    this.registry.set('rations',   100);
    this.registry.set('civilians', 847);

    this.cameras.main.fade(500, 0, 0, 0, false, (cam, t) => {
      if (t === 1) this.scene.start('StartScene');
    });
  }

  _typewrite(textObj, fullText) {
    let i = 0;
    const ev = this.time.addEvent({
      delay: CHAR_DELAY,
      loop: true,
      callback: () => {
        i++;
        textObj.setText(fullText.slice(0, i));
        if (i >= fullText.length) ev.destroy();
      },
    });
  }
}
