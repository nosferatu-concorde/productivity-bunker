import BaseScene from './BaseScene.js';

// Fits text into maxLines lines of maxCols chars, breaking at word boundaries.
// Hard-breaks single long words. Truncates with … if content still exceeds.
function fitText(text, maxCols, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const raw of words) {
    const word = raw.length > maxCols ? raw.slice(0, maxCols) : raw;
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCols) {
      lines.push(line);
      if (lines.length >= maxLines) break;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.join('\n');
}

const C = {
  bg: 0xffffff,
  border: 0x333333,
  text: '#222222',
  dim: '#555555',
  success: '#222222',
  fail: '#cc0000',
};

const LIMIT_MS = 25 * 60 * 1000;
const DIGITS   = '0123456789';
const CYCLE_MS = 550;
const TICK_MS  = 40;
const ZOOM     = 1.35;
const ZOOM_MS  = 180;

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
  const timeUsed = Math.floor((1 + Math.random() * 31) * 60 * 1000);
  return {
    timeUsed,
    taskDescription: 'debug task — random data',
    steps: ['write the login endpoint', 'hook up the database', 'test the auth flow'],
    underTime: timeUsed <= LIMIT_MS,
    _debug: true,
  };
}

export default class ResultScene extends BaseScene {
  constructor() {
    super('ResultScene');
  }

  preload() {
    this.load.audio('ding', 'assets/sounds/ding.mp3');
    this.load.audio('wind', 'assets/sounds/wind.mp3');
    this.load.audio('kaching', 'assets/sounds/kaching.mp3');
    this.load.audio('gunshot', 'assets/sounds/gunshot.mp3');
  }

  create() {
    super.create();
    this._playMuffledWind();
    this._ding    = this.sound.add('ding',    { loop: true, volume: 1.4, rate: 1.5 });
    this._kaching = this.sound.add('kaching', { volume: 0.8 });
    this._gunshot = this.sound.add('gunshot', { volume: 0.8 });

    const incoming = this.scene.settings.data;
    const isDebug  = !incoming || incoming.timeUsed == null || incoming._debug === true;
    const data     = isDebug ? randomDebugData() : incoming;

    const { timeUsed, taskDescription = '', steps = [], underTime } = data;

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
      fontFamily: 'monospace', fontSize: '26px',
      color: underTime ? C.text : C.fail,
    }).setOrigin(0.5, 0);

    const sep = this.add.graphics();
    sep.lineStyle(1, 0xcccccc);
    sep.lineBetween(PX + 20, PY + 290, PX + PW - 20, PY + 290);

    if (taskDescription) {
      this.add.text(width / 2, PY + 306, `"${taskDescription}"`, {
        fontFamily: 'monospace', fontSize: '14px', color: C.dim,
        wordWrap: { width: PW - 60 },
      }).setOrigin(0.5, 0);
    }

    // NEW MISSION button — hidden, appears after full sequence
    const btn = this.add.text(width / 2, PY + PH - 52, '[ NEW MISSION ]', {
      fontFamily: 'monospace', fontSize: '20px', color: C.text,
    }).setOrigin(0.5, 0).setAlpha(0);
    btn.setInteractive({ useHandCursor: true });

    // Debug replay button
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

    // ── Animation sequence ────────────────────────────────────────
    const zoomIn  = (t) => this.tweens.add({ targets: t, scale: ZOOM, duration: ZOOM_MS, ease: 'Sine.easeOut' });
    const zoomOut = (t) => this.tweens.add({ targets: t, scale: 1,    duration: ZOOM_MS, ease: 'Sine.easeOut' });

    const runSequence = () => {
    zoomIn(usedVal);
    this._slotReveal(usedVal, fmtTime(timeUsed), () => {
      zoomOut(usedVal);
      this.tweens.add({
        targets: savedVal, scale: ZOOM, duration: ZOOM_MS, ease: 'Sine.easeOut',
        onComplete: () => {
          this._slotReveal(savedVal, savedStr, () => {
            zoomOut(savedVal);
            this._ding.play();
            this.cameras.main.shake(200, 0.005);
            this.tweens.add({
              targets: bonusText, scale: 1.8, duration: ZOOM_MS, ease: 'Sine.easeOut',
              onComplete: () => {
                this._ding.stop();
                this._animateBonus(bonusText, bonusPct, underTime, () => {
                  this._kaching.play();
                  zoomOut(bonusText);
                  this.time.delayedCall(ZOOM_MS + 200, () => {
                    this._showTickets(steps, () => {
                      // Write session stats to registry, track actual applied deltas
                      const reg = this.registry;
                      const prevOxy = reg.get('oxygen')    ?? 100;
                      const prevRat = reg.get('rations')   ?? 100;
                      const prevCiv = reg.get('civilians') ?? 847;

                      const newOxy = Math.min(100, Math.max(0, prevOxy + (underTime ? 5 : -12)));
                      const newRat = Math.min(100, Math.max(0, prevRat + (underTime ? Math.round(bonusPct / 2) : -15)));
                      const newCiv = Math.max(0, prevCiv - (underTime ? 0 : Math.round(overMs / 60000) * 3));

                      reg.set('missions',  (reg.get('missions') ?? 0) + 1);
                      reg.set('oxygen',    newOxy);
                      reg.set('rations',   newRat);
                      reg.set('civilians', newCiv);

                      // Pass actual deltas so StartScene shows what really changed
                      const deltas = {
                        oxygen:    newOxy - prevOxy,
                        rations:   newRat - prevRat,
                        civilians: newCiv - prevCiv,
                        missions:  1,
                      };

                      this.tweens.add({ targets: btn, alpha: 1, duration: 300 });
                      btn.off('pointerdown');
                      btn.on('pointerdown', () => {
                        this.cameras.main.flash(50, 255, 0, 0);
                        this.time.delayedCall(100, () => this.scene.start('StartScene', { underTime, bonusPct, overMs, deltas }));
                      });
                    });
                  });
                });
              },
            });
          });
        },
      });
    });
    }; // end runSequence

    if (this.sound.locked) {
      this.sound.once('unlocked', runSequence);
    } else {
      runSequence();
    }
  }

  // ── Ticket sequence ───────────────────────────────────────────────────────

  _showTickets(steps, onAllDone) {
    const TW      = 238;
    const TH      = 110;
    const GAP     = 12;
    const totalW  = TW * 3 + GAP * 2;
    const startX  = PX + (PW - totalW) / 2;
    const ticketY = PY + 348;

    const checkNext = (i) => {
      if (i >= steps.length) {
        this.time.delayedCall(400, onAllDone);
        return;
      }

      const step = steps[i] || '';
      const x    = startX + i * (TW + GAP);

      const { box, checkbox, label } = this._createTicket(x, ticketY, TW, TH, i + 1, step);

      const all = [box, checkbox, label];
      all.forEach(o => o.setAlpha(0));
      this.tweens.add({ targets: all, alpha: 1, duration: 200 });

      this.time.delayedCall(700, () => {
        checkbox.setText('[x]');
        checkbox.setColor(C.text);
        label.setColor(C.text);
        box.setStrokeStyle(1, 0x222222);
        this._gunshot.play();
        this.cameras.main.shake(70, 0.003);
        this.tweens.add({
          targets: all, scale: 1.04, duration: 80,
          yoyo: true, ease: 'Sine.easeOut',
        });
        this.time.delayedCall(450, () => checkNext(i + 1));
      });
    };

    checkNext(0);
  }

  _createTicket(x, y, w, h, index, step) {
    const pad      = 14;
    const fontSize = 13;
    const colWidth = 8;                          // px per char at 13px monospace
    const maxCols  = Math.floor((w - pad * 2 - 34) / colWidth);
    const fitted   = fitText(step, maxCols, 2);

    const box = this.add.rectangle(x + w / 2, y + h / 2, w, h, C.bg)
      .setStrokeStyle(1, 0x999999);

    this.add.text(x + pad, y + 10, `STEP 0${index}`, {
      fontFamily: 'monospace', fontSize: '12px', color: C.dim,
    });

    const checkbox = this.add.text(x + pad, y + 32, '[ ]', {
      fontFamily: 'monospace', fontSize: '18px', color: C.dim,
    });

    const label = this.add.text(x + pad + 34, y + 33, fitted, {
      fontFamily: 'monospace', fontSize: `${fontSize}px`, color: C.dim,
    });

    return { box, checkbox, label };
  }

  // ── Slot machine reveal ───────────────────────────────────────────────────

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
      this._ding.play();
      this.cameras.main.shake(150, 0.004);
      textObj.setText(display(idx, DIGITS[0]));

      const ev = this.time.addEvent({
        delay: TICK_MS,
        loop: true,
        callback: () => {
          elapsed += TICK_MS;
          textObj.setText(display(idx, DIGITS[Math.floor(Math.random() * DIGITS.length)]));
          if (elapsed >= CYCLE_MS) {
            ev.destroy();
            this._ding.stop();
            locked[idx] = chars[idx];
            idx++;
            next();
          }
        },
      });
    };

    next();
  }

  // ── Bonus counter ─────────────────────────────────────────────────────────

  _animateBonus(text, targetPct, underTime, onDone) {
    if (!underTime || targetPct === 0) {
      text.setText('EFFICIENCY BONUS  +0 pts');
      onDone?.();
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
          onDone?.();
        }
      },
    });
  }

  // ── Stat block ────────────────────────────────────────────────────────────

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
