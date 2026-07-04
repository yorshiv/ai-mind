/* =====================================================================
   NEXARA AI — Hero Engine
   Sections:
   1. Shared state & helpers
   2. Background starfield (canvas 2D)
   3. Bottom energy stream (canvas 2D)
   4. Three.js neural brain
   5. Service cards + connector lines
   6. Text reveal / magnetic buttons (GSAP)
   ===================================================================== */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_SMALL = window.innerWidth <= 1180;

const mouse = { x: 0, y: 0, tx: 0, ty: 0 }; // normalized -1..1, t = target (smoothed)
window.addEventListener('mousemove', (e) => {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
});

const clock = { t: 0, dt: 0, last: performance.now() };
function tickClock(){
  const now = performance.now();
  clock.dt = Math.min((now - clock.last) / 1000, 0.05);
  clock.last = now;
  clock.t += clock.dt;
  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;
}

/* =====================================================================
   2. BACKGROUND STARFIELD
   ===================================================================== */
(function backgroundField(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let stars = [];
  let meshDots = [];

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    buildField();
  }

  function buildField(){
    const starCount = REDUCED_MOTION ? 60 : (IS_SMALL ? 90 : 160);
    stars = Array.from({length: starCount}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      r: Math.random()*1.4 + 0.3,
      depth: Math.random()*0.6 + 0.2,
      phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.6 + 0.3
    }));
    const meshCount = REDUCED_MOTION ? 0 : (IS_SMALL ? 14 : 26);
    meshDots = Array.from({length: meshCount}, () => ({
      x: Math.random()*w*0.7, y: Math.random()*h,
      depth: Math.random()*0.4 + 0.15,
      driftX: (Math.random()-0.5)*10,
      driftY: (Math.random()-0.5)*10,
      phase: Math.random()*Math.PI*2
    }));

    buildCircuits();
  }

  function buildCircuits(){
    const count = REDUCED_MOTION ? 0 : (IS_SMALL ? 8 : 16);
    circuits = [];
    for(let i=0;i<count;i++){
      const startEdge = Math.random() < 0.5 ? 'left' : 'right';
      const sx = startEdge === 'left' ? -20 : w+20;
      const sy = Math.random()*h;
      const segs = 2 + Math.floor(Math.random()*3);
      const points = [{x:sx,y:sy}];
      let cx = sx, cy = sy;
      for(let s=0;s<segs;s++){
        if(s % 2 === 0){ cx += (startEdge==='left' ? 1 : -1) * (60 + Math.random()*140); }
        else{ cy += (Math.random()<0.5?1:-1) * (50 + Math.random()*120); }
        points.push({x:cx,y:cy});
      }
      circuits.push({
        points,
        pink: Math.random() < 0.5,
        t: Math.random(),
        speed: 0.1 + Math.random()*0.14
      });
    }
  }
  let circuits = [];

  function draw(){
    ctx.clearRect(0,0,w,h);

    // twinkling stars with slight parallax
    for(const s of stars){
      const px = s.x + mouse.x * 18 * s.depth;
      const py = s.y + mouse.y * 12 * s.depth;
      const tw = 0.5 + Math.sin(clock.t * s.speed + s.phase) * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(180,200,255,${0.15 + tw*0.5})`;
      ctx.fill();
    }

    // faint neural mesh in the far background
    ctx.strokeStyle = 'rgba(120,140,255,0.10)';
    ctx.lineWidth = 1;
    for(let i=0;i<meshDots.length;i++){
      const a = meshDots[i];
      const ax = a.x + Math.sin(clock.t*0.2 + a.phase)*a.driftX + mouse.x*14*a.depth;
      const ay = a.y + Math.cos(clock.t*0.2 + a.phase)*a.driftY + mouse.y*10*a.depth;
      for(let j=i+1;j<meshDots.length;j++){
        const b = meshDots[j];
        const bx = b.x + mouse.x*14*b.depth;
        const by = b.y + mouse.y*10*b.depth;
        const dist = Math.hypot(ax-bx, ay-by);
        if(dist < 190){
          ctx.globalAlpha = 1 - dist/190;
          ctx.beginPath();
          ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(ax,ay,1.6,0,Math.PI*2);
      ctx.fillStyle = 'rgba(150,170,255,0.5)';
      ctx.fill();
    }

    drawCircuits();
  }

  function segLength(a,b){ return Math.hypot(b.x-a.x, b.y-a.y); }

  function drawCircuits(){
    ctx.globalCompositeOperation = 'lighter';
    for(const c of circuits){
      const pts = c.points;
      const color = c.pink ? '196,107,255' : '79,177,255';

      // draw the trace path itself, faint
      ctx.strokeStyle = `rgba(${color},0.14)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // small junction nodes
      for(const p of pts){
        ctx.beginPath();
        ctx.arc(p.x,p.y,2,0,Math.PI*2);
        ctx.fillStyle = `rgba(${color},0.3)`;
        ctx.fill();
      }

      // traveling pulse along the polyline
      const total = pts.reduce((sum,p,i)=> i===0?0:sum+segLength(pts[i-1],p), 0);
      c.t += c.speed * clock.dt;
      if(c.t > 1) c.t = 0;
      let dist = c.t * total;
      let px=pts[0].x, py=pts[0].y;
      for(let i=1;i<pts.length;i++){
        const len = segLength(pts[i-1], pts[i]);
        if(dist <= len){
          const f = len === 0 ? 0 : dist/len;
          px = pts[i-1].x + (pts[i].x-pts[i-1].x)*f;
          py = pts[i-1].y + (pts[i].y-pts[i-1].y)*f;
          break;
        }
        dist -= len;
      }
      ctx.beginPath();
      ctx.arc(px,py,3,0,Math.PI*2);
      ctx.fillStyle = `rgba(${color},0.95)`;
      ctx.shadowColor = `rgba(${color},1)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(){
    draw();
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  resize();
  loop();
})();

/* =====================================================================
   3. BOTTOM ENERGY STREAM — data feeding up into the brain
   ===================================================================== */
(function energyStream(){
  const canvas = document.getElementById('energy-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let particles = [];
  const COUNT = REDUCED_MOTION ? 0 : (IS_SMALL ? 60 : 140);

  function target(){
    // brain sits in the right ~64% column, roughly centered vertically
    return { x: w * (IS_SMALL ? 0.5 : 0.68), y: h * 0.56 };
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function spawn(){
    const t = target();
    const spread = w * 0.55;
    const sx = t.x + (Math.random()-0.5)*spread;
    return {
      x: sx, y: h + 20,
      sx, sy: h+20,
      t: Math.random(),
      speed: 0.12 + Math.random()*0.16,
      curve: (Math.random()-0.5) * 160,
      size: Math.random()*1.6 + 0.6,
      hueMix: Math.random()
    };
  }

  function init(){ particles = Array.from({length: COUNT}, spawn); }

  function draw(){
    ctx.clearRect(0,0,w,h);
    const t = target();
    ctx.globalCompositeOperation = 'lighter';

    for(const p of particles){
      p.t += p.speed * clock.dt;
      if(p.t >= 1){ Object.assign(p, spawn(), {t:0}); continue; }

      const ease = 1 - Math.pow(1-p.t, 3);
      const midX = (p.sx + t.x)/2 + p.curve * Math.sin(p.t*Math.PI);
      const midY = (p.sy + t.y)/2;
      // quadratic bezier
      const x = (1-ease)*(1-ease)*p.sx + 2*(1-ease)*ease*midX + ease*ease*t.x;
      const y = (1-ease)*(1-ease)*p.sy + 2*(1-ease)*ease*midY + ease*ease*t.y;

      const prevEase = Math.max(0, ease - 0.02);
      const px = (1-prevEase)*(1-prevEase)*p.sx + 2*(1-prevEase)*prevEase*midX + prevEase*prevEase*t.x;
      const py = (1-prevEase)*(1-prevEase)*p.sy + 2*(1-prevEase)*prevEase*midY + prevEase*prevEase*t.y;

      const alpha = Math.sin(p.t * Math.PI) * 0.85;
      const r = Math.round(80 + p.hueMix*140);
      const g = Math.round(130 + (1-p.hueMix)*40);
      const b = 255;

      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(px,py);
      ctx.lineTo(x,y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(){ draw(); requestAnimationFrame(loop); }
  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init();
  if(!REDUCED_MOTION) loop(); else draw();
})();

/* =====================================================================
   4. HOLOGRAPHIC SVG NEURAL BRAIN
   Hand-built (no WebGL/CDN dependency): a wireframe brain silhouette with
   procedurally generated gyrus fold-lines, a glowing central fissure,
   scattered pulsing neurons, and native-SVG traveling electric pulses.
   ===================================================================== */
const BrainEngine = (function(){
  const mount = document.getElementById('brain-breathe');
  const parallax = document.getElementById('brain-parallax');
  if(!mount) return { ready:false };

  const VB = 600;      // viewBox size
  const CX = 300, CY = 300;
  const A = 232, B = 246; // horizontal / vertical base radii

  // radial outline function: theta measured from top (0), clockwise
  function outlineR(theta){
    let r = 1;
    r += 0.055 * Math.sin(theta*3 + 0.4);
    r += 0.038 * Math.sin(theta*5 - 1.1);
    r += 0.026 * Math.sin(theta*8 + 2.2);
    r += 0.018 * Math.sin(theta*13 + 0.7);
    // taper the bottom into a brainstem-like neck
    const bottom = Math.max(0, Math.cos(theta - Math.PI));
    r *= 1 - 0.4 * Math.pow(bottom, 3);
    return r;
  }
  function outlinePoint(theta){
    const r = outlineR(theta);
    return {
      x: CX + A * Math.sin(theta) * r,
      y: CY - B * Math.cos(theta) * r
    };
  }

  const N = 160;
  const outline = [];
  for(let i=0;i<N;i++) outline.push(outlinePoint((i/N)*Math.PI*2));

  function pathFromPoints(pts, close){
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
    for(let i=1;i<pts.length;i++) d += `L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} `;
    if(close) d += 'Z';
    return d;
  }

  // point-in-polygon test (ray casting) against the outline
  function inside(x,y){
    let c = false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++){
      const xi=outline[i].x, yi=outline[i].y, xj=outline[j].x, yj=outline[j].y;
      if(((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||1e-6)+xi)) c = !c;
    }
    return c;
  }

  // horizontal extent of the silhouette at a given y (approx, sampled)
  function widthAtY(y){
    let minX = CX, maxX = CX, found = false;
    for(let i=0;i<outline.length;i++){
      const a = outline[i], b = outline[(i+1)%outline.length];
      if((a.y<=y && b.y>=y) || (a.y>=y && b.y<=y)){
        const t = (b.y-a.y)===0 ? 0 : (y-a.y)/(b.y-a.y);
        const x = a.x + (b.x-a.x)*t;
        minX = Math.min(minX,x); maxX = Math.max(maxX,x); found = true;
      }
    }
    return found ? {minX,maxX} : null;
  }

  const GYRUS_COUNT = REDUCED_MOTION ? 20 : (IS_SMALL ? 30 : 46);
  const gyrusLines = [];
  const topY = CY - B*0.94, botY = CY + B*0.7;
  for(let i=0;i<GYRUS_COUNT;i++){
    const y0 = topY + (i/(GYRUS_COUNT-1)) * (botY-topY) + (Math.random()-0.5)*10;
    const ext = widthAtY(y0);
    if(!ext) continue;
    const span = ext.maxX-ext.minX;
    const steps = 22;
    const amp = 5 + Math.random()*6;
    const freq = 1.4 + Math.random()*1.6;
    const phase = Math.random()*Math.PI*2;
    const pts = [];
    for(let s=0;s<=steps;s++){
      const fx = ext.minX + (span*s/steps);
      const fy = y0 + Math.sin((s/steps)*Math.PI*freq + phase) * amp * Math.sin((s/steps)*Math.PI);
      pts.push({x:fx, y:fy});
    }
    gyrusLines.push(pts);
  }

  const NEURON_COUNT = REDUCED_MOTION ? 16 : (IS_SMALL ? 26 : 40);
  const neurons = [];
  let tries = 0;
  while(neurons.length < NEURON_COUNT && tries < NEURON_COUNT*40){
    tries++;
    const x = CX + (Math.random()-0.5)*A*1.7;
    const y = CY + (Math.random()-0.5)*B*1.7;
    if(inside(x,y)) neurons.push({x,y, r: 1.6+Math.random()*2.2, delay: Math.random()*2.6});
  }

  function colorFor(x){
    const t = Math.min(1, Math.max(0, (x - (CX-A)) / (A*2)));
    return t;
  }

  const svgParts = [];
  svgParts.push(`<svg viewBox="0 0 ${VB} ${VB}" xmlns="http://www.w3.org/2000/svg">`);
  svgParts.push(`<defs>
    <linearGradient id="hemiGrad" x1="${CX-A}" y1="0" x2="${CX+A}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4fb1ff"/>
      <stop offset="48%" stop-color="#9b7bff"/>
      <stop offset="100%" stop-color="#ff5fc4"/>
    </linearGradient>
    <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#ff8fe0" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#8b6bff" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <clipPath id="brainClip"><path d="${pathFromPoints(outline,true)}"/></clipPath>
  </defs>`);

  // outer halo (heavily blurred duplicate of the outline)
  svgParts.push(`<path d="${pathFromPoints(outline,true)}" fill="none" stroke="url(#hemiGrad)" stroke-width="10" opacity="0.35" filter="url(#bigGlow)" class="brain-halo"/>`);

  // gyrus fold lines, clipped to silhouette
  gyrusLines.forEach((pts, i) => {
    svgParts.push(`<path id="gyrus-${i}" class="gyrus-line" d="${pathFromPoints(pts,false)}" fill="none" stroke="url(#hemiGrad)" stroke-width="1.3" clip-path="url(#brainClip)" filter="url(#softGlow)"/>`);
  });

  // sharp outline on top
  svgParts.push(`<path d="${pathFromPoints(outline,true)}" fill="none" stroke="url(#hemiGrad)" stroke-width="2.2" filter="url(#softGlow)"/>`);

  // central longitudinal fissure
  const fissurePts = [];
  for(let s=0;s<=20;s++){
    const y = topY + (botY-topY)*0.15 + (s/20)*(botY-topY)*0.85;
    const x = CX + Math.sin(s*0.7)*2.2;
    fissurePts.push({x,y});
  }
  svgParts.push(`<path d="${pathFromPoints(fissurePts,false)}" fill="none" stroke="#ffe8fb" stroke-width="2" opacity="0.8" filter="url(#softGlow)"/>`);

  // neurons
  neurons.forEach(n => {
    const t = colorFor(n.x);
    const col = t < 0.5 ? '#7fd0ff' : '#ff8fe0';
    svgParts.push(`<circle class="neuron-dot" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${col}" filter="url(#softGlow)" style="animation-delay:${n.delay.toFixed(2)}s"/>`);
  });

  // central core / brainstem glow where the energy stream converges
  svgParts.push(`<circle class="brain-core" cx="${CX}" cy="${CY+B*0.62}" r="34" fill="url(#coreGrad)"/>`);

  // traveling electric pulses along a subset of gyrus lines (native SMIL animation)
  if(!REDUCED_MOTION){
    const pulseCount = IS_SMALL ? 8 : 14;
    for(let i=0;i<pulseCount;i++){
      const gi = Math.floor(Math.random()*gyrusLines.length);
      const dur = (2.2 + Math.random()*2.4).toFixed(2);
      svgParts.push(`<circle r="2.6" fill="#ffffff" filter="url(#softGlow)" opacity="0.9">
        <animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto">
          <mpath href="#gyrus-${gi}"/>
        </animateMotion>
        <animate attributeName="opacity" values="0;0.95;0.95;0" dur="${dur}s" repeatCount="indefinite"/>
      </circle>`);
    }
  }

  svgParts.push('</svg>');
  mount.innerHTML = svgParts.join('');

  function animate(){
    if(!parallax) return;
    parallax.style.transform = `translate(${mouse.x*20}px, ${mouse.y*14}px)`;
  }

  return { ready:true, animate };
})();

/* =====================================================================
   5. SERVICE CARDS + CONNECTOR LINES
   ===================================================================== */
(function serviceEcosystem(){
  if(IS_SMALL) return; // hidden on small screens via CSS; skip logic

  const ICONS = {
    agent: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    whatsapp: '<path d="M12 3a9 9 0 00-7.8 13.4L3 21l4.8-1.2A9 9 0 1012 3z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 8.8c.2 3 3 5.7 6 6l1.3-1.3-2-.8-1 1c-1.3-.7-2.5-1.9-3.2-3.2l1-1-.8-2H8.5z" fill="currentColor" stroke="none"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3L5.6 5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    brain: '<path d="M9 4a3 3 0 00-3 3 3 3 0 00-1.5 5.6A3 3 0 007 17a3 3 0 003 2.9V4zM15 4a3 3 0 013 3 3 3 0 011.5 5.6A3 3 0 0117 17a3 3 0 01-3 2.9V4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    puzzle: '<path d="M9 4h4v2.2a1.8 1.8 0 103.6 0V4H20v4.2h-2.2a1.8 1.8 0 100 3.6H20V16h-4.2a1.8 1.8 0 10-3.6 0V16H8v-4.2H5.8a1.8 1.8 0 100-3.6H8V4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    chat: '<rect x="3.5" y="5" width="17" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 20l2.5-3M9 10h6M9 13h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    voice: '<rect x="9.5" y="3" width="5" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 11a6 6 0 0012 0M12 17v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
    api: '<path d="M8 6L3 12l5 6M16 6l5 6-5 6M14 4l-4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    rag: '<path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="19" cy="12" r="2" fill="currentColor"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    target: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    share: '<circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.1 10.8L15.9 7.2M8.1 13.2l7.8 3.6" stroke="currentColor" stroke-width="1.4"/>',
    phone: '<path d="M5 4.5h3.4l1.4 4-2 1.6a12 12 0 006.1 6.1l1.6-2 4 1.4V19a1.6 1.6 0 01-1.7 1.6A15.5 15.5 0 013.4 6.2 1.6 1.6 0 015 4.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  };

  const SERVICES = [
    { icon:'agent', title:'AI Agents', desc:'Autonomous agents that handle tasks, support & engagement' },
    { icon:'whatsapp', title:'WhatsApp API Automation', desc:'Automated conversations, notifications & customer support' },
    { icon:'gear', title:'Business Automation', desc:'Streamline workflows and eliminate repetitive tasks' },
    { icon:'puzzle', title:'CRM Automation', desc:'Sync leads, deals and conversations automatically' },
    { icon:'chat', title:'Chatbot Development', desc:'Conversational interfaces that resolve requests instantly' },
    { icon:'voice', title:'Voice AI Agents', desc:'Natural-sounding voice agents for calls & IVR' },
    { icon:'target', title:'Lead Generation Automation', desc:'Capture, qualify and route leads on autopilot' },
    { icon:'share', title:'Social Media Automation', desc:'Scheduled, on-brand content and engagement at scale' },
    { icon:'api', title:'Workflow Automation', desc:'Multi-step processes running without human input' },
    { icon:'brain', title:'Machine Learning', desc:'Predictive analytics and smart decision-making systems' },
    { icon:'chart', title:'Data Analytics', desc:'Turn raw data into actionable insight and growth' },
    { icon:'rag', title:'Custom Integrations', desc:'Seamless connections with your favorite tools & platforms' },
    { icon:'mail', title:'Email Automation', desc:'Sequences and triggers that nurture leads while you sleep' },
    { icon:'chat', title:'Customer Support Automation', desc:'Instant, always-on resolution across every channel' },
    { icon:'phone', title:'AI Calling System', desc:'AI-driven outbound & inbound calling that sounds human' },
  ];

  const SLOT_COUNT = 6;
  const layer = document.getElementById('cards-layer');
  const svg = document.getElementById('connector-svg');
  const scene = document.querySelector('.scene');

  // vertical distribution to roughly match reference layout
  const topPct = [4, 19.5, 35, 50.5, 66, 81.5];

  let queueIdx = SLOT_COUNT;
  const slots = [];

  for(let i=0;i<SLOT_COUNT;i++){
    const svc = SERVICES[i];
    const card = document.createElement('div');
    card.className = 'service-card';
    card.style.top = topPct[i] + '%';
    card.innerHTML = cardHTML(svc);
    layer.appendChild(card);

    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('class','connector-path');
    path.setAttribute('stroke', i % 2 === 0 ? 'url(#lineGradBlue)' : 'url(#lineGradPink)');
    svg.appendChild(path);

    slots.push({ el: card, path, svc, activeUntil: 0 });

    setTimeout(() => card.classList.add('visible'), 300 + i*140);
  }

  function cardHTML(svc){
    return `<div class="card-icon">${iconSVG(svc.icon)}</div>
      <div class="card-text"><h4>${svc.title}</h4><p>${svc.desc}</p></div>`;
  }
  function iconSVG(key){
    return `<svg viewBox="0 0 24 24" fill="none">${ICONS[key] || ICONS.agent}</svg>`;
  }

  function brainAnchor(){
    const bc = document.getElementById('brain-canvas-container').getBoundingClientRect();
    return { x: bc.left + bc.width*0.5, y: bc.top + bc.height*0.44 };
  }

  function updatePaths(){
    const sceneRect = scene.getBoundingClientRect();
    const anchor = brainAnchor();
    for(const s of slots){
      const r = s.el.getBoundingClientRect();
      const startX = r.left - sceneRect.left;
      const startY = r.top - sceneRect.top + r.height/2;
      const endX = anchor.x - sceneRect.left;
      const endY = anchor.y - sceneRect.top;
      const midX = startX - (startX-endX)*0.42;
      const d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      s.path.setAttribute('d', d);
    }
  }

  function activateRandom(){
    const s = slots[Math.floor(Math.random()*slots.length)];
    s.el.classList.add('active');
    s.path.classList.add('active');
    setTimeout(() => {
      s.el.classList.remove('active');
      s.path.classList.remove('active');
    }, 1600);
  }

  function rotateSlot(){
    if(REDUCED_MOTION) return;
    const idx = Math.floor(Math.random()*slots.length);
    const slot = slots[idx];
    const next = SERVICES[queueIdx % SERVICES.length];
    queueIdx++;
    slot.el.style.transition = 'opacity .35s ease, transform .35s ease';
    slot.el.style.opacity = '0';
    slot.el.style.transform = 'translateX(14px) scale(0.97)';
    setTimeout(() => {
      slot.svc = next;
      slot.el.innerHTML = cardHTML(next);
      slot.el.style.opacity = '1';
      slot.el.style.transform = 'translateX(0) scale(1)';
    }, 380);
  }

  window.addEventListener('resize', updatePaths);
  requestAnimationFrame(function raf(){ updatePaths(); requestAnimationFrame(raf); });

  if(!REDUCED_MOTION){
    setInterval(activateRandom, 1400);
    setInterval(rotateSlot, 4200);
  }
})();

/* =====================================================================
   6. TEXT REVEAL + MAGNETIC BUTTONS
   ===================================================================== */
(function polish(){
  document.querySelectorAll('.reveal-el').forEach((el, i) => {
    el.style.animation = `revealUp 0.9s cubic-bezier(.2,.8,.2,1) forwards`;
    el.style.animationDelay = `${0.15 + i*0.09}s`;
  });

  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top - r.height/2;
      btn.style.transform = `translate(${x*0.18}px, ${y*0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0,0)';
    });
  });
})();

/* =====================================================================
   MASTER LOOP
   ===================================================================== */
(function masterLoop(){
  function loop(){
    tickClock();
    if(BrainEngine.ready) BrainEngine.animate();
    requestAnimationFrame(loop);
  }
  loop();
})();
