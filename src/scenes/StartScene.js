import BaseScene from './BaseScene.js';

const PROMPT_FONT_SIZE = '28px';
const PROMPT_COLOR = '#ffffff';
const PROMPT_ALPHA_MIN = 0.25;
const PROMPT_PULSE_DURATION = 700;

export default class StartScene extends BaseScene {
  constructor() {
    super('StartScene');
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    // Black background
    this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0, 0);

    // "Press SPACE to begin" — centered, pulsing
    const prompt = this.add.text(width / 2, height / 2, 'Press SPACE to begin', {
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

    this.input.keyboard.once('keydown-SPACE', () => this.onStart());
    this.input.once('pointerdown', () => this.onStart());
  }

  onStart() {
    this.scene.start('InterrogationScene');
  }
}
