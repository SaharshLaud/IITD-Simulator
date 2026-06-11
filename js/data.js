/* ============================================================
   IIT DELHI SIMULATOR — data.js
   Global namespace, configuration, bosses, quests, dialogue,
   achievements. Loaded first.
   ============================================================ */
window.G = {
  TILE: 32,
  MAP_W: 84,
  MAP_H: 56,
  TIME_RATE: 10,            // game-minutes per real second while walking
  DAY_START: 6 * 60,        // 06:00
  DAY_END: 24 * 60,         // midnight collapse
  TOTAL_DAYS: 40,           // 2 semesters x 20 days
  SEM2_START: 21,
  BOSS_DAYS: { 5: 'quiz', 10: 'assignment', 14: 'midsem', 20: 'endsem1', 40: 'endsem2' },
  RDV_DAYS: [30, 31, 32],
  RDV_HOUR: 17,             // festival begins 5pm
};

/* ---------------- Bosses ---------------- */
G.BOSSES = {
  quiz: {
    name: 'THE SURPRISE QUIZ', hp: 60, dmg: [6, 11], color: '#ffd34d',
    intro: 'A crumpled question paper rises from the desk... it has NEGATIVE MARKING.',
    taunts: ['"Attempt all questions. Time: 10 minutes."', '"This was covered in the lecture you skipped."', '"Q3 is out of syllabus. Or is it?"'],
    moves: [
      { n: 'Tricky MCQ', t: 'dmg', lo: 6, hi: 11 },
      { n: 'Negative Marking', t: 'big', lo: 10, hi: 15 },
      { n: 'Time Pressure', t: 'weaken', lo: 4, hi: 8 },
    ],
    winCgpa: 0.45, winRp: 4, loseCgpa: 0.35,
  },
  assignment: {
    name: 'ASSIGNMENT DEADLINE', hp: 85, dmg: [8, 13], color: '#ff8f4d',
    intro: 'Moodle glows red. "Submission closes 23:59:59." The Deadline materialises.',
    taunts: ['"Plagiarism check: 97% similar to hope."', '"The server will crash at 23:58."', '"Did you read the updated problem statement?"'],
    moves: [
      { n: 'Scope Creep', t: 'dmg', lo: 8, hi: 13 },
      { n: 'Server Crash', t: 'big', lo: 12, hi: 17 },
      { n: 'Format Penalty', t: 'weaken', lo: 5, hi: 9 },
    ],
    winCgpa: 0.5, winRp: 6, loseCgpa: 0.4,
  },
  midsem: {
    name: 'MIDSEM MONSTER', hp: 120, dmg: [9, 15], color: '#ff5d7a',
    intro: 'The Lecture Hall doors slam shut. The MIDSEM MONSTER unfolds across three answer booklets.',
    taunts: ['"Section C is compulsory."', '"State all assumptions. Wrong assumptions: -5."', '"Your friend\'s paper looks easier. It is not."'],
    moves: [
      { n: 'Derivation Demand', t: 'dmg', lo: 9, hi: 15 },
      { n: 'Out-of-Syllabus Strike', t: 'big', lo: 14, hi: 20 },
      { n: 'Sleep Debt Drain', t: 'weaken', lo: 6, hi: 10 },
    ],
    winCgpa: 0.6, winRp: 8, loseCgpa: 0.5,
  },
  endsem1: {
    name: 'ENDSEM TITAN — SEM I', hp: 150, dmg: [11, 17], color: '#b06bff',
    intro: 'Winter fog rolls in. The ENDSEM TITAN towers over LHC, wearing your full syllabus as armour.',
    taunts: ['"Everything is in syllabus. Everything."', '"The invigilator is watching YOU."', '"Three hours. Five questions. One destiny."'],
    moves: [
      { n: 'Full Syllabus Slam', t: 'dmg', lo: 11, hi: 17 },
      { n: 'Compulsory Question', t: 'big', lo: 16, hi: 22 },
      { n: 'Exam Hall AC Blast', t: 'weaken', lo: 7, hi: 11 },
    ],
    winCgpa: 0.7, winRp: 10, loseCgpa: 0.6,
  },
  endsem2: {
    name: 'FINAL BOSS — ENDSEM TITAN II', hp: 190, dmg: [12, 19], color: '#5dd8ff',
    intro: 'The year ends here. The FINAL ENDSEM rises, fused from every quiz, deadline and 8 AM class you survived.',
    taunts: ['"After this... the report card."', '"Remember the first lecture? It is question 1."', '"Your CGPA hangs in the balance."'],
    moves: [
      { n: 'Year-Long Recall', t: 'dmg', lo: 12, hi: 19 },
      { n: 'Grade Annihilator', t: 'big', lo: 17, hi: 24 },
      { n: 'Burnout Beam', t: 'weaken', lo: 8, hi: 12 },
    ],
    winCgpa: 0.8, winRp: 12, loseCgpa: 0.7,
  },
};

/* ---------------- Main quest chain ----------------
   Resolved/advanced from main.js as events happen.    */
G.MAIN_QUESTS = [
  { id: 'firstLecture', name: 'First Day at IIT Delhi', desc: 'Attend your first lecture at LHC.' },
  { id: 'meetProf', name: 'Office Hours', desc: 'Meet a professor at the Main Building.' },
  { id: 'quiz', name: 'Boss: Surprise Quiz', desc: 'Day 5 — face the Surprise Quiz at LHC.' },
  { id: 'assignment', name: 'Boss: Assignment Deadline', desc: 'Day 10 — defeat the Deadline at LHC.' },
  { id: 'midsem', name: 'Boss: Midsems', desc: 'Day 14 — survive the Midsem Monster at LHC.' },
  { id: 'endsem1', name: 'Boss: Endsems I', desc: 'Day 20 — defeat the Endsem Titan at LHC.' },
  { id: 'research', name: 'Research Semester', desc: 'Sem 2 — work on research at the Main Building (reach 30 RP).' },
  { id: 'rdv', name: 'Rendezvous!', desc: 'Days 30–32 — join the RDV festival at OAT after 5 PM.' },
  { id: 'endsem2', name: 'Final Boss: Endsems II', desc: 'Day 40 — the final battle at LHC.' },
];

/* ---------------- Side quests ---------------- */
G.SIDE_QUESTS = {
  deliverNotes: {
    name: 'Courier of Knowledge', giver: 'Aman',
    desc: "Deliver Aman's notes to Priya at LHC.",
    done: 'Priya got her notes. Friendship +1!',
    reward: { fun: 12 },
  },
  lostId: {
    name: 'The Lost ID Card', giver: 'Rohit',
    desc: 'Find Rohit\'s ID card somewhere near the OAT, then return it to him.',
    done: 'Rohit can finally enter the library again.',
    reward: { fun: 10, research: 3 },
  },
  attend5: {
    name: 'Front Bench Material', giver: 'Prof. Sharma',
    desc: 'Attend 5 lectures at LHC. (Progress shown in quest log.)',
    done: 'Prof. Sharma nods approvingly. "Good attendance, beta."',
    reward: { cgpa: 0.3 },
    counter: 'lectures', target: 5,
  },
  research20: {
    name: 'Lab Apprentice', giver: 'Kabir',
    desc: 'Earn 20 Research Points working at the Main Building.',
    done: 'Kabir adds your name to the paper. Fourth author, but still.',
    reward: { research: 10, cgpa: 0.2 },
    counter: 'rpEarned', target: 20,
  },
  fitness3: {
    name: 'Mittal Challenge', giver: 'Coach Negi',
    desc: 'Complete 3 workouts at Mittal Sports Complex.',
    done: '"Now THAT is institute material!" Coach Negi beams.',
    reward: { health: 15, fun: 5 },
    counter: 'workouts', target: 3,
  },
  chaiTime: {
    name: 'Evening Chai Club', giver: 'Sneha',
    desc: 'Meet Sneha at Rajdhani in the evening (after 5 PM) for chai.',
    done: 'Two cutting chais and one hour of gossip. Perfect.',
    reward: { fun: 15, energy: 8 },
  },
};

/* ---------------- NPC dialogue pools ---------------- */
G.DIALOGUE = {
  Aman: [
    'Bro, the mess food today was a war crime. Rajdhani tonight?',
    'I slept through two alarms and one fire drill.',
    'CGPA is temporary. Maggi at 2 AM is forever.',
  ],
  Priya: [
    'The prof finished 3 chapters in one lecture. THREE.',
    'I color-code my notes. It changes nothing, but it feels powerful.',
    'LHC AC is set to "Siberia" again.',
  ],
  Rohit: [
    'I lose my ID card roughly once per semester. It keeps life exciting.',
    'OAT at sunset is the best spot on campus. Trust me.',
    'I came here to study engineering. I mostly study people at Rajdhani.',
  ],
  Sneha: [
    'Chai after 5 PM is not a habit, it is a lifestyle.',
    'The Rajdhani paneer roll has carried me through two midsems.',
    'Evening walks from hostel to Rajdhani count as cardio. I checked.',
  ],
  Vikram: [
    'Mittal courts at 6 AM. That is where legends are made.',
    'Insti football trials soon. You should come!',
    'Sound body, sound mind, sound CGPA. Mostly the first two.',
  ],
  Ananya: [
    'The Main Building looks unreal at golden hour.',
    'I have lived here a year and I still get lost near Block 99.',
    'RDV is coming. Clear your schedule. Clear your soul.',
  ],
  Ishaan: [
    'My sleep schedule is less a schedule, more a suggestion.',
    'Hostel wing tournament tonight. Winner gets bragging rights forever.',
    'I optimized my walk to LHC to exactly 7 minutes. Engineering.',
  ],
  Meera: [
    'The campus peacocks own this place. We are guests.',
    'Try studying under the trees near the Main Building. 10/10.',
    'Every IITian has one Rajdhani story. You will get yours.',
  ],
  'Prof. Sharma': [
    'Attendance is not just a number. Well, it is 75%, but still.',
    'Come to office hours. Nobody comes to office hours. It is lonely.',
    'Research is 1% inspiration, 99% debugging the setup.',
  ],
  'Prof. Iyer': [
    'A good question is worth more than a correct answer.',
    'My door is open. Metaphorically. Knock first.',
    'The endsem will be... comprehensive.',
  ],
  Kabir: [
    'PhD life: coffee in, papers out. Mostly coffee in.',
    'Want research points? The lab always needs hands.',
    'I have been "6 months from graduating" for 3 years.',
  ],
  'Coach Negi': [
    'Hostel to LHC is not exercise. Come to Mittal!',
    'Push-ups before deadlines. Builds character AND deltoids.',
    'Champions are made when nobody is watching. Usually at 6 AM.',
  ],
  Ramu: [
    'Special chai for exam season — extra adrak, extra hope.',
    'I have served chai to three generations of toppers.',
    'Beta, eat properly. CGPA cannot hug you when you are hungry.',
  ],
  Bahadur: [
    'Campus is peaceful at night. Except during RDV. Then it is... not.',
    'ID card, please. Just joking. Or am I?',
    'I have seen 20 batches come and go. You all walk the same way before exams.',
  ],
};

/* ---------------- Achievements ---------------- */
G.ACHIEVEMENTS = [
  { id: 'frontBench', name: 'Front Bencher', desc: 'Attended 10+ lectures', check: c => c.lectures >= 10 },
  { id: 'gymRat', name: 'Gym Rat', desc: 'Completed 8+ workouts at Mittal', check: c => c.workouts >= 8 },
  { id: 'rajdhaniRegular', name: 'Rajdhani Regular', desc: 'Ate 12+ meals at Rajdhani', check: c => c.meals >= 12 },
  { id: 'researchRockstar', name: 'Research Rockstar', desc: 'Earned 60+ Research Points', check: (c, s) => s.research >= 60 },
  { id: 'socialButterfly', name: 'Social Butterfly', desc: 'Completed 4+ side quests', check: c => c.sideQuestsDone >= 4 },
  { id: 'festivalSoul', name: 'Festival Soul', desc: 'Attended all 3 nights of RDV', check: c => c.rdvNights >= 3 },
  { id: 'bossSlayer', name: 'Boss Slayer', desc: 'Defeated all 5 exam bosses', check: c => c.bossesWon >= 5 },
  { id: 'nightOwl', name: 'Night Owl', desc: 'Collapsed at midnight 3+ times', check: c => c.allNighters >= 3 },
  { id: 'balanced', name: 'Perfectly Balanced', desc: 'Ended the year with Health, Energy and Fun all above 60', check: (c, s) => s.health > 60 && s.energy > 60 && s.fun > 60 },
  { id: 'ninePointer', name: 'Nine Pointer', desc: 'Finished with CGPA ≥ 9.0', check: (c, s) => s.cgpa >= 9 },
  { id: 'survivor', name: 'Survivor', desc: 'Completed the academic year', check: () => true },
];

/* ---------------- Small helpers ---------------- */
G.rand = (lo, hi) => lo + Math.random() * (hi - lo);
G.irand = (lo, hi) => Math.floor(G.rand(lo, hi + 1));
G.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
G.pick = arr => arr[Math.floor(Math.random() * arr.length)];
G.fmtTime = m => {
  const h = Math.floor(m / 60), mm = Math.floor(m % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
};
