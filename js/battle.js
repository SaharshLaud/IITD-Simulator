/* ============================================================
   IIT DELHI SIMULATOR — battle.js
   Turn-based exam boss battles. Renders into the #battle DOM
   overlay with animated HP bars, shake, flashes, damage text.
   ============================================================ */
(function () {
  const B = G.Battle = { active: false };
  let el = {};

  function $(id) { return document.getElementById(id); }

  B.bind = function () {
    el = {
      root: $('battle'), name: $('b-boss-name'), taunt: $('b-taunt'),
      bossHp: $('b-boss-hp'), bossHpTxt: $('b-boss-hp-txt'),
      pHp: $('b-player-hp'), pHpTxt: $('b-player-hp-txt'),
      log: $('b-log'), moves: $('b-moves'), boss: $('b-boss-sprite'),
      player: $('b-player-sprite'), arena: $('b-arena'),
    };
  };

  B.start = function (bossId, onEnd) {
    const def = G.BOSSES[bossId];
    const s = G.state;
    B.active = true;
    B.def = def; B.id = bossId; B.onEnd = onEnd;
    B.bossHp = def.hp; B.bossMax = def.hp;
    B.pMax = Math.round(55 + s.energy * 0.35 + s.health * 0.25);
    B.pHp = B.pMax;
    B.weak = 0;          // turns of reduced player damage
    B.turn = 'player';
    B.over = false;
    el.root.classList.remove('hidden');
    el.root.style.setProperty('--boss-color', def.color);
    el.name.textContent = def.name;
    el.boss.textContent = bossSprite(bossId);
    log('', true);
    log(def.intro);
    log('Your composure: built from today\u2019s Energy & Health. Fight smart!');
    renderBars();
    renderMoves();
    G.Audio.startBattle();
  };

  function bossSprite(id) {
    return { quiz: '\uD83D\uDCDD', assignment: '\u23F0', midsem: '\uD83D\uDCDA', endsem1: '\uD83D\uDC79', endsem2: '\uD83D\uDC80' }[id] || '\uD83D\uDCDD';
  }

  function log(msg, clear) {
    if (clear) el.log.innerHTML = '';
    if (!msg) return;
    const d = document.createElement('div');
    d.textContent = msg;
    el.log.appendChild(d);
    el.log.scrollTop = el.log.scrollHeight;
    while (el.log.children.length > 7) el.log.removeChild(el.log.firstChild);
  }

  function renderBars() {
    el.bossHp.style.width = Math.max(0, B.bossHp / B.bossMax * 100) + '%';
    el.bossHpTxt.textContent = `${Math.max(0, Math.ceil(B.bossHp))} / ${B.bossMax}`;
    el.pHp.style.width = Math.max(0, B.pHp / B.pMax * 100) + '%';
    el.pHpTxt.textContent = `${Math.max(0, Math.ceil(B.pHp))} / ${B.pMax}`;
  }

  function dmgText(target, amount, kind) {
    const node = document.createElement('div');
    node.className = 'dmg-float ' + (kind || '');
    node.textContent = (kind === 'heal' ? '+' : '\u2212') + Math.round(amount);
    const host = target === 'boss' ? el.boss : el.player;
    const r = host.getBoundingClientRect(), a = el.arena.getBoundingClientRect();
    node.style.left = (r.left - a.left + r.width / 2 + G.rand(-20, 20)) + 'px';
    node.style.top = (r.top - a.top + G.rand(-10, 10)) + 'px';
    el.arena.appendChild(node);
    setTimeout(() => node.remove(), 900);
  }
  function shake(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
  function flash() { el.root.classList.remove('flash'); void el.root.offsetWidth; el.root.classList.add('flash'); }

  /* ---------------- player moves ---------------- */
  const MOVES = [
    {
      id: 'answer', n: 'Focused Answer', sub: 'Reliable damage. Scales with CGPA & Research.',
      use() {
        const s = G.state;
        let d = 9 + s.cgpa * 2.1 + s.research * 0.08 + G.rand(-2, 3);
        if (B.weak > 0) { d *= 0.65; B.weak--; }
        hitBoss(d, 'You answer with terrifying precision!');
      },
    },
    {
      id: 'cram', n: 'All-Nighter Cram', sub: 'Huge damage, but costs your composure (\u221212).',
      use() {
        const s = G.state;
        let d = (12 + s.cgpa * 2.6 + G.rand(0, 6)) * 1.6;
        if (B.weak > 0) { d *= 0.65; B.weak--; }
        B.pHp -= 12;
        dmgText('player', 12);
        hitBoss(d, 'You unleash everything you crammed at 3 AM!');
      },
    },
    {
      id: 'chai', n: 'Chai Break', sub: 'Restore 20 composure. Tiny damage (chai is power).',
      use() {
        B.pHp = Math.min(B.pMax, B.pHp + 20);
        dmgText('player', 20, 'heal');
        G.Audio.sfx.heal();
        hitBoss(4 + G.rand(0, 3), 'One sip of cutting chai. Clarity returns.');
      },
    },
    {
      id: 'guess', n: 'Strategic Guess', sub: '55%: massive hit. 45%: total whiff.',
      use() {
        if (Math.random() < 0.55) {
          const s = G.state;
          hitBoss((10 + s.cgpa * 2.2) * 2.4 + G.rand(0, 8), 'INSPIRED GUESS! Option (c) was correct!!');
        } else {
          log('You guess... it was "None of the above". Whiff!');
          G.Audio.sfx.cancel();
          setTimeout(bossTurn, 700);
        }
      },
    },
  ];

  function renderMoves() {
    el.moves.innerHTML = '';
    MOVES.forEach((m, i) => {
      const b = document.createElement('button');
      b.className = 'move-btn';
      b.innerHTML = `<span class="mv-key">${i + 1}</span><span class="mv-name">${m.n}</span><span class="mv-sub">${m.sub}</span>`;
      b.onclick = () => B.playerMove(i);
      el.moves.appendChild(b);
    });
  }

  B.playerMove = function (i) {
    if (!B.active || B.over || B.turn !== 'player') return;
    B.turn = 'boss';
    setMovesEnabled(false);
    MOVES[i].use();
  };
  function setMovesEnabled(on) {
    for (const b of el.moves.children) b.disabled = !on;
  }

  function hitBoss(dmg, msg) {
    dmg = Math.round(dmg);
    B.bossHp -= dmg;
    log(msg + ` (${dmg} dmg)`);
    dmgText('boss', dmg);
    shake(el.boss);
    G.Audio.sfx.hit();
    renderBars();
    if (B.bossHp <= 0) return setTimeout(() => end(true), 800);
    setTimeout(bossTurn, 850);
  }

  function bossTurn() {
    if (B.over) return;
    const mv = G.pick(B.def.moves);
    let d = G.irand(mv.lo, mv.hi);
    if (mv.t === 'big' && Math.random() < 0.5) { // big attacks sometimes telegraphed & missable
      d = Math.round(d * 1.2);
    }
    log(`${B.def.name} uses ${mv.n}!`);
    if (Math.random() < 0.18) log(G.pick(B.def.taunts));
    setTimeout(() => {
      B.pHp -= d;
      dmgText('player', d);
      shake(el.player); flash();
      G.Audio.sfx.playerHit();
      if (mv.t === 'weaken') { B.weak = 2; log('Your concentration wavers... (damage reduced for 2 turns)'); }
      renderBars();
      if (B.pHp <= 0) return setTimeout(() => end(false), 800);
      B.turn = 'player';
      setMovesEnabled(true);
    }, 600);
  }

  function end(won) {
    B.over = true;
    if (won) {
      log(`${B.def.name} dissolves into a pile of graded answer sheets!`);
      G.Audio.sfx.win();
      el.boss.classList.add('boss-die');
    } else {
      log('Your composure shatters. The exam... claims you.');
      G.Audio.sfx.lose();
    }
    setTimeout(() => {
      el.root.classList.add('hidden');
      el.boss.classList.remove('boss-die');
      B.active = false;
      G.Audio.stopBattle();
      B.onEnd(won);
    }, 1700);
  }
})();
