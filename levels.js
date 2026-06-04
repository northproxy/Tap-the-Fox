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
    {
      facade:       "assets/facades/facade_04.jpg",
      fox:          "assets/foxes/fox_04.png",
      foxX:         240,
      foxY:         1010,
      foxWidth:     60,
      foxHeight:    45,
      hitboxWidth:  80,
      hitboxHeight: 65,
      foxOpacity:   0.6,   // fox transparency, if not set when transparency=1
      hint:         "Two small triangles peek above the roofline."
     },
     {
      facade:       "assets/facades/facade_05.jpg",
      fox:          "assets/foxes/fox_05.png",
      foxX:         400,
      foxY:         180,
      foxWidth:     70,
      foxHeight:    60,
      hitboxWidth:  90,
      hitboxHeight: 80,
      hint:         "Two small triangles peek above the roofline."
     },
     {
      facade:       "assets/facades/facade_06.jpg",
      fox:          "assets/foxes/fox_06.png",
      foxX:         370,
      foxY:         860,
      foxWidth:     80,
      foxHeight:    80,
      hitboxWidth:  100,
      hitboxHeight: 100,
      foxOpacity:   0.6,
      hint:         "Two small triangles peek above the roofline."
     },
     {
      facade:       "assets/facades/facade_07.jpg",
      fox:          "assets/foxes/fox_06.png",
      foxX:         370,
      foxY:         860,
      foxWidth:     80,
      foxHeight:    80,
      hitboxWidth:  100,
      hitboxHeight: 100,
      foxOpacity:   0.6,
      hint:         "Two small triangles peek above the roofline."
     },
     {
      facade:       "assets/facades/facade_08.jpg",
      fox:          "assets/foxes/fox_06.png",
      foxX:         370,
      foxY:         860,
      foxWidth:     80,
      foxHeight:    80,
      hitboxWidth:  100,
      hitboxHeight: 100,
      foxOpacity:   0.6,
      hint:         "Two small triangles peek above the roofline."
     },
     {
      facade:       "assets/facades/facade_09.jpg",
      fox:          "assets/foxes/fox_06.png",
      foxX:         370,
      foxY:         860,
      foxWidth:     80,
      foxHeight:    80,
      hitboxWidth:  100,
      hitboxHeight: 100,
      foxOpacity:   0.6,
      hint:         "Two small triangles peek above the roofline."
     },
     {
      facade:       "assets/facades/facade_10.jpg",
      fox:          "assets/foxes/fox_06.png",
      foxX:         370,
      foxY:         860,
      foxWidth:     80,
      foxHeight:    80,
      hitboxWidth:  100,
      hitboxHeight: 100,
      foxOpacity:   0.6,
      hint:         "Two small triangles peek above the roofline."
     },
    ];