import BaseScene from './BaseScene.js';
import MistralAPI from '../systems/MistralAPI.js';

const PROMPT_FONT_SIZE = '22px';
const PROMPT_COLOR = '#ffffff';
const PROMPT_ALPHA_MIN = 0.25;
const PROMPT_PULSE_DURATION = 700;

const C = {
  text: '#222222',
  dim:  '#555555',
  up:   '#226622',
  down: '#cc0000',
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

export default class StartScene extends BaseScene {
  constructor() {
    super('StartScene');
  }

  init(data) {
    this._initData = data || {};
  }

  preload() {
    this.load.image('bunker', 'assets/images/bunker.png');
    this.load.audio('wind', 'assets/sounds/wind.mp3');
    this.load.audio('typing', 'assets/sounds/typing-keyboard.mp3');
  }

  create() {
    super.create();

    // Init registry on first visit only
    if (!this.registry.has('missions')) {
      this.registry.set('missions',  0);
      this.registry.set('oxygen',    100);
      this.registry.set('rations',   100);
      this.registry.set('civilians', 847);
    }

    // Detect post-mission mode (arriving from ResultScene)
    const incoming = this._initData || {};
    const postMission = incoming.deltas !== undefined;
    const { underTime = true, bonusPct = 0, overMs = 0, deltas = {} } = incoming;

    const oxygenDelta  = deltas.oxygen    ?? { nominal: 0, actual: 0 };
    const rationsDelta = deltas.rations   ?? { nominal: 0, actual: 0 };
    const civDelta     = deltas.civilians ?? { nominal: 0, actual: 0 };

    const oxygen    = this.registry.get('oxygen');
    const rations   = this.registry.get('rations');
    const civilians = this.registry.get('civilians');
    const missions  = this.registry.get('missions');

    const { width, height } = this.scale;

    // White background
    this.add.rectangle(0, 0, width, height, 0xffffff, 1).setOrigin(0, 0);

    // Layout constants
    const headerH = 30;
    const imageH  = 400;
    const imageY  = headerH + 10;
    const promptY = imageY + imageH - 30;
    const statsY  = height - 100;

    // ── Header ────────────────────────────────────────────────────
    this.add.text(10, 8, postMission ? '[ BUNKER REPORT ]' : '[ BUNKER STATUS ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    });

    // ── Bunker image ──────────────────────────────────────────────
    const imageCx = width / 2;
    const imageCy = imageY + imageH / 2;

    if (this.textures.exists('bunker')) {
      this.add.image(imageCx, imageCy, 'bunker').setDisplaySize(PW, imageH);
    } else {
      this.add.rectangle(imageCx, imageCy, PW, imageH, 0x111111);
      this.add.text(imageCx, imageCy, 'BUNKER SECTOR 7 — CAMERA OFFLINE', {
        fontFamily: 'monospace', fontSize: '13px', color: '#444444',
      }).setOrigin(0.5);
    }

    // Dark overlay
    this.add.rectangle(imageCx, imageCy, PW, imageH, 0x000000, postMission ? 0.62 : 0.4);

    // ── Title / Overlord quote over image ─────────────────────────
    if (postMission) {
      const typingSound = this.sound.add('typing', { loop: true, volume: 0.4 });

      const quoteObj = this.add.text(imageCx, imageY + 60, '', {
        fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
        wordWrap: { width: PW - 100 }, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0).setAlpha(0.92);

      this._fetchQuote(underTime, bonusPct, overMs, oxygenDelta, rationsDelta, civDelta)
        .then(q => this._typewrite(quoteObj, `"${q.replace(/^"|"$/g, '')}"`, typingSound))
        .catch(() => {
          const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
          this._typewrite(quoteObj, q, typingSound);
        });
    } else {
      this.add.text(imageCx, imageY + 22, 'PRODUCTIVITY BUNKER', {
        fontFamily: 'monospace', fontSize: '32px', color: '#ffffff',
      }).setOrigin(0.5, 0).setAlpha(0.9);
    }

    // ── Dust particles ────────────────────────────────────────────
    const imgLeft = imageCx - PW / 2;

    const pg = this.make.graphics({ add: false });
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture('dust', 8, 8);
    pg.destroy();

    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(imgLeft, imageY, PW, imageH);
    const dustMask = maskGfx.createGeometryMask();

    const particles = this.add.particles(0, 0, 'dust', {
      x:        { min: imgLeft, max: imgLeft + PW },
      y:        { min: imageY,  max: imageY + imageH },
      speedX:   { min: 15, max: 70 },
      speedY:   { min: -10, max: 10 },
      scale:    { min: 0.05, max: 0.4 },
      alpha:    { start: 0.6, end: 0 },
      lifespan: { min: 3500, max: 7000 },
      frequency: 55,
      blendMode: 'ADD',
      tint: [0xffffff, 0xcccccc, 0x999999],
      quantity: 1,
    });
    particles.setMask(dustMask);

    // ── Stat blocks ───────────────────────────────────────────────
    const stats = [
      { cx: width * 0.15, current: oxygen,    d: oxygenDelta,  unit: '%', label: 'OXYGEN'    },
      { cx: width * 0.38, current: rations,   d: rationsDelta, unit: '%', label: 'RATIONS'   },
      { cx: width * 0.62, current: civilians, d: civDelta,      unit: '',  label: 'CIVILIANS' },
      { cx: width * 0.85, current: missions,  d: deltas.missions ?? { nominal: 1, actual: 1 }, unit: '', label: 'MISSIONS' },
    ];

    stats.forEach(({ cx, current, d, unit, label }, i) => {
      const nominal = typeof d === 'object' ? d.nominal : d;
      const actual  = typeof d === 'object' ? d.actual  : d;
      const prev    = postMission ? current - actual : current;

      const valueObj = this.add.text(cx, statsY, `${prev}${unit}`, {
        fontFamily: 'monospace', fontSize: '28px', color: C.text,
      }).setOrigin(0.5, 0);

      this.add.text(cx, statsY + 36, label, {
        fontFamily: 'monospace', fontSize: '11px', color: C.dim,
      }).setOrigin(0.5, 0);

      if (postMission && nominal !== 0) {
        const sign  = nominal > 0 ? '+' : '';
        const color = nominal > 0 ? C.up : C.down;
        const badge = this.add.text(cx, statsY + 2, `${sign}${nominal}${unit}`, {
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

    // ── Press SPACE prompt (pulsing) ──────────────────────────────
    const prompt = this.add.text(width / 2, promptY, 'Press SPACE to start a mission', {
      fontFamily: 'monospace',
      fontSize: PROMPT_FONT_SIZE,
      fill: PROMPT_COLOR,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: PROMPT_ALPHA_MIN,
      duration: PROMPT_PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Wind ambience
    const wind = this.sound.add('wind', { loop: true, volume: 0.5 });
    const playWind = () => wind.play();
    if (this.sound.locked) {
      this.sound.once('unlocked', playWind);
    } else {
      playWind();
    }
    this.events.once('shutdown', () => wind.stop());

    this.input.keyboard.once('keydown-SPACE', () => this.onStart());
    this.input.once('pointerdown', () => this.onStart());
  }

  onStart() {
    this.scene.start('InterrogationScene');
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

  _typewrite(textObj, fullText, sound = null) {
    let i = 0;
    if (sound) sound.play();
    const ev = this.time.addEvent({
      delay: 32,
      loop: true,
      callback: () => {
        i++;
        textObj.setText(fullText.slice(0, i));
        if (i >= fullText.length) {
          ev.destroy();
          if (sound) sound.stop();
        }
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
