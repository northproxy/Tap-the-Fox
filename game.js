// === Tap the Fox — game.js ===
// MVP 0.1 — one facade, one fox, tap detection

// ─── Canvas setup ───────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// Make the canvas match the actual screen pixels
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}
window.addEventListener('resize', resizeCanvas);


// ─── Level data ─────────────────────────────────────────────────
// This is where you define each facade and its hidden fox.
// All positions are in the facade image's own pixel space (0,0 = top-left of image).
// foxX / foxY = top-left corner of where the fox image is drawn
// hitboxWidth / hitboxHeight = the tappable area (usually bigger than the fox image)

const level = {
  facade:       'assets/facades/facade_01.jpg',   // background building image
  fox:          'assets/foxes/fox_01.png',     // transparent fox overlay
  foxX:         520,    // where on the facade the fox is drawn (pixels)
  foxY:         340,
  foxWidth:     120,    // how large the fox image is drawn
  foxHeight:    120,
  hitboxWidth:  200,    // tappable area — larger than the visual fox
  hitboxHeight: 200,
  hint:         'Look near the upper windows.',
};


// ─── Game state ─────────────────────────────────────────────────
let facadeImg  = new Image();
let foxImg     = new Image();
let imagesReady = false;

let foxFound    = false;     // has the player found the fox?
let highlightAlpha = 0;      // for the glow animation (0 = invisible, 1 = full)
let animating   = false;


// ─── Image loading ──────────────────────────────────────────────
// We wait for BOTH images to load before drawing anything.
let loadedCount = 0;

function onImageLoaded() {
  loadedCount++;
  if (loadedCount === 2) {
    imagesReady = true;
    draw();
  }
}

facadeImg.onload = onImageLoaded;
foxImg.onload    = onImageLoaded;

// If an image fails to load, we draw a placeholder so the game still works
// while you're setting up your real assets.
facadeImg.onerror = () => { facadeImg = null; onImageLoaded(); };
foxImg.onerror    = () => { foxImg    = null; onImageLoaded(); };

facadeImg.src = level.facade;
foxImg.src    = level.fox;


// ─── Drawing ────────────────────────────────────────────────────
function draw() {
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // --- Draw facade (stretched to fill the screen for now) ---
  if (facadeImg) {
    ctx.drawImage(facadeImg, 0, 0, W, H);
  } else {
    // Placeholder: warm stone-coloured rectangle
    ctx.fillStyle = '#c8a97a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a07850';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Place facade_01.jpg in assets/facades/', W / 2, H / 2);
  }

  // --- Draw fox overlay ---
  // Scale fox position from facade image space to screen space
  const scaleX = W / (facadeImg ? facadeImg.naturalWidth  : W);
  const scaleY = H / (facadeImg ? facadeImg.naturalHeight : H);

  const drawX = level.foxX * scaleX;
  const drawY = level.foxY * scaleY;
  const drawW = level.foxWidth  * scaleX;
  const drawH = level.foxHeight * scaleY;

  if (foxImg && !foxFound) {
    ctx.drawImage(foxImg, drawX, drawY, drawW, drawH);
  }

  // --- Draw highlight glow when fox is found ---
  if (foxFound && highlightAlpha > 0) {
    // Soft orange circle behind the fox position
    const cx = drawX + drawW / 2;
    const cy = drawY + drawH / 2;
    const radius = Math.max(drawW, drawH) * 0.9;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0,   `rgba(255, 180, 50, ${highlightAlpha * 0.7})`);
    gradient.addColorStop(0.5, `rgba(255, 120, 20, ${highlightAlpha * 0.4})`);
    gradient.addColorStop(1,   `rgba(255, 80,  0,  0)`);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw the fox on top of the glow
    if (foxImg) {
      ctx.drawImage(foxImg, drawX, drawY, drawW, drawH);
    }
  }

  // --- Draw "Found!" text ---
  if (foxFound) {
    ctx.save();
    ctx.globalAlpha = Math.min(highlightAlpha * 2, 1);
    ctx.font        = 'bold 36px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#fff8e1';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur  = 12;
    ctx.fillText('🦊 Found!', W / 2, H * 0.12);
    ctx.restore();
  }

  // --- Debug: draw hitbox outline (remove this when you're happy) ---
  if (!foxFound) {
    const hx = getHitboxScreenRect(scaleX, scaleY);
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.4)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(hx.x, hx.y, hx.w, hx.h);
    ctx.setLineDash([]);
  }
}


// ─── Hitbox helper ──────────────────────────────────────────────
// Returns the hitbox rectangle in SCREEN pixels
function getHitboxScreenRect(scaleX, scaleY) {
  // Centre the hitbox on the fox image
  const foxCenterX = level.foxX + level.foxWidth  / 2;
  const foxCenterY = level.foxY + level.foxHeight / 2;

  return {
    x: (foxCenterX - level.hitboxWidth  / 2) * scaleX,
    y: (foxCenterY - level.hitboxHeight / 2) * scaleY,
    w: level.hitboxWidth  * scaleX,
    h: level.hitboxHeight * scaleY,
  };
}


// ─── Tap / click detection ──────────────────────────────────────
function handleTap(screenX, screenY) {
  if (foxFound) return; // already found, ignore further taps

  const W = canvas.width;
  const H = canvas.height;
  const scaleX = W / (facadeImg ? facadeImg.naturalWidth  : W);
  const scaleY = H / (facadeImg ? facadeImg.naturalHeight : H);

  const hx = getHitboxScreenRect(scaleX, scaleY);

  const hit = (
    screenX >= hx.x &&
    screenX <= hx.x + hx.w &&
    screenY >= hx.y &&
    screenY <= hx.y + hx.h
  );

  if (hit) {
    foxFound = true;
    startHighlightAnimation();
  }
}

// Mouse click (desktop)
canvas.addEventListener('click', (e) => {
  handleTap(e.clientX, e.clientY);
});

// Touch tap (mobile) — use touchend for a snappy feel
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleTap(touch.clientX, touch.clientY);
});


// ─── Highlight animation ─────────────────────────────────────────
// Fades the orange glow in, then slowly out
function startHighlightAnimation() {
  highlightAlpha = 0;
  animating      = true;

  const duration   = 1800; // ms total
  const peakAt     = 300;  // ms to reach full brightness
  const startTime  = performance.now();

  function animate(now) {
    const elapsed = now - startTime;

    if (elapsed < peakAt) {
      // Fade in
      highlightAlpha = elapsed / peakAt;
    } else {
      // Fade out
      highlightAlpha = 1 - (elapsed - peakAt) / (duration - peakAt);
    }

    highlightAlpha = Math.max(0, Math.min(1, highlightAlpha));
    draw();

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      highlightAlpha = 0;
      animating      = false;
      draw();
    }
  }

  requestAnimationFrame(animate);
}


// ─── Start ──────────────────────────────────────────────────────
resizeCanvas();
