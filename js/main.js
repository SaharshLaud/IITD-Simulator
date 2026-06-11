/* ============================================================
   IIT DELHI SIMULATOR — main.js
   Game state, loop, player, time & calendar, activities,
   quests, RDV festival, day/night rendering, HUD & menus.
   ============================================================ */
(function () {
  const T = G.TILE, W = G.World;
  let canvas, ctx, vw, vh;
  const cam = { x: 0, y: 0 };
  const keys = {};
  let lastTs = 0, stepT = 0;

  /* ================= state ================= */
  function freshState() {
    return {
      day: 1, time: G.DAY_START + 60, // 7:00 AM day 1
      cgpa: 6.0, health: 80, energy: 90, fun: 70, research: 0,
      counters: {
        lectures: 0, workouts: 0, meals: 0, rpEarned: 0, sideQuestsDone: 0,
        rdvNights: 0, bossesWon: 0, allNighters: 0, eventsAttended: 0, sleeps: 0,
      },
      main: {},           // main quest id -> true when done
      side: {},           // side quest id -> 'active'|'done'
      pendingBoss: G.BOSS_DAYS[1] || null,
      bossFoughtToday: false,
      lostIdFound: false,
      lastRdvDay: 0,
      over: false,
    };
  }

  const player = {
    x: 0, y: 0, dir: 'down', frame: 0, ft: 0,
    pal: { shirt: '#3d7bd6', pants: '#2b2d42', hair: '#17110a', skin: '#c98c5a' },
  };

  let particles = [];
  let dialogueQ = null;
  let menuOpen = false, questOpen = false;
  let zone = 'campus';
  let started = false;

  /* ================= boot ================= */
  window.addEventListener('load', () => {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    W.build();
    G.NPC.init();
    G.Battle.bind();
    G.state = freshState();
    const h = W.byId('hostel');
    player.x = h.door.x * T + T / 2;
    player.y = (h.door.y + 2) * T;
    bindUI();
    requestAnimationFrame(loop);
  });

  function resize() {
    vw = canvas.width = Math.min(window.innerWidth, 1280);
    vh = canvas.height = Math.min(window.innerHeight, 800);
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  }

  function paused() {
    return !started || menuOpen || !!dialogueQ || G.Battle.active || G.state.over;
  }

  /* ================= input ================= */
  let audioUnlocked = false;
  function unlockAudio(e) {
    if (audioUnlocked || started) return;
    // If the user's very first interaction is clicking Start, skip intro —
    // startGame() will handle audio init and go straight to campus music.
    const startBtn = document.getElementById('start-btn');
    if (startBtn && (e.target === startBtn || startBtn.contains(e.target))) return;
    audioUnlocked = true;
    if (!G.Audio.ready) G.Audio.init();
    G.Audio.playIntro();
  }
  window.addEventListener('mousedown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);

  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();

    if (G.Battle.active) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) G.Battle.playerMove(n - 1);
      return;
    }
    if (!started) { if (e.key === 'Enter' || e.key === ' ') startGame(); return; }
    if (G.state.over) return;

    if (dialogueQ && (e.key.toLowerCase() === 'e' || e.key === ' ' || e.key === 'Enter')) { advanceDialogue(); return; }
    if (dialogueQ) return;
    if (e.key.toLowerCase() === 'e') interact();
    if (e.key.toLowerCase() === 'q') toggleQuestLog();
    if (e.key.toLowerCase() === 'm') {
      const muted = G.Audio.toggleMute();
      toast(muted ? 'Audio muted' : 'Audio on', 'info');
    }
    if (e.key === 'Escape') { closeMenu(); if (questOpen) toggleQuestLog(); }
    const n = parseInt(e.key, 10);
    if (menuOpen && n >= 1 && n <= 9) {
      const all = document.querySelectorAll('#menu .act-btn');
      if (all[n - 1] && !all[n - 1].disabled) all[n - 1].click();
    }
  });
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  /* ================= UI bind ================= */
  function bindUI() {
    document.getElementById('start-btn').onclick = () => { G.Audio.init(); startGame(); };
    document.getElementById('menu-close').onclick = closeMenu;
    document.getElementById('quest-close').onclick = toggleQuestLog;
    document.getElementById('hud-quest-btn').onclick = toggleQuestLog;
    document.getElementById('restart-btn').onclick = () => location.reload();
    document.getElementById('hospital-restart').onclick = () => location.reload();
  }
  function startGame() {
    if (started) return;
    started = true;
    audioUnlocked = true;
    if (!G.Audio.ready) G.Audio.init();
    document.getElementById('intro').classList.add('hidden');
    toast('Welcome to IIT Delhi! Walk with WASD / arrows. Press E near doors & people.', 'quest', 6000);
    toast('Main quest: attend your first lecture at LHC', 'info', 6000);
    G.Audio.sfx.confirm();
    G.Audio.stopIntro();
    setTimeout(() => G.Audio.setZone('campus', true), 300);
  }

  /* ================= dialogue ================= */
  function say(speaker, lines, after) {
    dialogueQ = { speaker, lines: Array.isArray(lines) ? lines : [lines], i: 0, after };
    renderDialogue();
  }
  function renderDialogue() {
    const box = document.getElementById('dialogue');
    box.classList.remove('hidden');
    document.getElementById('d-speaker').textContent = dialogueQ.speaker;
    document.getElementById('d-text').textContent = dialogueQ.lines[dialogueQ.i];
    G.Audio.sfx.blip();
  }
  function advanceDialogue() {
    dialogueQ.i++;
    if (dialogueQ.i >= dialogueQ.lines.length) {
      document.getElementById('dialogue').classList.add('hidden');
      const after = dialogueQ.after; dialogueQ = null;
      if (after) after();
    } else renderDialogue();
  }

  /* ================= toasts ================= */
  function toast(msg, kind, ms) {
    const host = document.getElementById('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || 'info');
    d.textContent = msg;
    host.appendChild(d);
    setTimeout(() => d.classList.add('show'), 16);
    setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 400); }, ms || 3400);
  }

  /* ================= stats ================= */
  function applyFx(fx) {
    const s = G.state;
    if (fx.cgpa) { s.cgpa = G.clamp(s.cgpa + fx.cgpa, 0, 10); statPop('cgpa', fx.cgpa); }
    if (fx.health) { s.health = G.clamp(s.health + fx.health, 0, 100); statPop('health', fx.health); }
    if (fx.energy) { s.energy = G.clamp(s.energy + fx.energy, 0, 100); statPop('energy', fx.energy); }
    if (fx.fun) { s.fun = G.clamp(s.fun + fx.fun, 0, 100); statPop('fun', fx.fun); }
    if (fx.research) {
      s.research = G.clamp(s.research + fx.research, 0, 999);
      if (fx.research > 0) s.counters.rpEarned += fx.research;
      statPop('research', fx.research);
    }
    checkVitals();
    checkCounterQuests();
  }
  function statPop(stat, v) {
    const elx = document.querySelector(`#stat-${stat} .stat-delta`);
    if (!elx) return;
    elx.textContent = (v > 0 ? '+' : '') + (stat === 'cgpa' ? v.toFixed(2) : Math.round(v));
    elx.className = 'stat-delta ' + (v > 0 ? 'up' : 'down');
    elx.style.opacity = 1;
    clearTimeout(elx._t);
    elx._t = setTimeout(() => elx.style.opacity = 0, 1400);
  }
  function checkVitals() {
    const s = G.state;
    if (s.health <= 0 && !s.over) {
      s.over = true;
      document.getElementById('hospital').classList.remove('hidden');
      G.Audio.sfx.lose();
    }
  }

  /* ================= time & calendar ================= */
  function advanceTime(mins) {
    const s = G.state;
    s.time += mins;
    if (s.time >= G.DAY_END && !G.Battle.active && !s.over) midnightCollapse();
  }
  function midnightCollapse() {
    const s = G.state;
    if (dialogueQ) { s.time = G.DAY_END - 1; return; }
    s.counters.allNighters++;
    s.time = G.DAY_END - 1;
    say('Your Body', [
      'It is midnight. Your eyes close on their own...',
      'You wake up on a friend\u2019s floor, with a blanket and mild regret.',
    ], () => newDay(false));
  }
  function sleep() {
    G.Audio.sfx.sleep();
    say('You', 'You crash onto the hostel bed. The fan hums its ancient song...', () => newDay(true));
  }
  function newDay(sleptWell) {
    const s = G.state;
    if (s.pendingBoss && !s.bossFoughtToday) {
      const def = G.BOSSES[s.pendingBoss];
      const missed = s.pendingBoss;
      applyFx({ cgpa: -0.6, fun: -8 });
      toast(`You skipped ${def.name}! CGPA \u22120.6`, 'bad', 5000);
      s.main[missed] = true;
      s.pendingBoss = null;
      if (missed === 'endsem2') return showReport();
    }
    s.day++;
    s.counters.sleeps++;
    s.time = G.DAY_START + 60;
    s.energy = G.clamp(s.energy + (sleptWell ? 70 : 45), 0, 100);
    s.health = G.clamp(s.health + (sleptWell ? 4 : -8), 0, 100);
    s.fun = G.clamp(s.fun - 4, 0, 100);
    if (s.fun <= 0) { applyFx({ cgpa: -0.1 }); toast('You feel burnt out. Fun is at zero \u2014 CGPA is slipping!', 'bad', 5000); }
    s.bossFoughtToday = false;
    s.pendingBoss = G.BOSS_DAYS[s.day] || null;
    checkVitals();
    if (s.over) return;
    if (s.day === G.SEM2_START) {
      say('Institute Notice', [
        'SEMESTER 2 BEGINS!',
        'New focus: research at the Main Building, sports trials at Mittal...',
        '...and whispers of RDV, the cultural festival, on days 30\u201332.',
      ]);
      G.Audio.sfx.quest();
    } else if (s.pendingBoss) {
      const def = G.BOSSES[s.pendingBoss];
      toast(`\u26A0 TODAY: ${def.name} awaits at LHC!`, 'bad', 6000);
      G.Audio.sfx.cancel();
    } else if (G.RDV_DAYS.includes(s.day)) {
      toast(`\uD83C\uDF89 RDV Day ${G.RDV_DAYS.indexOf(s.day) + 1}! Festival at OAT from 5 PM!`, 'quest', 6000);
    } else {
      toast(`Day ${s.day} \u2014 ${s.day <= 20 ? 'Semester 1' : 'Semester 2'}`, 'info');
    }
  }

  function isRdvLive() {
    const s = G.state;
    return G.RDV_DAYS.includes(s.day) && s.time >= G.RDV_HOUR * 60;
  }

  /* ================= quests ================= */
  function doneMain(id, label) {
    const s = G.state;
    if (s.main[id]) return;
    s.main[id] = true;
    toast('\u2714 Quest complete: ' + label, 'quest', 4500);
    G.Audio.sfx.quest();
  }
  function startSide(id) {
    const s = G.state, q = G.SIDE_QUESTS[id];
    if (s.side[id]) return;
    s.side[id] = 'active';
    toast('\u2605 New side quest: ' + q.name, 'quest', 4500);
    G.Audio.sfx.quest();
  }
  function completeSide(id) {
    const s = G.state, q = G.SIDE_QUESTS[id];
    if (s.side[id] === 'done') return;
    s.side[id] = 'done';
    s.counters.sideQuestsDone++;
    applyFx(q.reward);
    toast('\u2714 ' + q.name + ' complete!', 'quest', 4500);
    G.Audio.sfx.win();
  }
  function checkCounterQuests() {
    const s = G.state;
    for (const id of Object.keys(G.SIDE_QUESTS)) {
      const q = G.SIDE_QUESTS[id];
      if (q.counter && s.side[id] === 'active' && s.counters[q.counter] >= q.target && !dialogueQ) {
        say(q.giver, q.done, () => completeSide(id));
      }
    }
    if (!s.main.research && s.day >= G.SEM2_START && s.research >= 30) doneMain('research', 'Research Semester');
  }

  /* ================= interaction ================= */
  function interact() {
    if (paused()) return;
    let best = null, bd = 48;
    for (const n of G.NPC.list) {
      const d = Math.hypot(n.x - player.x, n.y - player.y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best) return talkTo(best);
    const s = G.state;
    if (s.side.lostId === 'active' && !s.lostIdFound) {
      const ix = 25 * T, iy = 40 * T;
      if (Math.hypot(ix - player.x, iy - player.y) < 56) {
        s.lostIdFound = true;
        G.Audio.sfx.confirm();
        return say('You', 'Found it! One slightly muddy ID card: "ROHIT, B.Tech". Return it to Rohit.');
      }
    }
    for (const b of W.BUILDINGS) {
      const dx = b.door.x * T + T / 2, dy = b.door.y * T + T / 2;
      if (Math.hypot(dx - player.x, dy - player.y) < 70) return openMenu(b);
    }
    toast('Nothing here. Find a door or a person.', 'info', 1800);
  }

  function talkTo(n) {
    const s = G.state;
    const qid = n.def.quest;
    n.dir = player.x < n.x ? 'left' : 'right';
    if (qid) {
      const st = s.side[qid];
      if (!st) {
        const q = G.SIDE_QUESTS[qid];
        return say(n.name, [G.pick(G.DIALOGUE[n.name]), `Actually \u2014 could you help me? ${q.desc}`], () => startSide(qid));
      }
      if (st === 'active') {
        if (qid === 'fitness3' || qid === 'attend5' || qid === 'research20') {
          const q = G.SIDE_QUESTS[qid];
          return say(n.name, `How is it going? (${Math.min(s.counters[q.counter], q.target)}/${q.target}) \u2014 ${q.desc}`);
        }
        if (qid === 'lostId') {
          if (s.lostIdFound) return say(n.name, 'MY ID! You absolute legend. The librarian can stop glaring at me now.', () => completeSide('lostId'));
          return say(n.name, 'I think I dropped my ID somewhere on the lawns east of the OAT. Look for a sparkle!');
        }
        if (qid === 'chaiTime') {
          const hour = Math.floor(s.time / 60);
          if ((zone === 'rajdhani' || zone === 'rdv') && hour >= 17) return say(n.name, 'You made it! Ramu bhaiya, two cutting chai! \u2615', () => completeSide('chaiTime'));
          return say(n.name, 'Rajdhani. After 5 PM. Chai. Be there.');
        }
        if (qid === 'deliverNotes') return say(n.name, 'Priya is usually around LHC in the day, or near the hostel in the evening. My notes await!');
      }
    }
    if (n.name === 'Priya' && s.side.deliverNotes === 'active') {
      return say('Priya', 'Aman\u2019s notes! Wow, his handwriting is somehow worse than last sem. Thanks!', () => completeSide('deliverNotes'));
    }
    if ((n.def.role === 'prof' || n.def.role === 'phd') && !s.main.meetProf) {
      return say(n.name, [G.pick(G.DIALOGUE[n.name]), 'Good to see a student outside class hours. Come by the Main Building \u2014 there is research to do.'],
        () => doneMain('meetProf', 'Office Hours'));
    }
    say(n.name, G.pick(G.DIALOGUE[n.name]));
  }

  /* ================= activities & building menus ================= */
  function hourIn(a, b) { const h = G.state.time / 60; return h >= a && h < b; }

  function rdvAttend() {
    const s = G.state;
    if (s.lastRdvDay !== s.day) {
      s.lastRdvDay = s.day;
      s.counters.rdvNights++;
      G.Audio.sfx.cheer();
      if (s.counters.rdvNights === 1) doneMain('rdv', 'Rendezvous!');
      say('RDV', [
        'The bass drops. Ten thousand phone flashlights rise over the OAT.',
        'For a few hours, there are no deadlines. Only music, lights, and your people.',
      ]);
    } else {
      say('RDV', 'You dive back into the crowd. The night is still young!');
    }
  }

  const ACTIVITIES = {
    main: [
      { n: 'Meet a professor', sub: 'Office hours. +Research, may unlock ideas.', time: 60, req: () => hourIn(9, 18), fx: { research: 4, energy: -5 },
        post: () => doneMain('meetProf', 'Office Hours') },
      { n: 'Work in the research lab', sub: 'Grind science. ++Research, \u2212Energy.', time: 150, req: s => hourIn(9, 21) && s.energy >= 15, fx: { research: 9, energy: -16, fun: -3, cgpa: 0.04 } },
      { n: 'Academic counselling', sub: 'Plan your courses. +CGPA, +calm.', time: 45, req: () => hourIn(9, 17), fx: { cgpa: 0.06, fun: 2, energy: -3 } },
      { n: 'Admire the rose garden', sub: 'Touch grass, literally. +Fun.', time: 30, req: () => true, fx: { fun: 6, energy: -2 } },
    ],
    lhc: [
      { n: 'Attend lecture', sub: '+CGPA, \u2212Energy. Attendance matters!', time: 90, req: s => hourIn(8, 18) && s.energy >= 8, fx: { cgpa: 0.12, energy: -10, research: 1 },
        post: () => { G.state.counters.lectures++; doneMain('firstLecture', 'First Day at IIT Delhi'); checkCounterQuests(); } },
      { n: 'Solve tutorial sheet', sub: 'Pain now, marks later. +CGPA, \u2212Fun.', time: 75, req: s => s.energy >= 10, fx: { cgpa: 0.09, energy: -12, fun: -5 } },
      { n: 'Nap in the back row', sub: 'A time-honoured tradition. +Energy.', time: 60, req: () => hourIn(8, 18), fx: { energy: 12, cgpa: -0.02, fun: 3 } },
    ],
    hostel: [
      { n: 'Sleep (end the day)', sub: 'Restore energy. Tomorrow is a new day.', time: 0, req: () => true, sleep: true },
      { n: 'Power nap', sub: '+Energy without ending the day.', time: 75, req: () => true, fx: { energy: 22, fun: 1 } },
      { n: 'Group study session', sub: 'Friends + formulas. +CGPA, +Fun, \u2212Energy.', time: 120, req: s => s.energy >= 10, fx: { cgpa: 0.1, fun: 6, energy: -12 } },
      { n: 'Wing hangout', sub: 'Maggi, music, mayhem. ++Fun.', time: 90, req: () => true, fx: { fun: 12, energy: -4 } },
    ],
    rajdhani: [
      { n: 'Proper meal', sub: 'Thali power. +Energy, +Health.', time: 45, req: () => hourIn(7, 23), fx: { energy: 18, health: 8, fun: 4 },
        post: () => { G.state.counters.meals++; G.Audio.sfx.eat(); } },
      { n: 'Chai & snacks', sub: 'Cutting chai + bread pakoda. +Fun, +Energy.', time: 30, req: () => hourIn(7, 23), fx: { fun: 8, energy: 8 },
        post: () => { G.state.counters.meals++; G.Audio.sfx.eat(); } },
      { n: 'Hang out with friends', sub: 'Gossip is a renewable resource. ++Fun.', time: 75, req: () => hourIn(7, 23), fx: { fun: 13, energy: -3 } },
    ],
    mittal: [
      { n: 'Workout', sub: 'Iron therapy. +Health, \u2212Energy.', time: 75, req: s => hourIn(6, 22) && s.energy >= 12, fx: { health: 10, energy: -14, fun: 2 },
        post: () => { G.state.counters.workouts++; checkCounterQuests(); } },
      { n: 'Play a sport', sub: 'Football / basketball / badminton. +Health, +Fun.', time: 90, req: s => hourIn(6, 22) && s.energy >= 10, fx: { health: 7, fun: 10, energy: -12 },
        post: () => { G.state.counters.workouts++; checkCounterQuests(); } },
      { n: 'Watch a match', sub: 'Cheer from the stands. +Fun.', time: 60, req: () => hourIn(16, 22), fx: { fun: 8, energy: -2 },
        post: () => { G.state.counters.eventsAttended++; } },
    ],
    oat: [
      { n: '\uD83C\uDF89 JOIN THE RDV FESTIVAL', sub: 'The night of the year. +++Fun!', time: 150, rdv: true, req: () => isRdvLive(), fx: { fun: 22, energy: -10 },
        post: rdvAttend },
      { n: 'Attend an evening event', sub: 'Music / drama / open mic. +Fun.', time: 90, req: () => hourIn(17, 23) && !isRdvLive(), fx: { fun: 11, energy: -4 },
        post: () => { G.state.counters.eventsAttended++; } },
      { n: 'Sit on the steps & unwind', sub: 'Best sunset on campus. +Fun, +Energy.', time: 45, req: () => true, fx: { fun: 5, energy: 5 } },
    ],
  };

  function openMenu(b) {
    const s = G.state;
    menuOpen = true;
    const root = document.getElementById('menu');
    root.classList.remove('hidden');
    document.getElementById('menu-title').textContent = b.name;
    const host = document.getElementById('menu-acts');
    host.innerHTML = '';
    if (b.id === 'lhc' && s.pendingBoss && !s.bossFoughtToday) {
      const def = G.BOSSES[s.pendingBoss];
      const btn = document.createElement('button');
      btn.className = 'act-btn boss';
      btn.innerHTML = `<span class="act-name">\u2694 FACE ${def.name}</span><span class="act-sub">${def.intro}</span>`;
      btn.onclick = () => { closeMenu(); startBoss(); };
      host.appendChild(btn);
    }
    for (const a of (ACTIVITIES[b.id] || [])) {
      if (a.rdv && !isRdvLive()) continue;
      const btn = document.createElement('button');
      btn.className = 'act-btn' + (a.rdv ? ' rdv' : '');
      const ok = a.req(s);
      btn.disabled = !ok;
      const fxTxt = a.fx ? fxLabel(a.fx) : 'Ends the day';
      btn.innerHTML = `<span class="act-name">${a.n}</span><span class="act-sub">${a.sub}</span><span class="act-meta">${a.time ? '\u23F1 ' + a.time + ' min \u00B7 ' : ''}${fxTxt}${ok ? '' : ' \u00B7 unavailable now'}</span>`;
      btn.onclick = () => runActivity(a);
      host.appendChild(btn);
    }
  }
  function fxLabel(fx) {
    const parts = [];
    const names = { cgpa: 'CGPA', health: 'HP', energy: 'EN', fun: 'FUN', research: 'RP' };
    for (const k of Object.keys(fx)) {
      const v = fx[k];
      parts.push((v > 0 ? '+' : '') + (k === 'cgpa' ? v.toFixed(2) : v) + ' ' + names[k]);
    }
    return parts.join('  ');
  }
  function closeMenu() {
    menuOpen = false;
    document.getElementById('menu').classList.add('hidden');
  }
  function runActivity(a) {
    closeMenu();
    if (a.sleep) return sleep();
    applyFx(a.fx);
    advanceTime(a.time);
    if (a.post) a.post();
    G.Audio.sfx.confirm();
  }

  /* ================= boss flow ================= */
  function startBoss() {
    const s = G.state;
    const id = s.pendingBoss;
    s.bossFoughtToday = true;
    G.Battle.start(id, won => {
      const def = G.BOSSES[id];
      if (won) {
        s.counters.bossesWon++;
        applyFx({ cgpa: def.winCgpa, research: def.winRp, fun: 5 });
        toast(`Victory! CGPA +${def.winCgpa.toFixed(2)}`, 'quest', 5000);
      } else {
        applyFx({ cgpa: -def.loseCgpa, fun: -10, energy: -10 });
        toast(`Defeated... CGPA \u2212${def.loseCgpa.toFixed(2)}`, 'bad', 5000);
      }
      doneMain(id, G.MAIN_QUESTS.find(q => q.id === id).name);
      s.pendingBoss = null;
      advanceTime(180);
      if (id === 'endsem2' && !s.over) setTimeout(showReport, 600);
    });
  }

  /* ================= quest log ================= */
  function toggleQuestLog() {
    questOpen = !questOpen;
    const root = document.getElementById('questlog');
    root.classList.toggle('hidden', !questOpen);
    if (!questOpen) return;
    const s = G.state;
    const mainHost = document.getElementById('ql-main');
    mainHost.innerHTML = '';
    for (const q of G.MAIN_QUESTS) {
      const done = !!s.main[q.id];
      const d = document.createElement('div');
      d.className = 'ql-item' + (done ? ' done' : '');
      d.innerHTML = `<span class="ql-check">${done ? '\u2714' : '\u25CB'}</span><div><div class="ql-name">${q.name}</div><div class="ql-desc">${q.desc}</div></div>`;
      mainHost.appendChild(d);
    }
    const sideHost = document.getElementById('ql-side');
    sideHost.innerHTML = '';
    let any = false;
    for (const id of Object.keys(G.SIDE_QUESTS)) {
      const st = s.side[id];
      if (!st) continue;
      any = true;
      const q = G.SIDE_QUESTS[id];
      const done = st === 'done';
      let prog = '';
      if (q.counter && !done) prog = ` (${Math.min(s.counters[q.counter], q.target)}/${q.target})`;
      const d = document.createElement('div');
      d.className = 'ql-item' + (done ? ' done' : '');
      d.innerHTML = `<span class="ql-check">${done ? '\u2714' : '\u25CB'}</span><div><div class="ql-name">${q.name}${prog}</div><div class="ql-desc">${q.desc} <em>\u2014 ${q.giver}</em></div></div>`;
      sideHost.appendChild(d);
    }
    if (!any) sideHost.innerHTML = '<div class="ql-empty">Talk to people around campus to find side quests.</div>';
  }

  /* ================= report card ================= */
  function showReport() {
    const s = G.state;
    s.over = true;
    const root = document.getElementById('report');
    root.classList.remove('hidden');
    const won = s.cgpa > 7 && s.health > 0 && s.energy > 0 && s.fun > 0;
    const v = document.getElementById('r-verdict');
    v.textContent = won ? 'YEAR CLEARED \u2014 YOU SURVIVED IIT DELHI!' : 'YEAR OVER \u2014 A SUMMER OF REFLECTION AWAITS';
    v.className = won ? 'win' : 'lose';
    const grade = x => x >= 9 ? 'A+' : x >= 8 ? 'A' : x >= 7 ? 'B' : x >= 6 ? 'C' : x >= 5 ? 'D' : 'F';
    const g100 = x => x >= 85 ? 'A+' : x >= 70 ? 'A' : x >= 55 ? 'B' : x >= 40 ? 'C' : x >= 25 ? 'D' : 'F';
    document.getElementById('r-rows').innerHTML = `
      <tr><td>CGPA</td><td>${s.cgpa.toFixed(2)} / 10</td><td>${grade(s.cgpa)}</td></tr>
      <tr><td>Health</td><td>${Math.round(s.health)} / 100</td><td>${g100(s.health)}</td></tr>
      <tr><td>Energy</td><td>${Math.round(s.energy)} / 100</td><td>${g100(s.energy)}</td></tr>
      <tr><td>Fun</td><td>${Math.round(s.fun)} / 100</td><td>${g100(s.fun)}</td></tr>
      <tr><td>Research Points</td><td>${Math.round(s.research)}</td><td>${s.research >= 60 ? 'A+' : s.research >= 35 ? 'A' : s.research >= 15 ? 'B' : 'C'}</td></tr>
      <tr><td>Lectures attended</td><td>${s.counters.lectures}</td><td></td></tr>
      <tr><td>Bosses defeated</td><td>${s.counters.bossesWon} / 5</td><td></td></tr>
      <tr><td>RDV nights</td><td>${s.counters.rdvNights} / 3</td><td></td></tr>
      <tr><td>Side quests</td><td>${s.counters.sideQuestsDone}</td><td></td></tr>`;
    const aHost = document.getElementById('r-achievements');
    aHost.innerHTML = '';
    for (const a of G.ACHIEVEMENTS) {
      if (a.check(s.counters, s)) {
        const d = document.createElement('div');
        d.className = 'ach';
        d.innerHTML = `<span class="ach-name">\uD83C\uDFC5 ${a.name}</span><span class="ach-desc">${a.desc}</span>`;
        aHost.appendChild(d);
      }
    }
    if (won) G.Audio.sfx.win(); else G.Audio.sfx.lose();
  }

  /* ================= update ================= */
  function update(dt) {
    const s = G.state;
    if (!paused()) {
      let dx = 0, dy = 0;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;
      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;
      const running = keys['shift'] && s.energy > 5;
      const spd = (running ? 215 : 150) * dt;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        const nx = player.x + dx / len * spd;
        const ny = player.y + dy / len * spd;
        if (!collides(nx, player.y)) player.x = nx;
        if (!collides(player.x, ny)) player.y = ny;
        player.x = G.clamp(player.x, 12, G.MAP_W * T - 12);
        player.y = G.clamp(player.y, 28, G.MAP_H * T - 6);
        player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        player.ft += dt * (running ? 11 : 8);
        player.frame = Math.floor(player.ft) % 2;
        stepT -= dt;
        if (stepT <= 0) { G.Audio.sfx.step(); stepT = running ? 0.22 : 0.3; }
        if (running) s.energy = G.clamp(s.energy - dt * 1.2, 0, 100);
      } else player.frame = 0;

      advanceTime(dt * G.TIME_RATE);
      G.NPC.update(dt, Math.floor(s.time / 60));
      if (isRdvLive()) G.NPC.spawnCrowd(); else G.NPC.clearCrowd();
      updateZone();
      if (Math.random() < dt * 2.5) spawnLeaf();
      if (isRdvLive() && Math.random() < dt * 30) spawnConfetti();
    }
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      p.vx += Math.sin(p.life * 3) * dt * 8;
    }
    particles = particles.filter(p => p.life > 0);
    cam.x = G.clamp(player.x - vw / 2, 0, G.MAP_W * T - vw);
    cam.y = G.clamp(player.y - vh / 2, 0, G.MAP_H * T - vh);
    updateHUD();
  }

  function collides(px, py) {
    for (const ox of [-8, 8]) for (const oy of [-4, 4]) {
      if (W.solid(Math.floor((px + ox) / T), Math.floor((py + oy) / T))) return true;
    }
    return false;
  }

  function updateZone() {
    let z = 'campus', label = 'IIT Delhi Campus';
    for (const b of W.BUILDINGS) {
      const pad = 4 * T;
      if (player.x > b.x * T - pad && player.x < (b.x + b.w) * T + pad &&
          player.y > b.y * T - pad && player.y < (b.y + b.h) * T + pad) {
        z = b.id; label = b.name;
      }
    }
    if (z === 'oat' && isRdvLive()) { z = 'rdv'; label = '\uD83C\uDF89 RDV FESTIVAL @ OAT'; }
    if (z !== zone) {
      zone = z;
      G.Audio.setZone(z);
      const elz = document.getElementById('hud-zone');
      elz.textContent = label;
      elz.classList.remove('zone-pop'); void elz.offsetWidth; elz.classList.add('zone-pop');
    }
  }

  function spawnLeaf() {
    particles.push({
      x: cam.x + Math.random() * vw, y: cam.y - 10,
      vx: G.rand(-12, 24), vy: G.rand(22, 44),
      life: G.rand(6, 12), c: G.pick(['#7fb069', '#d8973c', '#a4be7b']), s: G.rand(2, 4),
    });
  }
  function spawnConfetti() {
    const oat = W.byId('oat');
    particles.push({
      x: oat.x * T + G.rand(40, oat.w * T - 40), y: oat.y * T + G.rand(0, 60),
      vx: G.rand(-30, 30), vy: G.rand(20, 70),
      life: G.rand(1.5, 3.5), c: G.pick(['#ff5d7a', '#ffd34d', '#5dd8ff', '#b06bff', '#5dbb8a']), s: G.rand(2, 4),
    });
  }

  /* ================= rendering ================= */
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    if (G.state) update(dt);
    if (G.state) draw(ts / 1000);
    requestAnimationFrame(loop);
  }

  function draw(t) {
    const s = G.state;
    ctx.fillStyle = '#1a2616';
    ctx.fillRect(0, 0, vw, vh);
    W.draw(ctx, cam, vw, vh);

    const list = [];
    W.drawTall(ctx, cam, vw, vh, list);
    for (const n of G.NPC.list) {
      list.push({ y: n.y, draw: c2 => {
        G.NPC.drawPerson(c2, n.x - cam.x, n.y - cam.y, n.dir, n.frame, n.def.pal);
        if (questBadge(n)) {
          c2.fillStyle = '#ffd34d';
          c2.font = 'bold 18px Georgia';
          c2.textAlign = 'center';
          c2.fillText('!', n.x - cam.x, n.y - cam.y - 38 + Math.sin(t * 4) * 3);
        }
      } });
    }
    for (const c of G.NPC.crowd) {
      list.push({ y: c.y, draw: c2 => G.NPC.drawPerson(c2, c.x - cam.x, c.y - cam.y, 'up', Math.floor(c.t * 2) % 2, c.pal, c.bounce) });
    }
    if (s.side.lostId === 'active' && !s.lostIdFound) {
      const ix = 25 * T, iy = 40 * T;
      list.push({ y: iy, draw: c2 => {
        const g = 0.6 + Math.sin(t * 6) * 0.4;
        c2.fillStyle = 'rgba(255,230,120,' + g.toFixed(2) + ')';
        c2.beginPath(); c2.arc(ix - cam.x, iy - cam.y - 6, 5 + Math.sin(t * 6) * 2, 0, 7); c2.fill();
        c2.fillStyle = '#fff'; c2.fillRect(ix - cam.x - 1, iy - cam.y - 9, 2, 2);
      } });
    }
    list.push({ y: player.y, draw: c2 => G.NPC.drawPerson(c2, player.x - cam.x, player.y - cam.y, player.dir, player.frame, player.pal) });
    list.sort((a, b2) => a.y - b2.y);
    for (const o of list) o.draw(ctx);

    drawHint(t);
    if (isRdvLive()) drawRdv(t);

    for (const p of particles) {
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillRect(p.x - cam.x, p.y - cam.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;

    drawNight(t);
    drawMinimap();
  }

  function questBadge(n) {
    const s = G.state;
    const qid = n.def.quest;
    if (qid && !s.side[qid]) return true;
    if (qid === 'lostId' && s.side.lostId === 'active' && s.lostIdFound) return true;
    if (n.name === 'Priya' && s.side.deliverNotes === 'active') return true;
    return false;
  }

  function drawHint(t) {
    if (paused()) return;
    let msg = null, hx = 0, hy = 0;
    for (const n of G.NPC.list) {
      if (Math.hypot(n.x - player.x, n.y - player.y) < 48) {
        msg = 'E \u2014 talk to ' + n.name; hx = n.x; hy = n.y - 46; break;
      }
    }
    const s = G.state;
    if (!msg && s.side.lostId === 'active' && !s.lostIdFound &&
        Math.hypot(25 * T - player.x, 40 * T - player.y) < 56) {
      msg = 'E \u2014 pick up'; hx = 25 * T; hy = 40 * T - 30;
    }
    if (!msg) {
      for (const b of W.BUILDINGS) {
        const dx = b.door.x * T + T / 2, dy = b.door.y * T + T / 2;
        if (Math.hypot(dx - player.x, dy - player.y) < 70) {
          msg = 'E \u2014 enter ' + b.name;
          if (b.id === 'lhc' && s.pendingBoss && !s.bossFoughtToday) msg = '\u2694 E \u2014 the boss awaits inside!';
          hx = dx; hy = dy - 50; break;
        }
      }
    }
    if (!msg) return;
    ctx.font = 'bold 12px Verdana';
    const w2 = ctx.measureText(msg).width + 16;
    const px = G.clamp(hx - cam.x - w2 / 2, 4, vw - w2 - 4);
    const py = hy - cam.y + Math.sin(t * 3) * 2;
    ctx.fillStyle = 'rgba(15,18,28,.85)';
    ctx.fillRect(px, py - 14, w2, 20);
    ctx.strokeStyle = 'rgba(255,211,77,.7)';
    ctx.strokeRect(px + 0.5, py - 13.5, w2 - 1, 19);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'left';
    ctx.fillText(msg, px + 8, py);
  }

  /* ---- RDV stage beams, screen pulse, glow ---- */
  function drawRdv(t) {
    const oat = W.byId('oat');
    const sx = oat.x * T + oat.w * T / 2 - cam.x;
    const sy = oat.y * T + 30 - cam.y;
    if (sx < -600 || sx > vw + 600 || sy < -600 || sy > vh + 600) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cols = ['rgba(255,60,150,', 'rgba(80,180,255,', 'rgba(160,80,255,', 'rgba(80,255,170,'];
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(t * (0.7 + i * 0.23) + i * 1.7) * 0.9;
      const ox = (i - 1.5) * 42;
      ctx.fillStyle = cols[i] + '0.16)';
      ctx.beginPath();
      ctx.moveTo(sx + ox, sy);
      ctx.lineTo(sx + ox + Math.sin(a) * 260 - 55, sy + 330);
      ctx.lineTo(sx + ox + Math.sin(a) * 260 + 55, sy + 330);
      ctx.closePath();
      ctx.fill();
    }
    // screen strobe
    const pulse = 0.25 + Math.abs(Math.sin(t * 4.6)) * 0.3;
    ctx.fillStyle = 'rgba(90,200,255,' + pulse.toFixed(2) + ')';
    ctx.fillRect(sx - 50, sy - 12, 100, 24);
    // stage glow
    const g = ctx.createRadialGradient(sx, sy + 20, 10, sx, sy + 20, 240);
    g.addColorStop(0, 'rgba(255,150,220,.28)');
    g.addColorStop(1, 'rgba(255,150,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 240, sy - 100, 480, 420);
    ctx.restore();
  }

  /* ---- day/night ambient lighting ---- */
  function nightAlpha() {
    const h = G.state.time / 60;
    if (h >= 7 && h < 16.5) return 0;
    if (h >= 16.5 && h < 19.5) return (h - 16.5) / 3 * 0.55;        // dusk
    if (h >= 19.5) return 0.55;                                      // night
    return Math.max(0, (7 - h) / 1.5) * 0.55;                        // dawn 5:30-7
  }
  function duskTint() {
    const h = G.state.time / 60;
    if (h >= 16.5 && h < 19) return Math.sin((h - 16.5) / 2.5 * Math.PI) * 0.18;
    return 0;
  }

  function drawNight(t) {
    const a = nightAlpha();
    const dk = duskTint();
    if (dk > 0) {
      ctx.fillStyle = 'rgba(255,120,60,' + dk.toFixed(3) + ')';
      ctx.fillRect(0, 0, vw, vh);
    }
    if (a <= 0.01) return;
    ctx.fillStyle = 'rgba(12,16,46,' + a.toFixed(3) + ')';
    ctx.fillRect(0, 0, vw, vh);
    // warm glows
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!drawNight.lamps) drawNight.lamps = W.lampGlows();
    for (const l of drawNight.lamps) {
      const lx = l.x - cam.x, ly = l.y - cam.y;
      if (lx < -120 || lx > vw + 120 || ly < -120 || ly > vh + 120) continue;
      const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 90);
      g.addColorStop(0, 'rgba(255,220,150,' + (0.32 * a / 0.55).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 90, ly - 90, 180, 180);
    }
    // building window warmth
    for (const b of W.BUILDINGS) {
      const bx = b.cx - cam.x, by = b.cy - cam.y;
      if (bx < -400 || bx > vw + 400) continue;
      const g = ctx.createRadialGradient(bx, by, 20, bx, by, b.w * T * 0.7);
      g.addColorStop(0, 'rgba(255,200,120,' + (0.10 * a / 0.55).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - b.w * T, by - b.h * T, b.w * T * 2, b.h * T * 2);
    }
    // Rajdhani string lights twinkle
    const rj = W.byId('rajdhani');
    for (const l of (W.rajdhaniLights || [])) {
      const lx = rj.x * T + l.x - cam.x, ly = rj.y * T + l.y - cam.y;
      if (lx < -20 || lx > vw + 20 || ly < -20 || ly > vh + 20) continue;
      const tw = 0.5 + Math.sin(t * 5 + l.x) * 0.5;
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 14);
      g.addColorStop(0, 'rgba(255,230,160,' + (0.5 * tw).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 14, ly - 14, 28, 28);
    }
    ctx.restore();
    // stars at deep night
    if (a > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 24; i++) {
        const sx2 = (i * 173.3) % vw, sy2 = (i * 97.7) % (vh * 0.3);
        if (Math.sin(t * 2 + i) > 0.2) ctx.fillRect(sx2, sy2, 2, 2);
      }
    }
  }

  /* ---- minimap ---- */
  function drawMinimap() {
    const mc = document.getElementById('minimap');
    const mx = mc.getContext('2d');
    mx.imageSmoothingEnabled = false;
    mx.clearRect(0, 0, mc.width, mc.height);
    mx.drawImage(W.minimap, 0, 0, mc.width, mc.height);
    const px = player.x / (G.MAP_W * T) * mc.width;
    const py = player.y / (G.MAP_H * T) * mc.height;
    mx.fillStyle = '#fff';
    mx.beginPath(); mx.arc(px, py, 3.5, 0, 7); mx.fill();
    mx.fillStyle = '#3d7bd6';
    mx.beginPath(); mx.arc(px, py, 2.2, 0, 7); mx.fill();
    // boss marker on LHC
    const s = G.state;
    if (s.pendingBoss && !s.bossFoughtToday) {
      const b = W.byId('lhc');
      mx.fillStyle = '#ff5d7a';
      mx.font = 'bold 10px Verdana';
      mx.textAlign = 'center';
      mx.fillText('\u2694', (b.cx / (G.MAP_W * T)) * mc.width, (b.cy / (G.MAP_H * T)) * mc.height + 4);
    }
    if (isRdvLive()) {
      const b = W.byId('oat');
      mx.fillStyle = '#ffd34d';
      mx.font = 'bold 10px Verdana';
      mx.textAlign = 'center';
      mx.fillText('\u2605', (b.cx / (G.MAP_W * T)) * mc.width, (b.cy / (G.MAP_H * T)) * mc.height + 4);
    }
  }

  /* ---- HUD ---- */
  let hudT = 0;
  function updateHUD() {
    const s = G.state;
    setBar('cgpa', s.cgpa / 10, s.cgpa.toFixed(2));
    setBar('health', s.health / 100, Math.round(s.health));
    setBar('energy', s.energy / 100, Math.round(s.energy));
    setBar('fun', s.fun / 100, Math.round(s.fun));
    setBar('research', Math.min(1, s.research / 100), Math.round(s.research));
    document.getElementById('hud-day').textContent =
      'Day ' + s.day + ' / ' + G.TOTAL_DAYS + ' \u00B7 ' + (s.day <= 20 ? 'Sem 1' : 'Sem 2');
    document.getElementById('hud-clock').textContent = G.fmtTime(s.time);
    // current objective line
    let obj = '';
    if (s.pendingBoss && !s.bossFoughtToday) obj = '\u2694 ' + G.BOSSES[s.pendingBoss].name + ' \u2014 go to LHC!';
    else if (isRdvLive()) obj = '\uD83C\uDF89 RDV is LIVE at the OAT!';
    else {
      for (const q of G.MAIN_QUESTS) { if (!s.main[q.id]) { obj = '\u25B8 ' + q.desc; break; } }
    }
    document.getElementById('hud-objective').textContent = obj;
  }
  function setBar(id, frac, txt) {
    const fill = document.querySelector('#stat-' + id + ' .stat-fill');
    const val = document.querySelector('#stat-' + id + ' .stat-val');
    if (!fill) return;
    fill.style.width = Math.max(0, Math.min(100, frac * 100)) + '%';
    val.textContent = txt;
    fill.classList.toggle('low', frac < 0.25);
  }
})();
