/* ============================================================
   IIT DELHI SIMULATOR — npc.js
   NPC roster, daily schedules (anchors per time phase),
   wandering movement, procedural character sprites.
   ============================================================ */
(function () {
  const T = G.TILE;
  const NPC = G.NPC = { list: [], crowd: [] };

  // anchor helper: tile coords near a building's door / area
  function near(id, dx, dy, r) {
    const b = G.World.byId(id);
    return { x: (b.door.x + dx) * T, y: (b.door.y + dy) * T, r: (r || 4) * T };
  }
  function at(x, y, r) { return { x: x * T, y: y * T, r: (r || 4) * T }; }

  /* phases: morning 6–12, afternoon 12–17, evening 17–22, night 22–6 */
  const ROSTER = [
    { name: 'Aman',  role: 'student', pal: { shirt: '#e2574c', pants: '#33415c', hair: '#1b1b1b', skin: '#c98c5a' },
      sched: { morning: near('lhc', -3, 3), afternoon: near('hostel', 2, 2), evening: near('rajdhani', -2, 2), night: near('hostel', 0, 1, 2) },
      quest: 'deliverNotes' },
    { name: 'Priya', role: 'student', pal: { shirt: '#5dbb8a', pants: '#2b2d42', hair: '#241a12', skin: '#b97e4e' },
      sched: { morning: near('lhc', 2, 2, 3), afternoon: near('lhc', -2, 3, 3), evening: near('hostel', -3, 2), night: near('hostel', 1, 1, 2) } },
    { name: 'Rohit', role: 'student', pal: { shirt: '#f2b134', pants: '#3d3d3d', hair: '#101010', skin: '#d49a66' },
      sched: { morning: near('main', -2, 3), afternoon: near('oat', 2, 2, 5), evening: near('oat', -1, 2, 5), night: near('hostel', 2, 2) },
      quest: 'lostId' },
    { name: 'Sneha', role: 'student', pal: { shirt: '#b06bff', pants: '#26323e', hair: '#2c1608', skin: '#c08552' },
      sched: { morning: near('lhc', 0, 4, 3), afternoon: near('main', 3, 2), evening: near('rajdhani', 2, 1, 3), night: near('hostel', -2, 1, 2) },
      quest: 'chaiTime' },
    { name: 'Vikram', role: 'student', pal: { shirt: '#4d9de0', pants: '#1f1f1f', hair: '#0d0d0d', skin: '#a5683c' },
      sched: { morning: near('mittal', -2, 2), afternoon: near('mittal', 2, 2), evening: near('mittal', 0, 3, 3), night: near('hostel', 3, 1, 2) } },
    { name: 'Ananya', role: 'student', pal: { shirt: '#ef7b9d', pants: '#3a3f58', hair: '#1f130a', skin: '#cf9a68' },
      sched: { morning: near('main', 2, 2), afternoon: near('main', -3, 3, 5), evening: near('oat', 3, 1, 5), night: near('hostel', -1, 2, 2) } },
    { name: 'Ishaan', role: 'student', pal: { shirt: '#7bd1c5', pants: '#2f2f2f', hair: '#181818', skin: '#bd8350' },
      sched: { morning: near('hostel', 1, 2, 3), afternoon: near('lhc', 3, 2), evening: near('hostel', 2, 3, 3), night: near('hostel', 0, 2, 2) } },
    { name: 'Meera', role: 'student', pal: { shirt: '#f5e663', pants: '#46494c', hair: '#26160c', skin: '#c98c5a' },
      sched: { morning: at(40, 23, 8), afternoon: at(54, 40, 6), evening: at(30, 44, 6), night: near('hostel', -3, 1, 2) } },
    { name: 'Prof. Sharma', role: 'prof', pal: { shirt: '#cdd5e0', pants: '#43507a', hair: '#7d8a99', skin: '#c08552' },
      sched: { morning: near('lhc', -1, 2, 3), afternoon: near('main', 1, 2, 3), evening: near('main', -2, 2, 3), night: near('main', 0, 2, 2) },
      quest: 'attend5' },
    { name: 'Prof. Iyer', role: 'prof', pal: { shirt: '#e8e3d3', pants: '#5a4632', hair: '#5a5a5a', skin: '#b97e4e' },
      sched: { morning: near('main', -3, 2, 3), afternoon: near('lhc', 2, 3, 3), evening: near('main', 2, 1, 3), night: near('main', 1, 2, 2) } },
    { name: 'Kabir', role: 'phd', pal: { shirt: '#5d6d7e', pants: '#212f3c', hair: '#17202a', skin: '#cf9a68' },
      sched: { morning: near('main', 3, 1, 3), afternoon: near('main', -1, 3, 3), evening: near('rajdhani', -3, 1, 3), night: near('main', 0, 1, 2) },
      quest: 'research20' },
    { name: 'Coach Negi', role: 'coach', pal: { shirt: '#e63946', pants: '#1d3557', hair: '#222', skin: '#a5683c' },
      sched: { morning: near('mittal', 1, 2, 3), afternoon: near('mittal', -1, 3, 3), evening: near('mittal', 2, 1, 3), night: near('mittal', 0, 1, 2) },
      quest: 'fitness3' },
    { name: 'Ramu', role: 'chaiwala', pal: { shirt: '#f4f1ea', pants: '#6b4a2a', hair: '#333', skin: '#b97e4e' },
      sched: { morning: near('rajdhani', -1, 1, 2), afternoon: near('rajdhani', 1, 1, 2), evening: near('rajdhani', 0, 2, 2), night: near('rajdhani', 0, 1, 1) } },
    { name: 'Bahadur', role: 'guard', pal: { shirt: '#3e5c76', pants: '#1d2d44', hair: '#222', skin: '#a5683c' },
      sched: { morning: at(52, 22, 4), afternoon: at(28, 22, 4), evening: at(52, 45, 4), night: at(40, 22, 6) } },
  ];

  NPC.phase = function (hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  };

  NPC.init = function () {
    NPC.list = ROSTER.map(def => {
      const a = def.sched.morning;
      return {
        def, name: def.name, x: a.x, y: a.y, tx: a.x, ty: a.y,
        dir: 'down', frame: 0, ft: 0, speed: G.rand(34, 52),
        wanderT: G.rand(0, 3), paused: G.rand(1, 4),
      };
    });
  };

  function passable(px, py) {
    const t = G.TILE;
    return !G.World.solid(Math.floor(px / t), Math.floor(py / t));
  }

  NPC.update = function (dt, hour) {
    const ph = NPC.phase(hour);
    for (const n of NPC.list) {
      const anchor = n.def.sched[ph];
      n.wanderT -= dt;
      if (n.wanderT <= 0) {
        // pick a new target inside anchor radius
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * anchor.r;
          const tx = anchor.x + Math.cos(a) * r, ty = anchor.y + Math.sin(a) * r;
          if (passable(tx, ty)) { n.tx = tx; n.ty = ty; break; }
        }
        // if far from anchor (phase change), head straight there
        const dax = anchor.x - n.x, day = anchor.y - n.y;
        if (dax * dax + day * day > anchor.r * anchor.r * 4) { n.tx = anchor.x; n.ty = anchor.y; }
        n.wanderT = G.rand(2.5, 7);
      }
      const dx = n.tx - n.x, dy = n.ty - n.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const vx = dx / d * n.speed * dt, vy = dy / d * n.speed * dt;
        const nx = n.x + vx, ny = n.y + vy;
        if (passable(nx, n.y)) n.x = nx; else n.tx = n.x;
        if (passable(n.x, ny)) n.y = ny; else n.ty = n.y;
        n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        n.ft += dt * 8;
        n.frame = Math.floor(n.ft) % 2;
      } else n.frame = 0;
    }
    // festival crowd dance
    for (const c of NPC.crowd) {
      c.t += dt * c.rate;
      c.bounce = Math.abs(Math.sin(c.t)) * 6;
      c.x = c.bx + Math.sin(c.t * 0.4) * 8;
    }
  };

  /* ---------- procedural people sprites ---------- */
  NPC.drawPerson = function (ctx, x, y, dir, frame, pal, bounce) {
    // x,y = feet centre
    const b = bounce || 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, 7); ctx.fill();
    const top = y - 26 - b;
    // legs
    ctx.fillStyle = pal.pants;
    if (frame === 1) { ctx.fillRect(x - 6, y - 10 - b, 5, 10); ctx.fillRect(x + 1, y - 8 - b, 5, 8); }
    else { ctx.fillRect(x - 5, y - 9 - b, 4, 9); ctx.fillRect(x + 1, y - 9 - b, 4, 9); }
    // body
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(x - 7, top + 10, 14, 9);
    // arms
    ctx.fillRect(x - 9, top + 11, 3, 7);
    ctx.fillRect(x + 6, top + 11, 3, 7);
    // head
    ctx.fillStyle = pal.skin;
    ctx.fillRect(x - 5, top, 10, 10);
    // hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(x - 5, top - 2, 10, 4);
    if (dir === 'left') ctx.fillRect(x - 5, top, 3, 6);
    else if (dir === 'right') ctx.fillRect(x + 2, top, 3, 6);
    else if (dir === 'up') ctx.fillRect(x - 5, top, 10, 7);
    // face dots
    if (dir !== 'up') {
      ctx.fillStyle = '#26160c';
      const off = dir === 'left' ? -2 : dir === 'right' ? 2 : 0;
      ctx.fillRect(x - 3 + off, top + 4, 2, 2);
      ctx.fillRect(x + 1 + off, top + 4, 2, 2);
    }
  };

  /* ---------- RDV crowd ---------- */
  NPC.spawnCrowd = function () {
    if (NPC.crowd.length) return;
    const oat = G.World.byId('oat');
    const palettes = [
      { shirt: '#ff5d7a', pants: '#222', hair: '#111', skin: '#c98c5a' },
      { shirt: '#5dd8ff', pants: '#2b2d42', hair: '#1c1208', skin: '#b97e4e' },
      { shirt: '#ffd34d', pants: '#33415c', hair: '#0d0d0d', skin: '#d49a66' },
      { shirt: '#b06bff', pants: '#1f1f1f', hair: '#26160c', skin: '#a5683c' },
      { shirt: '#5dbb8a', pants: '#3d3d3d', hair: '#17202a', skin: '#cf9a68' },
      { shirt: '#f4f1ea', pants: '#46494c', hair: '#222', skin: '#c08552' },
    ];
    for (let i = 0; i < 34; i++) {
      const ang = G.rand(0.2, 0.8) * Math.PI;
      const rad = G.rand(60, 180);
      const bx = oat.x * G.TILE + oat.w * G.TILE / 2 + Math.cos(ang) * rad;
      const by = oat.y * G.TILE + 34 + Math.sin(ang) * rad;
      NPC.crowd.push({ bx, x: bx, y: by, t: G.rand(0, 6), rate: G.rand(4, 8), bounce: 0, pal: G.pick(palettes) });
    }
    // and an outside crowd streaming toward OAT
    for (let i = 0; i < 10; i++) {
      const bx = (oat.door.x + G.rand(-4, 4)) * G.TILE;
      const by = (oat.door.y + G.rand(0, 4)) * G.TILE;
      NPC.crowd.push({ bx, x: bx, y: by, t: G.rand(0, 6), rate: G.rand(3, 6), bounce: 0, pal: G.pick(palettes) });
    }
  };
  NPC.clearCrowd = function () { NPC.crowd.length = 0; };
})();
