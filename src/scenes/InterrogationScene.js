import BaseScene from './BaseScene.js';
import MistralAPI from '../systems/MistralAPI.js';

const C = {
  bg: 0xffffff,
  border: 0x333333,
  text: '#222222',
  dim: '#999999',
  green: '#222222',
  red: '#cc0000',
  orange: '#cc5500',
};

const PX = 10;
const PY = 10;
const PW = 780;
const PH = 580;
const INPUT_H = 28;
const TYPEWRITER_MS = 18;

export default class InterrogationScene extends BaseScene {
  constructor() {
    super('InterrogationScene');
  }

  create() {
    super.create();

    this.history = [];
    this.tasks = [];
    this.chatLines = [];
    this.inputBuffer = '';
    this.inputDisabled = true;
    this.waiting = false;
    this.timerRunning = false;
    this.turn = 0;
    this.maxTurns = 3;

    this._buildLayout();
    this._buildInput();

    this.mistral = new MistralAPI();
    this._overlordSpeak('The worker has entered the interrogation chamber. This is attempt 1 of 3. What are you building in the next 25 minutes? Be specific.');
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  _buildLayout() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, C.bg).setOrigin(0, 0);

    // panel
    this._border(PX, PY, PW, PH);
    this.add.text(PX + 10, PY + 8, '[ OVERLORD TRANSMISSION ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.green,
    });

    // turn counter — top right
    this.turnText = this.add.text(PX + PW - 10, PY + 8, 'ATTEMPT 0/3', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    }).setOrigin(1, 0);

    // chat output
    this.chatText = this.add.text(PX + 10, PY + 30, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: C.text,
      wordWrap: { width: PW - 20 },
      lineSpacing: 8,
    });

  }

  _border(x, y, w, h) {
    this.add.rectangle(x + w / 2, y + h / 2, w, h, C.bg)
      .setStrokeStyle(1, C.border);
  }

  _showModal(tasks) {
    const cx = 400, cy = 300;
    const mw = 500, mh = 260 + tasks.length * 24;

    this.modalObjects = [];
    const track = (obj) => { this.modalObjects.push(obj); return obj; };

    track(this.add.rectangle(cx, cy, 800, 600, 0x000000, 0.88));
    track(this.add.rectangle(cx, cy, mw, mh, 0xffffff).setStrokeStyle(1, C.border));
    track(this.add.text(cx, cy - mh / 2 + 14, '[ YOUR DIRECTIVES ]', {
      fontFamily: 'monospace', fontSize: '14px', color: C.green,
    }).setOrigin(0.5, 0));

    const taskStr = tasks.length
      ? tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')
      : '(no tasks extracted)';

    track(this.add.text(cx, cy - mh / 2 + 40, taskStr, {
      fontFamily: 'monospace', fontSize: '15px', color: C.text,
      wordWrap: { width: mw - 40 }, lineSpacing: 6,
    }).setOrigin(0.5, 0));

    const btn = track(this.add.text(0, cy + mh / 2 - 28, '[ START TIMER ]', {
      fontFamily: 'monospace', fontSize: '18px', color: C.green,
    }));
    btn.setX(cx - btn.width / 2);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this._startTimer());
  }

  // ─── Canvas Input ──────────────────────────────────────────────────────────

  _buildInput() {
    const iy = PY + PH - INPUT_H - 8;
    const ix = PX + 10;
    const iw = PW - 20;

    this.add.rectangle(ix + iw / 2, iy + INPUT_H / 2, iw, INPUT_H, C.bg)
      .setStrokeStyle(1, C.border);

    this.add.text(ix + 4, iy + 4, '>', {
      fontFamily: 'monospace', fontSize: '13px', color: C.green,
    });

    this.inputText = this.add.text(ix + 16, iy + 4, '', {
      fontFamily: 'monospace', fontSize: '20px', color: C.text,
    });

    this.cursor = this.add.text(ix + 16, iy + 4, '_', {
      fontFamily: 'monospace', fontSize: '20px', color: C.green,
    });

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => { this.cursor.setVisible(!this.cursor.visible); },
    });

    this.input.keyboard.on('keydown', (e) => {
      if (this.inputDisabled) return;

      if (e.key === 'Enter') {
        const val = this.inputBuffer.trim();
        if (val) {
          this.inputBuffer = '';
          this._updateInputDisplay();
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
        this.inputBuffer += e.key;
        this._updateInputDisplay();
      }
    });
  }

  _updateInputDisplay() {
    this.inputText.setText(this.inputBuffer);
    this.cursor.setX(this.inputText.x + this.inputText.width + 2);
  }

  // ─── Chat logic ────────────────────────────────────────────────────────────

  _overlordSpeak(prompt) {
    this.waiting = true;
    this.inputDisabled = true;
    this.history.push({ role: 'user', content: prompt });
    this._startWaitingDots();

    this.mistral.send(this.history)
      .then((res) => this._onResponse(res))
      .catch((err) => {
        this._stopWaitingDots();
        this._appendChat(`[ ERROR ] ${err.message}`, C.red);
        this.waiting = false;
        this.inputDisabled = false;
      });
  }

  _playerSend(text) {
    this.turn = Math.min(this.turn + 1, this.maxTurns);
    this.turnText.setText(`ATTEMPT ${this.turn}/${this.maxTurns}`)
      .setColor(this.turn === this.maxTurns ? C.red : C.green);

    this.chatLines = [];
    this._appendChat(`> ${text}`, C.dim);
    const content = `This is attempt ${this.turn} of ${this.maxTurns}. Worker says: ${text}`;
    this.history.push({ role: 'user', content });
    this.waiting = true;
    this.inputDisabled = true;
    this._startWaitingDots();

    this.mistral.send(this.history)
      .then((res) => this._onResponse(res))
      .catch((err) => {
        this._stopWaitingDots();
        this._appendChat(`[ ERROR ] ${err.message}`, C.red);
        this.waiting = false;
        this.inputDisabled = false;
      });
  }

  _onResponse(message) {
    this._stopWaitingDots();
    this.chatLines = [];
    this.history.push({ role: 'assistant', content: message });

    const isDone = this.turn >= this.maxTurns;
    this._typewrite(`OVERLORD: ${message}`, () => {
      this.waiting = false;
      if (!isDone) {
        this.inputDisabled = false;
      } else {
        this._extractTasks();
      }
    });
  }

  _extractTasks() {
    this._appendChat('[ COMPILING DIRECTIVES... ]', C.dim);
    const userOnly = this.history.filter(m => m.role === 'user');
    this.mistral.extractTasks(userOnly)
      .then((tasks) => {
        this._removeLastLine();
        this.tasks = tasks;
        this._showModal(tasks);
      })
      .catch(() => {
        this._removeLastLine();
        this._showModal([]);
      });
  }

  _startWaitingDots() {
    const frames = ['[  .  ]', '[ ..  ]', '[ ... ]'];
    let i = 0;
    this._appendChat(frames[0], C.dim);
    this._dotsEvent = this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        i = (i + 1) % frames.length;
        this.chatLines[this.chatLines.length - 1].line = frames[i];
        this._renderChat();
      },
    });
  }

  _stopWaitingDots() {
    if (this._dotsEvent) {
      this._dotsEvent.destroy();
      this._dotsEvent = null;
    }
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
    const visible = this.chatLines.slice(-28);
    this.chatText.setText(visible.map(l => l.line).join('\n'));
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

  // ─── Timer ─────────────────────────────────────────────────────────────────

  _startTimer() {
    if (this.timerRunning) return;
    this.timerRunning = true;
    this.scene.start('TodoScene', { tasks: this.tasks });
  }
}
