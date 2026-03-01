import BaseScene from './BaseScene.js';

const LORE = [
  'YEAR 2031. THE SURFACE IS GONE.',
  '',
  'You command BUNKER-7 — 847 survivors,',
  'dwindling oxygen, one merciless overseer: THE OVERLORD.',
  '',
  'You please him (if you can) by doing work.',
  'Complete work — earn oxygen, rations, survival.',
  'Miss the deadline — civilians die.',
  '',
  '"Your crew\'s morale is lower than your code coverage."',
  '',
  'This is not about points.',
  'It\'s about shipping under pressure.',
  '',
  'Ship. Or perish.',
].join('\n');

const CHAR_DELAY  = 28;   // ms per character
const CURSOR_BLINK = 530; // ms

export default class IntroScene extends BaseScene {
  constructor() {
    super('IntroScene');
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    // Dark background
    this.add.rectangle(0, 0, width, height, 0x080808).setOrigin(0, 0);

    // Top label
    this.add.text(12, 10, '// CLASSIFIED BRIEFING', {
      fontFamily: 'monospace', fontSize: '12px', color: '#444444',
    });

    // Main text object
    const textObj = this.add.text(width / 2, height / 2, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      lineSpacing: 8,
      align: 'left',
    }).setOrigin(0.5);

    // Blinking cursor object — sits after text
    const cursor = this.add.text(0, 0, '_', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0, 0);

    // Skip / continue prompt — hidden until done
    const prompt = this.add.text(width / 2, height - 32, 'PRESS SPACE TO CONTINUE', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);

    // ── Typewriter ────────────────────────────────────────────────
    let charIndex  = 0;
    let done       = false;

    const showAll = () => {
      done = true;
      charIndex = LORE.length;
      textObj.setText(LORE);
      cursor.setAlpha(0);
      this.tweens.add({ targets: prompt, alpha: 1, duration: 400 });
    };

    const typeTimer = this.time.addEvent({
      delay: CHAR_DELAY,
      loop: true,
      callback: () => {
        if (charIndex >= LORE.length) {
          typeTimer.destroy();
          showAll();
          return;
        }
        charIndex++;
        textObj.setText(LORE.slice(0, charIndex));

        // Position cursor after last character on last line
        const b = textObj.getBounds();
        cursor.setPosition(b.right + 2, b.bottom - cursor.height);
      },
    });

    // Cursor blink while typing
    this.time.addEvent({
      delay: CURSOR_BLINK,
      loop: true,
      callback: () => { if (!done) cursor.setAlpha(cursor.alpha > 0 ? 0 : 1); },
    });

    // SPACE / click: skip to full text, then on second press → StartScene
    const advance = () => {
      if (!done) { showAll(); return; }
      this.cameras.main.fade(400, 0, 0, 0, false, (cam, t) => {
        if (t === 1) this.scene.start('StartScene');
      });
    };

    this.input.keyboard.on('keydown-SPACE', advance);
    this.input.on('pointerdown', advance);
  }
}
