/* ============================================================
   IIT DELHI SIMULATOR — audio.js
   HTML5 Audio Engine designed to bypass file:/// CORS restrictions.
   Supports crossfading, SFX, and global mute.
   ============================================================ */
(function () {
  const A = {
    muted: false, ready: false, zone: null,
    bgms: {}, activeBgm: null, battleBgm: null,
  };
  G.Audio = A;

  const ASSETS = {
    campus: 'audio/campus.ogg',
    lhc: 'audio/classroom.ogg',
    rajdhani: 'audio/cafe.ogg',
    hostel: 'audio/kenney_music_loops/Cheerful Annoyance.ogg',
    mittal: 'audio/kenney_music_loops/Time Driving.ogg',
    rdv: 'audio/kenney_music_loops/Alpha Dance.ogg',
    battle: 'audio/battle.mp3',
    intro: 'audio/kenney_music_loops/Night at the Beach.ogg',
    victory: 'audio/victory.mp3',
    defeat: 'audio/kenney_music_loops/Game Over.ogg',
    quest: 'audio/quest.ogg',
    click: 'audio/kenney_ui_audio/click1.wav',
    cancel: 'audio/kenney_ui_audio/switch10.wav',
    step: 'audio/kenney_rpg_audio/footstep00.ogg',
    hit: 'audio/kenney_rpg_audio/knifeSlice.ogg',
    playerHit: 'audio/kenney_rpg_audio/cloth1.ogg',
    heal: 'audio/kenney_ui_audio/rollover1.wav',
    eat: 'audio/kenney_rpg_audio/metalPot1.ogg',
    sleep: 'audio/kenney_rpg_audio/doorClose_1.ogg',
    cheer: 'audio/kenney_rpg_audio/bookClose.ogg'
  };

  A.init = function () {
    if (A.ready) return;
    A.ready = true;

    // Pre-create persistent audio tags for looping BGMs
    ['campus', 'lhc', 'rajdhani', 'hostel', 'mittal', 'rdv', 'battle', 'intro'].forEach(k => {
      const a = new Audio(ASSETS[k]);
      a.loop = true;
      A.bgms[k] = a;
    });

    // Start background music if zone was set before initialization
    if (A.zone) A.setZone(A.zone, true);
  };

  A.playIntro = function () {
    if (!A.ready) A.init();
    if (!A.activeBgm) {
      A.activeBgm = fadeIn('intro', 1500, 0.6);
    }
  };

  A.toggleMute = function () {
    A.muted = !A.muted;
    if (A.activeBgm) A.activeBgm.audio.muted = A.muted;
    if (A.battleBgm) A.battleBgm.audio.muted = A.muted;
    return A.muted;
  };

  // Create a new Audio object for every SFX to allow overlapping sounds (e.g. rapid footsteps)
  function playSfx(key, vol = 1.0) {
    if (!A.ready || A.muted) return;
    const a = new Audio(ASSETS[key]);
    a.volume = vol * 0.8; // SFX bus attenuation
    a.play().catch(e => { /* Ignore autoplay/spam rejections */ });
  }

  A.sfx = {
    step: () => playSfx('step', 0.2),
    blip: () => playSfx('click', 0.5),
    confirm: () => playSfx('click', 0.7),
    cancel: () => playSfx('cancel', 0.6),
    quest: () => playSfx('quest', 0.8),
    hit: () => playSfx('hit', 0.8),
    playerHit: () => playSfx('playerHit', 0.8),
    heal: () => playSfx('heal', 0.6),
    win: () => playSfx('victory', 0.8),
    lose: () => playSfx('defeat', 0.8),
    sleep: () => playSfx('sleep', 0.6),
    eat: () => playSfx('eat', 0.6),
    cheer: () => playSfx('cheer', 0.6),
  };

  /* ---------- HTML5 Audio Crossfading ---------- */
  function fadeOut(bgmObj, duration = 1500) {
    if (!bgmObj || !bgmObj.audio) return;
    const a = bgmObj.audio;
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = a.volume / steps;
    
    // Clear any existing fades to prevent jitter
    if (a.fadeInterval) clearInterval(a.fadeInterval);
    
    a.fadeInterval = setInterval(() => {
      if (a.volume - volStep > 0) {
        a.volume -= volStep;
      } else {
        a.volume = 0;
        a.pause();
        clearInterval(a.fadeInterval);
      }
    }, stepTime);
  }

  function fadeIn(key, duration = 1500, targetVol = 0.5) {
    if (!A.ready || !A.bgms[key]) return null;
    const a = A.bgms[key];
    a.muted = A.muted;
    a.volume = 0;
    
    // Clear any existing fades
    if (a.fadeInterval) clearInterval(a.fadeInterval);
    
    a.play().catch(e => {});
    
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = targetVol / steps;
    
    a.fadeInterval = setInterval(() => {
      if (a.volume + volStep < targetVol) {
        a.volume += volStep;
      } else {
        a.volume = targetVol;
        clearInterval(a.fadeInterval);
      }
    }, stepTime);
    
    return { audio: a, key };
  }

  A.setZone = function (zone, force) {
    const zoneMap = {
      campus: 'campus', main: 'campus', oat: 'campus',
      lhc: 'lhc', hostel: 'hostel', rajdhani: 'rajdhani',
      mittal: 'mittal', rdv: 'rdv', intro: 'intro'
    };
    
    const trackKey = zoneMap[zone] || 'campus';
    A.zone = zone;
    
    if (!A.ready || A.battleBgm) return;
    if (!force && A.activeBgm && A.activeBgm.key === trackKey) return;
    
    if (A.activeBgm) fadeOut(A.activeBgm, 1500);
    A.activeBgm = fadeIn(trackKey, 1500, 0.5);
  };

  A.startBattle = function () {
    if (!A.ready || A.battleBgm) return;
    if (A.activeBgm) fadeOut(A.activeBgm, 500);
    A.battleBgm = fadeIn('battle', 500, 0.5);
  };

  A.stopBattle = function () {
    if (!A.battleBgm) return;
    fadeOut(A.battleBgm, 1000);
    A.battleBgm = null;
    
    const zoneMap = { campus: 'campus', main: 'campus', oat: 'campus', lhc: 'lhc', hostel: 'hostel', rajdhani: 'rajdhani', mittal: 'mittal', rdv: 'rdv' };
    A.activeBgm = fadeIn(zoneMap[A.zone] || 'campus', 2000, 0.5);
  };
})();
