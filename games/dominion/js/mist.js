function makeMist(salt) {
  const r = stream(salt);
  const layers = [];
  const count = 3 + (r() * 2) | 0; // 3-4 layers

  for (let i = 0; i < count; i++) {
    const width = 800 + r() * 600;
    const height = 60 + r() * 80;
    const yBase = HORIZON - 30 + r() * 60;
    const scrollSpeed = 4 + r() * 12;
    const bobAmp = 2 + r() * 6;
    const bobFreq = 0.3 + r() * 0.5;
    const alpha = 0.12 + r() * 0.13;
    const phase = r() * TAU;

    // Bake ribbon texture
    const tex = document.createElement('canvas');
    tex.width = width;
    tex.height = height;
    const g = tex.getContext('2d');
    const noise = makeNoise(salt ^ (i * 0x100));
    const img = g.createImageData(width, height);
    const d = img.data;
    const fog = hx(PAL.fog);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const v = y / height;
        // fBm for organic shape
        const f = fbm((u, v) => noise(u, v), x * 0.03, y * 0.08, 4, 2.0, 0.55);
        // Vertical fade: soft top/bottom
        const fade = Math.sin(v * Math.PI) * 0.8 + 0.2;
        // Horizontal variation
        const hFade = Math.sin(u * Math.PI * 0.5) * 0.3 + 0.7;
        let a = clamp(f * fade * hFade, 0, 1);
        // Soften edges
        a = smooth(a);
        const idx = (y * width + x) * 4;
        d[idx] = fog[0];
        d[idx + 1] = fog[1];
        d[idx + 2] = fog[2];
        d[idx + 3] = clamp(a * 255, 0, 255);
      }
    }
    g.putImageData(img, 0, 0);

    layers.push({
      tex,
      width,
      height,
      yBase,
      scrollSpeed,
      bobAmp,
      bobFreq,
      alpha,
      phase,
      xOff: r() * WORLDW
    });
  }

  return { layers };
}

function drawMist(g, state, cam, t) {
  const { layers } = state;

  g.save();
  g.globalCompositeOperation = 'source-over';

  for (const layer of layers) {
    const scroll = (cam * 0.15 + t * layer.scrollSpeed + layer.xOff) % WORLDW;
    const bobY = Math.sin(t * layer.bobFreq + layer.phase) * layer.bobAmp;
    const y = layer.yBase + bobY;

    g.globalAlpha = layer.alpha;

    // Draw multiple copies to wrap horizontally
    const step = layer.width;
    const startX = -scroll % step;
    for (let x = startX - step; x < VW + step; x += step) {
      g.drawImage(layer.tex, x, y);
    }
  }

  g.globalAlpha = 1;
  g.restore();
}