import BaseScene from './BaseScene.js';
import MistralAPI from '../systems/MistralAPI.js';

const C = {
  bg:     0xffffff,
  text:   '#222222',
  dim:    '#555555',
  up:     '#226622',
  down:   '#cc0000',
};

const PW = 780;

const OVERLORD_SYSTEM = `You are THE OVERLORD — the AI that controls Bunker-7, the last human shelter.
You receive a post-mission resource report and respond in ONE sentence.
Tone: cold, bureaucratic, darkly ironic. You view humans as productivity units.
Rules: max 15 words, no exclamation points, no warmth, no generic phrases.`;

const FALLBACK_QUOTES = [
  '"Losses within acceptable parameters. Do not repeat this."',
  '"Resource drain noted. The weak have been reallocated."',
  '"Efficiency suboptimal. Civilization persists. Barely."',
  '"Another mission logged. Another disappointment catalogued."',
  '"You survived. The ledger is less impressed than you are."',
];

export default class BunkerScene extends BaseScene {
  constructor() {
    super('BunkerScene');
  }

  preload() {
    this.load.image('bunker', 'assets/images/bunker.png');
  }

  create() {
    super.create();

    const incoming = this.scene.settings.data || {};
    const { underTime = true, bonusPct = 0, overMs = 0 } = incoming;

    // Deltas (mirror ResultScene logic)
    const oxygenDelta   = underTime ? 5 : -12;
    const rationsDelta  = underTime ? Math.round(bonusPct / 2) : -15;
    const civDelta      = underTime ? 0 : -Math.round(overMs / 60000) * 3;

    // Current values (already written by ResultScene)
    const oxygen    = this.registry.get('oxygen')    ?? 100;
    const rations   = this.registry.get('rations')   ?? 100;
    const civilians = this.registry.get('civilians') ?? 847;
    const missions  = this.registry.get('missions')  ?? 1;

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, C.bg).setOrigin(0, 0);

    this.add.text(10, 8, '[ BUNKER REPORT ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    });

    // ── Image ─────────────────────────────────────────────────────
    const imageH  = 400;
    const imageY  = 28;
    const imageCx = width / 2;
    const imageCy = imageY + imageH / 2;

    if (this.textures.exists('bunker')) {
      this.add.image(imageCx, imageCy, 'bunker').setDisplaySize(PW, imageH);
    } else {
      this.add.rectangle(imageCx, imageCy, PW, imageH, 0x111111);
    }
    // Heavier overlay so white text is legible
    this.add.rectangle(imageCx, imageCy, PW, imageH, 0x000000, 0.62);

    // ── Overlord quote ────────────────────────────────────────────
    const quoteObj = this.add.text(imageCx, imageCy, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
      wordWrap: { width: PW - 100 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.92);

    this._fetchQuote(underTime, bonusPct, overMs, oxygenDelta, rationsDelta, civDelta)
      .then(quote => this._typewrite(quoteObj, `"${quote.replace(/^"|"$/g, '')}"`))
      .catch(() => {
        const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
        this._typewrite(quoteObj, q);
      });

    // ── Resource blocks ───────────────────────────────────────────
    const statsY = height - 115;

    const stats = [
      { cx: width * 0.15, label: 'OXYGEN',    current: oxygen,    delta: oxygenDelta,  unit: '%' },
      { cx: width * 0.38, label: 'RATIONS',   current: rations,   delta: rationsDelta, unit: '%' },
      { cx: width * 0.62, label: 'CIVILIANS', current: civilians, delta: civDelta,      unit: ''  },
      { cx: width * 0.85, label: 'MISSIONS',  current: missions,  delta: 1,            unit: ''  },
    ];

    stats.forEach(({ cx, label, current, delta, unit }, i) => {
      const prev = current - delta;

      const valueObj = this.add.text(cx, statsY, `${prev}${unit}`, {
        fontFamily: 'monospace', fontSize: '32px', color: C.text,
      }).setOrigin(0.5, 0);

      this.add.text(cx, statsY + 42, label, {
        fontFamily: 'monospace', fontSize: '11px', color: C.dim,
      }).setOrigin(0.5, 0);

      // Delta badge — slides up and fades in
      if (delta !== 0) {
        const sign  = delta > 0 ? '+' : '';
        const color = delta > 0 ? C.up : C.down;
        const badge = this.add.text(cx, statsY + 2, `${sign}${delta}${unit}`, {
          fontFamily: 'monospace', fontSize: '13px', color,
        }).setOrigin(0.5, 1).setAlpha(0);

        this.time.delayedCall(300 + i * 180, () => {
          this._animateCount(valueObj, prev, current, unit, 600);
          this.tweens.add({
            targets: badge, alpha: 1, y: statsY - 6,
            duration: 300, ease: 'Sine.easeOut',
          });
        });
      }
    });

    // ── Continue ──────────────────────────────────────────────────
    const btn = this.add.text(width / 2, height - 36, 'continue', {
      fontFamily: 'monospace', fontSize: '16px', color: C.dim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor(C.text));
    btn.on('pointerout',  () => btn.setColor(C.dim));
    btn.on('pointerdown', () => this._goNext());
    this.input.keyboard.once('keydown-SPACE', () => this._goNext());
  }

  _goNext() {
    this.cameras.main.fade(300, 255, 255, 255, false, (cam, t) => {
      if (t === 1) this.scene.start('StartScene');
    });
  }

  async _fetchQuote(underTime, bonusPct, overMs, oxyDelta, ratDelta, civDelta) {
    const api = new MistralAPI();
    const result = underTime
      ? `completed on time with ${bonusPct}% efficiency`
      : `exceeded the time limit by ${Math.round(overMs / 60000)} minute(s)`;
    const prompt =
      `Post-mission report: worker ${result}. ` +
      `Oxygen ${oxyDelta > 0 ? '+' : ''}${oxyDelta}%. ` +
      `Rations ${ratDelta > 0 ? '+' : ''}${ratDelta}%. ` +
      `Civilian loss: ${Math.abs(civDelta)}. ` +
      `Respond as THE OVERLORD in one sentence.`;
    return api.sendOnce(OVERLORD_SYSTEM, prompt);
  }

  _typewrite(textObj, fullText) {
    let i = 0;
    const ev = this.time.addEvent({
      delay: 32,
      loop: true,
      callback: () => {
        i++;
        textObj.setText(fullText.slice(0, i));
        if (i >= fullText.length) ev.destroy();
      },
    });
  }

  _animateCount(textObj, from, to, unit, duration) {
    let elapsed = 0;
    const ev = this.time.addEvent({
      delay: 20,
      loop: true,
      callback: () => {
        elapsed += 20;
        const t = Math.min(elapsed / duration, 1);
        textObj.setText(`${Math.round(from + (to - from) * t)}${unit}`);
        if (elapsed >= duration) {
          textObj.setText(`${to}${unit}`);
          ev.destroy();
        }
      },
    });
  }
}
