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
  }

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
    return { x: w * (IS_SMALL ? 0.5 : 0.71), y: h * 0.5 };
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
   4. THREE.JS NEURAL BRAIN
   ===================================================================== */
const BrainEngine = (function(){
  if(typeof THREE === 'undefined') return { ready:false };

  const container = document.getElementById('brain-canvas-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 9.4);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const brainGroup = new THREE.Group();
  scene.add(brainGroup);

  /* ---- circular glow sprite texture, generated at runtime ---- */
  function makeGlowTexture(inner, outer){
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    const grad = cx.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.4, inner);
    grad.addColorStop(1, outer);
    cx.fillStyle = grad;
    cx.fillRect(0,0,size,size);
    return new THREE.CanvasTexture(c);
  }
  const dotTexture = makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');

  /* ---- brain surface shape via deformed dual-lobe sphere ---- */
  function brainRadius(theta, phi){
    // theta: polar (0..PI), phi: azimuth (0..2PI)
    let r = 1;
    r += 0.10 * Math.sin(phi*5 + theta*3);
    r += 0.06 * Math.sin(phi*9 - theta*6 + 1.2);
    r += 0.05 * Math.sin(theta*10 + phi*2);
    r *= 1 - 0.18 * Math.pow(Math.cos(theta),2); // flatten poles slightly (top/bottom)
    return r;
  }

  const PARTICLE_COUNT = REDUCED_MOTION ? 1400 : (IS_SMALL ? 2200 : 4200);
  const positions = new Float32Array(PARTICLE_COUNT*3);
  const colors = new Float32Array(PARTICLE_COUNT*3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const basePos = [];

  const colBlue = new THREE.Color('#4fb1ff');
  const colPurple = new THREE.Color('#8b6bff');
  const colPink = new THREE.Color('#ff5fc4');

  for(let i=0;i<PARTICLE_COUNT;i++){
    const theta = Math.acos(2*Math.random()-1);
    const phi = Math.random()*Math.PI*2;
    const r = 2.35 * brainRadius(theta, phi);

    let x = r * Math.sin(theta) * Math.cos(phi);
    let y = r * Math.cos(theta) * 1.08;
    let z = r * Math.sin(theta) * Math.sin(phi) * 0.86;

    // carve the central longitudinal fissure
    const gap = Math.exp(-Math.pow(x*3.2,2)) * 0.55;
    x += x >= 0 ? gap : -gap;

    positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
    basePos.push(x,y,z);

    const mixT = THREE.MathUtils.clamp((x/2.6)+0.5, 0, 1);
    const c = mixT < 0.5
      ? colBlue.clone().lerp(colPurple, mixT*2)
      : colPurple.clone().lerp(colPink, (mixT-0.5)*2);
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
    sizes[i] = Math.random()*2.2 + 0.9;
  }

  const brainGeo = new THREE.BufferGeometry();
  brainGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  brainGeo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  brainGeo.setAttribute('size', new THREE.BufferAttribute(sizes,1));

  const brainMat = new THREE.PointsMaterial({
    size: 0.05,
    map: dotTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const brainPoints = new THREE.Points(brainGeo, brainMat);
  brainGroup.add(brainPoints);

  /* ---- neural connection lines between nearby points ---- */
  const LINK_COUNT = REDUCED_MOTION ? 0 : (IS_SMALL ? 90 : 170);
  const linkPositions = [];
  const linkColors = [];
  const linkPairs = [];
  for(let i=0;i<LINK_COUNT;i++){
    const a = Math.floor(Math.random()*PARTICLE_COUNT);
    let b = a, tries=0;
    while(tries < 6){
      b = Math.floor(Math.random()*PARTICLE_COUNT);
      const dx = basePos[a*3]-basePos[b*3], dy=basePos[a*3+1]-basePos[b*3+1], dz=basePos[a*3+2]-basePos[b*3+2];
      if(Math.sqrt(dx*dx+dy*dy+dz*dz) < 0.9) break;
      tries++;
    }
    linkPairs.push([a,b]);
    linkPositions.push(basePos[a*3],basePos[a*3+1],basePos[a*3+2], basePos[b*3],basePos[b*3+1],basePos[b*3+2]);
    const c1 = new THREE.Color(colors[a*3],colors[a*3+1],colors[a*3+2]);
    linkColors.push(c1.r,c1.g,c1.b, c1.r,c1.g,c1.b);
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions,3));
  linkGeo.setAttribute('color', new THREE.Float32BufferAttribute(linkColors,3));
  const linkMat = new THREE.LineBasicMaterial({
    vertexColors:true, transparent:true, opacity:0.16,
    blending:THREE.AdditiveBlending, depthWrite:false
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  brainGroup.add(linkLines);

  /* ---- traveling electric pulses along random links ---- */
  const PULSE_COUNT = REDUCED_MOTION ? 0 : (IS_SMALL ? 12 : 26);
  const pulseGeo = new THREE.BufferGeometry();
  const pulsePos = new Float32Array(PULSE_COUNT*3);
  const pulseCol = new Float32Array(PULSE_COUNT*3);
  const pulseState = [];
  for(let i=0;i<PULSE_COUNT;i++){
    const pair = linkPairs[Math.floor(Math.random()*linkPairs.length)] || [0,0];
    pulseState.push({ pair, t: Math.random(), speed: 0.4 + Math.random()*0.5 });
    const c = new THREE.Color('#ffffff');
    pulseCol[i*3]=c.r; pulseCol[i*3+1]=c.g; pulseCol[i*3+2]=c.b;
  }
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos,3));
  pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseCol,3));
  const pulseMat = new THREE.PointsMaterial({
    size:0.09, map:dotTexture, vertexColors:true, transparent:true,
    opacity:0.95, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true
  });
  const pulsePoints = new THREE.Points(pulseGeo, pulseMat);
  brainGroup.add(pulsePoints);

  /* ---- central core glow (brain stem energy source) ---- */
  const coreMat = new THREE.SpriteMaterial({ map: makeGlowTexture('rgba(255,255,255,0.95)','rgba(255,255,255,0)'), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  const core = new THREE.Sprite(coreMat);
  core.scale.set(2.6,2.6,1);
  core.position.set(0,-1.2,0.3);
  brainGroup.add(core);

  /* ---- ambient outer halo ---- */
  const haloMat = new THREE.SpriteMaterial({ map: makeGlowTexture('rgba(140,120,255,0.35)','rgba(140,120,255,0)'), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(9,9,1);
  brainGroup.add(halo);

  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }
  window.addEventListener('resize', resize);

  function animate(){
    const t = clock.t;

    // breathing pulse
    const breathe = 1 + Math.sin(t*1.1)*0.035;
    brainPoints.scale.setScalar(breathe);
    linkLines.scale.setScalar(breathe);

    // gentle autonomous rotation + mouse parallax
    brainGroup.rotation.y = Math.sin(t*0.12)*0.15 + mouse.x*0.35;
    brainGroup.rotation.x = Math.cos(t*0.1)*0.05 + mouse.y*0.18;
    brainGroup.position.y = Math.sin(t*0.6)*0.12;

    // link shimmer
    linkMat.opacity = 0.12 + (Math.sin(t*2.2)*0.5+0.5)*0.16;

    // core + halo pulse
    const corePulse = 2.3 + Math.sin(t*2)*0.35;
    core.scale.set(corePulse, corePulse, 1);
    coreMat.opacity = 0.7 + Math.sin(t*2)*0.3;
    halo.material.opacity = 0.5 + Math.sin(t*0.8)*0.2;

    // traveling pulses along neuron links
    for(let i=0;i<PULSE_COUNT;i++){
      const st = pulseState[i];
      st.t += st.speed * clock.dt;
      if(st.t > 1){
        st.t = 0;
        st.pair = linkPairs[Math.floor(Math.random()*linkPairs.length)];
      }
      const [a,b] = st.pair;
      const ax=basePos[a*3],ay=basePos[a*3+1],az=basePos[a*3+2];
      const bx=basePos[b*3],by=basePos[b*3+1],bz=basePos[b*3+2];
      pulsePos[i*3] = ax + (bx-ax)*st.t;
      pulsePos[i*3+1] = ay + (by-ay)*st.t;
      pulsePos[i*3+2] = az + (bz-az)*st.t;
    }
    pulseGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  return { ready:true, animate, resize };
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
  };

  const SERVICES = [
    { icon:'agent', title:'AI Agents', desc:'Intelligent AI agents to handle tasks, support & engagement' },
    { icon:'whatsapp', title:'WhatsApp API', desc:'Automate conversations, notifications & customer support' },
    { icon:'gear', title:'Business Automation', desc:'Streamline workflows and eliminate repetitive tasks' },
    { icon:'brain', title:'Machine Learning', desc:'Predictive analytics and smart decision-making systems' },
    { icon:'chart', title:'Data Analytics', desc:'Turn raw data into actionable insight and growth' },
    { icon:'puzzle', title:'Custom Integrations', desc:'Seamless connections with your favorite tools & platforms' },
    { icon:'chat', title:'AI Chatbots', desc:'Conversational interfaces that resolve requests instantly' },
    { icon:'voice', title:'Voice AI', desc:'Natural-sounding voice agents for calls & IVR' },
    { icon:'api', title:'API Development', desc:'Robust, documented endpoints built for scale' },
    { icon:'rag', title:'RAG Systems', desc:'Retrieval-augmented answers grounded in your data' },
    { icon:'agent', title:'AI Assistants', desc:'Always-on copilots embedded in your workflow' },
    { icon:'gear', title:'Workflow Automation', desc:'Multi-step processes running without human input' },
    { icon:'puzzle', title:'CRM Integration', desc:'Sync leads, deals and conversations automatically' },
    { icon:'brain', title:'Agentic AI', desc:'Autonomous systems that plan and execute tasks' },
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
    return { x: bc.left + bc.width*0.42, y: bc.top + bc.height*0.46 };
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
   6. TEXT REVEAL + MAGNETIC BUTTONS (GSAP)
   ===================================================================== */
(function polish(){
  if(typeof gsap !== 'undefined'){
    gsap.set('.reveal-el', { opacity:0, y: 22 });
    gsap.to('.reveal-el', {
      opacity:1, y:0, duration:0.9, ease:'power3.out',
      stagger:0.09, delay:0.15
    });
  }

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
