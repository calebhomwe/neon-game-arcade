function makeFlora(salt) {
  const r = stream(salt);
  const flowers = [];
  const grassTufts = [];
  
  // Jittered grid for flowers across ground band
  const gridSize = 48;
  const cols = Math.ceil(WORLDW / gridSize) + 2;
  const rows = 4;
  
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const baseX = col * gridSize + r() * gridSize * 0.6;
      const baseY = HORIZON + 20 + row * 60 + r() * 30;
      if (baseY > VH - 20) continue;
      
      const species = (r() * 3) | 0;
      const stemHeight = 20 + r() * 35;
      const petalCount = 5 + (r() * 4) | 0;
      const petalSize = 4 + r() * 5;
      const color = r() < 0.5 ? PAL.floraGold : PAL.floraRose;
      const phase = r() * TAU;
      const swayFreq = 0.8 + r() * 0.6;
      const swayAmp = 0.03 + r() * 0.04;
      const depth = 1 - (baseY - HORIZON) / (VH - HORIZON);
      
      flowers.push({
        x: baseX,
        y: baseY,
        stemHeight,
        petalCount,
        petalSize,
        color,
        phase,
        swayFreq,
        swayAmp,
        depth,
        springVel: 0,
        springPos: 0
      });
    }
  }
  
  // Foreground grass tufts near bottom
  const grassSpacing = 24;
  const grassCols = Math.ceil(WORLDW / grassSpacing) + 2;
  for (let col = 0; col < grassCols; col++) {
    const baseX = col * grassSpacing + r() * 12;
    const baseY = VH - 30 - r() * 40;
    const height = 20 + r() * 30;
    const phase = r() * TAU;
    const swayFreq = 1.0 + r() * 0.5;
    const swayAmp = 0.04 + r() * 0.03;
    
    grassTufts.push({
      x: baseX,
      y: baseY,
      height,
      phase,
      swayFreq,
      swayAmp,
      depth: 1.2
    });
  }
  
  return { flowers, grassTufts };
}

function drawFlora(g, state, cam, t) {
  const { flowers, grassTufts } = state;
  
  // Draw grass tufts first (behind flowers)
  for (const tuft of grassTufts) {
    let sx = tuft.x - cam * 0.8;
    sx = ((sx % WORLDW) + WORLDW) % WORLDW;
    if (sx > VW + 40 || sx < -40) continue;
    
    const sway = Math.sin(t * tuft.swayFreq + tuft.phase + sx * 0.01) * tuft.swayAmp;
    
    g.save();
    g.translate(sx, tuft.y);
    g.transform(1, 0, sway, 1, 0, 0);
    
    // Draw grass blades
    const bladeCount = 5 + (tuft.x * 7 + tuft.y * 13) % 3;
    for (let i = 0; i < bladeCount; i++) {
      const bx = (i / bladeCount - 0.5) * 12;
      const bh = tuft.height * (0.6 + (i * 0.1));
      const alpha = 0.5 + (i / bladeCount) * 0.4;
      
      g.strokeStyle = mix(PAL.canopyDeep, PAL.groundLite, 0.3 + i * 0.1);
      g.globalAlpha = alpha;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(bx, 0);
      g.quadraticCurveTo(bx + sway * 8, -bh * 0.5, bx + sway * 12, -bh);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
  }
  
  // Draw flowers
  for (const flower of flowers) {
    let sx = flower.x - cam * 0.6;
    sx = ((sx % WORLDW) + WORLDW) % WORLDW;
    if (sx > VW + 60 || sx < -60) continue;
    
    // Spring wobble
    const windForce = Math.sin(t * flower.swayFreq + flower.phase + sx * 0.01) * flower.swayAmp;
    flower.springVel += (windForce - flower.springPos * 0.1 - flower.springVel * 0.3) * 0.1;
    flower.springPos += flower.springVel;
    
    const totalSway = windForce + flower.springPos * 0.5;
    
    g.save();
    g.translate(sx, flower.y);
    g.transform(1, 0, totalSway, 1, 0, 0);
    
    // Stem
    g.strokeStyle = mix(PAL.canopyDeep, PAL.groundLite, 0.5);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -flower.stemHeight);
    g.stroke();
    
    // Petal ring
    const cx = 0;
    const cy = -flower.stemHeight;
    const petalAngle = t * 0.1 + flower.phase;
    
    for (let i = 0; i < flower.petalCount; i++) {
      const angle = (i / flower.petalCount) * TAU + petalAngle;
      const px = cx + Math.cos(angle) * flower.petalSize * 0.8;
      const py = cy + Math.sin(angle) * flower.petalSize * 0.6;
      
      g.fillStyle = flower.color;
      g.globalAlpha = 0.9;
      g.beginPath();
      g.ellipse(px, py, flower.petalSize * 0.5, flower.petalSize * 0.35, angle, 0, TAU);
      g.fill();
    }
    
    // Center dot
    g.fillStyle = mix(PAL.floraGold, PAL.floraRose, 0.5);
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(cx, cy, 2.5, 0, TAU);
    g.fill();
    
    g.restore();
  }
}