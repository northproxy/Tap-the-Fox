// === Tap the Fox — game.js ===
// MVP 0.3 — score, completion screen, restart
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
// Each level gets its own image objects and found-state.
// initState() builds this fresh — also used by restartGame().
function initState() {
  return levels.map(() => ({
    facadeImg:      null,
    foxImg:         null,
    facadeLoaded:   false,
    foxLoaded:      false,
    foxFound:       false,
    highlightAlpha: 0,
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


// ─── Image loading ──────────────────────────────────────────────
function loadImages() {
  levels.forEach((lvl, i) => {
    const s = state[i];

    const fImg = new Image();
    fImg.onload  = () => { s.facadeImg = fImg; s.facadeLoaded = true;  draw(); };
    fImg.onerror = () => {                      s.facadeLoaded = true;  draw(); };
    fImg.src = lvl.facade;

    const xImg = new Image();
    xImg.onload  = () => { s.foxImg = xImg; s.foxLoaded = true; draw(); };
    xImg.onerror = () => {                   s.foxLoaded = true; draw(); };
    xImg.src = lvl.fox;
  });
}


// ─── Restart ────────────────────────────────────────────────────
// Called by ui.js when the player taps "Play again".
function restartGame() {
  state    = initState();
  scrollX  = 0;
  velocity = 0;
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
  for (let i = 0; i < index; i++) {
    x += facadeDrawWidth(i) + GAP;
  }
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
      ctx.fillStyle   = 'rgba(0,0,0,0.3)';
      ctx.font        = '16px sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(`facade_0${i + 1}.jpg`, x + dw / 2, H / 2);
    }

    const scaleX = dw / (s.facadeImg ? s.facadeImg.naturalWidth  : dw);
    const scaleY = H  / (s.facadeImg ? s.facadeImg.naturalHeight : H);

    const foxScreenX = x + lvl.foxX * scaleX;
    const foxScreenY =     lvl.foxY * scaleY;
    const foxScreenW =     lvl.foxWidth  * scaleX;
    const foxScreenH =     lvl.foxHeight * scaleY;

    // Fox overlay
    if (s.foxImg) {
      ctx.drawImage(s.foxImg, foxScreenX, foxScreenY, foxScreenW, foxScreenH);
    }

    // Glow highlight
    if (s.foxFound && s.highlightAlpha > 0) {
      const cx     = foxScreenX + foxScreenW / 2;
      const cy     = foxScreenY + foxScreenH / 2;
      const radius = Math.max(foxScreenW, foxScreenH) * 0.9;
      const grad   = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,   `rgba(255, 180, 50, ${s.highlightAlpha * 0.75})`);
      grad.addColorStop(0.5, `rgba(255, 120, 20, ${s.highlightAlpha * 0.4})`);
      grad.addColorStop(1,   `rgba(255, 80,  0,  0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      if (s.foxImg) ctx.drawImage(s.foxImg, foxScreenX, foxScreenY, foxScreenW, foxScreenH);
    }

    // Debug hitbox — remove this block when hitboxes are tuned
    if (!s.foxFound) {
      const hx = getHitboxRect(i, x, scaleX, scaleY);
      ctx.strokeStyle = 'rgba(255, 120, 0, 0.5)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(hx.x, hx.y, hx.w, hx.h);
      ctx.setLineDash([]);
    }
  });

  drawHUD();
  drawScrollHints();

  // Completion screen drawn last (on top of everything)
  drawCompletionScreen();
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

  ctx.fillStyle = '#fff8e1';
  ctx.textAlign = 'left';
  ctx.fillText(label, 16 + pad, 16 + 27);
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
  const allFound = state.every(s => s.foxFound);
  if (allFound) {
    // Small delay so the last glow animation is visible first
    setTimeout(showCompletionScreen, 900);
  }
}


// ─── Tap detection ──────────────────────────────────────────────
function handleTap(screenX, screenY) {
  if (dragDistance > TAP_THRESHOLD) return;

  // Let ui.js handle the tap first if completion screen is showing
  if (handleCompletionTap(screenX, screenY)) return;

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
      startHighlightAnimation(i);
      checkCompletion();
    }
  });
}


// ─── Scrolling — mouse ──────────────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
  isDragging   = true;
  dragStartX   = e.clientX;
  scrollAtDrag = scrollX;
  dragDistance = 0;
  velocity     = 0;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
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
  if (!isDragging) return;
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
  if (Math.abs(velocity) < 1) return;
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


// ─── Highlight animation ─────────────────────────────────────────
function startHighlightAnimation(index) {
  const s         = state[index];
  s.highlightAlpha = 0;
  const duration  = 1800;
  const peakAt    = 300;
  const startTime = performance.now();

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
    }
  }
  requestAnimationFrame(animate);
}


// ─── Start ──────────────────────────────────────────────────────
loadImages();
resizeCanvas();
