/* ==========================================================================
   プロベースボール・スピリッツ：約分スラッガー 1000問ロード (main.js)
   1000問Sランク育成・エンドレス形式・アカウント管理（呼出＆上書き固定）
   約分しきった分数の確実表示・連打完全防止
   ========================================================================== */

function calcGcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// 教科書P.117例題・練習問題＋発展問題データプール（必ず2〜20で約分可能）
const PROBLEM_POOL = [
  { num: 15, den: 20 }, // 15/20 = 3/4 (÷5)
  { num: 18, den: 24 }, // 18/24 = 3/4 (÷6, または ÷2➔9/12➔÷3)
  { num: 2,  den: 6  }, // 2/6 = 1/3 (÷2)
  { num: 8,  den: 10 }, // 8/10 = 4/5 (÷2)
  { num: 16, den: 20 }, // 16/20 = 4/5 (÷4, または ÷2➔8/10➔÷2)
  { num: 9,  den: 27 }, // 9/27 = 1/3 (÷9, または ÷3➔3/9➔÷3)
  { num: 24, den: 36 }, // 24/36 = 2/3 (÷12, または ÷6, ÷4, ÷3, ÷2)
  { num: 40, den: 60 }, // 40/60 = 2/3 (÷20, または ÷10, ÷5, ÷4, ÷2)
  { num: 4,  den: 8  }, // 1/2
  { num: 6,  den: 8  }, // 3/4
  { num: 6,  den: 9  }, // 2/3
  { num: 10, den: 12 }, // 5/6
  { num: 12, den: 15 }, // 4/5
  { num: 10, den: 20 }, // 1/2
  { num: 14, den: 21 }, // 2/3
  { num: 15, den: 25 }, // 3/5
  { num: 12, den: 18 }, // 2/3
  { num: 20, den: 25 }, // 4/5
  { num: 21, den: 28 }, // 3/4
  { num: 18, den: 30 }, // 3/5
  { num: 25, den: 30 }, // 5/6
  { num: 30, den: 45 }, // 2/3
  { num: 28, den: 42 }, // 2/3
  { num: 32, den: 48 }, // 2/3
  { num: 36, den: 48 }, // 3/4
  { num: 45, den: 60 }, // 3/4
  { num: 25, den: 100 },// 1/4
  { num: 50, den: 100 } // 1/2
];

// ストレージキー
const STORAGE_CURRENT_PLAYER = 'yakubun_active_player';
const STORAGE_PREFIX = 'yakubun_data_';

// ゲームステート
const state = {
  screen: 'title',
  playerName: '',
  sessionToken: '',
  playing: false,
  isLocked: false,

  // 通算・育成パラメータ（1000問ロード）
  totalSolved: 0,      // 通算正解問数
  sessionGain: 0,      // 今回のセッションで解いた問数
  totalHomeruns: 0,    // 通算ホームラン
  totalHits: 0,        // 通算安打
  totalStrikeouts: 0,  // 通算三振
  consecutiveHits: 0,
  abilities: new Set(['期待の新人']),

  // 打席状況
  strikes: 0, // 0〜3
  bases: [false, false, false],

  // 現在の問題
  currentProblem: null,
  currentNum: 0,
  currentDen: 0,
  stepCount: 0,
  problemIndex: 0,
  problemQueue: []
};

// DOMキャッシュ
const dom = {
  screens: {
    title: document.getElementById('screen-title'),
    howto: document.getElementById('screen-howto'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
    ranking: document.getElementById('screen-ranking')
  },
  feverOverlay: document.getElementById('fever-overlay'),
  homerunCutin: document.getElementById('homerun-cutin'),
  cutinTitle: document.getElementById('cutin-title'),
  cutinStatUp: document.getElementById('cutin-stat-up'),
  confettiCanvas: document.getElementById('confetti-canvas'),

  // タイトル
  resumeBox: document.getElementById('resume-box'),
  resumeName: document.getElementById('resume-name'),
  resumeRank: document.getElementById('resume-rank'),
  resumeSolvedCount: document.getElementById('resume-solved-count'),
  btnResumeStart: document.getElementById('btn-resume-start'),
  playerNameInput: document.getElementById('player-name'),
  btnNewStart: document.getElementById('btn-new-start'),
  btnTitleRanking: document.getElementById('btn-title-ranking'),
  btnHowto: document.getElementById('btn-how-to'),
  btnHowtoClose: document.getElementById('btn-howto-close'),
  btnMute: document.getElementById('btn-mute'),

  // ゲーム画面HUD
  hudPlayerName: document.getElementById('hud-player-name'),
  hudProudSkill: document.getElementById('hud-proud-skill'),
  hudPlayerRank: document.getElementById('hud-player-rank'),
  hudRankNext: document.getElementById('hud-rank-next'),
  hudTotalSolved: document.getElementById('hud-total-solved'),
  hudSessionGain: document.getElementById('hud-session-gain'),
  strikeDots: [
    document.getElementById('strike-1'),
    document.getElementById('strike-2')
  ],
  bases: [
    document.getElementById('base-1'),
    document.getElementById('base-2'),
    document.getElementById('base-3')
  ],
  hudTrajectory: document.getElementById('hud-trajectory'),
  hudMeet: document.getElementById('hud-meet'),
  hudPower: document.getElementById('hud-power'),
  hudHr: document.getElementById('hud-hr'),
  btnSaveRest: document.getElementById('btn-save-rest'),
  announcerText: document.getElementById('announcer-text'),

  // 打席ノート
  pitchSpeed: document.getElementById('pitch-speed'),
  yakubunBadge: document.getElementById('yakubun-badge'),
  fractionNotebook: document.getElementById('fraction-notebook'),
  displayNum: document.getElementById('display-num'),
  displayDen: document.getElementById('display-den'),
  stepHistory: document.getElementById('step-history'),
  stepHintBox: document.getElementById('step-hint-box'),
  stepHintText: document.getElementById('step-hint-text'),
  divisorGrid: document.getElementById('divisor-grid'),

  // リザルト画面
  resPlayerName: document.getElementById('res-player-name'),
  resProudSkill: document.getElementById('res-proud-skill'),
  resFinalRank: document.getElementById('res-final-rank'),
  resSessionGain: document.getElementById('res-session-gain'),
  resTotalSolved: document.getElementById('res-total-solved'),
  resNextRemain: document.getElementById('res-next-remain'),
  resTrajectory: document.getElementById('res-trajectory'),
  resTrajectoryName: document.getElementById('res-trajectory-name'),
  resMeetGrade: document.getElementById('res-meet-grade'),
  resMeetNum: document.getElementById('res-meet-num'),
  resPowerGrade: document.getElementById('res-power-grade'),
  resPowerNum: document.getElementById('res-power-num'),
  resHrCount: document.getElementById('res-hr-count'),
  resHitCount: document.getElementById('res-hit-count'),
  resSoCount: document.getElementById('res-so-count'),
  resSpecialSkills: document.getElementById('res-special-skills'),
  registerStatus: document.getElementById('register-status'),
  registerMsg: document.getElementById('register-msg'),
  btnContinue: document.getElementById('btn-continue'),
  btnResultRanking: document.getElementById('btn-result-ranking'),
  btnBackTitle: document.getElementById('btn-back-title'),

  // ランキング画面
  btnRankingClose: document.getElementById('btn-ranking-close'),
  rankingTbody: document.getElementById('ranking-tbody'),
  rankingLoading: document.getElementById('ranking-loading'),
  rankingOfflineAlert: document.getElementById('ranking-offline-alert'),
  myRankCard: document.getElementById('my-rank-card'),
  myRankBadge: document.getElementById('my-rank-badge'),
  myRankName: document.getElementById('my-rank-name'),
  myRankGrade: document.getElementById('my-rank-grade'),
  myRankScore: document.getElementById('my-rank-score'),
  myRankSkill: document.getElementById('my-rank-skill'),
  myRankStats: document.getElementById('my-rank-stats')
};

// ==========================================================================
// 永遠のランク＆スキル進化・限界突破ロジック（1000問上限完全撤廃）
// ==========================================================================
const SKILL_PROGRESSION = [
  { threshold: 10000, name: '宇宙創世スラッガー' },
  { threshold: 7000,  name: '天衣無縫の極意' },
  { threshold: 5000,  name: '約分の神' },
  { threshold: 4000,  name: '銀河系ホームラン王' },
  { threshold: 3000,  name: '殿堂入りレジェンド' },
  { threshold: 2500,  name: '超次元の打棒' },
  { threshold: 2000,  name: '球聖スラッガー' },
  { threshold: 1800,  name: '威圧感・極' },
  { threshold: 1500,  name: '約分マスター' },
  { threshold: 1200,  name: '神速スイング' },
  { threshold: 1000,  name: '伝説の名球会' },
  { threshold: 850,   name: '怪物スラッガー' },
  { threshold: 700,   name: '超アーチスト' },
  { threshold: 500,   name: '三冠王スラッガー' },
  { threshold: 400,   name: '安打製造機' },
  { threshold: 300,   name: '高弾道スラッガー' },
  { threshold: 200,   name: '満塁男' },
  { threshold: 150,   name: 'チャンスメーカー' },
  { threshold: 100,   name: '広角打法' },
  { threshold: 50,    name: 'アベレージヒッター' },
  { threshold: 30,    name: '粘り打ち' },
  { threshold: 10,    name: '選球眼' },
  { threshold: 0,     name: '期待の新人' }
];

function getSkillsForSolved(solved) {
  const skills = new Set();
  for (const s of SKILL_PROGRESSION) {
    if (solved >= s.threshold) {
      skills.add(s.name);
    }
  }
  if (solved >= 10000) {
    const lv = Math.floor((solved - 10000) / 1000) + 1;
    skills.add(`神話の超越者 Lv.${lv}`);
  }
  return skills;
}

function getPrimarySkill(solved) {
  if (solved >= 10000) {
    const lv = Math.floor((solved - 10000) / 1000) + 1;
    return `神話の超越者 Lv.${lv}`;
  }
  for (const s of SKILL_PROGRESSION) {
    if (solved >= s.threshold) {
      return s.name;
    }
  }
  return '期待の新人';
}

function calcOverallRank(solved) {
  if (solved >= 10000) {
    const lv = Math.floor((solved - 10000) / 1000) + 1;
    return `無双 Lv.${lv}`;
  }
  if (solved >= 5000) {
    const stars = Math.floor((solved - 5000) / 500);
    return stars === 0 ? '神' : `神★${stars}`;
  }
  if (solved >= 3000) {
    const stars = Math.floor((solved - 3000) / 250);
    return stars === 0 ? '殿堂' : `殿堂★${stars}`;
  }
  if (solved >= 2000) {
    const stars = Math.floor((solved - 2000) / 100);
    return stars === 0 ? 'SSS' : `SSS★${stars}`;
  }
  if (solved >= 1500) {
    const stars = Math.floor((solved - 1500) / 100);
    return stars === 0 ? 'SS' : `SS★${stars}`;
  }
  if (solved >= 1000) {
    const stars = Math.floor((solved - 1000) / 100);
    return stars === 0 ? 'S' : `S★${stars}`;
  }
  if (solved >= 500)  return 'A';
  if (solved >= 200)  return 'B';
  if (solved >= 50)   return 'C';
  return 'D';
}

function getRankClass(rankStr) {
  if (!rankStr) return 'rank-d';
  if (rankStr.startsWith('無双')) return 'rank-inf';
  if (rankStr.startsWith('神')) return 'rank-god';
  if (rankStr.startsWith('殿堂')) return 'rank-legend';
  if (rankStr.startsWith('SSS')) return 'rank-sss';
  if (rankStr.startsWith('SS')) return 'rank-ss';
  if (rankStr.startsWith('S')) return 'rank-s';
  if (rankStr.startsWith('A')) return 'rank-a';
  if (rankStr.startsWith('B')) return 'rank-b';
  if (rankStr.startsWith('C')) return 'rank-c';
  return 'rank-d';
}

function getNextRankHint(solved) {
  if (solved >= 10000) {
    const currentLv = Math.floor((solved - 10000) / 1000) + 1;
    const nextTarget = 10000 + currentLv * 1000;
    return `無双 Lv.${currentLv + 1} まで あと ${nextTarget - solved}問！`;
  }
  if (solved >= 5000) {
    const nextTarget = Math.floor(solved / 500) * 500 + 500;
    if (nextTarget === 10000) return `無双ランクまで あと ${10000 - solved}問！`;
    const stars = Math.floor((nextTarget - 5000) / 500);
    return `神★${stars} まで あと ${nextTarget - solved}問！`;
  }
  if (solved >= 3000) {
    const nextTarget = Math.floor(solved / 250) * 250 + 250;
    if (nextTarget === 5000) return `神ランクまで あと ${5000 - solved}問！`;
    const stars = Math.floor((nextTarget - 3000) / 250);
    return `殿堂★${stars} まで あと ${nextTarget - solved}問！`;
  }
  if (solved >= 2000) {
    const nextTarget = Math.floor(solved / 100) * 100 + 100;
    if (nextTarget === 3000) return `殿堂ランクまで あと ${3000 - solved}問！`;
    const stars = Math.floor((nextTarget - 2000) / 100);
    return `SSS★${stars} まで あと ${nextTarget - solved}問！`;
  }
  if (solved >= 1500) {
    const nextTarget = Math.floor(solved / 100) * 100 + 100;
    if (nextTarget === 2000) return `SSSランクまで あと ${2000 - solved}問！`;
    const stars = Math.floor((nextTarget - 1500) / 100);
    return `SS★${stars} まで あと ${nextTarget - solved}問！`;
  }
  if (solved >= 1000) {
    const nextTarget = Math.floor(solved / 100) * 100 + 100;
    if (nextTarget === 1500) return `SSランクまで あと ${1500 - solved}問！`;
    const stars = Math.floor((nextTarget - 1000) / 100);
    return `S★${stars} まで あと ${nextTarget - solved}問！`;
  }
  if (solved >= 500)  return `Sランクまで あと ${1000 - solved}問！`;
  if (solved >= 200)  return `Aランクまで あと ${500 - solved}問！`;
  if (solved >= 50)   return `Bランクまで あと ${200 - solved}問！`;
  return `Cランクまで あと ${50 - solved}問！`;
}

function calcTrajectory(solved) {
  if (solved >= 5000) return 7; // 銀河アーチスト
  if (solved >= 3000) return 6; // 神速弾道
  if (solved >= 1500) return 5; // 超アーチスト
  if (solved >= 700)  return 4; // アーチスト
  if (solved >= 300)  return 3; // 高弾道
  if (solved >= 100)  return 2; // 中弾道
  return 1;                     // グラウンダー
}

function getTrajectoryName(traj) {
  if (traj >= 7) return '銀河アーチスト';
  if (traj === 6) return '神速弾道';
  if (traj === 5) return '超アーチスト';
  if (traj === 4) return 'アーチスト';
  if (traj === 3) return '高弾道';
  if (traj === 2) return '中弾道';
  return 'グラウンダー';
}

function calcPower(hr) {
  // 700本のホームランで99到達、その後も青天井（限界突破）！
  return Math.floor(40 + (hr / 700) * 59);
}

function calcMeet(solved) {
  // 1000問正解で99到達、その後も青天井（限界突破）！
  return Math.floor(40 + (solved / 1000) * 59);
}

function getGrade(val) {
  if (val >= 160) return '神';
  if (val >= 130) return 'SSS';
  if (val >= 100) return 'SS';
  if (val >= 90) return 'S';
  if (val >= 80) return 'A';
  if (val >= 70) return 'B';
  if (val >= 60) return 'C';
  if (val >= 50) return 'D';
  if (val >= 40) return 'E';
  if (val >= 30) return 'F';
  return 'G';
}

// ==========================================================================
// アカウント管理（ローカル・スプレッドシート連動＆上書き固定）
// ==========================================================================
function loadLocalPlayerData(name) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

function saveLocalPlayerData() {
  if (!state.playerName) return;
  const data = {
    name: state.playerName,
    totalSolved: state.totalSolved,
    totalHomeruns: state.totalHomeruns,
    totalHits: state.totalHits,
    totalStrikeouts: state.totalStrikeouts,
    abilities: Array.from(state.abilities),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_CURRENT_PLAYER, state.playerName);
  localStorage.setItem(STORAGE_PREFIX + state.playerName, JSON.stringify(data));
}

// タイトル画面のセーブデータ読み込み
function checkTitleSavedData() {
  const lastPlayer = localStorage.getItem(STORAGE_CURRENT_PLAYER);
  if (lastPlayer) {
    const data = loadLocalPlayerData(lastPlayer);
    if (data && data.totalSolved !== undefined) {
      dom.resumeBox.classList.remove('hide');
      dom.resumeName.textContent = `${data.name} 選手`;
      const rank = calcOverallRank(data.totalSolved);
      dom.resumeRank.textContent = rank;
      dom.resumeRank.className = `resume-badge ${getRankClass(rank)}`;
      dom.resumeSolvedCount.textContent = data.totalSolved;
      dom.playerNameInput.value = data.name;
      return;
    }
  }
  dom.resumeBox.classList.add('hide');
}

// ==========================================================================
// 画面切り替え＆HUD更新
// ==========================================================================
function showScreen(screenName) {
  state.screen = screenName;
  Object.keys(dom.screens).forEach(key => {
    if (key === screenName) {
      dom.screens[key].classList.remove('hide');
      dom.screens[key].classList.add('active');
    } else {
      dom.screens[key].classList.remove('active');
      dom.screens[key].classList.add('hide');
    }
  });
}

function announce(text) {
  dom.announcerText.textContent = text;
}

function updateBases() {
  dom.bases.forEach((baseEl, idx) => {
    baseEl.classList.toggle('occupied', state.bases[idx]);
  });
}

function updateStrikeLamps() {
  dom.strikeDots[0].classList.toggle('active', state.strikes >= 1);
  dom.strikeDots[1].classList.toggle('active', state.strikes >= 2);
}

function updateHud() {
  dom.hudPlayerName.textContent = `${state.playerName} 選手`;

  const rank = calcOverallRank(state.totalSolved);
  dom.hudPlayerRank.textContent = rank;
  dom.hudPlayerRank.className = `player-rank-badge ${getRankClass(rank)}`;
  dom.hudRankNext.textContent = getNextRankHint(state.totalSolved);

  if (dom.hudProudSkill) {
    dom.hudProudSkill.textContent = `【${getPrimarySkill(state.totalSolved)}】`;
  }

  dom.hudTotalSolved.textContent = state.totalSolved;
  dom.hudSessionGain.textContent = `(+${state.sessionGain})`;

  updateStrikeLamps();
  updateBases();

  const traj = calcTrajectory(state.totalSolved);
  const curMeet = calcMeet(state.totalSolved);
  const curPower = calcPower(state.totalHomeruns);

  dom.hudTrajectory.textContent = traj;
  dom.hudMeet.textContent = `${getGrade(curMeet)} ${curMeet}`;
  dom.hudPower.textContent = `${getGrade(curPower)} ${curPower}`;
  dom.hudHr.textContent = `${state.totalHomeruns}本`;
}

// ==========================================================================
// ゲーム開始（選手呼び出し・新規作成）
// ==========================================================================
async function startTraining(playerName) {
  const cleanName = playerName.trim().substring(0, 10) || 'スラッガー';
  state.playerName = cleanName;

  // セッショントークン
  api.getSessionToken().then(t => state.sessionToken = t);

  // 1. ローカルデータのロード
  const localData = loadLocalPlayerData(cleanName);
  if (localData) {
    state.totalSolved = localData.totalSolved || 0;
    state.totalHomeruns = localData.totalHomeruns || 0;
    state.totalHits = localData.totalHits || 0;
    state.totalStrikeouts = localData.totalStrikeouts || 0;
    state.abilities = getSkillsForSolved(state.totalSolved);
  } else {
    state.totalSolved = 0;
    state.totalHomeruns = 0;
    state.totalHits = 0;
    state.totalStrikeouts = 0;
    state.abilities = getSkillsForSolved(0);
  }

  // 2. スプレッドシートから最新データの同期確認（オンライン時）
  if (api.isOnline()) {
    try {
      const ranking = await api.getRanking(cleanName);
      if (ranking && ranking.myRank && typeof ranking.myRank.score === 'number') {
        // スプレッドシートの解いた問数の方が進んでいればマージ
        if (ranking.myRank.score > state.totalSolved) {
          state.totalSolved = ranking.myRank.score;
          state.abilities = getSkillsForSolved(state.totalSolved);
        }
      }
    } catch (e) {
      console.warn("GAS load fallback to local:", e);
    }
  }

  if (state.totalHomeruns >= 100) state.abilities.add('超アーチスト');
  if (state.totalHomeruns >= 300) state.abilities.add('世界のホームラン王');

  state.sessionGain = 0;
  state.playing = true;
  state.isLocked = false;
  state.strikes = 0;
  state.bases = [false, false, false];

  saveLocalPlayerData();
  shuffleProblems();

  dom.homerunCutin.classList.add('hide');
  dom.stepHintBox.classList.add('hide');
  dom.divisorGrid.classList.remove('locked');

  showScreen('game');
  sounds.playPlayBall();
  updateHud();
  announce(`プレイボール！${state.playerName}選手、公約数を見つけて約分しよう！`);

  setupProblem();
}

function shuffleProblems() {
  const list = [...PROBLEM_POOL];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  state.problemQueue = list;
  state.problemIndex = 0;
}

function setupProblem() {
  if (state.problemIndex >= state.problemQueue.length) {
    shuffleProblems();
  }
  const prob = state.problemQueue[state.problemIndex++];
  state.currentProblem = prob;
  state.currentNum = prob.num;
  state.currentDen = prob.den;
  state.stepCount = 0;
  state.strikes = 0;
  state.isLocked = false;

  const speed = Math.floor(Math.random() * 18) + 138;
  dom.pitchSpeed.textContent = `${speed} km/h`;
  dom.yakubunBadge.textContent = "約分せよ！";
  dom.yakubunBadge.style.background = "var(--accent-red)";

  dom.displayNum.textContent = prob.num;
  dom.displayDen.textContent = prob.den;
  dom.displayNum.classList.remove('slashed');
  dom.displayDen.classList.remove('slashed');
  dom.stepHistory.innerHTML = '';
  dom.stepHintBox.classList.add('hide');
  dom.divisorGrid.classList.remove('locked');

  updateHud();
}

// ==========================================================================
// わる数ボタン（2〜20）タップ時の判定処理（連打完全防止＆約分後分数表示）
// ==========================================================================
function handleDivisorClick(divisor) {
  // ⏱️ ロック中（空振りクールダウン中または約分完了表示中）は100%無効化！
  if (!state.playing || state.screen !== 'game' || state.isLocked) return;

  const curN = state.currentNum;
  const curD = state.currentDen;

  const nDiv = (curN % divisor === 0);
  const dDiv = (curD % divisor === 0);

  if (nDiv && dDiv) {
    // 🌟 正解！
    handleCorrectDivisor(divisor, curN, curD);
  } else {
    // ❌ 不正解！（空振りストライク）
    handleWrongDivisor(divisor, curN, curD, nDiv, dDiv);
  }
}

function handleCorrectDivisor(divisor, curN, curD) {
  state.stepCount++;
  state.isLocked = true; // アニメーション・タメ表示中ロック

  const newN = curN / divisor;
  const newD = curD / divisor;

  // 直前の数字に赤斜線アニメーション
  const currentCard = dom.stepHistory.lastElementChild || document.getElementById('step-0');
  const numSpan = currentCard.querySelector('.fraction-num');
  const denSpan = currentCard.querySelector('.fraction-den');
  if (numSpan) numSpan.classList.add('slashed');
  if (denSpan) denSpan.classList.add('slashed');

  // これ以上約分できるか（既約分数判定）
  const gcdNext = calcGcd(newN, newD);
  const isComplete = (gcdNext === 1);

  // ★ 約分後の新しい分数カードを構築（完了時は completed-step で特大ハイライト！）
  const stepElem = document.createElement('div');
  stepElem.className = 'step-history-item';
  stepElem.style.display = 'flex';
  stepElem.style.alignItems = 'center';
  stepElem.style.gap = '8px';
  stepElem.innerHTML = `
    <div class="step-arrow-wrap">
      <span class="step-div-badge">÷ ${divisor}</span>
      <span class="step-arrow">➔</span>
    </div>
    <div class="step-card active-step ${isComplete ? 'completed-step' : ''}">
      <div class="step-tag">${isComplete ? '★ 約分かんりょう！' : `${state.stepCount}回目`}</div>
      <div class="fraction-display">
        <div class="num-wrapper"><span class="fraction-num">${newN}</span></div>
        <div class="fraction-line"></div>
        <div class="den-wrapper"><span class="fraction-den">${newD}</span></div>
      </div>
    </div>
  `;
  dom.stepHistory.appendChild(stepElem);

  state.currentNum = newN;
  state.currentDen = newD;

  if (isComplete) {
    // 🎉 約分完了！
    dom.yakubunBadge.textContent = "約分かんりょう！";
    dom.yakubunBadge.style.background = "var(--accent-green)";

    // 通算正解数加算
    state.totalSolved++;
    state.sessionGain++;
    state.consecutiveHits++;

    // 特殊能力習得判定（全スキル動的アップデート）
    state.abilities = getSkillsForSolved(state.totalSolved);
    if (state.totalHomeruns >= 100) state.abilities.add('超アーチスト');
    if (state.totalHomeruns >= 300) state.abilities.add('世界のホームラン王');
    if (state.consecutiveHits >= 10) state.abilities.add('安打製造機');

    // ★ ユーザー様ご要望：「約分しきったあとの分数をしっかり表示する！」
    // 画面に「3/4」などの完成分数がドンと表示された状態で約0.8秒間しっかり見せる！
    announce(`🎯 約分かんりょう！！【${newN}/${newD}】！`);
    updateHud();
    saveLocalPlayerData();

    setTimeout(() => {
      if (!state.playing) return;

      if (state.stepCount === 1) {
        // 🌟 一発特大ホームラン！（かず方式）
        triggerHomerun(divisor, newN, newD);
      } else {
        // ⚾ タイムリー連打でホームイン！（りこ方式）
        triggerTimelyHomein(divisor, newN, newD);
      }
    }, 800); // 0.8秒のタメで確定分数を視認！
  } else {
    // ⚾ まだ割れる ➔ クリーンヒット＆進塁！
    triggerHit(divisor, newN, newD);
  }
}

// 特大ホームラン演出
function triggerHomerun(divisor, finalN, finalD) {
  state.totalHomeruns++;
  state.bases = [false, false, false];

  if (state.totalHomeruns >= 100) state.abilities.add('超アーチスト');
  if (state.totalHomeruns >= 300) state.abilities.add('世界のホームラン王');

  updateHud();
  sounds.playHomerun();
  triggerConfetti();

  dom.cutinTitle.textContent = "特大ホームラン！！";
  dom.cutinStatUp.textContent = `【${finalN}/${finalD}】一撃完成！ 通算${state.totalHomeruns}本塁打！`;
  dom.homerunCutin.classList.remove('hide');
  announce(`🔥 カキィィン！！【÷${divisor}】一撃特大ホームラン！`);

  setTimeout(() => {
    dom.homerunCutin.classList.add('hide');
    setupProblem();
  }, 1300);
}

// タイムリーホームイン演出
function triggerTimelyHomein(divisor, finalN, finalD) {
  state.totalHits++;
  state.bases = [false, false, false];

  if (state.consecutiveHits >= 5) state.abilities.add('アベレージヒッター');

  updateHud();
  sounds.playHomerun();
  triggerConfetti();

  dom.cutinTitle.textContent = "タイムリー！ホームイン！";
  dom.cutinStatUp.textContent = `【${finalN}/${finalD}】約分完了！ 通算${state.totalSolved}問正解！`;
  dom.homerunCutin.classList.remove('hide');
  announce(`🎊 見事な連打で約分完了！ホームイン！`);

  setTimeout(() => {
    dom.homerunCutin.classList.add('hide');
    setupProblem();
  }, 1300);
}

// 途中約分ヒット
function triggerHit(divisor, newN, newD) {
  state.totalHits++;
  state.consecutiveHits++;

  if (state.bases[2]) state.bases[2] = false;
  state.bases[2] = state.bases[1];
  state.bases[1] = state.bases[0];
  state.bases[0] = true;

  updateHud();
  sounds.playHit();

  dom.stepHintBox.classList.remove('hide');
  dom.stepHintText.textContent = `⚾ ナイスヒット！【${newN}/${newD}】まだ約分できるぞ！次は何で割る？`;
  announce(`ナイスヒット！【÷${divisor}】で約分！まだ割れるぞ！`);

  state.isLocked = false;
}

// 空振り（ストライク＆0.8秒連打防止ロック）
function handleWrongDivisor(divisor, curN, curD, nDiv, dDiv) {
  state.strikes++;
  state.consecutiveHits = 0;
  updateStrikeLamps();

  sounds.playStrike();
  dom.screens.game.classList.add('shake');
  setTimeout(() => dom.screens.game.classList.remove('shake'), 400);

  // ⏱️ 連打防止：ボタンを0.8秒間完全ロック！
  state.isLocked = true;
  dom.divisorGrid.classList.add('locked');

  if (!nDiv && !dDiv) {
    announce(`⚡ 空振り！【${divisor}】では分子も分母も割り切れないぞ！`);
  } else if (!nDiv) {
    announce(`⚡ 空振り！【${divisor}】では上（分子 ${curN}）が割り切れないぞ！`);
  } else {
    announce(`⚡ 空振り！【${divisor}】では下（分母 ${curD}）が割り切れないぞ！`);
  }

  // 3ストライクで三振チェンジ
  if (state.strikes >= 3) {
    state.totalStrikeouts++;
    announce("⚡ 3ストライク！空振り三振！気を取り直して次の問題へ！");
    setTimeout(() => {
      setupProblem();
    }, 1100);
    return;
  }

  // 0.8秒後にロック解除（バットを構え直し）
  setTimeout(() => {
    if (state.playing && state.strikes < 3) {
      state.isLocked = false;
      dom.divisorGrid.classList.remove('locked');
    }
  }, 800);
}

// ==========================================================================
// 💾 きゅうけい（セーブしてリザルトへ）
// ==========================================================================
function handleRestSave() {
  state.playing = false;
  state.isLocked = true;

  dom.homerunCutin.classList.add('hide');
  dom.stepHintBox.classList.add('hide');
  dom.divisorGrid.classList.remove('locked');

  showResult();
}

function showResult() {
  showScreen('result');
  sounds.playResult();

  saveLocalPlayerData();

  dom.resPlayerName.textContent = `${state.playerName} 選手（データ保存済）`;

  const rank = calcOverallRank(state.totalSolved);
  dom.resFinalRank.textContent = rank;
  dom.resFinalRank.className = `final-rank-circle ${getRankClass(rank)}`;

  if (dom.resProudSkill) {
    dom.resProudSkill.textContent = `🌟 【${getPrimarySkill(state.totalSolved)}】`;
  }

  dom.resSessionGain.textContent = `+${state.sessionGain} 問`;
  dom.resTotalSolved.textContent = `${state.totalSolved} 問`;
  dom.resNextRemain.textContent = getNextRankHint(state.totalSolved);

  const traj = calcTrajectory(state.totalSolved);
  const curMeet = calcMeet(state.totalSolved);
  const curPower = calcPower(state.totalHomeruns);

  dom.resTrajectory.textContent = traj;
  dom.resTrajectoryName.textContent = getTrajectoryName(traj);

  dom.resMeetGrade.textContent = getGrade(curMeet);
  dom.resMeetNum.textContent = curMeet;

  dom.resPowerGrade.textContent = getGrade(curPower);
  dom.resPowerNum.textContent = curPower;

  dom.resHrCount.textContent = state.totalHomeruns;
  dom.resHitCount.textContent = state.totalHits;
  dom.resSoCount.textContent = state.totalStrikeouts;

  // 特殊能力タグ
  dom.resSpecialSkills.innerHTML = '';
  state.abilities.forEach(ability => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = ability;
    dom.resSpecialSkills.appendChild(tag);
  });

  // スプレッドシートに上書き記録（何問解いたか）
  sendScoreToGAS();
}

// スプレッドシートへ上書き記録（何問解いたか）
async function sendScoreToGAS() {
  dom.registerStatus.className = 'register-status-box';

  if (!api.isOnline()) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = '⚠️ オフラインのためローカル保存のみ完了しました';
    return;
  }

  dom.registerMsg.textContent = '📡 統合スプレッドシートに通算記録を上書き中...';

  try {
    const res = await api.registerScore(state.playerName, state.totalSolved, state.sessionToken);
    dom.registerStatus.classList.add('success');
    dom.registerMsg.textContent = `✅ スプレッドシートに上書き保存完了！ 全国第 ${res.rank || '-'} 位！`;
  } catch (err) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = `⚠️ 通信エラー: ローカルに安全保存されました (${err.message})`;
  }
}

// ランキング表示（自慢のスキルと能力値を誇示するリッチカード一覧）
async function openRankingModal() {
  showScreen('ranking');
  dom.rankingOfflineAlert.classList.add('hide');
  dom.rankingTbody.innerHTML = '';
  dom.rankingLoading.classList.remove('hide');
  dom.myRankCard.classList.add('hide');

  if (!api.isOnline()) {
    dom.rankingLoading.classList.add('hide');
    dom.rankingOfflineAlert.classList.remove('hide');
    return;
  }

  try {
    const list = await api.getRanking(state.playerName);
    dom.rankingLoading.classList.add('hide');

    if (!list || list.length === 0) {
      dom.rankingTbody.innerHTML = '<tr><td colspan="3" class="ranking-loading">まだ記録がありません。一番乗りで記録しよう！</td></tr>';
      return;
    }

    let rowsHtml = '';
    list.slice(0, 50).forEach((item, index) => {
      const rank = index + 1;
      let topClass = '';
      if (rank === 1) topClass = 'top-1';
      else if (rank === 2) topClass = 'top-2';
      else if (rank === 3) topClass = 'top-3';

      const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `${rank}`;
      const solved = Number(item.score) || 0;
      const overallRank = calcOverallRank(solved);
      const rankClass = getRankClass(overallRank);
      const primarySkill = getPrimarySkill(solved);
      const traj = calcTrajectory(solved);
      const trajName = getTrajectoryName(traj);
      const meetVal = calcMeet(solved);
      const meetGrade = getGrade(meetVal);
      const estHr = Math.floor(solved * 0.7);
      const powerVal = calcPower(estHr);
      const powerGrade = getGrade(powerVal);

      rowsHtml += `
        <tr class="${topClass} ranking-row-card">
          <td class="col-rank">${rankBadge}</td>
          <td class="col-player">
            <div class="rp-header">
              <span class="rp-name">${escapeHtml(item.name)}</span>
              <span class="player-rank-badge ${rankClass}">${overallRank}</span>
            </div>
            <div class="rp-skill-line">
              <span class="primary-skill-tag">🌟 【${escapeHtml(primarySkill)}】</span>
              <span class="rp-stats">弾道:${trajName} M:${meetGrade}${meetVal} P:${powerGrade}${powerVal}</span>
            </div>
          </td>
          <td class="col-score"><strong>${solved.toLocaleString()}</strong> 問</td>
        </tr>
      `;
    });
    dom.rankingTbody.innerHTML = rowsHtml;

    if (list.myRank) {
      dom.myRankCard.classList.remove('hide');
      const mySolved = state.totalSolved;
      const myRankStr = calcOverallRank(mySolved);
      const myRankClass = getRankClass(myRankStr);
      const myPrimarySkill = getPrimarySkill(mySolved);
      const myTraj = calcTrajectory(mySolved);
      const myMeet = calcMeet(mySolved);
      const myPower = calcPower(state.totalHomeruns);

      dom.myRankBadge.textContent = `あなた: 第 ${list.myRank.rank} 位`;
      dom.myRankName.textContent = escapeHtml(list.myRank.name);
      if (dom.myRankGrade) {
        dom.myRankGrade.textContent = myRankStr;
        dom.myRankGrade.className = `player-rank-badge ${myRankClass}`;
      }
      dom.myRankScore.textContent = `${mySolved.toLocaleString()} 問`;
      if (dom.myRankSkill) {
        dom.myRankSkill.textContent = `🌟 【${myPrimarySkill}】`;
      }
      if (dom.myRankStats) {
        dom.myRankStats.textContent = `弾道: ${getTrajectoryName(myTraj)} / ミート: ${getGrade(myMeet)} ${myMeet} / パワー: ${getGrade(myPower)} ${myPower} (本塁打: ${state.totalHomeruns}本)`;
      }
    }
  } catch (err) {
    dom.rankingLoading.classList.add('hide');
    dom.rankingTbody.innerHTML = `<tr><td colspan="3" class="ranking-loading">ランキングの取得に失敗しました (${err.message})</td></tr>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// 紙吹雪
function triggerConfetti() {
  const canvas = dom.confettiCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ffd23f', '#ff334b', '#00d2ff', '#2ecc71', '#ffffff'];

  for (let i = 0; i < 45; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      alpha: 1
    });
  }

  let frames = 0;
  function updateConfetti() {
    frames++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;
      p.rotation += p.rotSpeed;
      p.alpha -= 0.015;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive && frames < 70) {
      requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(updateConfetti);
}

// ==========================================================================
// イベント登録
// ==========================================================================
function initEvents() {
  // つづきからスタート
  dom.btnResumeStart.addEventListener('click', () => {
    sounds.init();
    const lastPlayer = localStorage.getItem(STORAGE_CURRENT_PLAYER);
    if (lastPlayer) {
      startTraining(lastPlayer);
    }
  });

  // 指定の名前でスタート / 呼出
  dom.btnNewStart.addEventListener('click', () => {
    sounds.init();
    const name = dom.playerNameInput.value.trim();
    if (!name) {
      alert("選手名（なまえ）をいれてね！");
      return;
    }
    startTraining(name);
  });

  dom.btnTitleRanking.addEventListener('click', () => {
    sounds.init();
    sounds.playClick();
    openRankingModal();
  });

  dom.btnHowto.addEventListener('click', () => {
    sounds.init();
    sounds.playClick();
    showScreen('howto');
  });

  dom.btnHowtoClose.addEventListener('click', () => {
    sounds.playClick();
    showScreen('title');
  });

  dom.btnMute.addEventListener('click', () => {
    const isMuted = sounds.toggleMute();
    dom.btnMute.textContent = isMuted ? '🔇' : '🔊';
  });

  // わる数ボタン（2〜20）
  document.querySelectorAll('.div-btn[data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-val'), 10);
      handleDivisorClick(val);
    });
  });

  // 💾 きゅうけい（セーブ）ボタン
  dom.btnSaveRest.addEventListener('click', () => {
    sounds.playClick();
    handleRestSave();
  });

  // リザルト画面
  dom.btnContinue.addEventListener('click', () => {
    sounds.playClick();
    state.playing = true;
    state.isLocked = false;
    showScreen('game');
    announce(`練習再開！${state.playerName}選手、公約数を見つけてスイング！`);
    setupProblem();
  });

  dom.btnResultRanking.addEventListener('click', () => {
    sounds.playClick();
    openRankingModal();
  });

  dom.btnBackTitle.addEventListener('click', () => {
    sounds.playClick();
    checkTitleSavedData();
    showScreen('title');
  });

  // ランキング閉じる
  dom.btnRankingClose.addEventListener('click', () => {
    sounds.playClick();
    if (state.playing) {
      showScreen('game');
    } else if (state.totalSolved > 0) {
      showScreen('result');
    } else {
      showScreen('title');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initEvents();
  checkTitleSavedData();
  showScreen('title');
});
