import BaseScene from './BaseScene.js';

const C = {
  bg: 0xffffff,
  timerBg: 0x222222,
  border: 0x333333,
  text: '#222222',
  timerText: '#ffffff',
  timerDim: '#888888',
  dim: '#555555',
  done: '#aaaaaa',
};

const TIMER_DURATION = 25 * 60;
const SPLIT_Y = 300;
const PAD = 16;
const CARD_H = 76;
const CARD_GAP = 8;

export default class TodoScene extends BaseScene {
  constructor() {
    super('TodoScene');
  }

  preload() {
    this.load.audio('kaching', 'assets/sounds/kaching.mp3');
    this.load.audio('wind', 'assets/sounds/wind.mp3');
  }

  create() {
    super.create();
    this._playMuffledWind();
    this._kaching = this.sound.add('kaching', { volume: 0.8 });

    const data = this.scene.settings.data;
    this.taskDescription = data.taskDescription || '';
    this.stepList = this._pad3(data.steps || []);
    this.doneStandard = data.doneStandard || '';
    this.completed = [false, false, false];
    this.timeLeft = TIMER_DURATION;

    this._buildLayout();
    this._buildCards();
    this._startTimer();
  }

  _pad3(arr) {
    const result = arr.slice(0, 3);
    while (result.length < 3) result.push('—');
    return result;
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  _buildLayout() {
    const { width, height } = this.scale;

    // White background
    this.add.rectangle(0, 0, width, height, C.bg).setOrigin(0, 0);

    // Top half — dark background
    this.add.rectangle(PAD, PAD, width - PAD * 2, SPLIT_Y - PAD * 2, C.timerBg)
      .setOrigin(0, 0);

    // Bottom half border
    this.add.rectangle(PAD, SPLIT_Y + 4, width - PAD * 2, height - SPLIT_Y - PAD - 4, C.bg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, C.border);

    // Panel labels
    this.add.text(PAD + 8, PAD + 6, '[ TIMER ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.timerText,
    });

    this.add.text(PAD + 8, SPLIT_Y + 10, '[ MISSION STEPS ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    });

    // Task description — small, top-right of timer panel
    if (this.taskDescription) {
      this.add.text(width - PAD - 8, PAD + 6, this.taskDescription, {
        fontFamily: 'monospace', fontSize: '12px', color: C.timerText,
        wordWrap: { width: 360 },
      }).setOrigin(1, 0);
    }

    // Big centered timer — vertically centered in top half
    const timerY = PAD + (SPLIT_Y - PAD * 2) / 2 + 8;
    this.bigTimer = this.add.text(width / 2, timerY, '25:00', {
      fontFamily: 'monospace', fontSize: '120px', color: C.timerText,
    }).setOrigin(0.5, 0.5);
  }

  // ─── Task cards ────────────────────────────────────────────────────────────

  _buildCards() {
    this.cardObjects = [];
    const { width } = this.scale;
    const cardW = width - PAD * 2 - 2;
    const startX = PAD + 1;
    const startY = SPLIT_Y + 28;

    this.stepList.forEach((step, i) => {
      const cardY = startY + i * (CARD_H + CARD_GAP);
      this.cardObjects.push(this._makeCard(startX, cardY, cardW, CARD_H, step, i));
    });

    // Scene-level pointer handling — bypasses PostFX pipeline hit detection issues
    this.input.on('pointerdown', (pointer) => {
      this.cardObjects.forEach((card, i) => {
        const { x, y, w, h } = card.bounds;
        if (pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h) {
          this.completed[i] = !this.completed[i];
          const done = this.completed[i];
          card.xMark.setText(done ? 'X' : '');
          card.stepText.setColor(done ? C.done : C.text);
          if (done) { this._kaching.play(); this.cameras.main.shake(120, 0.004); }
        }
      });

      if (this.completed.every(c => c)) {
        this._onAllComplete();
      }
    });
  }

  _makeCard(x, y, w, h, text) {
    const cbSize = 22;
    const cbX = x + 16;
    const cbY = y + (h - cbSize) / 2;

    // Card border
    this.add.rectangle(x, y, w, h, C.bg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, C.border);

    // Drawn checkbox box
    const gfx = this.add.graphics();
    gfx.lineStyle(1, C.border);
    gfx.strokeRect(cbX, cbY, cbSize, cbSize);

    // X mark centered inside the box
    const xMark = this.add.text(cbX + cbSize / 2, cbY + cbSize / 2, '', {
      fontFamily: 'monospace', fontSize: '16px', color: C.text,
    }).setOrigin(0.5);

    // Step text — vertically centered in card
    const stepText = this.add.text(cbX + cbSize + 12, y + h / 2, text, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: C.text,
      wordWrap: { width: w - cbSize - 55 },
      lineSpacing: 4,
    }).setOrigin(0, 0.5);

    return { xMark, stepText, bounds: { x, y, w, h } };
  }

  // ─── Timer ─────────────────────────────────────────────────────────────────

  _onAllComplete() {
    const timeUsed = Date.now() - this.startTime;
    this.cameras.main.flash(50, 255, 255, 255);
    this.time.delayedCall(100, () => {
      this.scene.start('ResultScene', {
        timeUsed,
        taskDescription: this.taskDescription,
        steps: this.stepList,
        underTime: timeUsed <= TIMER_DURATION * 1000,
      });
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
        if (remaining <= 0) {
          this.scene.start('ResultScene', {
            timeUsed: TIMER_DURATION * 1000,
            taskDescription: this.taskDescription,
            steps: this.stepList,
            underTime: false,
          });
        }
      },
    });
  }

  _renderTimer() {
    const m = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
    const s = String(this.timeLeft % 60).padStart(2, '0');
    this.bigTimer.setText(`${m}:${s}`);

    if (this.timeLeft === 60) this._startWarningBlink();
    if (this.timeLeft <= 0) this._stopWarningBlink();
  }

  _startWarningBlink() {
    this._blinkEvent = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => { this.bigTimer.setVisible(!this.bigTimer.visible); },
    });
  }

  _stopWarningBlink() {
    if (this._blinkEvent) { this._blinkEvent.destroy(); this._blinkEvent = null; }
    this.bigTimer.setVisible(true);
  }
}
