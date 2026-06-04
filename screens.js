// screens.js — Phase 7: Pre-roll cinematic scroll engine
// The last PREROLL_COUNT facades are placed virtually to the LEFT of facade_01.
// On load / between levels the camera starts there and scrolls right to land
// on the target facade. No separate cover images needed.

(function () {
    "use strict";
  
    // ─── Public API ────────────────────────────────────────────────────────────
    // Screens.init(canvas, ctx, state, levels)
    // Screens.showCinematic(targetLevelIndex, onComplete)
    // Screens.isCinematicActive() → boolean
    // Screens.handleCinematicTap(x, y)  → boolean  (true = event consumed)
    // Screens.prerollWidth()             → number   (px offset added to all scrollX)
  
    const PREROLL_COUNT  = 3;
    const GAP            = 0;    // must match game.js GAP
    const FADE_DURATION  = 600;  // ms  black → visible
    const SCROLL_DURATION = 2200; // ms  full travel
  
    const easeOut = t => 1 - Math.pow(1 - t, 3);
  
    let _canvas, _ctx, _state, _levels;
    let _active      = false;
    let _onComplete  = null;
    let _startTime   = 0;
    let _animFrame   = null;
    let _startScroll = 0;
    let _landScroll  = 0;
    let _overlayAlpha = 1;
  
    // ─── Layout helpers ────────────────────────────────────────────────────────
    // These mirror game.js exactly. Both files must use the same GAP value.
  
    function _facadeDrawWidth(index) {
      const s = _state[index];
      const H = _canvas.height;
      if (!s || !s.facadeImg) return Math.round(H * 0.75);
      return Math.round((s.facadeImg.naturalWidth / s.facadeImg.naturalHeight) * H);
    }
  
    // Street X of the LEFT edge of facade[index], NOT counting pre-roll offset.
    function _streetLeft(index) {
      let x = 0;
      for (let i = 0; i < index; i++) x += _facadeDrawWidth(i) + GAP;
      return x;
    }
  
    // Total width of the pre-roll block (last PREROLL_COUNT facades).
    function _prerollWidth() {
      let w = 0;
      const start = Math.max(0, _levels.length - PREROLL_COUNT);
      for (let i = start; i < _levels.length; i++) {
        w += _facadeDrawWidth(i) + GAP;
      }
      return w;
    }
  
    // scrollX value that centres facade[index] on screen,
    // accounting for the pre-roll offset.
    function _centredScrollFor(index) {
      const W   = _canvas.width;
      const dw  = _facadeDrawWidth(index);
      const raw = _prerollWidth() + _streetLeft(index) + dw / 2 - W / 2;
      return Math.max(0, raw);
    }
  
    // ─── Public: pre-roll width (game.js needs this to set its scroll origin) ──
    function prerollWidth() {
      if (!_canvas) return 0;
      return _prerollWidth();
    }
  
    // ─── Init ──────────────────────────────────────────────────────────────────
    function init(canvas, ctx, state, levels) {
      _canvas = canvas;
      _ctx    = ctx;
      _state  = state;
      _levels = levels;
    }
  
    // ─── Show cinematic ────────────────────────────────────────────────────────
    function showCinematic(targetLevelIndex, onComplete) {
      if (!_canvas) { if (onComplete) onComplete(); return; }
  
      _active       = true;
      _onComplete   = onComplete || null;
      _overlayAlpha = 1;
      _startTime    = performance.now();
  
      // Land centred on the target facade.
      _landScroll = _centredScrollFor(targetLevelIndex);
  
      // Start at the very beginning of the pre-roll block (scrollX = 0 shows
      // the first pre-roll facade at the left edge of the screen).
      _startScroll = 0;
  
      if (_animFrame) cancelAnimationFrame(_animFrame);
      _animFrame = requestAnimationFrame(_tick);
    }
  
    // ─── Tick ──────────────────────────────────────────────────────────────────
    function _tick(now) {
      const elapsed = now - _startTime;
  
      const scrollT  = Math.min(elapsed / SCROLL_DURATION, 1);
      const eased    = easeOut(scrollT);
      const scrollX  = _startScroll + (_landScroll - _startScroll) * eased;
  
      _overlayAlpha  = 1 - Math.min(elapsed / FADE_DURATION, 1);
  
      _draw(scrollX);
  
      if (_overlayAlpha > 0) {
        _ctx.globalAlpha = _overlayAlpha;
        _ctx.fillStyle   = '#000';
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
        _ctx.globalAlpha = 1;
      }
  
      if (scrollT < 1) {
        _animFrame = requestAnimationFrame(_tick);
      } else {
        _draw(_landScroll);
        _active   = false;
        _animFrame = null;
        if (_onComplete) _onComplete();
      }
    }
  
    // ─── Draw ──────────────────────────────────────────────────────────────────
    // Renders the pre-roll facades (to the left of facade_01) then the normal
    // street, all offset by scrollX.
    function _draw(scrollX) {
      const W = _canvas.width;
      const H = _canvas.height;
      const pw = _prerollWidth();
  
      _ctx.fillStyle = '#1a1008';
      _ctx.fillRect(0, 0, W, H);
  
      // ── Pre-roll facades ──────────────────────────────────────────
      // Placed at virtual street positions [-pw … 0), i.e. left of level 0.
      const preStart = Math.max(0, _levels.length - PREROLL_COUNT);
      let preX = -pw; // street-left of the first pre-roll facade
      for (let i = preStart; i < _levels.length; i++) {
        const dw      = _facadeDrawWidth(i);
        const screenX = preX + pw - scrollX; // add pw because scrollX=0 shows pre-roll start
        preX += dw + GAP;
        if (screenX + dw < 0 || screenX > W) continue;
        // Facade only — no fox on pre-roll
        const s = _state[i];
        if (s && s.facadeImg) {
          _ctx.drawImage(s.facadeImg, screenX, 0, dw, H);
        } else {
          const colors = ['#c8a97a', '#b89060', '#d4b485'];
          _ctx.fillStyle = colors[i % colors.length];
          _ctx.fillRect(screenX, 0, dw, H);
        }
      }
  
      // ── Normal street facades ─────────────────────────────────────
      for (let i = 0; i < _levels.length; i++) {
        const dw      = _facadeDrawWidth(i);
        const screenX = pw + _streetLeft(i) - scrollX;
        if (screenX + dw < 0 || screenX > W) continue;
        _drawFacade(i, screenX, dw, H);
      }
    }
  
    function _drawFacade(index, screenX, dw, H) {
      const s   = _state[index];
      const lvl = _levels[index];
  
      if (s && s.facadeImg) {
        _ctx.drawImage(s.facadeImg, screenX, 0, dw, H);
      } else {
        const colors = ['#c8a97a', '#b89060', '#d4b485'];
        _ctx.fillStyle = colors[index % colors.length];
        _ctx.fillRect(screenX, 0, dw, H);
      }
  
      // Fox overlay — pure scenery, no hitbox logic during cinematic
      if (s && s.foxImg) {
        const scaleX = dw / (s.facadeImg ? s.facadeImg.naturalWidth  : dw);
        const scaleY = H  / (s.facadeImg ? s.facadeImg.naturalHeight : H);
        _ctx.drawImage(
          s.foxImg,
          screenX + lvl.foxX * scaleX,
          lvl.foxY * scaleY,
          lvl.foxWidth  * scaleX,
          lvl.foxHeight * scaleY
        );
      }
    }
  
    // ─── Helpers ───────────────────────────────────────────────────────────────
    function isCinematicActive()      { return _active; }
    function handleCinematicTap(x, y) { return _active; }
  
    // ─── Export ────────────────────────────────────────────────────────────────
    window.Screens = { init, showCinematic, isCinematicActive, handleCinematicTap, prerollWidth };
  
    // Bare globals for existing game.js calls
    window.isCinematicActive  = isCinematicActive;
    window.handleCinematicTap = handleCinematicTap;
  })();