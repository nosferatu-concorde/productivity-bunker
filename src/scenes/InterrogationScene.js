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
const MAX_INPUT = 60;

const STEP_LABELS = ['', 'TASK', 'STEP 1/3', 'STEP 2/3', 'STEP 3/3', 'DONE STD'];

const HARDCODED = {
  step2: 'Logged. Step 2 — what is it, citizen?',
  step3: 'Logged. Step 3 — the final action. Make it count.',
};

const FLAVOR_PROMPT = 'You are the AI Overlord of the last human bunker. Add one short cold Orwellian remark — pick from themes like: oxygen ration levels, sector productivity scores, civilian morale index, bunker structural integrity, the surface being uninhabitable, quota compliance. Do not ask a question. Do not reference any specific task. 1 sentence only.';

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

    this._typewrite('AI OVERLORD: Greetings good citizen, what is your contribution today? Meet your quouta and prosper?', () => {
      this.hintText.setText('  (What is your next task? Give a short description for it.)');
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

    this.hintText = this.add.text(PX + 10, PY + 110, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: C.dim,
      wordWrap: { width: PW - 20 },
      lineSpacing: 8,
    });
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

    this.charCount = this.add.text(ix + iw - 4, iy - 20, `0/${MAX_INPUT}`, {
      fontFamily: 'monospace', fontSize: '14px', color: C.dim,
    }).setOrigin(1, 0);

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

      if (e.key.length === 1) {
        if (this.inputBuffer.length < MAX_INPUT) {
          this.inputBuffer += e.key;
          this._updateInputDisplay();
        } else {
          this.cameras.main.shake(120, 0.004);
        }
      }
    });
  }

  _updateInputDisplay() {
    this.inputText.setText(this.inputBuffer);
    this.cursor.setX(this.inputText.x + this.inputText.width + 2);
    const len = this.inputBuffer.length;
    this.charCount.setText(`${len}/${MAX_INPUT}`);
    this.charCount.setColor(len >= MAX_INPUT ? '#cc0000' : C.dim);
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

    if (this._hintEvent) { this._hintEvent.destroy(); this._hintEvent = null; }
    this.hintText.setText('');

    this.chatLines = [];
    this._appendChat(`> ${text}`, C.dim);
    this.inputDisabled = true;
    this._startWaitingDots();

    const prompt = this._buildPrompt(this.step, text);
    const hardcoded = HARDCODED[`step${this.step}`];

    if (hardcoded) {
      this.mistral.sendStep(FLAVOR_PROMPT, this.conversationHistory)
        .then((flavor) => this._onResponse(prompt, `${hardcoded} ${flavor}`))
        .catch(() => this._onResponse(prompt, hardcoded));
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
        this._appendCollectedSteps();
        if (this.step === 1) {
          this.hintText.setText('  (Split the task in three small parts. What is task 1?)');
          this._showHint();
        } else if (this.step === 2) {
          this.hintText.setText('  (Split the task in three small parts. What is task 2?)');
          this._showHint();
        } else if (this.step === 3) {
          this.hintText.setText('  (Split the task in three small parts. What is task 3?)');
          this._showHint();
        } else if (this.step === 4) {
          this.hintText.setText('  (What does good enough look like? When is this task done?)');
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
        return `Task logged: "${playerInput}". Coldly acknowledge it in one sentence — you may reference bunker survival stakes, quota systems, oxygen rations, or sector productivity scores to underline why this matters. Then ask what step 1 is. Orwellian tone, no warmth. 2 sentences.`;
      case 2:
        return `Task: "${taskDescription}". Step 1: "${playerInput}".`;
      case 3:
        return `Step 2: "${playerInput}".`;
      case 4:
        return `Task: "${taskDescription}". Steps: "${step1}" / "${step2}" / "${playerInput}". All steps logged. Command them to shut off all bunker distractions right now — pick 2 or 3 specific ones from: bunker radio, ration entertainment feed, civilian comms channel, morale screen, sector gossip terminal, personal device. Then ask what good enough looks like for this task. Orwellian tone. 2 sentences.`;
      case 5:
        return `Task: "${taskDescription}". Steps: "${step1}" / "${step2}" / "${this.step3}". Done standard: "${playerInput}". Deliver the final sendoff — remind them that bunker survival depends on output, not perfection. You may reference ration allocation, oxygen reserves, or sector ranking to raise the stakes. 25 minutes on the clock. End with exactly: "DIRECTIVE ACCEPTED. TIMER INITIATED." 2 sentences.`;
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

  // ─── Collected steps display ───────────────────────────────────────────────

  _appendCollectedSteps() {
    const entries = [];
    if (this.step >= 2 && this.step1) entries.push(this.step1);
    if (this.step >= 3 && this.step2) entries.push(this.step2);
    if (this.step >= 4 && this.step3) entries.push(this.step3);

    this._appendChat('', C.dim);
    if (this.taskDescription) this._appendChat(`  TASK: ${this.taskDescription}`, C.dim);
    entries.forEach((s, i) => this._appendChat(`  ${i + 1}. ${s}`, C.dim));
  }

  // ─── Hint helpers ──────────────────────────────────────────────────────────

  _showHint() {
    if (this._hintEvent) { this._hintEvent.destroy(); this._hintEvent = null; }
    this.hintText.setY(this.chatText.y + this.chatText.height + 20);
    const full = this.hintText.text;
    this.hintText.setText('');
    let i = 0;
    this._hintEvent = this.time.addEvent({
      delay: TYPEWRITER_MS,
      repeat: full.length - 1,
      callback: () => { this.hintText.setText(full.slice(0, ++i)); },
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
