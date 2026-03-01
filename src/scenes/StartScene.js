import BaseScene from './BaseScene.js';

const PROMPT_FONT_SIZE = '22px';
const PROMPT_COLOR = '#ffffff';
const PROMPT_ALPHA_MIN = 0.25;
const PROMPT_PULSE_DURATION = 700;

const C = {
  text: '#222222',
  dim:  '#555555',
};

const PW = 780;

export default class StartScene extends BaseScene {
  constructor() {
    super('StartScene');
  }

  preload() {
    this.load.image('bunker', 'assets/images/bunker.png');
    this.load.audio('wind', 'assets/sounds/wind.mp3');
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

    const { width, height } = this.scale;

    // White background
    this.add.rectangle(0, 0, width, height, 0xffffff, 1).setOrigin(0, 0);

    // Layout constants
    const headerH  = 30;
    const imageH   = 400;
    const imageY   = headerH + 10;
    const promptY  = imageY + imageH - 30;
    const statsY   = height - 100;

    // ── Header ────────────────────────────────────────────────────
    this.add.text(10, 8, '[ BUNKER STATUS ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    });

    // ── Bunker image (or fallback dark rect) ──────────────────────
    const imageCx = width / 2;
    const imageCy = imageY + imageH / 2;

    if (this.textures.exists('bunker')) {
      const img = this.add.image(imageCx, imageCy, 'bunker');
      img.setDisplaySize(PW, imageH);
    } else {
      // Fallback: dark rectangle
      this.add.rectangle(imageCx, imageCy, PW, imageH, 0x111111);
      this.add.text(imageCx, imageCy, 'BUNKER SECTOR 7 — CAMERA OFFLINE', {
        fontFamily: 'monospace', fontSize: '13px', color: '#444444',
      }).setOrigin(0.5);
    }

    // Dark overlay on image for readability
    this.add.rectangle(imageCx, imageCy, PW, imageH, 0x000000, 0.4);

    // ── Title over image ──────────────────────────────────────────
    this.add.text(imageCx, imageY + 22, 'PRODUCTIVITY BUNKER', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffffff',
    }).setOrigin(0.5, 0).setAlpha(0.9);

    // ── Dust particles inside image ───────────────────────────────
    const imgLeft = imageCx - PW / 2;
    const imgTop  = imageY;

    // Tiny soft-circle texture for dust
    const pg = this.make.graphics({ add: false });
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture('dust', 8, 8);
    pg.destroy();

    // Geometry mask clips particles to image bounds
    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(imgLeft, imgTop, PW, imageH);
    const dustMask = maskGfx.createGeometryMask();

    const particles = this.add.particles(0, 0, 'dust', {
      x:        { min: imgLeft, max: imgLeft + PW },
      y:        { min: imgTop,  max: imgTop + imageH },
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
    const missions  = this.registry.get('missions');
    const oxygen    = this.registry.get('oxygen');
    const rations   = this.registry.get('rations');
    const civilians = this.registry.get('civilians');

    const cols = [
      { cx: width * 0.15, value: `${oxygen}%`,    label: 'OXYGEN'    },
      { cx: width * 0.38, value: `${rations}%`,   label: 'RATIONS'   },
      { cx: width * 0.62, value: String(civilians), label: 'CIVILIANS' },
      { cx: width * 0.85, value: String(missions),  label: 'MISSIONS'  },
    ];

    for (const { cx, value, label } of cols) {
      this.add.text(cx, statsY, value, {
        fontFamily: 'monospace', fontSize: '28px', color: C.text,
      }).setOrigin(0.5, 0);

      this.add.text(cx, statsY + 36, label, {
        fontFamily: 'monospace', fontSize: '11px', color: C.dim,
      }).setOrigin(0.5, 0);
    }

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

    // Wind ambience — loop, stop when leaving
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
}
