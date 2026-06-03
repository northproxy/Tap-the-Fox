// === Tap the Fox — game.js ===
// MVP 0.4 — hints (6A) + find animations (6B)
// + centred start position
// + smooth auto-scroll to next facade after fox found
// Level data  → levels.js
// UI overlays → ui.js

// ─── Canvas setup ───────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}
window.addEventListener('resize', resizeCanvas);


// ─── Game state ─────────────────────────────────────────────────
function initState() {
  return levels.map(() => ({
    facadeImg:      null,
    foxImg:         null,
    facadeLoaded:   false,
    foxLoaded:      false,
    foxFound:       false,
    highlightAlpha: 0,
    // 6B — per-level find animation state
    foxScale:       1,      // bounce scale multiplier (drawn around fox centre)
    pulseRings:     [],     // array of active pulse ring objects
  }));
}

let state = initState();

// Scrolling
let scrollX      = 0;
let isDragging   = false;
let dragStartX   = 0;
let scrollAtDrag = 0;
let lastDragX    = 0;
let velocity     = 0;
let dragDistance = 0;
const TAP_THRESHOLD = 8;

// Auto-scroll lock
let isAutoScrolling = false;

// ─── Hint state ─────────────────────────────────────────────────
let hintStage      = 0;
let hintCooldown   = false;
let hintTextAlpha  = 0;
let hintGlowAlpha  = 0;
let hintGlowRadius = 0;

function resetHint() {
  hintStage      = 0;
  hintCooldown   = false;
  hintTextAlpha  = 0;
  hintGlowAlpha  = 0;
  hintGlowRadius = 0;
}

// ─── Score bump state (6B) ───────────────────────────────────────
// A brief +1 label that pops up near the HUD score then fades.
// scoreBump.active drives a single animation at a time.
const scoreBump = {
  active:    false,
  alpha:     0,
  offsetY:   0,   // animates upward from 0
  scale:     1,
};

function triggerScoreBump() {
  scoreBump.active  = true;
  scoreBump.alpha   = 1;
  scoreBump.offsetY = 0;
  scoreBump.scale   = 1.4;  // starts big, shrinks to 1 then fades
}


// ─── Image loading ──────────────────────────────────────────────
function loadImages() {
  levels.forEach((lvl, i) => {
    const s = state[i];

    const fImg = new Image();
    fImg.onload  = () => { s.facadeImg = fImg; s.facadeLoaded = true; centreFirstFacade(); draw(); };
    fImg.onerror = () => {                      s.facadeLoaded = true; draw(); };
    fImg.src = lvl.facade;

    const xImg = new Image();
    xImg.onload  = () => { s.foxImg = xImg; s.foxLoaded = true; draw(); };
    xImg.onerror = () => {                   s.foxLoaded = true; draw(); };
    xImg.src = lvl.fox;
  });
}


// ─── Centred start ──────────────────────────────────────────────
function centreFirstFacade() {
  if (state[0].facadeImg) scrollX = centredScrollFor(0);
}

function centredScrollFor(index) {
  const W  = canvas.width;
  const dw = facadeDrawWidth(index);
  let streetX = 0;
  for (let i = 0; i < index; i++) streetX += facadeDrawWidth(i) + GAP;
  return clampScroll(streetX + dw / 2 - W / 2);
}


// ─── Restart ────────────────────────────────────────────────────
function restartGame() {
  state           = initState();
  scrollX         = 0;
  velocity        = 0;
  isAutoScrolling = false;
  scoreBump.active = false;
  resetHint();
  loadImages();
  draw();
}


// ─── Layout helpers ─────────────────────────────────────────────
const GAP = 24;

function facadeDrawWidth(index) {
  const img = state[index].facadeImg;
  const H   = canvas.height;
  if (!img) return Math.round(H * 0.75);
  return Math.round((img.naturalWidth / img.naturalHeight) * H);
}

function facadeLeft(index) {
  let x = 0;
  for (let i = 0; i < index; i++) x += facadeDrawWidth(i) + GAP;
  return x - scrollX;
}

function totalStreetWidth() {
  let w = 0;
  levels.forEach((_, i) => { w += facadeDrawWidth(i) + GAP; });
  return w - GAP;
}


// ─── Drawing ────────────────────────────────────────────────────
function draw() {
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#1a1008';
  ctx.fillRect(0, 0, W, H);

  // Track whether any animation is still running this frame so we
  // can schedule another rAF automatically if needed.
  let needsNextFrame = false;

  levels.forEach((lvl, i) => {
    const s  = state[i];
    const x  = facadeLeft(i);
    const dw = facadeDrawWidth(i);

    if (x + dw < 0 || x > W) return;

    // Facade
    if (s.facadeImg) {
      ctx.drawImage(s.facadeImg, x, 0, dw, H);
    } else {
      const colors = ['#c8a97a', '#b89060', '#d4b485'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, 0, dw, H);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font      = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`facade_0${i + 1}.jpg`, x + dw / 2, H / 2);
    }

    const scaleX = dw / (s.facadeImg ? s.facadeImg.naturalWidth  : dw);
    const scaleY = H  / (s.facadeImg ? s.facadeImg.naturalHeight : H);

    const foxScreenX = x + lvl.foxX * scaleX;
    const foxScreenY =     lvl.foxY * scaleY;
    const foxScreenW =     lvl.foxWidth  * scaleX;
    const foxScreenH =     lvl.foxHeight * scaleY;
    const foxCX      = foxScreenX + foxScreenW / 2;
    const foxCY      = foxScreenY + foxScreenH / 2;

    // ── Hint glow (stage 2) — drawn behind fox overlay ──────────
    const currentIndex = state.findIndex(s => !s.foxFound);
    if (i === currentIndex && hintStage >= 2 && hintGlowAlpha > 0) {
      const cx = x + (lvl.foxX + lvl.hitboxWidth  / 2) * scaleX;
      const cy =     (lvl.foxY + lvl.hitboxHeight / 2) * scaleY;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hintGlowRadius);
      grad.addColorStop(0,   `rgba(255, 200, 80, ${hintGlowAlpha * 0.35})`);
      grad.addColorStop(0.5, `rgba(255, 160, 40, ${hintGlowAlpha * 0.15})`);
      grad.addColorStop(1,   `rgba(255, 140, 20, 0)`);

      ctx.beginPath();
      ctx.arc(cx, cy, hintGlowRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      if (hintGlowRadius < 120) hintGlowRadius += 3;
      if (hintGlowAlpha  < 1)   hintGlowAlpha   = Math.min(1, hintGlowAlpha + 0.04);
      needsNextFrame = true;
    }

    // ── Pulse rings (6B) — drawn behind fox so rings radiate outward ──
    s.pulseRings = s.pulseRings.filter(ring => ring.alpha > 0);
    s.pulseRings.forEach(ring => {
      ctx.beginPath();
      ctx.arc(foxCX, foxCY, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 80, ${ring.alpha})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ring.radius += 3.5;
      ring.alpha  -= 0.033;
      if (ring.alpha > 0) needsNextFrame = true;
    });

    // ── Fox overlay — drawn with bounce scale if active ──────────
    if (s.foxImg) {
      if (s.foxScale !== 1) {
        // Draw scaled around fox centre
        ctx.save();
        ctx.translate(foxCX, foxCY);
        ctx.scale(s.foxScale, s.foxScale);
        ctx.drawImage(s.foxImg, -foxScreenW / 2, -foxScreenH / 2, foxScreenW, foxScreenH);
        ctx.restore();
      } else {
        ctx.drawImage(s.foxImg, foxScreenX, foxScreenY, foxScreenW, foxScreenH);
      }
    }

    // ── Radial glow highlight (existing) ────────────────────────
    if (s.foxFound && s.highlightAlpha > 0) {
      const radius = Math.max(foxScreenW, foxScreenH) * 0.9;
      const grad   = ctx.createRadialGradient(foxCX, foxCY, 0, foxCX, foxCY, radius);
      grad.addColorStop(0,   `rgba(255, 180, 50, ${s.highlightAlpha * 0.75})`);
      grad.addColorStop(0.5, `rgba(255, 120, 20, ${s.highlightAlpha * 0.4})`);
      grad.addColorStop(1,   `rgba(255, 80,  0,  0)`);
      ctx.beginPath();
      ctx.arc(foxCX, foxCY, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Redraw fox on top of glow
      if (s.foxImg) {
        if (s.foxScale !== 1) {
          ctx.save();
          ctx.translate(foxCX, foxCY);
          ctx.scale(s.foxScale, s.foxScale);
          ctx.drawImage(s.foxImg, -foxScreenW / 2, -foxScreenH / 2, foxScreenW, foxScreenH);
          ctx.restore();
        } else {
          ctx.drawImage(s.foxImg, foxScreenX, foxScreenY, foxScreenW, foxScreenH);
        }
      }
    }

    // Debug hitbox — remove when hitboxes are tuned
    if (!s.foxFound) {
      const hx = getHitboxRect(i, x, scaleX, scaleY);
      ctx.strokeStyle = 'rgba(255, 120, 0, 0.5)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(hx.x, hx.y, hx.w, hx.h);
      ctx.setLineDash([]);
    }
  });

  drawHUD();           // includes hint button and score bump
  drawScrollHints();
  drawHintText();
  drawCompletionScreen();

  if (needsNextFrame) requestAnimationFrame(draw);
}


// ─── HUD ────────────────────────────────────────────────────────
function drawHUD() {
  const found = state.filter(s => s.foxFound).length;
  const total = levels.length;
  const label = `🦊 ${found} / ${total}`;
  const pad   = 12;

  ctx.font = 'bold 20px sans-serif';
  const tw = ctx.measureText(label).width;

  ctx.fillStyle = 'rgba(20, 10, 0, 0.65)';
  roundRect(ctx, 16, 16, tw + pad * 2, 40, 10);
  ctx.fill();

  ctx.fillStyle    = '#fff8e1';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 16 + pad, 36);

  drawScoreBump(found);
  drawHintButton();
}

// ─── Score bump (6B) ────────────────────────────────────────────
// A "+1" that floats upward from the score HUD and fades out.
function drawScoreBump(found) {
  if (!scoreBump.active) return;

  // Animate each frame
  scoreBump.offsetY += 1.4;
  scoreBump.alpha   -= 0.025;
  scoreBump.scale    = Math.max(1, scoreBump.scale - 0.018);

  if (scoreBump.alpha <= 0) {
    scoreBump.active = false;
    return;
  }

  // Position: just to the right of the score pill
  const label  = `🦊 ${found} / ${levels.length}`;
  ctx.font     = 'bold 20px sans-serif';
  const pillW  = ctx.measureText(label).width + 12 * 2;
  const bumpX  = 16 + pillW + 14;
  const bumpY  = 36 - scoreBump.offsetY;

  ctx.save();
  ctx.globalAlpha = scoreBump.alpha;
  ctx.translate(bumpX, bumpY);
  ctx.scale(scoreBump.scale, scoreBump.scale);
  ctx.font         = 'bold 22px sans-serif';
  ctx.fillStyle    = '#ffd580';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('+1', 0, 0);
  ctx.restore();
}


// ─── Hint button ─────────────────────────────────────────────────
function drawHintButton() {
  const allFound = state.every(s => s.foxFound);
  if (allFound) return;

  const { x: btnX, y: btnY, r: btnR } = hintButtonBounds();
  const used = hintStage >= 2;

  ctx.beginPath();
  ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
  ctx.fillStyle = (hintCooldown || used) ? 'rgba(80,80,80,0.75)' : 'rgba(245,166,35,0.90)';
  ctx.fill();

  ctx.font         = `bold ${Math.round(btnR)}px sans-serif`;
  ctx.fillStyle    = used ? 'rgba(200,200,200,0.5)' : '#fff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', btnX, btnY);
}

function hintButtonBounds() {
  return { x: canvas.width - 36, y: 36, r: 20 };
}


// ─── Hint text pill ──────────────────────────────────────────────
function drawHintText() {
  if (hintStage < 1 || hintTextAlpha <= 0) return;

  if (hintTextAlpha < 1) {
    hintTextAlpha = Math.min(1, hintTextAlpha + 0.03);
    requestAnimationFrame(draw);
  }

  const currentIndex = state.findIndex(s => !s.foxFound);
  if (currentIndex === -1) return;

  const text = levels[currentIndex].hint || 'Keep looking…';
  const W    = canvas.width;
  const H    = canvas.height;

  ctx.font = '15px sans-serif';
  const textW  = ctx.measureText(text).width;
  const boxPad = 18;
  const boxW   = Math.min(textW + boxPad * 2, W - 40);
  const boxH   = 44;
  const boxX   = (W - boxW) / 2;
  const boxY   = H - boxH - 24;

  ctx.save();
  ctx.globalAlpha = hintTextAlpha;

  ctx.fillStyle = 'rgba(20, 12, 0, 0.82)';
  roundRect(ctx, boxX, boxY, boxW, boxH, 22);
  ctx.fill();

  ctx.strokeStyle = 'rgba(245, 166, 35, 0.6)';
  ctx.lineWidth   = 1.5;
  roundRect(ctx, boxX, boxY, boxW, boxH, 22);
  ctx.stroke();

  ctx.fillStyle    = '#ffd580';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, boxY + boxH / 2);

  ctx.restore();
}


// ─── Scroll hints ────────────────────────────────────────────────
function drawScrollHints() {
  const W   = canvas.width;
  const H   = canvas.height;
  const max = totalStreetWidth() - W;
  if (scrollX > 10)       drawArrow(28,     H / 2, 'left');
  if (scrollX < max - 10) drawArrow(W - 28, H / 2, 'right');
}

function drawArrow(cx, cy, dir) {
  const size = 18;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle   = '#fff8e1';
  ctx.beginPath();
  if (dir === 'left') {
    ctx.moveTo(cx + size / 2, cy - size);
    ctx.lineTo(cx - size / 2, cy);
    ctx.lineTo(cx + size / 2, cy + size);
  } else {
    ctx.moveTo(cx - size / 2, cy - size);
    ctx.lineTo(cx + size / 2, cy);
    ctx.lineTo(cx - size / 2, cy + size);
  }
  ctx.fill();
  ctx.restore();
}


// ─── Utilities ──────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}

function getHitboxRect(index, facadeScreenX, scaleX, scaleY) {
  const lvl        = levels[index];
  const foxCenterX = lvl.foxX + lvl.foxWidth  / 2;
  const foxCenterY = lvl.foxY + lvl.foxHeight / 2;
  return {
    x: facadeScreenX + (foxCenterX - lvl.hitboxWidth  / 2) * scaleX,
    y:                 (foxCenterY - lvl.hitboxHeight / 2) * scaleY,
    w: lvl.hitboxWidth  * scaleX,
    h: lvl.hitboxHeight * scaleY,
  };
}


// ─── Completion check ────────────────────────────────────────────
function checkCompletion() {
  if (state.every(s => s.foxFound)) {
    setTimeout(showCompletionScreen, 900);
  }
}


// ─── Auto-scroll to next facade ─────────────────────────────────
function scrollToNextFacade() {
  const nextIndex = state.findIndex(s => !s.foxFound);
  if (nextIndex === -1) return;

  const targetScrollX = centredScrollFor(nextIndex);
  if (Math.abs(targetScrollX - scrollX) < 2) return;

  const startScrollX = scrollX;
  const distance     = targetScrollX - startScrollX;
  const duration     = 600 + Math.abs(distance) * 0.25;
  const startTime    = performance.now();

  isAutoScrolling = true;
  velocity        = 0;

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);

    scrollX = clampScroll(startScrollX + distance * eased);
    draw();

    if (progress < 1) requestAnimationFrame(step);
    else isAutoScrolling = false;
  }

  requestAnimationFrame(step);
}


// ─── Find animations (6B) ───────────────────────────────────────
// Fires all three animations simultaneously on fox tap:
//   1. Pulse rings  — expand outward from fox centre
//   2. Fox bounce   — scale pop that settles back to 1
//   3. Score bump   — +1 floats up from the HUD
//
// The highlight glow (existing) continues to run in parallel via
// startHighlightAnimation() called from handleTap().

function startFindAnimations(index) {
  const s = state[index];

  // 1. Spawn three staggered pulse rings
  s.pulseRings = [
    { radius: 10, alpha: 0.9 },
    { radius: 10, alpha: 0.7 },
    { radius: 10, alpha: 0.5 },
  ];
  // Small delay between rings so they don't all start at once
  setTimeout(() => { if (s.pulseRings.length < 6) s.pulseRings.push({ radius: 10, alpha: 0.75 }); }, 80);
  setTimeout(() => { if (s.pulseRings.length < 6) s.pulseRings.push({ radius: 10, alpha: 0.6  }); }, 160);

  // 2. Fox scale bounce — spring curve driven by rAF
  animateFoxBounce(s);

  // 3. Score +1 bump
  triggerScoreBump();
}

// Spring-like bounce: overshoots slightly then settles at 1.
// Target scale = 1. We push it to 1.35 then let it oscillate down.
function animateFoxBounce(s) {
  const keyframes = [
    { t: 0,   scale: 1.0  },
    { t: 80,  scale: 1.35 },  // peak
    { t: 200, scale: 0.88 },  // undershoot
    { t: 300, scale: 1.08 },  // small overshoot
    { t: 400, scale: 0.97 },
    { t: 480, scale: 1.0  },  // settled
  ];
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const total   = keyframes[keyframes.length - 1].t;

    if (elapsed >= total) {
      s.foxScale = 1;
      draw();
      return;
    }

    // Find surrounding keyframes and lerp
    let from = keyframes[0], to = keyframes[1];
    for (let k = 0; k < keyframes.length - 1; k++) {
      if (elapsed >= keyframes[k].t && elapsed < keyframes[k + 1].t) {
        from = keyframes[k];
        to   = keyframes[k + 1];
        break;
      }
    }
    const seg      = (elapsed - from.t) / (to.t - from.t);
    s.foxScale     = from.scale + (to.scale - from.scale) * seg;
    draw();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}


// ─── Tap detection ──────────────────────────────────────────────
function handleTap(screenX, screenY) {
  if (dragDistance > TAP_THRESHOLD) return;
  if (handleCompletionTap(screenX, screenY)) return;

  // Hint button
  const { x: btnX, y: btnY, r: btnR } = hintButtonBounds();
  if (Math.hypot(screenX - btnX, screenY - btnY) < btnR + 8) {
    handleHintTap();
    return;
  }

  // Fox hitbox
  levels.forEach((lvl, i) => {
    const s = state[i];
    if (s.foxFound) return;

    const x      = facadeLeft(i);
    const dw     = facadeDrawWidth(i);
    const scaleX = dw / (s.facadeImg ? s.facadeImg.naturalWidth  : dw);
    const scaleY = canvas.height / (s.facadeImg ? s.facadeImg.naturalHeight : canvas.height);
    const hx     = getHitboxRect(i, x, scaleX, scaleY);

    const hit = (
      screenX >= hx.x && screenX <= hx.x + hx.w &&
      screenY >= hx.y && screenY <= hx.y + hx.h
    );

    if (hit) {
      s.foxFound = true;
      startFindAnimations(i);          // 6B — rings, bounce, score bump
      startHighlightAnimation(i, () => {
        checkCompletion();
        resetHint();
        scrollToNextFacade();
      });
    }
  });
}


// ─── Hint tap logic ──────────────────────────────────────────────
function handleHintTap() {
  if (hintCooldown) return;
  if (hintStage >= 2) return;

  if (hintStage === 0) {
    hintStage     = 1;
    hintTextAlpha = 0.01;
  } else if (hintStage === 1) {
    hintStage     = 2;
    hintGlowAlpha = 0.01;
  }

  hintCooldown = true;
  if (hintStage < 2) {
    setTimeout(() => { hintCooldown = false; draw(); }, 3000);
  }

  draw();
}


// ─── Scrolling — mouse ──────────────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
  if (isAutoScrolling) return;
  isDragging   = true;
  dragStartX   = e.clientX;
  scrollAtDrag = scrollX;
  dragDistance = 0;
  velocity     = 0;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging || isAutoScrolling) return;
  const delta  = dragStartX - e.clientX;
  dragDistance = Math.abs(delta);
  velocity     = e.clientX - lastDragX;
  lastDragX    = e.clientX;
  scrollX      = clampScroll(scrollAtDrag + delta);
  draw();
});

canvas.addEventListener('mouseup',    (e) => { isDragging = false; startMomentum(); handleTap(e.clientX, e.clientY); });
canvas.addEventListener('mouseleave', ()  => { isDragging = false; });


// ─── Scrolling — touch ──────────────────────────────────────────
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (isAutoScrolling) return;
  const t      = e.touches[0];
  isDragging   = true;
  dragStartX   = t.clientX;
  scrollAtDrag = scrollX;
  dragDistance = 0;
  velocity     = 0;
  lastDragX    = t.clientX;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDragging || isAutoScrolling) return;
  const t      = e.touches[0];
  const delta  = dragStartX - t.clientX;
  dragDistance = Math.abs(delta);
  velocity     = t.clientX - lastDragX;
  lastDragX    = t.clientX;
  scrollX      = clampScroll(scrollAtDrag + delta);
  draw();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  isDragging = false;
  const t    = e.changedTouches[0];
  startMomentum();
  handleTap(t.clientX, t.clientY);
}, { passive: false });


// ─── Momentum scrolling ─────────────────────────────────────────
function startMomentum() {
  if (Math.abs(velocity) < 1 || isAutoScrolling) return;
  function step() {
    velocity *= 0.92;
    scrollX   = clampScroll(scrollX - velocity);
    draw();
    if (Math.abs(velocity) > 0.5) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function clampScroll(val) {
  const max = Math.max(0, totalStreetWidth() - canvas.width);
  return Math.max(0, Math.min(max, val));
}


// ─── Highlight animation (radial glow, existing) ─────────────────
function startHighlightAnimation(index, onComplete) {
  const s          = state[index];
  s.highlightAlpha = 0;
  const duration   = 1800;
  const peakAt     = 300;
  const startTime  = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    if (elapsed < peakAt) {
      s.highlightAlpha = elapsed / peakAt;
    } else {
      s.highlightAlpha = 1 - (elapsed - peakAt) / (duration - peakAt);
    }
    s.highlightAlpha = Math.max(0, Math.min(1, s.highlightAlpha));
    draw();

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      s.highlightAlpha = 0;
      draw();
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(animate);
}


// ─── Start ──────────────────────────────────────────────────────
loadImages();
resizeCanvas();