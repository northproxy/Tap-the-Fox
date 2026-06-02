// === Tap the Fox — levels.js ===
// Add or edit your levels here. game.js reads this automatically.
//
// foxX / foxY     — position of the fox inside the facade image (pixels)
// foxWidth/Height — how large to draw the fox image
// hitboxWidth/Height — the tappable area (keep this larger than the fox image)

const levels = [
    {
      facade:       'assets/facades/facade_01.jpg',
      fox:          'assets/foxes/fox_01.png',
      foxX:         420,
      foxY:         1030,
      foxWidth:     105,
      foxHeight:    125,
      hitboxWidth:  125,
      hitboxHeight: 145,
      hint:         'Look near the entrance.',
    },
    {
      facade:       'assets/facades/facade_02.jpg',
      fox:          'assets/foxes/fox_02.png',
      foxX:         220,
      foxY:         655,
      foxWidth:     80,
      foxHeight:    62,
      hitboxWidth:  100,
      hitboxHeight: 82,
      hint:         'Check the balcony.',
    },
    {
      facade:       'assets/facades/facade_03.jpg',
      fox:          'assets/foxes/fox_03.png',
      foxX:         630,
      foxY:         280,
      foxWidth:     90,
      foxHeight:    60,
      hitboxWidth:  110,
      hitboxHeight: 80,
      hint:         'Something orange near the balcony.',
    },
  ];