function makeFlock(salt) {
  const r = stream(salt);
  const count = 11;
  const birds = [];
  
  // Lead bird
  const leadX = r() * VW;
  const leadY = 80 + r() * 100; // y in [40,180] range
  const leadPhase = r() * TAU;
  const flapRate = 3.5 + r() * 1.5;
  const speed = 25 + r() * 15;
  
  birds.push({
    x: leadX,
    y: leadY,
    vx: speed,
    vy: 0,
    phase: leadPhase,
    flapRate: flapRate,
    isLeader: true,
    slotX: 0,
    slotY: 0,
    springX: 0,
    springY: 0,
    springVX: 0,
    springVY: 0
  });
  
  // Followers in V-formation
  const wingSpread = 35 + r() * 15; // horizontal spread per rank
  const depthStep = 28 + r() * 8;   // how far back each rank sits
  const vertSpread = 12 + r() * 6;  // vertical offset per rank
  
  let birdIndex = 1;
  for (let rank = 1; rank <= 5; rank++) {
    for (let side = -1; side <= 1; side += 2) {
      if (birdIndex >= count) break;
      
      const slotX = -rank * depthStep;
      const slotY = side * (rank * vertSpread * 0.5 + wingSpread * 0.3);
      
      birds.push({
        x: leadX + slotX,
        y: leadY + slotY,
        vx: speed * 0.95,
        vy: 0,
        phase: r() * TAU,
        flapRate: flapRate * (0.85 + r() * 0.3),
        isLeader: false,
        slotX: slotX,
        slotY: slotY,
        springX: 0,
        springY: 0,
        springVX: 0,
        springVY: 0
      });
      birdIndex++;
    }
  }
  
  return { birds, speed, flapRate };
}

function drawFlock(g, state, cam, t) {
  const { birds, speed, flapRate } = state;
  
  // Update leader position
  const leader = birds[0];
  leader.x += leader.vx * 0.016;
  leader.y += Math.sin(t * 0.3 + leader.phase * 0.5) * 0.3;
  
  // Wrap leader horizontally
  if (leader.x > VW + 100) leader.x = -100;
  if (leader.x < -100) leader.x = VW + 100;
  
  // Update followers with spring-lerp toward their V-slot behind leader
  for (let i = 1; i < birds.length; i++) {
    const bird = birds[i];
    const targetX = leader.x + bird.slotX;
    const targetY = leader.y + bird.slotY;
    
    // Spring force toward target
    const dx = targetX - bird.x;
    const dy = targetY - bird.y;
    const springK = 0.04;
    const damping = 0.85;
    
    bird.springVX += dx * springK;
    bird.springVY += dy * springK;
    bird.springVX *= damping;
    bird.springVY *= damping;
    
    bird.x += bird.springVX;
    bird.y += bird.springVY;
    
    // Add slight wander
    bird.y += Math.sin(t * 0.2 + bird.phase * 0.7 + i) * 0.15;
    
    // Wrap followers with leader
    if (bird.x > VW + 150) bird.x -= VW + 300;
    if (bird.x < -150) bird.x += VW + 300;
  }
  
  // Draw birds (back to front for depth)
  g.save();
  g.globalAlpha = 0.85;
  
  // Sort by y for depth ordering
  const sorted = [...birds].sort((a, b) => a.y - b.y);
  
  for (const bird of sorted) {
    const wingAngle = Math.sin(t * bird.flapRate + bird.phase) * 0.4 + 0.3;
    const wingLength = 6 + Math.sin(t * bird.flapRate * 0.7 + bird.phase) * 1.5;
    
    g.strokeStyle = mix(PAL.skyZenith, '#000000', 0.6);
    g.lineWidth = 1.2;
    g.lineCap = 'round';
    
    // Left wing
    g.beginPath();
    g.moveTo(bird.x, bird.y);
    g.quadraticCurveTo(
      bird.x - wingLength * Math.cos(wingAngle),
      bird.y - wingLength * Math.sin(wingAngle) * 0.5,
      bird.x - wingLength * 1.3,
      bird.y - wingLength * 0.2
    );
    g.stroke();
    
    // Right wing
    g.beginPath();
    g.moveTo(bird.x, bird.y);
    g.quadraticCurveTo(
      bird.x + wingLength * Math.cos(wingAngle),
      bird.y - wingLength * Math.sin(wingAngle) * 0.5,
      bird.x + wingLength * 1.3,
      bird.y - wingLength * 0.2
    );
    g.stroke();
    
    // Body hint (tiny dot)
    g.fillStyle = mix(PAL.skyZenith, '#000000', 0.7);
    g.beginPath();
    g.arc(bird.x, bird.y, 0.8, 0, TAU);
    g.fill();
  }
  
  g.globalAlpha = 1;
  g.restore();
}