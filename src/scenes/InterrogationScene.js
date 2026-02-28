import BaseScene from './BaseScene.js';
import MistralAPI, { FALLBACKS } from '../systems/MistralAPI.js';

const C = {
  bg: 0xffffff,
  border: 0x333333,
  text: '#222222',
  dim: '#999999',
  green: '#222222',
};

const PX = 10;
const PY = 10;
const PW = 780;
const PH = 580;
const INPUT_H = 28;
const TYPEWRITER_MS = 18;
const MAX_INPUT = 150;

const STEP_LABELS = ['', 'TASK', 'STEP 1/3', 'STEP 2/3', 'STEP 3/3', 'DONE STD'];

// Steps that skip the API and use hardcoded Overlord lines
const HARDCODED = {
  step2: 'Logged. Step 2 — what is it, citizen?',
  step3: 'Logged. Step 3 — the final action. Make it count.',
};

export default class InterrogationScene extends BaseScene {
  constructor() {
    super('InterrogationScene');
  }

  create() {
    super.create();

    this.step = 0;
    this.taskDescription = '';
    this.step1 = '';
    this.step2 = '';
    this.step3 = '';
    this.doneStandard = '';
    this.conversationHistory = [];

    this.chatLines = [];
    this.inputBuffer = '';
    this.inputDisabled = true;

    this._buildLayout();
    this._buildInput();

    this.mistral = new MistralAPI();

    this._typewrite('OVERLORD: Good citizen, what is your contribution today, an excuse to stay alive?', () => {
      this._showHint();
      this.inputDisabled = false;
    });
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  _buildLayout() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, C.bg).setOrigin(0, 0);

    this._border(PX, PY, PW, PH);
    this.add.text(PX + 10, PY + 8, '[ OVERLORD TRANSMISSION ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.green,
    });

    this.stepLabel = this.add.text(PX + PW - 10, PY + 8, '', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    }).setOrigin(1, 0);

    this.chatText = this.add.text(PX + 10, PY + 30, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: C.text,
      wordWrap: { width: PW - 20 },
      lineSpacing: 8,
    });

    this.hintText = this.add.text(PX + 10, PY + 110, '(What is your next task? Give a short description for it.)', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: C.dim,
      wordWrap: { width: PW - 20 },
      lineSpacing: 8,
    }).setAlpha(0);
  }

  _border(x, y, w, h) {
    this.add.rectangle(x + w / 2, y + h / 2, w, h, C.bg)
      .setStrokeStyle(1, C.border);
  }

  // ─── Canvas Input ──────────────────────────────────────────────────────────

  _buildInput() {
    const iy = PY + PH - INPUT_H - 8;
    const ix = PX + 10;
    const iw = PW - 20;

    this.add.rectangle(ix + iw / 2, iy + INPUT_H / 2, iw, INPUT_H, C.bg)
      .setStrokeStyle(1, C.border);

    this.add.text(ix + 4, iy + 4, '>', {
      fontFamily: 'monospace', fontSize: '20px', color: C.green,
    });

    this.inputText = this.add.text(ix + 20, iy + 4, '', {
      fontFamily: 'monospace', fontSize: '20px', color: C.text,
    });

    this.cursor = this.add.text(ix + 20, iy + 4, '_', {
      fontFamily: 'monospace', fontSize: '20px', color: C.green,
    });

    this.time.addEvent({
      delay: 500, loop: true,
      callback: () => { this.cursor.setVisible(!this.cursor.visible); },
    });

    this.input.keyboard.on('keydown', (e) => {
      if (this.inputDisabled) return;

      if (e.key === 'Enter') {
        const val = this.inputBuffer.trim();
        this.inputBuffer = '';
        this._updateInputDisplay();
        if (!val) {
          this._typewrite('OVERLORD: Silence is not a directive, worker.', () => {
            this.inputDisabled = false;
          });
        } else {
          this._playerSend(val);
        }
        return;
      }

      if (e.key === 'Backspace') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this._updateInputDisplay();
        return;
      }

      if (e.key.length === 1 && this.inputBuffer.length < MAX_INPUT) {
        this.inputBuffer += e.key;
        this._updateInputDisplay();
      }
    });
  }

  _updateInputDisplay() {
    this.inputText.setText(this.inputBuffer);
    this.cursor.setX(this.inputText.x + this.inputText.width + 2);
  }

  // ─── Step machine ──────────────────────────────────────────────────────────

  _playerSend(text) {
    this.step++;
    this.stepLabel.setText(STEP_LABELS[this.step] || '');

    if (this.step === 1) this.taskDescription = text;
    if (this.step === 2) this.step1 = text;
    if (this.step === 3) this.step2 = text;
    if (this.step === 4) this.step3 = text;
    if (this.step === 5) this.doneStandard = text;

    this.tweens.killTweensOf(this.hintText);
    this.hintText.setAlpha(0);

    this.chatLines = [];
    this._appendChat(`> ${text}`, C.dim);
    this.inputDisabled = true;
    this._startWaitingDots();

    const prompt = this._buildPrompt(this.step, text);
    const hardcoded = HARDCODED[`step${this.step}`];

    if (hardcoded) {
      // Skip API — respond instantly, still record to history for LLM context later
      this.time.delayedCall(400, () => this._onResponse(prompt, hardcoded));
    } else {
      this.mistral.sendStep(prompt, this.conversationHistory)
        .then((msg) => this._onResponse(prompt, msg))
        .catch(() => this._onResponse(prompt, FALLBACKS[`step${this.step}`] || ''));
    }
  }

  _onResponse(userPrompt, message) {
    this._stopWaitingDots();
    this.conversationHistory.push({ role: 'user', content: userPrompt });
    this.conversationHistory.push({ role: 'assistant', content: message });
    this.chatLines = [];

    this._typewrite(`OVERLORD: ${message}`, () => {
      if (this.step === 5) {
        this.time.delayedCall(1500, () => this._showStartButton());
      } else {
        if (this.step === 1) {
          this.hintText.setText('(Split the task in three small parts. What is task 1?)');
          this._showHint();
        } else if (this.step === 2) {
          this.hintText.setText('(Split the task in three small parts. What is task 2?)');
          this._showHint();
        } else if (this.step === 3) {
          this.hintText.setText('(Split the task in three small parts. What is task 3?)');
          this._showHint();
        } else if (this.step === 4) {
          this.hintText.setText('(What does good enough look like? When is this task done?)');
          this._showHint();
        }
        this.inputDisabled = false;
      }
    });
  }

  _buildPrompt(step, playerInput) {
    const { taskDescription, step1, step2 } = this;
    switch (step) {
      case 1:
        return `Task logged: "${playerInput}". Coldly acknowledge it in one sentence. Then ask what step 1 is. Orwellian tone, no warmth. 2 sentences.`;
      case 2:
        return `Task: "${taskDescription}". Step 1: "${playerInput}".`;
      case 3:
        return `Step 2: "${playerInput}".`;
      case 4:
        return `Task: "${taskDescription}". Steps: "${step1}" / "${step2}" / "${playerInput}". All steps logged. Command them to close all distractions now. Ask what good enough looks like for this task. 2 sentences.`;
      case 5:
        return `Task: "${taskDescription}". Steps: "${step1}" / "${step2}" / "${this.step3}". Done standard: "${playerInput}". Deliver the final sendoff. Good enough ships, perfect does not. 25 minutes. End with exactly: "DIRECTIVE ACCEPTED. TIMER INITIATED." 2 sentences.`;
      default:
        return playerInput;
    }
  }

  // ─── Start button ──────────────────────────────────────────────────────────

  _showStartButton() {
    const { width, height } = this.scale;
    const btn = this.add.text(0, height / 2 + 60, '[ INITIATE WORK SEQUENCE ]', {
      fontFamily: 'monospace', fontSize: '22px', color: C.green,
    });
    btn.setX(width / 2 - btn.width / 2);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.cameras.main.flash(50, 255, 0, 0);
      this.time.delayedCall(100, () => {
        this.scene.start('TodoScene', {
          taskDescription: this.taskDescription,
          steps: [this.step1, this.step2, this.step3],
          doneStandard: this.doneStandard,
        });
      });
    });
  }

  // ─── Hint helpers ──────────────────────────────────────────────────────────

  _showHint() {
    this.hintText.setY(this.chatText.y + this.chatText.height + 20);
    this.hintText.setAlpha(0);
    this.tweens.add({
      targets: this.hintText,
      alpha: 1,
      duration: 900,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: this.hintText,
          alpha: 0.35,
          duration: 1800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          loop: -1,
        });
      },
    });
  }

  // ─── Chat helpers ──────────────────────────────────────────────────────────

  _startWaitingDots() {
    const frames = ['[  .  ]', '[ ..  ]', '[ ... ]'];
    let i = 0;
    this._appendChat(frames[0], C.dim);
    this._dotsEvent = this.time.addEvent({
      delay: 350, loop: true,
      callback: () => {
        i = (i + 1) % frames.length;
        this.chatLines[this.chatLines.length - 1].line = frames[i];
        this._renderChat();
      },
    });
  }

  _stopWaitingDots() {
    if (this._dotsEvent) { this._dotsEvent.destroy(); this._dotsEvent = null; }
    this._removeLastLine();
  }

  _appendChat(line, color = C.text) {
    this.chatLines.push({ line, color });
    this._renderChat();
  }

  _removeLastLine() {
    this.chatLines.pop();
    this._renderChat();
  }

  _renderChat() {
    this.chatText.setText(this.chatLines.slice(-24).map(l => l.line).join('\n'));
  }

  _typewrite(text, onDone) {
    this._appendChat('');
    let i = 0;
    const idx = this.chatLines.length - 1;
    this.time.addEvent({
      delay: TYPEWRITER_MS,
      repeat: text.length - 1,
      callback: () => {
        this.chatLines[idx].line += text[i++];
        this._renderChat();
        if (i === text.length && onDone) onDone();
      },
    });
  }
}
