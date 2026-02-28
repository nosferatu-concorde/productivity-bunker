import BaseScene from './BaseScene.js';

const C = {
  bg: 0xffffff,
  border: 0x333333,
  text: '#222222',
  dim: '#999999',
  success: '#222222',
  fail: '#cc0000',
};

const LIMIT_MS = 25 * 60 * 1000;
const DIGITS   = '0123456789';
const CYCLE_MS = 550;
const TICK_MS  = 40;

const PX = 10;
const PY = 10;
const PW = 780;
const PH = 580;

function fmtTime(ms) {
  const totalSec = Math.abs(Math.floor(ms / 1000));
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function randomDebugData() {
  // Random time between 1 min and 32 min — sometimes under, sometimes over
  const timeUsed = Math.floor((1 + Math.random() * 31) * 60 * 1000);
  return {
    timeUsed,
    taskDescription: 'debug task — random data',
    underTime: timeUsed <= LIMIT_MS,
    _debug: true,
  };
}

export default class ResultScene extends BaseScene {
  constructor() {
    super('ResultScene');
  }

  create() {
    super.create();

    const incoming = this.scene.settings.data;
    const isDebug  = !incoming || incoming.timeUsed == null || incoming._debug === true;
    const data     = isDebug ? randomDebugData() : incoming;

    const { timeUsed, taskDescription = '', underTime } = data;

    const timeSavedMs = LIMIT_MS - timeUsed;
    const overMs      = underTime ? 0 : -timeSavedMs;
    const bonusPct    = underTime ? Math.round((timeSavedMs / LIMIT_MS) * 100) : 0;

    const { width } = this.scale;

    this.add.rectangle(0, 0, width, 600, C.bg).setOrigin(0, 0);
    this.add.rectangle(PX + PW / 2, PY + PH / 2, PW, PH, C.bg)
      .setStrokeStyle(1, C.border);

    this.add.text(PX + 10, PY + 8, '[ MISSION REPORT ]', {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    });

    const verdict      = underTime ? 'DIRECTIVE COMPLETED.' : 'TIME EXCEEDED.';
    const verdictColor = underTime ? C.success : C.fail;
    this.add.text(width / 2, PY + 42, verdict, {
      fontFamily: 'monospace', fontSize: '28px', color: verdictColor,
    }).setOrigin(0.5, 0);

    const colL  = PX + PW * 0.25;
    const colR  = PX + PW * 0.75;
    const statY = PY + 100;

    const usedVal  = this._statBlock(colL, statY, '00:00', 'time used');
    const savedStr = underTime ? `+${fmtTime(timeSavedMs)}` : `\u2212${fmtTime(overMs)}`;
    const savedVal = this._statBlock(colR, statY, savedStr.replace(/\d/g, '0'),
      underTime ? 'time saved' : 'over limit',
      underTime ? C.text : C.fail);

    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0xcccccc);
    gfx.lineBetween(width / 2, statY, width / 2, statY + 110);

    const bonusText = this.add.text(width / 2, PY + 252, 'EFFICIENCY BONUS  +0 pts', {
      fontFamily: 'monospace', fontSize: '18px',
      color: underTime ? C.text : C.fail,
    }).setOrigin(0.5, 0).setAlpha(0);

    const sep = this.add.graphics();
    sep.lineStyle(1, 0xcccccc);
    sep.lineBetween(PX + 20, PY + 290, PX + PW - 20, PY + 290);

    if (taskDescription) {
      this.add.text(width / 2, PY + 306, `"${taskDescription}"`, {
        fontFamily: 'monospace', fontSize: '14px', color: C.dim,
        wordWrap: { width: PW - 60 },
      }).setOrigin(0.5, 0);
    }

    // ── New mission button ────────────────────────────────────────
    const btn = this.add.text(width / 2, PY + PH - 52, '[ NEW MISSION ]', {
      fontFamily: 'monospace', fontSize: '20px', color: C.text,
    }).setOrigin(0.5, 0);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.cameras.main.flash(50, 255, 0, 0);
      this.time.delayedCall(100, () => this.scene.start('InterrogationScene'));
    });

    // ── Debug replay button (scene-level pointer — bypasses PostFX hit issues) ──
    let replayBounds = null;
    if (isDebug) {
      const replay = this.add.text(PX + PW - 10, PY + PH - 52, '[ replay ]', {
        fontFamily: 'monospace', fontSize: '13px', color: C.dim,
      }).setOrigin(1, 0);

      replayBounds = {
        x: replay.x - replay.width,
        y: replay.y,
        w: replay.width,
        h: replay.height,
      };

      this.input.on('pointermove', (p) => {
        if (!replayBounds) return;
        const { x, y, w, h } = replayBounds;
        const hit = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
        replay.setColor(hit ? C.text : C.dim);
      });

      this.input.on('pointerdown', (p) => {
        if (!replayBounds) return;
        const { x, y, w, h } = replayBounds;
        if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) {
          this.scene.start('ResultScene', randomDebugData());
        }
      });
    }

    // ── Slot animations: left first, then right, then bonus ───────
    const ZOOM    = 1.18;
    const ZOOM_MS = 180;

    const zoomIn  = (t) => this.tweens.add({ targets: t, scale: ZOOM, duration: ZOOM_MS, ease: 'Sine.easeOut' });
    const zoomOut = (t) => this.tweens.add({ targets: t, scale: 1,    duration: ZOOM_MS, ease: 'Sine.easeOut' });

    zoomIn(usedVal);
    this._slotReveal(usedVal, fmtTime(timeUsed), () => {
      zoomOut(usedVal);
      this.tweens.add({
        targets: savedVal, scale: ZOOM, duration: ZOOM_MS, ease: 'Sine.easeOut',
        onComplete: () => {
          this._slotReveal(savedVal, savedStr, () => {
            zoomOut(savedVal);
            this._animateBonus(bonusText, bonusPct, underTime);
          });
        },
      });
    });
  }

  _slotReveal(textObj, finalStr, onDone) {
    const chars  = finalStr.split('');
    const locked = chars.map(() => null);

    const display = (spinIdx, spinChar) => chars.map((ch, i) => {
      if (locked[i] !== null) return locked[i];
      if (i === spinIdx)      return spinChar;
      return /\d/.test(ch) ? '0' : ch;
    }).join('');

    let idx = 0;

    const next = () => {
      while (idx < chars.length && !/\d/.test(chars[idx])) {
        locked[idx] = chars[idx];
        idx++;
      }
      if (idx >= chars.length) {
        textObj.setText(finalStr);
        onDone?.();
        return;
      }

      let elapsed = 0;
      textObj.setText(display(idx, DIGITS[0]));

      const ev = this.time.addEvent({
        delay: TICK_MS,
        loop: true,
        callback: () => {
          elapsed += TICK_MS;
          textObj.setText(display(idx, DIGITS[Math.floor(Math.random() * DIGITS.length)]));
          if (elapsed >= CYCLE_MS) {
            ev.destroy();
            locked[idx] = chars[idx];
            idx++;
            next();
          }
        },
      });
    };

    next();
  }

  _animateBonus(text, targetPct, underTime) {
    text.setAlpha(1);
    if (!underTime || targetPct === 0) {
      text.setText('EFFICIENCY BONUS  +0 pts');
      return;
    }
    let elapsed = 0;
    const duration = 600;
    const ev = this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => {
        elapsed += TICK_MS;
        const t = Math.min(elapsed / duration, 1);
        text.setText(`EFFICIENCY BONUS  +${Math.round(t * targetPct)} pts`);
        if (elapsed >= duration) {
          ev.destroy();
          text.setText(`EFFICIENCY BONUS  +${targetPct} pts`);
        }
      },
    });
  }

  _statBlock(cx, y, value, label, valueColor = C.text) {
    const val = this.add.text(cx, y, value, {
      fontFamily: 'monospace', fontSize: '64px', color: valueColor,
    }).setOrigin(0.5, 0);

    this.add.text(cx, y + 80, label, {
      fontFamily: 'monospace', fontSize: '13px', color: C.dim,
    }).setOrigin(0.5, 0);

    return val;
  }
}
