function makeRocks(salt) {
  const r = stream(salt);
  const rocks = [];
  const minGap = 80;
  const maxGap = 200;
  const count = 14;
  let x = 40 + r() * 60;
  for (let i = 0; i < count; i++) {
    const y = HORIZON + 30 + r() * (VH - 120 - HORIZON - 30);
    const depth = 1 - (y - HORIZON) / (VH - HORIZON);
    const baseRadius = 18 + depth * 32 + r() * 12;
    const verts = 8 + (r() * 5) | 0;
    const poly = [];
    for (let j = 0; j < verts; j++) {
      const angle = (j / verts) * TAU + r() * 0.3;
      const rad = baseRadius * (0.7 + r() * 0.6);
      poly.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
    }
    // Bake texture
    const texSize = Math.ceil(baseRadius * 2.4);
    const texCanvas = document.createElement('canvas');
    texCanvas.width = texSize;
    texCanvas.height = texSize;
    const tg = texCanvas.getContext('2d');
    const noise = makeNoise(salt ^ (i * 0x1337 + 0xBEEF));
    const img = tg.createImageData(texSize, texSize);
    const d = img.data;
    const deep = hx(PAL.groundDeep);
    const lite = hx(PAL.hills[3]);
    const cx = texSize / 2, cy = texSize / 2;
    for (let py = 0; py < texSize; py++) {
      for (let px = 0; px < texSize; px++) {
        const dx = px - cx, dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > baseRadius * 1.1) {
          const idx = (py * texSize + px) * 4;
          d[idx] = 0; d[idx+1] = 0; d[idx+2] = 0; d[idx+3] = 0;
          continue;
        }
        const u = px / texSize, v = py / texSize;
        const f = fbm((u, v) => noise(u, v), px * 0.12, py * 0.12, 4, 2.0, 0.55);
        const shade = 0.6 + f * 0.5;
        const topFactor = 1 - (py / texSize);
        const bottomFactor = py / texSize;
        const t = 0.3 + 0.4 * topFactor + 0.1 * f;
        const rCol = lerp(deep[0], lite[0], t) * shade;
        const gCol = lerp(deep[1], lite[1], t) * shade;
        const bCol = lerp(deep[2], lite[2], t) * shade;
        const idx = (py * texSize + px) * 4;
        d[idx] = clamp(rCol, 0, 255);
        d[idx+1] = clamp(gCol, 0, 255);
        d[idx+2] = clamp(bCol, 0, 255);
        d[idx+3] = 255;
      }
    }
    tg.putImageData(img, 0, 0);
    rocks.push({
      x, y, poly, texCanvas, texSize,
      baseRadius, depth,
      shadowAlpha: 0.25
    });
    x += minGap + r() * (maxGap - minGap);
    if (x > WORLDW - 60) break;
  }
  return { rocks };
}

function drawRocks(g, state, cam, t) {
  const { rocks } = state;
  for (const rock of rocks) {
    let sx = rock.x - cam * 0.6;
    sx = ((sx % WORLDW) + WORLDW) % WORLDW;
    if (sx > VW + 100 || sx < -100) continue;
    // Contact shadow
    g.save();
    g.globalAlpha = rock.shadowAlpha;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(sx, rock.y + rock.baseRadius * 0.3, rock.baseRadius * 0.9, rock.baseRadius * 0.25, 0, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    // Draw boulder
    const half = rock.texSize / 2;
    g.drawImage(rock.texCanvas, sx - half, rock.y - half);
    g.restore();
  }
}