// === Tap the Fox — screens.js ===
// Cinematic cover scroll — shown on game start and between every level.
//
// Behaviour:
//   1. Three facade images slide in from the right, one by one.
//   2. Each panel holds for a moment, then the next scrolls in.
//   3. After the third panel, a "Tap to play" / "Tap to continue" pill
//      pulses until the player taps.
//   4. A fade-out transition hands control back to game.js.
//
// Public API (called by game.js):
//   showCinematic(options)   — start the sequence
//     options.label          — button text, e.g. 'Tap to play' or 'Tap to continue'
//     options.onComplete     — callback fired when player dismisses
//
// Internal helpers used from game.js:
//   isCinematicActive()      — true while the sequence is running
//   handleCinematicTap()     — call from handleTap() to dismiss when ready

// ─── State ──────────────────────────────────────────────────────
let _cinematicActive   = false;
let _cinematicReady    = false;   // true once all three panels have shown
let _cinematicLabel    = 'Tap to play';
let _cinematicCallback = null;
let _cinematicRafId    = null;

// The three panels — each borrows a facade image from game state.
// Indices into levels[]: use the first three (or fewer if < 3 levels).
const PANEL_COUNT = 3;

// Per-panel animation state
let _panels = [];

// Overall scroll position across the three panels (world units = canvas widths)
let _cinScrollX   = 0;   // current (fractional canvas widths, left = 0)
let _cinTargetX   = 0;   // where we're easing toward
let _cinPhase     = 'scrolling'; // 'scrolling' | 'waiting' | 'ready' | 'dismissing'
let _cinFadeAlpha = 0;   // overlay alpha for fade-in / fade-out
let _cinPulse     = 0;   // time accumulator for button pulse

// Timing constants (ms)
const CIN_SCROLL_DURATION = 900;   // time to scroll between panels
const CIN_HOLD_DURATION   = 900;   // how long each panel holds before next scrolls in
const CIN_FADE_IN         = 500;   // initial dark fade-in

// ─── Public API ─────────────────────────────────────────────────
function isCinematicActive() {
  return _cinematicActive;
}

function showCinematic({ label = 'Tap to play', onComplete = null } = {}) {
  _cinematicActive   = true;
  _cinematicReady    = false;
  _cinematicLabel    = label;
  _cinematicCallback = onComplete;
  _cinScrollX        = 0;
  _cinTargetX        = 0;
  _cinPhase          = 'fadein';
  _cinFadeAlpha      = 1;   // start fully dark, fade in
  _cinPulse          = 0;

  // Build panel list: up to PANEL_COUNT facades, cycling if fewer levels
  _panels = [];
  for (let i = 0; i < PANEL_COUNT; i++) {
    const lvlIndex = i % levels.length;
    _panels.push({
      lvlIndex,
      offsetX: i,    // panel i sits at world-x = i (in canvas-width units)
    });
  }

  // Schedule the scroll sequence
  _scheduleCinematic();

  if (_cinematicRafId) cancelAnimationFrame(_cinematicRafId);
  _cinematicRafId = requestAnimationFrame(_drawCinematic);
}

function handleCinematicTap() {
  if (!_cinematicActive) return false;
  if (!_cinematicReady)  return true;  // absorb tap but don't dismiss yet mid-scroll

  _dismissCinematic();
  return true;
}

// ─── Scheduling ─────────────────────────────────────────────────
// Drives the panel sequence with chained timeouts:
//   fade-in → hold panel 0 → scroll to 1 → hold → scroll to 2 → hold → ready
function _scheduleCinematic() {
  let t = CIN_FADE_IN + CIN_HOLD_DURATION;

  for (let i = 1; i < PANEL_COUNT; i++) {
    const targetPanel = i;
    setTimeout(() => {
      if (!_cinematicActive) return;
      _cinPhase   = 'scrolling';
      _cinTargetX = targetPanel;
    }, t);
    t += CIN_SCROLL_DURATION + CIN_HOLD_DURATION;
  }

  // After last panel holds, show the tap button
  setTimeout(() => {
    if (!_cinematicActive) return;
    _cinPhase       = 'ready';
    _cinematicReady = true;
  }, t);
}

// ─── Dismiss ────────────────────────────────────────────────────
function _dismissCinematic() {
  _cinPhase = 'dismissing';
  const startTime = performance.now();
  const duration  = 350;

  function fade(now) {
    const t       = Math.min((now - startTime) / duration, 1);
    _cinFadeAlpha = t;   // fade to black

    if (t < 1) {
      requestAnimationFrame(fade);
    } else {
      _cinematicActive = false;
      if (_cinematicCallback) _cinematicCallback();
    }
  }
  requestAnimationFrame(fade);
}

// ─── Draw loop ──────────────────────────────────────────────────
function _drawCinematic() {
  if (!_cinematicActive) return;

  const W = canvas.width;
  const H = canvas.height;

  // ── Ease scroll position ──
  if (_cinPhase === 'scrolling') {
    const diff = _cinTargetX - _cinScrollX;
    _cinScrollX += diff * 0.07;   // exponential ease-out
    if (Math.abs(diff) < 0.002) {
      _cinScrollX = _cinTargetX;
      _cinPhase   = 'waiting';
    }
  }

  // ── Fade-in: reduce overlay alpha ──
  if (_cinPhase === 'fadein') {
    _cinFadeAlpha = Math.max(0, _cinFadeAlpha - 0.035);
    if (_cinFadeAlpha <= 0) _cinPhase = 'waiting';
  }

  // ── Black base ──
  ctx.fillStyle = '#0d0805';
  ctx.fillRect(0, 0, W, H);

  // ── Draw each panel ──
  _panels.forEach((panel, idx) => {
    const s   = state[panel.lvlIndex];
    const img = s ? s.facadeImg : null;

    // Screen x for this panel
    const panelScreenX = (panel.offsetX - _cinScrollX) * W;

    // Skip if off screen
    if (panelScreenX + W < -W * 0.1 || panelScreenX > W * 1.1) return;

    if (img) {
      // Draw facade fitted to canvas height, centred in its panel slot
      const dw  = Math.round((img.naturalWidth / img.naturalHeight) * H);
      const dx  = panelScreenX + (W - dw) / 2;

      // Dim the non-active panels slightly
      const distFromCentre = Math.abs(panel.offsetX - _cinScrollX);
      const dimAlpha       = Math.max(0.45, 1 - distFromCentre * 0.4);

      ctx.save();
      ctx.globalAlpha = dimAlpha;
      ctx.drawImage(img, dx, 0, dw, H);
      ctx.restore();

      // Dark gradient overlay — heavier at edges, lighter in centre
      // so the title text is always legible
      const grad = ctx.createLinearGradient(panelScreenX, 0, panelScreenX + W, 0);
      grad.addColorStop(0,   'rgba(0,0,0,0.55)');
      grad.addColorStop(0.2, 'rgba(0,0,0,0.18)');
      grad.addColorStop(0.8, 'rgba(0,0,0,0.18)');
      grad.addColorStop(1,   'rgba(0,0,0,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(panelScreenX, 0, W, H);

      // Bottom vignette — keeps button area readable
      const vbot = ctx.createLinearGradient(0, H * 0.55, 0, H);
      vbot.addColorStop(0, 'rgba(0,0,0,0)');
      vbot.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = vbot;
      ctx.fillRect(panelScreenX, 0, W, H);

    } else {
      // Placeholder while image loads
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(panelScreenX, 0, W, H);
    }
  });

  // ── Title block (fixed on screen, not scrolling) ──
  _drawCinematicTitle();

  // ── Tap button (only when ready) ──
  if (_cinematicReady && _cinPhase === 'ready') {
    _cinPulse += 0.016;
    _drawTapButton();
  }

  // ── Fade overlay (fade-in or dismiss) ──
  if (_cinFadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${_cinFadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  _cinematicRafId = requestAnimationFrame(_drawCinematic);
}

function _drawCinematicTitle() {
  const W = canvas.width;
  const H = canvas.height;

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Fox emoji
  ctx.font      = `${Math.round(W * 0.13)}px serif`;
  ctx.fillStyle = '#fff8e1';
  ctx.fillText('🦊', W / 2, H * 0.36);

  // Game title
  ctx.font      = `bold ${Math.round(W * 0.078)}px serif`;
  ctx.fillStyle = '#ffd580';
  // Soft text shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur    = 12;
  ctx.fillText('Tap the Fox', W / 2, H * 0.50);
  ctx.shadowBlur    = 0;

  // Subtitle
  ctx.font      = `${Math.round(W * 0.037)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,248,225,0.65)';
  ctx.fillText('Find the fox hidden in each facade', W / 2, H * 0.585);
}

function _drawTapButton() {
  const W      = canvas.width;
  const H      = canvas.height;
  const pulse  = 0.82 + 0.18 * Math.sin(_cinPulse * 3.2);
  const pillW  = Math.min(Math.round(W * 0.56), 280);
  const pillH  = 52;
  const pillX  = (W - pillW) / 2;
  const pillY  = H * 0.72;

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = 'rgba(245,166,35,0.92)';
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font         = `bold ${Math.round(W * 0.043)}px sans-serif`;
  ctx.fillStyle    = '#1a1008';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(_cinematicLabel, W / 2, pillY + pillH / 2);
  ctx.restore();
}