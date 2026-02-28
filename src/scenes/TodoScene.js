import BaseScene from './BaseScene.js';

const C = {
  bg: 0xffffff,
  border: 0x333333,
  green: '#222222',
  red: '#cc0000',
  orange: '#cc5500',
  dim: '#999999',
  text: '#222222',
};

const TIMER_DURATION = 25 * 60;

export default class TodoScene extends BaseScene {
  constructor() {
    super('TodoScene');
  }

  create() {
    super.create();

    const data = this.scene.settings.data;
    this.tasks = data.tasks || [];
    this.timeLeft = TIMER_DURATION;

    this._buildLayout();
    this._startTimer();
  }

  _buildLayout() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, C.bg).setOrigin(0, 0);

    // panel border
    this.add.rectangle(width / 2, height / 2, width - 20, height - 20, C.bg)
      .setStrokeStyle(1, C.border);

    this.add.text(20, 18, '[ ACTIVE DIRECTIVES ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.green,
    });

    // timer — centered
    this.timerText = this.add.text(width / 2, height / 2 + 40, '25:00', {
      fontFamily: 'monospace', fontSize: '144px', color: C.text,
    }).setOrigin(0.5);

    // task list
    const taskStr = this.tasks.length
      ? this.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : '(no directives assigned)';

    this.add.text(20, 50, taskStr, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: C.text,
      wordWrap: { width: width - 40 },
      lineSpacing: 12,
    });
  }

  _startTimer() {
    this.startTime = Date.now();
    this.endTime = this.startTime + TIMER_DURATION * 1000;

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const remaining = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
        this.timeLeft = remaining;
        this._renderTimer();
        if (remaining <= 0) this.scene.start('BunkerScene', { tasks: this.tasks });
      },
    });
  }

  _startWarningBlink() {
    this._blinkEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.timerText.setVisible(!this.timerText.visible);
      },
    });
  }

  _stopWarningBlink() {
    if (this._blinkEvent) {
      this._blinkEvent.destroy();
      this._blinkEvent = null;
    }
    this.timerText.setVisible(true);
  }

  _renderTimer() {
    const m = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
    const s = String(this.timeLeft % 60).padStart(2, '0');
    const formatted = `${m}:${s}`;
    this.timerText.setText(formatted);
    if (this.timeLeft === 60) this._startWarningBlink();
    if (this.timeLeft <= 0) this._stopWarningBlink();
  }
}
