/* ============================================================
   IIT DELHI SIMULATOR — world.js
   Tile map, pre-rendered building facades (drawn to look like
   the real IIT Delhi references), trees, lamps, minimap.
   ============================================================ */
(function () {
  const T = G.TILE, W = G.MAP_W, H = G.MAP_H;
  const World = G.World = {};

  // tile ids
  const GRASS = 0, ROAD = 1, PATH = 2, TREE = 3, BLD = 4, DOOR = 5, FLOWER = 6, LAMP = 7;
  World.GRASS = GRASS; World.ROAD = ROAD; World.PATH = PATH; World.TREE = TREE;
  World.BLD = BLD; World.DOOR = DOOR; World.FLOWER = FLOWER; World.LAMP = LAMP;

  /* ---------------- Building definitions (tile rects) ---------------- */
  World.BUILDINGS = [
    { id: 'hostel',   name: 'Jwalamukhi Hostel',      x: 6,  y: 4,  w: 15, h: 13 },
    { id: 'mittal',   name: 'Mittal Sports Complex',  x: 34, y: 6,  w: 13, h: 9 },
    { id: 'main',     name: 'Main Building',          x: 58, y: 4,  w: 17, h: 11 },
    { id: 'lhc',      name: 'Lecture Hall Complex',   x: 58, y: 26, w: 15, h: 9 },
    { id: 'rajdhani', name: 'Rajdhani',               x: 36, y: 28, w: 13, h: 7 },
    { id: 'oat',      name: 'Open Air Theatre (OAT)', x: 8,  y: 30, w: 15, h: 13 },
  ];
  for (const b of World.BUILDINGS) {
    b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h }; // tile just below
    b.cx = (b.x + b.w / 2) * T; b.cy = (b.y + b.h / 2) * T;
  }
  World.byId = id => World.BUILDINGS.find(b => b.id === id);

  /* ---------------- Map construction ---------------- */
  const map = World.map = [];
  const deco = World.deco = []; // per-tile decoration variant
  function setT(x, y, v) { if (x >= 0 && y >= 0 && x < W && y < H) map[y][x] = v; }
  function getT(x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? BLD : map[y][x]; }
  World.get = getT;

  function hLine(y, x0, x1, v, w) {
    for (let yy = y; yy < y + (w || 1); yy++) for (let x = x0; x <= x1; x++) setT(x, yy, v);
  }
  function vLine(x, y0, y1, v, w) {
    for (let xx = x; xx < x + (w || 1); xx++) for (let y = y0; y <= y1; y++) setT(xx, y, v);
  }

  World.build = function () {
    for (let y = 0; y < H; y++) {
      map[y] = []; deco[y] = [];
      for (let x = 0; x < W; x++) { map[y][x] = GRASS; deco[y][x] = Math.random(); }
    }
    // roads — a campus loop
    hLine(20, 2, 81, ROAD, 2);   // north avenue
    hLine(46, 2, 81, ROAD, 2);   // south avenue
    vLine(2, 20, 47, ROAD, 2);   // west edge
    vLine(80, 20, 47, ROAD, 2);  // east edge
    vLine(26, 20, 47, ROAD, 2);  // west spine
    vLine(50, 20, 47, ROAD, 2);  // mid spine

    // building footprints
    for (const b of World.BUILDINGS) {
      for (let y = b.y; y < b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++) setT(x, y, BLD);
      // path from door to nearest road
      setT(b.door.x, b.door.y - 1, DOOR); // doorway strip on building edge stays BLD; door tile below:
      setT(b.door.x, b.door.y, PATH);
    }
    // door approach paths
    vLine(World.byId('hostel').door.x, 17, 20, PATH);
    vLine(World.byId('mittal').door.x, 15, 20, PATH);
    vLine(World.byId('main').door.x, 15, 20, PATH);
    vLine(World.byId('lhc').door.x, 35, 46, PATH);
    vLine(World.byId('rajdhani').door.x, 35, 46, PATH);
    vLine(World.byId('oat').door.x, 43, 46, PATH);
    // a scenic diagonal-ish walking path between avenues
    hLine(33, 27, 36, PATH); vLine(27, 22, 33, PATH); vLine(36, 33, 35, PATH);
    hLine(40, 51, 58, PATH); vLine(51, 22, 40, PATH);

    // rose garden near Main Building (the real one!)
    for (let i = 0; i < 26; i++) {
      const x = G.irand(54, 57), y = G.irand(5, 16);
      if (getT(x, y) === GRASS) setT(x, y, FLOWER);
    }
    for (let i = 0; i < 18; i++) {
      const x = G.irand(76, 79), y = G.irand(5, 16);
      if (getT(x, y) === GRASS) setT(x, y, FLOWER);
    }

    // trees — dense campus greenery, kept off roads/paths/buildings
    let placed = 0, guard = 0;
    while (placed < 230 && guard++ < 4000) {
      const x = G.irand(1, W - 2), y = G.irand(1, H - 2);
      if (getT(x, y) !== GRASS) continue;
      // keep doors approachable
      let nearDoor = false;
      for (const b of World.BUILDINGS) {
        if (Math.abs(x - b.door.x) < 2 && y >= b.door.y - 1 && y <= b.door.y + 3) nearDoor = true;
      }
      if (nearDoor) continue;
      setT(x, y, TREE); placed++;
    }
    // lamps along the avenues
    for (let x = 6; x < 80; x += 7) { if (getT(x, 19) === GRASS) setT(x, 19, LAMP); if (getT(x, 48) === GRASS) setT(x, 48, LAMP); }
    for (let y = 24; y < 46; y += 7) {
      if (getT(25, y) === GRASS) setT(25, y, LAMP);
      if (getT(53, y) === GRASS) setT(53, y, LAMP);
    }

    World.prerender();
    World.makeMinimap();
  };

  World.solid = function (x, y) {
    const t = getT(x, y);
    return t === BLD || t === TREE;
  };

  /* ============================================================
     SPRITE PRE-RENDERING
     ============================================================ */
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  function bricks(x, X, Y, w, h, base, mortar, bh, bw) {
    bh = bh || 7; bw = bw || 16;
    x.fillStyle = base; x.fillRect(X, Y, w, h);
    x.strokeStyle = mortar; x.lineWidth = 1;
    for (let r = 0; r * bh < h; r++) {
      const yy = Y + r * bh;
      x.beginPath(); x.moveTo(X, yy + 0.5); x.lineTo(X + w, yy + 0.5); x.stroke();
      const off = (r % 2) * (bw / 2);
      for (let c2 = -1; c2 * bw < w + bw; c2++) {
        const xx = X + off + c2 * bw;
        if (xx > X && xx < X + w) { x.beginPath(); x.moveTo(xx + 0.5, yy); x.lineTo(xx + 0.5, Math.min(yy + bh, Y + h)); x.stroke(); }
      }
    }
  }
  function stoneBlocks(x, X, Y, w, h, tones) {
    const bw = 26, bh = 16;
    for (let r = 0; r * bh < h; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c2 = -1; c2 * bw < w + bw; c2++) {
        const xx = X + off + c2 * bw, yy = Y + r * bh;
        x.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        x.fillRect(Math.max(X, xx), yy, Math.min(bw, X + w - xx), Math.min(bh, Y + h - yy));
      }
    }
    x.strokeStyle = 'rgba(90,70,45,.25)'; x.lineWidth = 1;
    for (let r = 0; r * bh <= h; r++) { x.beginPath(); x.moveTo(X, Y + r * bh + .5); x.lineTo(X + w, Y + r * bh + .5); x.stroke(); }
  }
  function win(x, X, Y, w, h, glass, frame) {
    x.fillStyle = frame || '#3a3f45'; x.fillRect(X - 1, Y - 1, w + 2, h + 2);
    x.fillStyle = glass; x.fillRect(X, Y, w, h);
    x.fillStyle = 'rgba(255,255,255,.25)';
    x.fillRect(X + 1, Y + 1, Math.max(2, w * 0.3), Math.max(2, h * 0.35));
  }

  /* ---- Main Building: sandstone slab, red-brown band, IITD sign, window strips ---- */
  function spriteMain(b) {
    const w = b.w * T, h = b.h * T;
    const [c, x] = cv(w, h);
    // sandstone body
    stoneBlocks(x, 0, 0, w, h, ['#d9b98c', '#d2b083', '#e0c096', '#ccab7e', '#d6b588']);
    // roofline / parapet
    x.fillStyle = '#b89368'; x.fillRect(0, 0, w, 10);
    x.fillStyle = '#a07f57'; x.fillRect(0, 10, w, 3);
    // upper window strip with AC units (like the photo)
    x.fillStyle = '#2e3a3f'; x.fillRect(8, 24, w - 16, 26);
    for (let i = 0; i < Math.floor((w - 16) / 30); i++) {
      win(x, 12 + i * 30, 27, 22, 20, '#5d7e8a');
      if (i % 3 === 1) { x.fillStyle = '#e8e6e0'; x.fillRect(12 + i * 30 + 2, 22, 16, 7); x.fillStyle = '#b9b7b0'; x.fillRect(12 + i * 30 + 2, 22, 16, 2); }
    }
    // band with institute name
    const bandY = Math.floor(h * 0.42);
    x.fillStyle = '#c4a071'; x.fillRect(0, bandY, w, 66);
    x.strokeStyle = 'rgba(120,90,55,.5)'; x.strokeRect(0.5, bandY + 0.5, w - 1, 65);
    // emblem
    x.beginPath(); x.arc(w / 2, bandY + 16, 11, 0, 7);
    x.fillStyle = '#5a4630'; x.fill();
    x.beginPath(); x.arc(w / 2, bandY + 16, 8, 0, 7);
    x.strokeStyle = '#e6d7bd'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#e6d7bd'; x.fillRect(w / 2 - 1, bandY + 10, 2, 12);
    // Devanagari-style line (suggested with marks) + English
    x.fillStyle = '#4a3826';
    x.font = 'bold 11px Georgia, serif'; x.textAlign = 'center';
    x.fillText('\u092D\u093E\u0930\u0924\u0940\u092F \u092A\u094D\u0930\u094C\u0926\u094D\u092F\u094B\u0917\u093F\u0915\u0940 \u0938\u0902\u0938\u094D\u0925\u093E\u0928 \u0926\u093F\u0932\u094D\u0932\u0940', w / 2, bandY + 42);
    x.font = 'bold 13px Georgia, serif';
    x.fillStyle = '#3a2c1d';
    x.fillText('INDIAN INSTITUTE OF TECHNOLOGY DELHI', w / 2, bandY + 58);
    // lower glass strip behind hedge
    x.fillStyle = '#22343a'; x.fillRect(10, h - 70, w - 20, 44);
    for (let i = 0; i < Math.floor((w - 24) / 24); i++) win(x, 14 + i * 24, h - 66, 18, 36, '#39616e');
    // hedge + flowers at base
    x.fillStyle = '#3f7d3a'; x.fillRect(0, h - 24, w, 24);
    for (let i = 0; i < 60; i++) { x.fillStyle = ['#4f9448', '#37702f', '#5aa251'][i % 3]; x.fillRect(Math.random() * w, h - 24 + Math.random() * 20, 4, 4); }
    for (let i = 0; i < 16; i++) { x.fillStyle = ['#ffd34d', '#ff7a59'][i % 2]; x.fillRect(Math.random() * w, h - 20 + Math.random() * 14, 3, 3); }
    // entrance
    doorway(x, w / 2, h, '#5a4630');
    return c;
  }

  /* ---- LHC: curved white canopy over green glass, columns ---- */
  function spriteLHC(b) {
    const w = b.w * T, h = b.h * T;
    const [c, x] = cv(w, h);
    // stone backdrop
    stoneBlocks(x, 0, 0, w, h, ['#cfc4ae', '#c6bba5', '#d6ccb7']);
    // right glass tower (like photo's right side)
    x.fillStyle = '#3e2f33'; x.fillRect(w - 86, 6, 80, h - 30);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 3; i++) win(x, w - 80 + i * 26, 14 + r * 30, 20, 22, '#5c8794');
    // curved glass front
    x.save();
    x.beginPath();
    x.moveTo(10, h - 20);
    x.quadraticCurveTo(w * 0.42, h * 0.28, w - 96, h - 20);
    x.lineTo(10, h - 20); x.closePath();
    const grad = x.createLinearGradient(0, h * 0.3, 0, h);
    grad.addColorStop(0, '#9fc8c2'); grad.addColorStop(1, '#34555a');
    x.fillStyle = grad; x.fill();
    x.clip();
    // mullions
    x.strokeStyle = 'rgba(20,40,45,.55)'; x.lineWidth = 2;
    for (let i = 1; i < 14; i++) { x.beginPath(); x.moveTo(10 + i * ((w - 106) / 14), h * 0.25); x.lineTo(10 + i * ((w - 106) / 14), h); x.stroke(); }
    for (let r = 1; r < 5; r++) { x.beginPath(); x.moveTo(0, h * 0.3 + r * (h * 0.62 / 5)); x.lineTo(w, h * 0.3 + r * (h * 0.62 / 5)); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.18)';
    x.beginPath(); x.ellipse(w * 0.3, h * 0.5, 70, 26, -0.4, 0, 7); x.fill();
    x.restore();
    // white canopy slab (curved)
    x.beginPath();
    x.moveTo(0, h * 0.34);
    x.quadraticCurveTo(w * 0.42, h * 0.06, w - 90, h * 0.34);
    x.quadraticCurveTo(w * 0.42, h * 0.2, 0, h * 0.46);
    x.closePath();
    x.fillStyle = '#e9e2d2'; x.fill();
    x.strokeStyle = '#b8ae97'; x.lineWidth = 2; x.stroke();
    // railing on canopy
    x.strokeStyle = '#9aa3a8'; x.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const t0 = i / 22, px = t0 * (w - 90);
      const py = (1 - t0) * (1 - t0) * (h * 0.34) + 2 * (1 - t0) * t0 * (h * 0.06) + t0 * t0 * (h * 0.34);
      x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - 8); x.stroke();
    }
    // columns
    x.fillStyle = '#ddd4c0';
    for (const px of [w * 0.18, w * 0.36, w * 0.55]) { x.fillRect(px, h * 0.36, 12, h * 0.6); x.fillStyle = '#c9bfa9'; x.fillRect(px + 9, h * 0.36, 3, h * 0.6); x.fillStyle = '#ddd4c0'; }
    // sign
    x.fillStyle = '#3a2e25'; x.fillRect(w / 2 - 86, h - 44, 172, 18);
    x.fillStyle = '#e8ddc6'; x.font = 'bold 11px Georgia, serif'; x.textAlign = 'center';
    x.fillText('LECTURE HALL COMPLEX', w / 2, h - 31);
    // planters
    x.fillStyle = '#3f7d3a'; x.fillRect(0, h - 14, w, 14);
    doorway(x, w / 2, h, '#27313a');
    return c;
  }

  /* ---- Hostel: twin red-brick towers, concrete grid, glass atrium ---- */
  function spriteHostel(b) {
    const w = b.w * T, h = b.h * T;
    const [c, x] = cv(w, h);
    const towerW = Math.floor(w * 0.41);
    for (const tx of [0, w - towerW]) {
      bricks(x, tx, 0, towerW, h, '#a8442f', 'rgba(60,20,12,.35)', 6, 14);
      // concrete grid
      x.fillStyle = '#cfc8bd';
      for (let r = 0; r <= 8; r++) x.fillRect(tx, Math.floor(r * (h / 8)) - 3, towerW, 6);
      for (let cc = 0; cc <= 3; cc++) x.fillRect(tx + Math.floor(cc * (towerW / 3)) - 3, 0, 6, h);
      // windows / balconies
      for (let r = 0; r < 8; r++) for (let cc = 0; cc < 3; cc++) {
        const wx = tx + cc * (towerW / 3) + 10, wy = r * (h / 8) + 9;
        if ((r * 3 + cc) % 5 === 2) { // recessed balcony
          x.fillStyle = '#5d2c20'; x.fillRect(wx - 4, wy - 3, towerW / 3 - 12, h / 8 - 12);
          x.fillStyle = '#cfc8bd'; x.fillRect(wx - 4, wy + h / 8 - 18, towerW / 3 - 12, 3);
        } else {
          win(x, wx, wy, towerW / 3 - 20, h / 8 - 18, ['#314250', '#3c5666', '#2a3a46'][(r + cc) % 3]);
        }
      }
    }
    // central atrium block
    const aw = w - 2 * towerW + 24, ax0 = towerW - 12, ah = Math.floor(h * 0.42), ay = h - ah;
    bricks(x, ax0, ay, aw, ah, '#a8442f', 'rgba(60,20,12,.35)', 6, 14);
    x.fillStyle = '#cfc8bd'; x.fillRect(ax0, ay, aw, 5); x.fillRect(ax0, ay, 5, ah); x.fillRect(ax0 + aw - 5, ay, 5, ah);
    const gw = aw - 28;
    const glass = x.createLinearGradient(0, ay + 8, 0, h);
    glass.addColorStop(0, '#bfe9ee'); glass.addColorStop(1, '#4a7e8d');
    x.fillStyle = glass; x.fillRect(ax0 + 14, ay + 10, gw, ah - 16);
    x.strokeStyle = 'rgba(30,50,60,.5)';
    for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(ax0 + 14 + i * gw / 5, ay + 10); x.lineTo(ax0 + 14 + i * gw / 5, h - 6); x.stroke(); }
    // planters + cycles
    x.fillStyle = '#c97f5e'; x.fillRect(0, h - 10, w, 10);
    x.fillStyle = '#3f7d3a';
    for (let i = 0; i < 7; i++) x.fillRect(8 + i * (w / 7), h - 16, 18, 8);
    x.fillStyle = '#444';
    for (let i = 0; i < 10; i++) { x.beginPath(); x.arc(towerW * 0.2 + i * 9, h - 5, 3, 0, 7); x.stroke(); }
    doorway(x, w / 2, h, '#27313a');
    return c;
  }

  /* ---- Rajdhani: open-air cafe, pergola, string lights, big sign ---- */
  function spriteRajdhani(b) {
    const w = b.w * T, h = b.h * T;
    const [c, x] = cv(w, h);
    // canopy of trees behind (it sits under trees in the photo)
    x.fillStyle = '#2c4a26';
    for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(20 + i * (w / 9), 12, 22, 0, 7); x.fill(); }
    x.fillStyle = '#39612f';
    for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(35 + i * (w / 7), 18, 16, 0, 7); x.fill(); }
    // dark structure
    x.fillStyle = '#241b14'; x.fillRect(6, 26, w - 12, h - 44);
    // pergola slat roof
    x.fillStyle = '#3a2c1e'; x.fillRect(2, 26, w - 4, 12);
    x.fillStyle = '#523e2a';
    for (let i = 0; i < (w - 8) / 12; i++) x.fillRect(4 + i * 12, 27, 7, 10);
    // sign boards
    x.fillStyle = '#0d0a08'; x.fillRect(14, 40, w - 28, 30);
    x.font = 'bold 22px Georgia, serif'; x.textAlign = 'center';
    x.fillStyle = '#f5f1e6'; x.fillText('RAJDHANI', w / 2, 62);
    x.font = 'bold 8px Verdana, sans-serif'; x.fillStyle = '#e34b4b';
    x.fillText('CHATKARE FOOD   \u2022   MULTI CUISINE   \u2022   IIT DELHI CATERING', w / 2, 78);
    // warm open interior
    const iy = 84, ih = h - iy - 26;
    const wg = x.createLinearGradient(0, iy, 0, iy + ih);
    wg.addColorStop(0, '#8a5a26'); wg.addColorStop(1, '#5a3a18');
    x.fillStyle = wg; x.fillRect(16, iy, w - 32, ih);
    // counters / stalls
    for (let i = 0; i < 4; i++) {
      x.fillStyle = '#332315'; x.fillRect(24 + i * ((w - 56) / 4), iy + 4, (w - 56) / 4 - 8, ih * 0.4);
      x.fillStyle = '#ffd98a'; x.fillRect(28 + i * ((w - 56) / 4), iy + 8, (w - 56) / 4 - 16, 6);
    }
    // tables
    for (let i = 0; i < 5; i++) {
      const tx2 = 30 + i * ((w - 60) / 5), ty2 = iy + ih * 0.62;
      x.fillStyle = '#6b4a2a'; x.beginPath(); x.arc(tx2, ty2, 7, 0, 7); x.fill();
      x.fillStyle = '#c9c2b2'; x.fillRect(tx2 - 2, ty2 - 2, 4, 4);
    }
    // string lights along eave — glow handled at night in renderer too
    World.rajdhaniLights = [];
    for (let i = 0; i < 16; i++) {
      const lx = 12 + i * ((w - 24) / 15), ly = 40 + Math.sin(i * 1.3) * 3;
      x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(lx, ly, 2.5, 0, 7); x.fill();
      World.rajdhaniLights.push({ x: lx, y: ly });
    }
    // fence
    x.strokeStyle = '#1c130c'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(6, h - 22); x.lineTo(w - 6, h - 22); x.stroke();
    for (let i = 0; i < (w - 12) / 14; i++) { x.beginPath(); x.moveTo(8 + i * 14, h - 22); x.lineTo(8 + i * 14, h - 10); x.stroke(); }
    doorway(x, w / 2, h, '#1c130c');
    return c;
  }

  /* ---- OAT: amphitheatre arcs + stage with truss & screen ---- */
  function spriteOAT(b) {
    const w = b.w * T, h = b.h * T;
    const [c, x] = cv(w, h);
    // stone perimeter wall
    bricks(x, 0, 0, w, h, '#6e6253', 'rgba(30,25,18,.4)', 9, 20);
    x.fillStyle = '#15161c'; x.fillRect(8, 8, w - 16, h - 16);
    const cx2 = w / 2, stageY = 34;
    // concentric seating arcs opening toward the stage (top)
    for (let r = 9; r >= 2; r--) {
      x.beginPath();
      x.arc(cx2, stageY, 26 + r * 17, 0.18 * Math.PI, 0.82 * Math.PI);
      x.strokeStyle = r % 2 ? '#9b948a' : '#7e776c';
      x.lineWidth = 13;
      x.stroke();
    }
    // aisle steps
    x.strokeStyle = '#5d574d'; x.lineWidth = 6;
    for (const a of [0.32, 0.5, 0.68]) {
      x.beginPath();
      x.moveTo(cx2 + Math.cos(a * Math.PI) * 50, stageY + Math.sin(a * Math.PI) * 50);
      x.lineTo(cx2 + Math.cos(a * Math.PI) * 186, stageY + Math.sin(a * Math.PI) * 186);
      x.stroke();
    }
    // stage platform
    x.fillStyle = '#23252e'; x.fillRect(cx2 - 84, 10, 168, 44);
    x.fillStyle = '#2e3140'; x.fillRect(cx2 - 78, 14, 156, 36);
    // LED screen
    const sg = x.createLinearGradient(cx2 - 50, 0, cx2 + 50, 0);
    sg.addColorStop(0, '#1d5fae'); sg.addColorStop(0.5, '#3fa7d6'); sg.addColorStop(1, '#1d5fae');
    x.fillStyle = sg; x.fillRect(cx2 - 50, 18, 100, 24);
    x.fillStyle = 'rgba(255,255,255,.5)'; x.font = 'bold 9px Verdana'; x.textAlign = 'center';
    x.fillText('RDV', cx2, 33);
    // truss
    x.strokeStyle = '#888f9c'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx2 - 84, 8); x.lineTo(cx2 + 84, 8); x.stroke();
    x.beginPath(); x.moveTo(cx2 - 84, 8); x.lineTo(cx2 - 84, 54); x.moveTo(cx2 + 84, 8); x.lineTo(cx2 + 84, 54); x.stroke();
    for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(cx2 - 84 + i * 14, 8); x.lineTo(cx2 - 70 + i * 14, 14); x.stroke(); }
    // speaker stacks
    x.fillStyle = '#0c0d11'; x.fillRect(cx2 - 102, 16, 14, 36); x.fillRect(cx2 + 88, 16, 14, 36);
    // stage light fixtures
    for (let i = 0; i < 6; i++) { x.fillStyle = '#d9dee8'; x.fillRect(cx2 - 70 + i * 28, 6, 6, 5); }
    // entry gap at bottom
    x.fillStyle = '#15161c'; x.fillRect(cx2 - 18, h - 16, 36, 16);
    x.fillStyle = '#9b948a'; x.fillRect(cx2 - 18, h - 6, 36, 6);
    return c;
  }

  /* ---- Mittal: brick + glass band + pink neon sign ---- */
  function spriteMittal(b) {
    const w = b.w * T, h = b.h * T;
    const [c, x] = cv(w, h);
    bricks(x, 0, 0, w, h, '#8e3b2a', 'rgba(50,16,10,.4)', 7, 15);
    // roofline
    x.fillStyle = '#6b2c20'; x.fillRect(0, 0, w, 8);
    // neon sign band
    x.fillStyle = '#23140f'; x.fillRect(w * 0.12, 14, w * 0.76, 26);
    x.font = 'bold 13px Verdana, sans-serif'; x.textAlign = 'center';
    x.shadowColor = '#ff3ec8'; x.shadowBlur = 8;
    x.fillStyle = '#ff7ad9';
    x.fillText('\u092E\u093F\u0924\u094D\u0924\u0932  \u2022  MITTAL SPORTS COMPLEX', w / 2, 32);
    x.shadowBlur = 0;
    // big dark glass band
    const gy = 48, gh = Math.floor(h * 0.34);
    const gg = x.createLinearGradient(0, gy, 0, gy + gh);
    gg.addColorStop(0, '#202c34'); gg.addColorStop(0.5, '#33505e'); gg.addColorStop(1, '#16222a');
    x.fillStyle = gg; x.fillRect(14, gy, w - 28, gh);
    x.strokeStyle = 'rgba(160,190,205,.35)'; x.lineWidth = 1;
    for (let i = 1; i < 9; i++) { x.beginPath(); x.moveTo(14 + i * (w - 28) / 9, gy); x.lineTo(14 + i * (w - 28) / 9, gy + gh); x.stroke(); }
    x.beginPath(); x.moveTo(14, gy + gh / 2); x.lineTo(w - 14, gy + gh / 2); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(20, gy + 4, 60, gh / 2 - 8);
    // banner strip
    x.fillStyle = '#dfeaf2'; x.fillRect(10, gy + gh + 6, w - 20, 16);
    x.fillStyle = '#2a5f8a'; x.font = 'bold 9px Georgia, serif';
    x.fillText('Board for Sports Activities, IIT Delhi', w / 2, gy + gh + 18);
    // lower brick + trophies window
    x.fillStyle = '#1a2228'; x.fillRect(w * 0.2, gy + gh + 28, w * 0.6, h - (gy + gh + 28) - 22);
    x.fillStyle = '#ffd34d';
    for (let i = 0; i < 5; i++) x.fillRect(w * 0.24 + i * w * 0.11, gy + gh + 36, 5, 9);
    // stone base
    bricks(x, 0, h - 18, w, 18, '#8c8270', 'rgba(40,35,25,.4)', 9, 24);
    doorway(x, w / 2, h, '#10161a');
    return c;
  }

  function doorway(x, cx2, h, color) {
    x.fillStyle = color; x.fillRect(cx2 - 16, h - 30, 32, 30);
    x.fillStyle = 'rgba(255,235,170,.85)'; x.fillRect(cx2 - 12, h - 26, 24, 22);
    x.fillStyle = color; x.fillRect(cx2 - 2, h - 26, 4, 22);
  }

  /* ---- trees, lamp, ground tiles ---- */
  function spriteTree(variant) {
    const [c, x] = cv(T, T * 2);
    x.fillStyle = '#5a3c22'; x.fillRect(13, 40, 6, 22);
    const greens = variant ? ['#2f6b2a', '#3f8a37', '#56a84a'] : ['#39612f', '#4a7d3c', '#63a04f'];
    x.fillStyle = greens[0]; x.beginPath(); x.arc(16, 26, 15, 0, 7); x.fill();
    x.fillStyle = greens[1]; x.beginPath(); x.arc(9, 20, 10, 0, 7); x.arc(23, 19, 10, 0, 7); x.fill();
    x.fillStyle = greens[2]; x.beginPath(); x.arc(15, 14, 9, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(11, 12, 4, 0, 7); x.fill();
    return c;
  }
  function spriteLamp() {
    const [c, x] = cv(T, T * 2);
    x.fillStyle = '#3a3f45'; x.fillRect(14, 14, 4, 48);
    x.fillRect(8, 10, 16, 6);
    x.fillStyle = '#ffe9a8'; x.fillRect(10, 6, 12, 6);
    return c;
  }
  function groundTiles() {
    const mk = fn => { const [c, x] = cv(T, T); fn(x); return c; };
    World.tGrass = mk(x => {
      x.fillStyle = '#69a653'; x.fillRect(0, 0, T, T);
      for (let i = 0; i < 7; i++) { x.fillStyle = ['#5f9a4a', '#74b15c', '#609c4d'][i % 3]; x.fillRect(Math.random() * T, Math.random() * T, 3, 3); }
    });
    World.tGrass2 = mk(x => {
      x.fillStyle = '#63a04f'; x.fillRect(0, 0, T, T);
      for (let i = 0; i < 6; i++) { x.fillStyle = ['#5a934a', '#70ab59'][i % 2]; x.fillRect(Math.random() * T, Math.random() * T, 4, 2); }
      x.fillStyle = '#54914a'; x.fillRect(8, 12, 2, 5); x.fillRect(20, 20, 2, 5);
    });
    World.tRoad = mk(x => {
      x.fillStyle = '#4a4d52'; x.fillRect(0, 0, T, T);
      for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(Math.random() * T, Math.random() * T, 4, 2); }
    });
    World.tPath = mk(x => {
      x.fillStyle = '#c9b189'; x.fillRect(0, 0, T, T);
      for (let i = 0; i < 6; i++) { x.fillStyle = ['#bda47d', '#d4bd96'][i % 2]; x.fillRect(Math.random() * T, Math.random() * T, 5, 3); }
      x.strokeStyle = 'rgba(120,95,60,.25)'; x.strokeRect(0.5, 0.5, T - 1, T - 1);
    });
    World.tFlower = mk(x => {
      x.fillStyle = '#69a653'; x.fillRect(0, 0, T, T);
      for (let i = 0; i < 4; i++) {
        const fx = 4 + Math.random() * 22, fy = 4 + Math.random() * 22;
        x.fillStyle = ['#ff5d7a', '#ffd34d', '#ff8f4d', '#e86bd0'][i % 4];
        x.fillRect(fx, fy, 4, 4);
        x.fillStyle = '#fff'; x.fillRect(fx + 1, fy + 1, 2, 2);
      }
    });
  }

  World.prerender = function () {
    groundTiles();
    World.trees = [spriteTree(0), spriteTree(1)];
    World.lamp = spriteLamp();
    World.sprites = {};
    for (const b of World.BUILDINGS) {
      World.sprites[b.id] = ({
        main: spriteMain, lhc: spriteLHC, hostel: spriteHostel,
        rajdhani: spriteRajdhani, oat: spriteOAT, mittal: spriteMittal,
      })[b.id](b);
    }
  };

  /* ---------------- minimap ---------------- */
  World.makeMinimap = function () {
    const [c, x] = cv(W * 2, H * 2);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const t = map[y][xx];
      x.fillStyle = t === ROAD ? '#55585e' : t === PATH ? '#c9b189' : t === TREE ? '#2f6b2a'
        : t === BLD ? '#b08a5a' : t === FLOWER ? '#cf6a8a' : '#69a653';
      x.fillRect(xx * 2, y * 2, 2, 2);
    }
    x.fillStyle = '#7a3a2a';
    for (const b of World.BUILDINGS) x.fillRect(b.x * 2, b.y * 2, b.w * 2, b.h * 2);
    World.minimap = c;
  };

  /* ---------------- world drawing ---------------- */
  World.draw = function (ctx, cam, vw, vh) {
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(W - 1, Math.ceil((cam.x + vw) / T)), y1 = Math.min(H - 1, Math.ceil((cam.y + vh) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = map[y][x], px = x * T - cam.x, py = y * T - cam.y;
      if (t === ROAD) ctx.drawImage(World.tRoad, px, py);
      else if (t === PATH) ctx.drawImage(World.tPath, px, py);
      else if (t === FLOWER) ctx.drawImage(World.tFlower, px, py);
      else ctx.drawImage(deco[y][x] > 0.5 ? World.tGrass : World.tGrass2, px, py);
      // road centre dashes
      if (t === ROAD && map[Math.max(0, y - 1)][x] === ROAD && (y > 0 && map[y - 1][x] === ROAD) === false) {}
    }
    // dashed lines on 2-wide roads (horizontal avenues)
    ctx.fillStyle = 'rgba(230,225,200,.5)';
    for (let x = x0; x <= x1; x++) {
      if (x % 2 === 0) {
        if (20 >= y0 - 1 && 21 <= y1 + 1) ctx.fillRect(x * T - cam.x + 8, 21 * T - cam.y - 2, 16, 4);
        if (46 >= y0 - 1 && 47 <= y1 + 1) ctx.fillRect(x * T - cam.x + 8, 47 * T - cam.y - 2, 16, 4);
      }
    }
    // buildings
    for (const b of World.BUILDINGS) {
      const px = b.x * T - cam.x, py = b.y * T - cam.y;
      if (px > vw || py > vh || px + b.w * T < 0 || py + b.h * T < 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(px + 6, py + b.h * T - 4, b.w * T - 6, 10);
      ctx.drawImage(World.sprites[b.id], px, py);
    }
    // trees & lamps (drawn tall, sorted later with entities by main.js via overlay pass)
  };
  World.drawTall = function (ctx, cam, vw, vh, list) {
    // gather trees + lamps as pseudo-entities for y-sorting
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1), y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    const x1 = Math.min(W - 1, Math.ceil((cam.x + vw) / T) + 1), y1 = Math.min(H - 1, Math.ceil((cam.y + vh) / T) + 2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = map[y][x];
      if (t === TREE) list.push({ y: y * T + T, draw: (c2) => c2.drawImage(World.trees[deco[y][x] > 0.5 ? 0 : 1], x * T - cam.x, y * T - T - cam.y) });
      else if (t === LAMP) list.push({ y: y * T + T, draw: (c2) => c2.drawImage(World.lamp, x * T - cam.x, y * T - T - cam.y) });
    }
  };

  /* lamps positions for night glow */
  World.lampGlows = function () {
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (map[y][x] === LAMP) out.push({ x: x * T + T / 2, y: y * T - T + 8 });
    return out;
  };
})();
