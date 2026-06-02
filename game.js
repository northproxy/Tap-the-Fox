// === Tap the Fox — game.js ===
// MVP 0.2 — multiple facades, horizontal scrolling

// ─── Canvas setup ───────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}
window.addEventListener('resize', resizeCanvas);


// Level data lives in levels.js — edit your foxes and facades there.

// ─── Game state ─────────────────────────────────────────────────
// Each level gets its own loaded image objects and found-state.
const state = levels.map(lvl => ({
  facadeImg:      null,
  foxImg:         null,
  facadeLoaded:   false,
  foxLoaded:      false,
  foxFound:       false,
  highlightAlpha: 0,
}));

// Scrolling
let scrollX      = 0;       // how many pixels we've scrolled right
let isDragging   = false;
let dragStartX   = 0;       // pointer X when drag began
let scrollAtDrag = 0;       // scrollX value when drag began
let lastDragX    = 0;       // for momentum
let velocity     = 0;       // pixels/frame for momentum scroll


// ─── Image loading ──────────────────────────────────────────────
// Each facade and fox image loads independently.
// The game draws what's ready and shows placeholders for the rest.

levels.forEach((lvl, i) => {
  const s = state[i];

  const fImg = new Image();
  fImg.onload  = () => { s.facadeLoaded = true;  s.facadeImg = fImg; draw(); };
  fImg.onerror = () => { s.facadeLoaded = true;  s.facadeImg = null; draw(); };
  fImg.src = lvl.facade;

  const xImg = new Image();
  xImg.onload  = () => { s.foxLoaded = true; s.foxImg = xImg; draw(); };
  xImg.onerror = () => { s.foxLoaded = true; s.foxImg = null; draw(); };
  xImg.src = lvl.fox;
});


// ─── Layout helpers ─────────────────────────────────────────────
// Each facade fills the full screen height and keeps the image's
// natural aspect ratio. Facades sit side by side with a small gap.

const GAP = 24; // pixels between facades

function facadeDrawWidth(index) {
  const img = state[index].facadeImg;
  const H   = canvas.height;
  if (!img) return Math.round(H * 0.75); // placeholder width
  return Math.round((img.naturalWidth / img.naturalHeight) * H);
}

// Returns the X position (on the canvas) where facade [index] starts,
// taking scrollX into account.
function facadeLeft(index) {
  let x = 0;
  for (let i = 0; i < index; i++) {
    x += facadeDrawWidth(i) + GAP;
  }
  return x - scrollX;
}

// Total width of all facades + gaps combined
function totalStreetWidth() {
  let w = 0;
  levels.forEach((_, i) => { w += facadeDrawWidth(i) + GAP; });
  return w - GAP; // no trailing gap
}


// ─── Drawing ────────────────────────────────────────────────────
function draw() {
  const W = canvas.width;
  const H = canvas.height;

  // Background — deep night sky between buildings
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(0, 0, W, H);

  levels.forEach((lvl, i) => {
    const s    = state[i];
    const x    = facadeLeft(i);
    const dw   = facadeDrawWidth(i);

    // Skip facades entirely off-screen (performance)
    if (x + dw < 0 || x > W) return;

    // --- Facade image or placeholder ---
    if (s.facadeImg) {
      ctx.drawImage(s.facadeImg, x, 0, dw, H);
    } else {
      // Warm placeholder tile
      const colors = ['#c8a97a', '#b89060', '#d4b485'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, 0, dw, H);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`facade_0${i + 1}.jpg`, x + dw / 2, H / 2);
    }

    // Scale factors: facade image space → screen space
    const scaleX = dw / (s.facadeImg ? s.facadeImg.naturalWidth  : dw);
    const scaleY = H  / (s.facadeImg ? s.facadeImg.naturalHeight : H);

    const foxScreenX = x + lvl.foxX * scaleX;
    const foxScreenY =     lvl.foxY * scaleY;
    const foxScreenW =     lvl.foxWidth  * scaleX;
    const foxScreenH =     lvl.foxHeight * scaleY;

    // --- Fox overlay ---
    if (s.foxImg) {
      ctx.drawImage(s.foxImg, foxScreenX, foxScreenY, foxScreenW, foxScreenH);
    }

    // --- Highlight glow (plays after found) ---
    if (s.foxFound && s.highlightAlpha > 0) {
      const cx     = foxScreenX + foxScreenW / 2;
      const cy     = foxScreenY + foxScreenH / 2;
      const radius = Math.max(foxScreenW, foxScreenH) * 0.9;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,   `rgba(255, 180, 50, ${s.highlightAlpha * 0.75})`);
      grad.addColorStop(0.5, `rgba(255, 120, 20, ${s.highlightAlpha * 0.4})`);
      grad.addColorStop(1,   `rgba(255, 80,  0,  0)`);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Redraw fox on top of glow
      if (s.foxImg) {
        ctx.drawImage(s.foxImg, foxScreenX, foxScreenY, foxScreenW, foxScreenH);
      }
    }

    // --- Debug hitbox (dashed orange box) ---
    // Remove this block once you're happy with hitbox positions.
    if (!s.foxFound) {
      const hx = getHitboxRect(i, x, scaleX, scaleY);
      ctx.strokeStyle = 'rgba(255, 120, 0, 0.5)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(hx.x, hx.y, hx.w, hx.h);
      ctx.setLineDash([]);
    }
  });

  // --- HUD: score badge (top-left) ---
  drawHUD();

  // --- Scroll edge indicators ---
  drawScrollHints();
}


// ─── HUD ────────────────────────────────────────────────────────
function drawHUD() {
  const found = state.filter(s => s.foxFound).length;
  const total = levels.length;

  const label = `🦊 ${found} / ${total}`;
  const pad   = 12;

  ctx.font = 'bold 20px sans-serif';
  const tw  = ctx.measureText(label).width;

  // Badge background
  ctx.fillStyle = 'rgba(20, 10, 0, 0.65)';
  roundRect(ctx, 16, 16, tw + pad * 2, 40, 10);
  ctx.fill();

  // Badge text
  ctx.fillStyle = '#fff8e1';
  ctx.textAlign = 'left';
  ctx.fillText(label, 16 + pad, 16 + 27);
}


// ─── Scroll hint arrows ──────────────────────────────────────────
function drawScrollHints() {
  const W   = canvas.width;
  const H   = canvas.height;
  const max = totalStreetWidth() - W;

  // Left arrow — show when not at the start
  if (scrollX > 10) {
    drawArrow(ctx, 28, H / 2, 'left');
  }
  // Right arrow — show when not at the end
  if (scrollX < max - 10) {
    drawArrow(ctx, W - 28, H / 2, 'right');
  }
}

function drawArrow(ctx, cx, cy, dir) {
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


// ─── Utility: rounded rectangle ─────────────────────────────────
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


// ─── Hitbox helper ──────────────────────────────────────────────
// Returns hitbox rectangle in screen pixels for facade [index].
// facadeScreenX = left edge of the facade on screen (after scrolling).
function getHitboxRect(index, facadeScreenX, scaleX, scaleY) {
  const lvl = levels[index];
  const foxCenterX = lvl.foxX + lvl.foxWidth  / 2;
  const foxCenterY = lvl.foxY + lvl.foxHeight / 2;
  return {
    x: facadeScreenX + (foxCenterX - lvl.hitboxWidth  / 2) * scaleX,
    y:                 (foxCenterY - lvl.hitboxHeight / 2) * scaleY,
    w: lvl.hitboxWidth  * scaleX,
    h: lvl.hitboxHeight * scaleY,
  };
}


// ─── Tap detection ──────────────────────────────────────────────
// We only register a tap if the pointer didn't move much (not a scroll drag).
let dragDistance = 0;
const TAP_THRESHOLD = 8; // pixels — below this = tap, above = drag

function handleTap(screenX, screenY) {
  if (dragDistance > TAP_THRESHOLD) return; // was a drag, not a tap

  levels.forEach((lvl, i) => {
    const s = state[i];
    if (s.foxFound) return;

    const x      = facadeLeft(i);
    const dw     = facadeDrawWidth(i);
    const scaleX = dw / (s.facadeImg ? s.facadeImg.naturalWidth  : dw);
    const scaleY = canvas.height / (s.facadeImg ? s.facadeImg.naturalHeight : canvas.height);

    const hx = getHitboxRect(i, x, scaleX, scaleY);
    const hit = (
      screenX >= hx.x && screenX <= hx.x + hx.w &&
      screenY >= hx.y && screenY <= hx.y + hx.h
    );

    if (hit) {
      s.foxFound = true;
      startHighlightAnimation(i);
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
// After releasing a drag, the street glides to a stop naturally.
function startMomentum() {
  if (Math.abs(velocity) < 1) return;

  function step() {
    velocity *= 0.92;               // friction — lower = slides further
    scrollX   = clampScroll(scrollX - velocity);
    draw();
    if (Math.abs(velocity) > 0.5) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

// Keep scrollX inside valid bounds
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
resizeCanvas();