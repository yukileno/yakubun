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
  maxDistance: 0,      // 自己最長飛距離 (m)
  totalDistance: 0,    // 通算総飛距離 (m)
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
    game: document.getElementById('screen-game'),
    batting: document.getElementById('screen-batting'),
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
  resumeHrCount: document.getElementById('resume-hr-count'),
  resumeDistCount: document.getElementById('resume-dist-count'),
  btnResumeStart: document.getElementById('btn-resume-start'),
  btnChoiceNew: document.getElementById('btn-choice-new'),
  btnChoiceLoad: document.getElementById('btn-choice-load'),
  modalStartNew: document.getElementById('modal-start-new'),
  modalStartLoad: document.getElementById('modal-start-load'),
  inputNewPlayerName: document.getElementById('input-new-player-name'),
  inputLoadPlayerName: document.getElementById('input-load-player-name'),
  btnConfirmNewStart: document.getElementById('btn-confirm-new-start'),
  btnConfirmLoadStart: document.getElementById('btn-confirm-load-start'),
  btnCloseModalNew: document.getElementById('btn-close-modal-new'),
  btnCloseModalLoad: document.getElementById('btn-close-modal-load'),
  btnTitleRanking: document.getElementById('btn-title-ranking'),
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
  resMaxDist: document.getElementById('res-max-dist'),
  resTotalDist: document.getElementById('res-total-dist'),
  resSpecialSkills: document.getElementById('res-special-skills'),
  registerStatus: document.getElementById('register-status'),
  registerMsg: document.getElementById('register-msg'),
  btnContinue: document.getElementById('btn-continue'),
  btnResultRanking: document.getElementById('btn-result-ranking'),
  btnBackTitle: document.getElementById('btn-back-title'),

  // ご褒美バッティング画面
  battingCanvas: document.getElementById('batting-canvas'),
  battingLayerBatter: document.getElementById('batting-layer-batter'),
  battingLayerBroadcast: document.getElementById('batting-layer-broadcast'),
  battingImgBroadcast: document.getElementById('batting-img-broadcast'),
  battingImpactFlash: document.getElementById('batting-impact-flash'),
  battingStatusText: document.getElementById('batting-status-text'),
  battingPlayerStatsBadge: document.getElementById('batting-player-stats-badge'),
  battingMeterHud: document.getElementById('batting-meter-hud'),
  battingMeterVal: document.getElementById('batting-meter-val'),
  battingBroadcastTicker: document.getElementById('batting-broadcast-ticker'),
  battingTickerText: document.getElementById('batting-ticker-text'),
  battingHomerunPopup: document.getElementById('batting-homerun-popup'),
  battingHrDistText: document.getElementById('batting-hr-dist-text'),
  btnBattingSwingTouch: document.getElementById('btn-batting-swing-touch'),
  battingRivalCard: document.getElementById('batting-rival-card'),
  battingRivalRankBadge: document.getElementById('batting-rival-rank-badge'),
  battingRivalName: document.getElementById('batting-rival-name'),
  battingRivalSub: document.getElementById('batting-rival-sub'),
  battingRivalSpeed: document.getElementById('batting-rival-speed'),
  battingRivalPitches: document.getElementById('batting-rival-pitches'),
  battingRivalControl: document.getElementById('batting-rival-control'),
  battingPitchCallout: document.getElementById('batting-pitch-callout'),
  battingPitchCalloutType: document.getElementById('batting-pitch-callout-type'),

  // 対戦相手ルーレットモーダル
  battingRouletteModal: document.getElementById('batting-roulette-modal'),
  rouletteReelWindow: document.getElementById('roulette-reel-window'),
  rouletteReelStrip: document.getElementById('roulette-reel-strip'),
  btnRouletteStop: document.getElementById('btn-roulette-stop'),
  rouletteDecidedCard: document.getElementById('roulette-decided-card'),
  rouletteDecidedRank: document.getElementById('roulette-decided-rank'),
  rouletteDecidedName: document.getElementById('roulette-decided-name'),
  rouletteDecidedSub: document.getElementById('roulette-decided-sub'),
  rouletteDecidedSpeed: document.getElementById('roulette-decided-speed'),
  rouletteDecidedPitches: document.getElementById('roulette-decided-pitches'),

  // ランキング画面
  btnRankingClose: document.getElementById('btn-ranking-close'),
  thRankingMetric: document.getElementById('th-ranking-metric'),
  rankingNavTabs: document.getElementById('ranking-nav-tabs'),
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
    maxDistance: state.maxDistance || 0,
    totalDistance: state.totalDistance || 0,
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
      dom.resumeRank.className = `player-rank-badge ${getRankClass(rank)}`;
      dom.resumeSolvedCount.textContent = data.totalSolved;
      if (dom.resumeHrCount) dom.resumeHrCount.textContent = data.totalHomeruns || 0;
      if (dom.resumeDistCount) dom.resumeDistCount.textContent = data.maxDistance || 0;
      return;
    }
  }
  dom.resumeBox.classList.add('hide');
}

// ==========================================================================
// 画面切り替え＆HUD更新
// ==========================================================================
function showScreen(screenName) {
  if (screenName !== 'batting' && typeof bBattingActive !== 'undefined' && bBattingActive) {
    bBattingActive = false;
    if (typeof clearBattingTimers === 'function') clearBattingTimers();
    if (bAnimId) {
      cancelAnimationFrame(bAnimId);
      bAnimId = null;
    }
  }
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
function startTraining(playerName, isFresh = false) {
  const cleanName = playerName.trim().substring(0, 10) || 'スラッガー';
  state.playerName = cleanName;

  // セッショントークン（非同期でバックグラウンド取得）
  api.getSessionToken().then(t => state.sessionToken = t).catch(() => {});
  prefetchRankings();

  // 1. ローカルデータから即座にロード（0ミリ秒で高速起動！）
  const localData = isFresh ? null : loadLocalPlayerData(cleanName);
  if (localData) {
    state.totalSolved = localData.totalSolved || 0;
    state.totalHomeruns = localData.totalHomeruns || 0;
    state.totalHits = localData.totalHits || 0;
    state.totalStrikeouts = localData.totalStrikeouts || 0;
    state.maxDistance = localData.maxDistance || 0;
    state.totalDistance = localData.totalDistance || 0;
    state.abilities = getSkillsForSolved(state.totalSolved);
  } else {
    state.totalSolved = 0;
    state.totalHomeruns = 0;
    state.totalHits = 0;
    state.totalStrikeouts = 0;
    state.maxDistance = 0;
    state.totalDistance = 0;
    state.abilities = getSkillsForSolved(0);
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

  // ★ 待たずに即座にゲーム画面へ遷移！
  showScreen('game');
  sounds.playPlayBall();
  updateHud();
  announce(`プレイボール！${state.playerName}選手、公約数を見つけて約分しよう！`);
  setupProblem();

  // 2. スプレッドシートとの同期（バックグラウンドで非同期実行・ゲーム開始を絶対に待たせない）
  if (api.isOnline()) {
    api.getRanking(cleanName).then(ranking => {
      if (ranking && ranking.myRank && typeof ranking.myRank.score === 'number') {
        // 別端末などでスプレッドシートの記録が進んでいれば自動マージ
        if (ranking.myRank.score > state.totalSolved) {
          state.totalSolved = ranking.myRank.score;
          state.abilities = getSkillsForSolved(state.totalSolved);
          updateHud();
          saveLocalPlayerData();
        }
      }
    }).catch(e => {
      console.warn("GAS background sync fallback to local:", e);
    });
  }
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
    if (state.totalSolved % 10 === 0 && state.totalSolved > 0) {
      startRewardBatting();
    } else {
      setupProblem();
    }
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
    if (state.totalSolved % 10 === 0 && state.totalSolved > 0) {
      startRewardBatting();
    } else {
      setupProblem();
    }
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
  if (dom.resMaxDist) dom.resMaxDist.textContent = state.maxDistance || 0;
  if (dom.resTotalDist) dom.resTotalDist.textContent = (state.totalDistance || 0).toLocaleString();
  if (dom.resSoCount) dom.resSoCount.textContent = state.totalStrikeouts;

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

// スプレッドシートへ上書き記録（正解問数・本塁打数・最長飛距離・総飛距離）
async function sendScoreToGAS() {
  dom.registerStatus.className = 'register-status-box';

  if (!api.isOnline()) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = '⚠️ オフラインのためローカル保存のみ完了しました';
    return;
  }

  dom.registerMsg.textContent = '📡 統合スプレッドシートに最新記録を上書き中...';

  try {
    const battingStats = {
      homeruns: state.totalHomeruns || 0,
      maxDistance: state.maxDistance || 0,
      totalDistance: state.totalDistance || 0
    };
    const res = await api.registerScore(state.playerName, state.totalSolved, state.sessionToken, battingStats);
    dom.registerStatus.classList.add('success');
    dom.registerMsg.textContent = `✅ スプレッドシートに上書き保存完了！ 全国第 ${res.rank || '-'} 位！`;
  } catch (err) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = `⚠️ 通信エラー: ローカルに安全保存されました (${err.message})`;
  }
}

// ランキング表示（3タブ切替：正解数・最長飛距離・HR数）
let cachedRankingList = [];
let currentRankingTab = 'score'; // 'score' | 'distance' | 'homerun'

function renderRankingTable(tab) {
  currentRankingTab = tab || currentRankingTab;

  // タブボタンのアクティブ更新
  document.querySelectorAll('.rank-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === currentRankingTab);
  });

  // ヘッダータイトルの更新
  if (dom.thRankingMetric) {
    if (currentRankingTab === 'distance') {
      dom.thRankingMetric.textContent = '最長飛距離';
    } else if (currentRankingTab === 'homerun') {
      dom.thRankingMetric.textContent = '本塁打数';
    } else {
      dom.thRankingMetric.textContent = '通算問数';
    }
  }

  // ソート処理
  const sorted = [...cachedRankingList];
  sorted.sort((a, b) => {
    if (currentRankingTab === 'distance') {
      const distDiff = (Number(b.maxDistance) || 0) - (Number(a.maxDistance) || 0);
      if (distDiff !== 0) return distDiff;
      const hrDiff = (Number(b.homeruns) || 0) - (Number(a.homeruns) || 0);
      if (hrDiff !== 0) return hrDiff;
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    } else if (currentRankingTab === 'homerun') {
      const hrDiff = (Number(b.homeruns) || 0) - (Number(a.homeruns) || 0);
      if (hrDiff !== 0) return hrDiff;
      const distDiff = (Number(b.maxDistance) || 0) - (Number(a.maxDistance) || 0);
      if (distDiff !== 0) return distDiff;
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    } else {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.maxDistance) || 0) - (Number(a.maxDistance) || 0);
    }
  });

  if (sorted.length === 0) {
    dom.rankingTbody.innerHTML = '<tr><td colspan="3" class="ranking-loading">まだ記録がありません。一番乗りで記録しよう！</td></tr>';
    updateMyRankCardInTab(sorted);
    return;
  }

  let rowsHtml = '';
  sorted.slice(0, 50).forEach((item, index) => {
    const rank = index + 1;
    let topClass = '';
    if (rank === 1) topClass = 'top-1';
    else if (rank === 2) topClass = 'top-2';
    else if (rank === 3) topClass = 'top-3';

    const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `${rank}`;
    const solved = Number(item.score) || 0;
    const hr = Number(item.homeruns) || 0;
    const maxDist = Number(item.maxDistance) || 0;
    const totalDist = Number(item.totalDistance) || 0;

    const overallRank = calcOverallRank(solved);
    const rankClass = getRankClass(overallRank);
    const primarySkill = getPrimarySkill(solved);
    const traj = calcTrajectory(solved);
    const trajName = getTrajectoryName(traj);
    const meetVal = calcMeet(solved);
    const meetGrade = getGrade(meetVal);
    const powerVal = calcPower(hr);
    const powerGrade = getGrade(powerVal);

    let metricHtml = '';
    if (currentRankingTab === 'distance') {
      metricHtml = `<strong style="color:var(--gold); font-size:1.15rem;">${maxDist.toLocaleString()}</strong> m`;
    } else if (currentRankingTab === 'homerun') {
      metricHtml = `<strong style="color:#f87171; font-size:1.15rem;">${hr.toLocaleString()}</strong> 本`;
    } else {
      metricHtml = `<strong>${solved.toLocaleString()}</strong> 問`;
    }

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
          <div class="rp-records-row">
            <span class="rec-chip">正解: <strong>${solved}</strong>問</span>
            <span class="rec-chip chip-hr">⚾ HR: <strong>${hr}</strong>本</span>
            <span class="rec-chip chip-dist">🚀 最長: <strong>${maxDist}</strong>m</span>
            ${totalDist > 0 ? `<span class="rec-chip">総: <strong>${totalDist.toLocaleString()}</strong>m</span>` : ''}
          </div>
        </td>
        <td class="col-score">${metricHtml}</td>
      </tr>
    `;
  });
  dom.rankingTbody.innerHTML = rowsHtml;

  // あなたの自慢カード更新
  updateMyRankCardInTab(sorted);
}

function updateMyRankCardInTab(sortedList) {
  if (!dom.myRankCard) return;

  const mySolved = state.totalSolved;
  const myHr = state.totalHomeruns || 0;
  const myMaxDist = state.maxDistance || 0;
  const myTotalDist = state.totalDistance || 0;

  // sortedList 内で自分の順位を探す
  let myIndex = -1;
  if (sortedList && sortedList.length > 0 && state.playerName) {
    myIndex = sortedList.findIndex(item => item.name === state.playerName);
  }

  const myRankNum = myIndex !== -1 ? (myIndex + 1) : '-';
  dom.myRankBadge.textContent = `あなた: 第 ${myRankNum} 位`;
  dom.myRankName.textContent = escapeHtml(state.playerName || 'スラッガー');

  const myRankStr = calcOverallRank(mySolved);
  const myRankClass = getRankClass(myRankStr);
  if (dom.myRankGrade) {
    dom.myRankGrade.textContent = myRankStr;
    dom.myRankGrade.className = `player-rank-badge ${myRankClass}`;
  }

  if (dom.myRankScore) {
    if (currentRankingTab === 'distance') {
      dom.myRankScore.innerHTML = `<span style="color:var(--gold); font-size:1.1rem; font-weight:bold;">${myMaxDist} m</span>`;
    } else if (currentRankingTab === 'homerun') {
      dom.myRankScore.innerHTML = `<span style="color:#f87171; font-size:1.1rem; font-weight:bold;">${myHr} 本</span>`;
    } else {
      dom.myRankScore.textContent = `${mySolved.toLocaleString()} 問`;
    }
  }

  if (dom.myRankSkill) {
    dom.myRankSkill.textContent = `🌟 【${getPrimarySkill(mySolved)}】`;
  }

  if (dom.myRankStats) {
    const myTraj = calcTrajectory(mySolved);
    const myMeet = calcMeet(mySolved);
    const myPower = calcPower(myHr);
    dom.myRankStats.innerHTML = `弾道: ${getTrajectoryName(myTraj)} / M: ${getGrade(myMeet)} ${myMeet} / P: ${getGrade(myPower)} ${myPower} | ⚾ 本塁打: <strong>${myHr}</strong>本 / 🚀 最長: <strong>${myMaxDist}</strong>m / 📏 総飛距離: <strong>${myTotalDist.toLocaleString()}</strong>m`;
  }

  dom.myRankCard.classList.remove('hide');
}

async function openRankingModal() {
  showScreen('ranking');
  dom.rankingOfflineAlert.classList.add('hide');
  dom.rankingTbody.innerHTML = '';
  dom.rankingLoading.classList.remove('hide');
  dom.myRankCard.classList.add('hide');

  if (!api.isOnline()) {
    dom.rankingLoading.classList.add('hide');
    dom.rankingOfflineAlert.classList.remove('hide');
    updateMyRankCardInTab([]);
    return;
  }

  try {
    const list = await api.getRanking(state.playerName);
    dom.rankingLoading.classList.add('hide');
    cachedRankingList = list || [];
    renderRankingTable(currentRankingTab || 'score');
  } catch (err) {
    dom.rankingLoading.classList.add('hide');
    dom.rankingTbody.innerHTML = `<tr><td colspan="3" class="ranking-loading">ランキングの取得に失敗しました (${err.message})</td></tr>`;
    updateMyRankCardInTab([]);
  }
}

async function prefetchRankings() {
  if (!api.isOnline()) return;
  try {
    const list = await api.getRanking(state.playerName);
    if (Array.isArray(list) && list.length > 0) {
      cachedRankingList = list;
    }
  } catch (err) {
    console.warn("Background ranking prefetch:", err);
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

/* ==========================================================================
   ご褒美バッティングエンジン (10問達成ご褒美・1球入魂！実況中継カメラ演出)
   ========================================================================== */
let bCtx = null;
let bW = 0, bH = 0;
let bAnimId = null;
let bCameraMode = 'BATTER';
let bBattingActive = false;
let bPitchState = 'IDLE'; // 'IDLE', 'READY', 'WINDUP', 'FLYING', 'RESULT'
let bStateStartTime = 0;
let bTimers = [];

function addBattingTimer(fn, ms) {
  const tid = setTimeout(() => {
    bTimers = bTimers.filter(id => id !== tid);
    fn();
  }, ms);
  bTimers.push(tid);
  return tid;
}

function clearBattingTimers() {
  for (const tid of bTimers) {
    clearTimeout(tid);
  }
  bTimers = [];
  if (typeof clearRouletteAnimation === 'function') {
    clearRouletteAnimation();
  }
}

const bStrikeZone = {
  get x() { return bW * 0.5; },
  get y() { return bH * 0.64; },
  get w() { return Math.min(220, bW * 0.28); },
  get h() { return Math.min(250, bH * 0.36); }
};

const bBatCursor = {
  x: 0, y: 0,
  radius: 36,
  isSwinging: false,
  swingProgress: 0
};

const bBall = {
  active: false,
  x: 0, y: 0,
  speedKmh: 148,
  durationMs: 960,
  startTime: 0,
  targetX: 0, targetY: 0,
  hit: false,
  swung: false,
  hitResult: null,
  pitchType: 'STRAIGHT', // 'STRAIGHT', 'FIREBALL', 'CURVE', 'SLIDER', 'FORK'
  pitchLabel: '直球',
  cornerName: '中央',
  breakDir: 1,
  isMeatball: false
};

const bTrackingBall = {
  active: false,
  startTime: 0,
  durationMs: 2400,
  startX: 0, startY: 0,
  apexY: 0,
  endX: 0, endY: 0,
  targetDist: 140,
  isHr: false,
  isPerfect: false,
  landed: false,
  currentX: 0, currentY: 0,
  currentScale: 1.0,
  trail: []
};

let bParticles = [];
let bConfetti = [];
let bPitchTrail = [];

// デフォルトのライバル投手データプール（オフライン時・初期用）
const DEFAULT_RIVAL_PITCHERS = [
  { name: "あたらし ひろと", score: 83, homeruns: 74, maxDistance: 152, title: "豪速球の守護神" },
  { name: "わたなべ", score: 92, homeruns: 62, maxDistance: 154, title: "怪物スラッガー投手" },
  { name: "二宮悠太", score: 80, homeruns: 40, maxDistance: 140, title: "本格派エース" },
  { name: "そうた", score: 55, homeruns: 33, maxDistance: 130, title: "技巧派ドクターK" },
  { name: "あおい", score: 52, homeruns: 28, maxDistance: 135, title: "急降下フォークの使い手" },
  { name: "森くん", score: 31, homeruns: 15, maxDistance: 144, title: "魔球カーブマスター" },
  { name: "柴田", score: 30, homeruns: 28, maxDistance: 130, title: "快速サイドスロー" },
  { name: "翔真", score: 20, homeruns: 8, maxDistance: 110, title: "期待の本格派右腕" },
  { name: "こゆり", score: 9, homeruns: 6, maxDistance: 95, title: "ルーキー投手" }
];

let currentRivalPitcher = null;

function buildPitcherProfile(raw, rankPos = 1) {
  const name = (raw && raw.name) ? raw.name : "ライバル投手";
  const solved = Number(raw ? raw.score : 0) || 0;
  const hr = Number(raw ? raw.homeruns : 0) || 0;
  const maxDist = Number(raw ? raw.maxDistance : 0) || 0;

  // 総合戦闘力ポイント（問数 + 本塁打重み + 飛距離）
  const powerPts = solved * 1.0 + hr * 2.2 + (maxDist > 100 ? (maxDist - 100) * 0.7 : 0);

  let grade = 'D';
  let maxSpeedKmh = 120;
  let pitches = ['STRAIGHT'];
  let pitchLabels = ['直球'];
  let control = 'CENTER';
  let controlLabel = '中央集球';
  let title = (raw && raw.title) ? raw.title : '期待の右腕';

  if (powerPts >= 160 || hr >= 50 || solved >= 75) {
    grade = 'S';
    maxSpeedKmh = 154 + Math.floor(Math.random() * 8); // 154〜161km/h
    pitches = ['FIREBALL', 'SLIDER', 'FORK', 'STRAIGHT'];
    pitchLabels = ['火の玉', '鋭角スライダー', '消えるフォーク'];
    control = 'PINPOINT';
    controlLabel = '4隅ピンポイント';
    title = '全国屈指の絶対的守護神';
  } else if (powerPts >= 90 || hr >= 30 || solved >= 45) {
    grade = 'A';
    maxSpeedKmh = 146 + Math.floor(Math.random() * 6); // 146〜151km/h
    pitches = ['STRAIGHT', 'SLIDER', 'FORK'];
    pitchLabels = ['剛速球', '鋭角スライダー', '落差フォーク'];
    control = 'CORNER';
    controlLabel = 'きわどいコーナー攻め';
    title = '強豪校の看板エース';
  } else if (powerPts >= 45 || hr >= 18 || solved >= 25) {
    grade = 'B';
    maxSpeedKmh = 138 + Math.floor(Math.random() * 6); // 138〜143km/h
    pitches = ['STRAIGHT', 'SLIDER', 'CURVE'];
    pitchLabels = ['直球', 'スライダー', 'ドロップカーブ'];
    control = 'CORNER';
    controlLabel = '外角コーナー狙い';
    title = '変幻自在の技巧派右腕';
  } else if (powerPts >= 20 || hr >= 8 || solved >= 12) {
    grade = 'C';
    maxSpeedKmh = 128 + Math.floor(Math.random() * 8); // 128〜135km/h
    pitches = ['STRAIGHT', 'CURVE'];
    pitchLabels = ['直球', 'スローカーブ'];
    control = 'CENTER';
    controlLabel = 'ストライク先行';
    title = '緩急を操る好投手';
  } else {
    grade = 'D';
    maxSpeedKmh = 115 + Math.floor(Math.random() * 10); // 115〜124km/h
    pitches = ['STRAIGHT'];
    pitchLabels = ['打ちやすい直球'];
    control = 'CENTER';
    controlLabel = 'ど真ん中勝負';
    title = '期待のルーキー投手';
  }

  const subTitle = rankPos > 0
    ? `全国${rankPos}位 / ${hr > 0 ? hr + '本塁打' : solved + '問クリア'}`
    : title;

  return {
    name,
    solved,
    homeruns: hr,
    maxDistance: maxDist,
    grade,
    maxSpeedKmh,
    pitches,
    pitchLabels,
    control,
    controlLabel,
    subTitle,
    rankPos
  };
}

function selectRivalPitcher() {
  // キャッシュされたランキングから、現在のプレイヤー以外を抽出
  let pool = [...cachedRankingList].filter(item => {
    return item && item.name && item.name !== state.playerName && item.name !== 'テスト' && item.name !== 'てすと';
  });

  if (pool.length === 0) {
    pool = [...DEFAULT_RIVAL_PITCHERS];
  }

  // 実力順にソート（本塁打数と問数から算出）
  pool.sort((a, b) => {
    const aPts = (Number(a.score) || 0) + (Number(a.homeruns) || 0) * 2;
    const bPts = (Number(b.score) || 0) + (Number(b.homeruns) || 0) * 2;
    return bPts - aPts;
  });

  // 現在の問数（ラウンド）に応じた段階的マッチング
  // 10問目: 初級〜中位のライバル
  // 20問目: 中位〜上位の実力派
  // 30問目以降: Sランク最強ランカー！（全国トップ3）
  const round = Math.max(1, Math.floor(state.totalSolved / 10));
  let candidate = null;
  let rankPos = 1;

  if (round === 1) {
    const startIdx = Math.floor(pool.length * 0.35);
    const slice = pool.slice(startIdx);
    const chosen = slice.length > 0 ? slice[Math.floor(Math.random() * slice.length)] : pool[pool.length - 1];
    rankPos = pool.indexOf(chosen) + 1;
    candidate = chosen;
  } else if (round === 2) {
    const midIdx = Math.floor(pool.length * 0.15);
    const endIdx = Math.max(midIdx + 1, Math.floor(pool.length * 0.55));
    const slice = pool.slice(midIdx, endIdx);
    const chosen = slice.length > 0 ? slice[Math.floor(Math.random() * slice.length)] : pool[0];
    rankPos = pool.indexOf(chosen) + 1;
    candidate = chosen;
  } else {
    // ボス対決：全国トップ3位以内から選出！
    const topSlice = pool.slice(0, Math.min(3, pool.length));
    const chosen = topSlice[Math.floor(Math.random() * topSlice.length)];
    rankPos = pool.indexOf(chosen) + 1;
    candidate = chosen;
  }

  return buildPitcherProfile(candidate, rankPos);
}

function getRivalCandidatesPool() {
  let pool = [...cachedRankingList].filter(item => {
    return item && item.name && item.name !== state.playerName && item.name !== 'テスト' && item.name !== 'てすと';
  });

  if (pool.length === 0) {
    pool = [...DEFAULT_RIVAL_PITCHERS];
  }

  pool.sort((a, b) => {
    const aPts = (Number(a.score) || 0) + (Number(a.homeruns) || 0) * 2;
    const bPts = (Number(b.score) || 0) + (Number(b.homeruns) || 0) * 2;
    return bPts - aPts;
  });

  return pool.map((cand, idx) => buildPitcherProfile(cand, idx + 1));
}

function renderRouletteCard(cardEl, pitcher) {
  cardEl.className = 'roulette-card-item';
  const gradeChar = (pitcher.grade || 'D').toLowerCase().charAt(0);
  cardEl.innerHTML = `
    <span class="rival-rank-badge rank-${gradeChar}">${pitcher.grade || 'D'}</span>
    <div class="roulette-card-center">
      <span class="roulette-card-name">${escapeHtml(pitcher.name)} 投手</span>
      <span class="roulette-card-sub">${escapeHtml(pitcher.subTitle || '')}</span>
    </div>
    <div class="roulette-card-speed">${pitcher.maxSpeedKmh || 120} km/h</div>
  `;
}

function updateBattingRivalCard(pitcher) {
  if (!pitcher || !dom.battingRivalCard) return;
  if (dom.battingRivalName) dom.battingRivalName.textContent = `${pitcher.name} 投手`;
  if (dom.battingRivalSub) dom.battingRivalSub.textContent = pitcher.subTitle;
  if (dom.battingRivalRankBadge) {
    dom.battingRivalRankBadge.textContent = pitcher.grade;
    dom.battingRivalRankBadge.className = `rival-rank-badge rank-${pitcher.grade.toLowerCase().charAt(0)}`;
  }
  if (dom.battingRivalSpeed) dom.battingRivalSpeed.textContent = `${pitcher.maxSpeedKmh} km/h`;
  if (dom.battingRivalPitches) dom.battingRivalPitches.textContent = pitcher.pitchLabels.join('・');
  if (dom.battingRivalControl) dom.battingRivalControl.textContent = pitcher.controlLabel;
  dom.battingRivalCard.classList.remove('hide-rival');
}

let rouletteAnimId = null;

function clearRouletteAnimation() {
  if (rouletteAnimId) {
    cancelAnimationFrame(rouletteAnimId);
    rouletteAnimId = null;
  }
}

function startRivalRoulette(targetPitcher, onComplete) {
  clearRouletteAnimation();

  if (!dom.battingRouletteModal || !dom.rouletteReelStrip) {
    if (onComplete) onComplete(targetPitcher);
    return;
  }

  // リール要素初期化
  dom.rouletteReelStrip.innerHTML = '';
  dom.rouletteReelStrip.style.transform = 'translate3d(0, 0, 0)';

  const pool = getRivalCandidatesPool();
  const CARD_HEIGHT = 72;
  const TOTAL_CARDS = 38;
  const cardElements = [];

  for (let i = 0; i < TOTAL_CARDS; i++) {
    const cardEl = document.createElement('div');
    const randomPitcher = pool[Math.floor(Math.random() * pool.length)] || targetPitcher;
    renderRouletteCard(cardEl, randomPitcher);
    dom.rouletteReelStrip.appendChild(cardEl);
    cardElements.push(cardEl);
  }

  // 初期UI状態
  dom.battingRouletteModal.classList.remove('hide');
  if (dom.rouletteDecidedCard) {
    dom.rouletteDecidedCard.classList.remove('show');
    dom.rouletteDecidedCard.classList.add('hide');
  }
  if (dom.btnRouletteStop) {
    dom.btnRouletteStop.disabled = false;
    dom.btnRouletteStop.style.opacity = '1';
  }

  let roulettePos = 0;
  let rouletteState = 'SPINNING'; // 'SPINNING' | 'STOPPING' | 'DECIDED'
  let spinSpeed = 950; // px/sec
  let lastTime = performance.now();
  let stopStartTime = 0;
  let stopStartPos = 0;
  const stopDuration = 1050; // ms 減速時間
  let winnerIndex = -1;
  let finalTargetY = 0;
  let lastTickIndex = -1;

  // STOPトリガー（手動タップ・ボタン・自動タイマー・キーボード共通）
  const triggerStop = () => {
    if (rouletteState !== 'SPINNING') return;
    rouletteState = 'STOPPING';
    stopStartTime = performance.now();
    stopStartPos = roulettePos;

    if (dom.btnRouletteStop) {
      dom.btnRouletteStop.disabled = true;
      dom.btnRouletteStop.style.opacity = '0.5';
    }

    // 現在位置から5枚先を当選カードにする
    const currentCardIdx = Math.floor(roulettePos / CARD_HEIGHT);
    winnerIndex = Math.min(TOTAL_CARDS - 3, Math.max(3, currentCardIdx + 5));

    // 当選カードの位置に targetPitcher を確実に配置
    if (cardElements[winnerIndex]) {
      renderRouletteCard(cardElements[winnerIndex], targetPitcher);
    }

    // 高さ216pxのウィンドウ中央（top: 72px）に winnerIndex のカードをピタリと配置
    finalTargetY = (winnerIndex - 1) * CARD_HEIGHT;
  };

  // 自動停止タイマー（1.5秒経過で自動停止）
  const autoTimer = setTimeout(() => {
    if (rouletteState === 'SPINNING') {
      triggerStop();
    }
  }, 1500);

  // イベントハンドラ
  const handleStopClick = (e) => {
    if (e) e.stopPropagation();
    triggerStop();
  };

  if (dom.btnRouletteStop) {
    dom.btnRouletteStop.onclick = handleStopClick;
  }
  dom.battingRouletteModal.onclick = () => {
    if (rouletteState === 'SPINNING') triggerStop();
  };

  const handleKeyDown = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (rouletteState === 'SPINNING') triggerStop();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  const cleanupListeners = () => {
    clearTimeout(autoTimer);
    window.removeEventListener('keydown', handleKeyDown);
    if (dom.btnRouletteStop) dom.btnRouletteStop.onclick = null;
    if (dom.battingRouletteModal) dom.battingRouletteModal.onclick = null;
  };

  // 決定演出（フラッシュ、インパクト表示、対決突入）
  const completeRoulette = () => {
    rouletteState = 'DECIDED';
    clearRouletteAnimation();
    cleanupListeners();

    // 当選カードを金色ハイライト
    if (cardElements[winnerIndex]) {
      cardElements[winnerIndex].classList.add('winner-highlight');
    }

    // ド派手な決定ファンファーレ＆画面ホワイトアウト閃光
    sounds.playRouletteDecided();
    if (dom.battingImpactFlash) {
      dom.battingImpactFlash.classList.add('flash');
      setTimeout(() => {
        if (dom.battingImpactFlash) dom.battingImpactFlash.classList.remove('flash');
      }, 180);
    }

    // 決定カード（カットイン演出）の表示
    if (dom.rouletteDecidedCard) {
      if (dom.rouletteDecidedRank) {
        dom.rouletteDecidedRank.textContent = targetPitcher.grade;
        dom.rouletteDecidedRank.className = `rival-rank-badge rank-${targetPitcher.grade.toLowerCase().charAt(0)}`;
      }
      if (dom.rouletteDecidedName) dom.rouletteDecidedName.textContent = `${targetPitcher.name} 投手`;
      if (dom.rouletteDecidedSub) dom.rouletteDecidedSub.textContent = targetPitcher.subTitle;
      if (dom.rouletteDecidedSpeed) dom.rouletteDecidedSpeed.textContent = `${targetPitcher.maxSpeedKmh} km/h`;
      if (dom.rouletteDecidedPitches) dom.rouletteDecidedPitches.textContent = targetPitcher.pitchLabels.join('・');

      dom.rouletteDecidedCard.classList.remove('hide');
      dom.rouletteDecidedCard.classList.add('show');
    }

    // 950ms 表示後、モーダルをフェードアウトしてバッティング画面へ合流
    addBattingTimer(() => {
      if (dom.rouletteDecidedCard) {
        dom.rouletteDecidedCard.classList.remove('show');
        dom.rouletteDecidedCard.classList.add('hide');
      }
      if (dom.battingRouletteModal) {
        dom.battingRouletteModal.classList.add('hide');
      }

      sounds.playPlayBall();

      if (onComplete) {
        onComplete(targetPitcher);
      }
    }, 950);
  };

  // アニメーションループ
  const animateRoulette = (now) => {
    if (!bBattingActive) {
      clearRouletteAnimation();
      cleanupListeners();
      return;
    }

    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (rouletteState === 'SPINNING') {
      roulettePos += spinSpeed * dt;

      // チクタク音判定（カード1枚通過ごと）
      const tickIdx = Math.floor((roulettePos + CARD_HEIGHT * 0.5) / CARD_HEIGHT);
      if (tickIdx !== lastTickIndex) {
        lastTickIndex = tickIdx;
        sounds.playRouletteTick();
      }

      if (roulettePos >= (TOTAL_CARDS - 7) * CARD_HEIGHT) {
        triggerStop();
      }
    } else if (rouletteState === 'STOPPING') {
      const elapsed = now - stopStartTime;
      const progress = Math.min(1.0, elapsed / stopDuration);
      // 滑らかな3次イーズアウト（急激なカクつきを完全排除）
      const ease = 1 - Math.pow(1 - progress, 3);
      roulettePos = stopStartPos + (finalTargetY - stopStartPos) * ease;

      // 減速中のチクタク音判定（間隔が徐々に広がる）
      const tickIdx = Math.floor((roulettePos + CARD_HEIGHT * 0.5) / CARD_HEIGHT);
      if (tickIdx !== lastTickIndex) {
        lastTickIndex = tickIdx;
        sounds.playRouletteTick();
      }

      if (progress >= 1.0) {
        roulettePos = finalTargetY;
        dom.rouletteReelStrip.style.transform = `translate3d(0, -${roulettePos}px, 0)`;
        completeRoulette();
        return;
      }
    }

    dom.rouletteReelStrip.style.transform = `translate3d(0, -${roulettePos}px, 0)`;

    if (rouletteState !== 'DECIDED') {
      rouletteAnimId = requestAnimationFrame(animateRoulette);
    }
  };

  rouletteAnimId = requestAnimationFrame(animateRoulette);
}

function calcPitchTrajectory(pitchType, safeProgress, breakDir = 1) {
  let offsetX = 0;
  let offsetY = 0;

  if (pitchType === 'CURVE') {
    // ドロップカーブ: 上にふわりと浮き上がり、手前で大きく下へ落ちる緩急
    const arc = Math.sin(safeProgress * Math.PI);
    offsetY = -arc * 44;
    offsetX = -arc * breakDir * 26;
  } else if (pitchType === 'SLIDER') {
    // 鋭角スライダー: 半分までは直球軌道、後半0.42から急激に外/内にキレる
    if (safeProgress > 0.42) {
      const breakFactor = Math.pow((safeProgress - 0.42) / 0.58, 1.8);
      offsetX = breakDir * breakFactor * 42;
      offsetY = breakFactor * 8;
    }
  } else if (pitchType === 'FORK') {
    // 落差フォーク: 直球の軌道から手前0.48以降で急激に真下へストンと落ちる
    if (safeProgress > 0.48) {
      const dropFactor = Math.pow((safeProgress - 0.48) / 0.52, 2.0);
      offsetY = dropFactor * 46;
    }
  } else if (pitchType === 'FIREBALL') {
    // 火の玉ストレート: 手元でホップする（浮き上がる）ライジング軌道
    if (safeProgress > 0.55) {
      const riseFactor = Math.pow((safeProgress - 0.55) / 0.45, 1.6);
      offsetY = -riseFactor * 16;
    }
  }

  return { offsetX, offsetY };
}

function updateAndDrawPitchTrail() {
  for (let i = bPitchTrail.length - 1; i >= 0; i--) {
    const p = bPitchTrail[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      bPitchTrail.splice(i, 1);
      continue;
    }
    bCtx.save();
    bCtx.globalAlpha = Math.max(0, p.alpha);
    bCtx.fillStyle = p.color;
    bCtx.shadowColor = p.color;
    bCtx.shadowBlur = 8;
    bCtx.beginPath();
    bCtx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.restore();
  }
}

function resizeBattingCanvas() {
  if (!dom.battingCanvas) return;
  const rect = dom.battingCanvas.getBoundingClientRect();
  const w = rect.width || window.innerWidth || 800;
  const h = rect.height || window.innerHeight || 600;
  bW = dom.battingCanvas.width = Math.max(320, Math.floor(w));
  bH = dom.battingCanvas.height = Math.max(240, Math.floor(h));
  bBatCursor.x = bStrikeZone.x;
  bBatCursor.y = bStrikeZone.y;
}

window.addEventListener('resize', () => {
  if (state.screen === 'batting') {
    resizeBattingCanvas();
  }
});

function setBattingCameraMode(mode) {
  bCameraMode = mode;
  if (!dom.battingLayerBatter || !dom.battingLayerBroadcast) return;
  if (mode === 'BROADCAST') {
    dom.battingLayerBatter.classList.remove('active');
    dom.battingLayerBroadcast.classList.add('active');
    if (dom.battingRivalCard) dom.battingRivalCard.classList.add('hide-rival');
    if (dom.battingPitchCallout) dom.battingPitchCallout.classList.remove('show');
  } else {
    dom.battingLayerBroadcast.classList.remove('active');
    dom.battingLayerBatter.classList.add('active');
    if (dom.battingRivalCard) dom.battingRivalCard.classList.remove('hide-rival');
    if (dom.battingBroadcastTicker) dom.battingBroadcastTicker.classList.remove('show');
    if (dom.battingMeterHud) dom.battingMeterHud.classList.remove('show');
  }
}

function getBattingPitcherPos() {
  return { x: bW * 0.505, y: bH * 0.40 };
}

function startRewardBatting() {
  clearBattingTimers();
  state.screen = 'batting';
  showScreen('batting');
  sounds.playFever();

  bBattingActive = true;
  setBattingCameraMode('BATTER');
  resizeBattingCanvas();

  bCtx = dom.battingCanvas.getContext('2d');

  // 選手の能力値を反映
  const curMeet = calcMeet(state.totalSolved);
  const curPower = calcPower(state.totalHomeruns);
  const meetGrade = getGrade(curMeet);
  const powerGrade = getGrade(curPower);

  if (dom.battingPlayerStatsBadge) {
    dom.battingPlayerStatsBadge.textContent =
      `ミート: ${meetGrade} ${curMeet} / パワー: ${powerGrade} ${curPower}`;
  }

  // ミート力に応じてカーソルサイズ拡大（32px〜52px）
  bBatCursor.radius = Math.min(52, Math.max(32, 32 + (curMeet - 40) * 0.35));
  bBatCursor.x = bStrikeZone.x;
  bBatCursor.y = bStrikeZone.y;
  bBatCursor.isSwinging = false;
  bBatCursor.swingProgress = 0;

  bParticles = [];
  bConfetti = [];
  bPitchTrail = [];
  bPitchState = 'READY';
  bBall.active = false;
  bBall.hit = false;
  bBall.swung = false;
  bBall.hitResult = null;
  bTrackingBall.active = false;

  // 相手（ライバル）投手の選出
  currentRivalPitcher = selectRivalPitcher();

  // ルーレット抽選中は対決HUDを一時非表示
  if (dom.battingRivalCard) dom.battingRivalCard.classList.add('hide-rival');
  if (dom.battingPitchCallout) dom.battingPitchCallout.classList.remove('show');
  if (dom.battingHomerunPopup) dom.battingHomerunPopup.classList.remove('show');
  if (dom.battingStatusText) dom.battingStatusText.textContent = "対戦相手を抽選中...";

  if (bAnimId) cancelAnimationFrame(bAnimId);
  bAnimId = requestAnimationFrame(renderBatting);

  // 🎰 対戦相手ルーレット（スロット抽選）演出開始！
  startRivalRoulette(currentRivalPitcher, (decidedPitcher) => {
    if (!bBattingActive) return;

    // HUDに決定投手をセットして表示
    updateBattingRivalCard(decidedPitcher);

    dom.battingStatusText.textContent = `相手投手【${decidedPitcher.name}】が登板！【1球入魂】タイミングを合わせて打て！`;

    // 安全装置（万が一のフリーズ防止用ウォッチドッグタイマー：8.5秒後に自動復帰）
    addBattingTimer(() => {
      if (bBattingActive) {
        console.warn("Batting watchdog timer triggered.");
        finishRewardBatting();
      }
    }, 8500);

    // 1秒後にピッチャー投球開始！
    addBattingTimer(() => {
      if (bBattingActive) {
        throwRewardPitch();
      }
    }, 1000);
  });
}

function throwRewardPitch() {
  if (!bBattingActive) return;
  bPitchState = 'WINDUP';
  bStateStartTime = performance.now();

  bBall.active = false;
  bBall.hit = false;
  bBall.swung = false;
  bBall.hitResult = null;
  bBatCursor.isSwinging = false;

  addBattingTimer(() => {
    if (!bBattingActive) return;
    releaseRewardPitch();
  }, 500);
}

function releaseRewardPitch() {
  if (!bBattingActive) return;
  bBall.active = true;
  bBall.hit = false;
  bBall.swung = false;
  bBall.hitResult = null;
  bBall.startTime = performance.now();

  const rival = currentRivalPitcher || buildPitcherProfile(DEFAULT_RIVAL_PITCHERS[0], 1);

  // 球種の選択
  const availablePitches = (rival && rival.pitches && rival.pitches.length > 0) ? rival.pitches : ['STRAIGHT'];
  const pitchType = availablePitches[Math.floor(Math.random() * availablePitches.length)];

  // 球速と球種名の算出
  let speed = rival.maxSpeedKmh || 140;
  let pitchLabel = '直球';

  if (pitchType === 'FIREBALL') {
    speed += Math.floor(1 + Math.random() * 3); // 158〜164km/h
    pitchLabel = '⚡ 火の玉ストレート';
  } else if (pitchType === 'SLIDER') {
    speed -= Math.floor(8 + Math.random() * 5); // -8〜12km/h
    pitchLabel = '🌀 鋭角スライダー';
  } else if (pitchType === 'FORK') {
    speed -= Math.floor(12 + Math.random() * 5); // -12〜16km/h
    pitchLabel = '📉 落差フォーク';
  } else if (pitchType === 'CURVE') {
    speed -= Math.floor(25 + Math.random() * 8); // -25〜32km/h（大きな緩急！）
    pitchLabel = '🌈 ドロップカーブ';
  } else {
    speed -= Math.floor(Math.random() * 4);
    pitchLabel = speed >= 150 ? '🔥 剛速球' : '⚾ ストレート';
  }

  bBall.speedKmh = Math.max(105, speed);
  bBall.durationMs = Math.floor((150 / bBall.speedKmh) * 950);
  bBall.pitchType = pitchType;
  bBall.pitchLabel = pitchLabel;
  bBall.breakDir = Math.random() > 0.5 ? 1 : -1;

  const pPos = getBattingPitcherPos();
  bBall.x = pPos.x;
  bBall.y = pPos.y;

  // コントロールとコース（隅を突く技術）
  // 爽快感のため22%の確率で「ド真ん中甘い絶好球（失投）」が発生！
  const isMeatball = Math.random() < 0.22;
  let cornerName = '真ん中';

  if (isMeatball) {
    bBall.isMeatball = true;
    bBall.targetX = bStrikeZone.x + (Math.random() - 0.5) * (bStrikeZone.w * 0.15);
    bBall.targetY = bStrikeZone.y + (Math.random() - 0.5) * (bStrikeZone.h * 0.15);
    cornerName = 'ド真ん中絶好球';
  } else if (rival.control === 'PINPOINT' || rival.control === 'CORNER') {
    // 4隅を突く！
    const cornerIndex = Math.floor(Math.random() * 4);
    const padX = bStrikeZone.w * 0.36;
    const padY = bStrikeZone.h * 0.35;
    if (cornerIndex === 0) {
      bBall.targetX = bStrikeZone.x + padX;
      bBall.targetY = bStrikeZone.y + padY;
      cornerName = '外角低め';
    } else if (cornerIndex === 1) {
      bBall.targetX = bStrikeZone.x - padX;
      bBall.targetY = bStrikeZone.y - padY;
      cornerName = '内角高め';
    } else if (cornerIndex === 2) {
      bBall.targetX = bStrikeZone.x - padX;
      bBall.targetY = bStrikeZone.y + padY;
      cornerName = '内角低め';
    } else {
      bBall.targetX = bStrikeZone.x + padX;
      bBall.targetY = bStrikeZone.y - padY;
      cornerName = '外角高め';
    }
    bBall.isMeatball = false;
  } else {
    // 初心者向け：ストライクゾーン中央付近
    bBall.targetX = bStrikeZone.x + (Math.random() - 0.5) * (bStrikeZone.w * 0.28);
    bBall.targetY = bStrikeZone.y + (Math.random() - 0.5) * (bStrikeZone.h * 0.28);
    cornerName = 'ストライク';
    bBall.isMeatball = false;
  }

  bBall.cornerName = cornerName;
  bPitchState = 'FLYING';
  sounds.playRelease();

  // 球種テロップポップアップ
  const calloutText = isMeatball
    ? `🔥 失投だ！${cornerName}！`
    : `${pitchLabel} ${bBall.speedKmh}km/h (${cornerName})！`;

  if (dom.battingPitchCallout && dom.battingPitchCalloutType) {
    dom.battingPitchCalloutType.textContent = calloutText;
    dom.battingPitchCallout.classList.add('show');
    addBattingTimer(() => {
      if (dom.battingPitchCallout) dom.battingPitchCallout.classList.remove('show');
    }, 1200);
  }

  dom.battingStatusText.textContent = `相手投手【${rival.name}】が投じた！${calloutText}`;
}

function executeBattingSwing() {
  if (bBatCursor.isSwinging || !bBattingActive) return;
  bBatCursor.isSwinging = true;
  bBatCursor.swingProgress = 0;
  sounds.playWhoosh();

  if (!bBall.active || bBall.hit || bPitchState !== 'FLYING') {
    return;
  }

  const now = performance.now();
  const elapsed = Math.max(0, now - bBall.startTime);
  const timingDelta = elapsed - bBall.durationMs;

  const dist = Math.hypot(bBatCursor.x - bBall.x, bBatCursor.y - bBall.y);
  const cursorR = bBatCursor.radius;
  const coreR = 14;

  const absTiming = Math.abs(timingDelta);
  let result = '';
  let baseFlight = 0;

  // パワーボーナス
  const curPower = calcPower(state.totalHomeruns);
  const powerBonus = Math.floor((curPower - 40) * 0.45);

  // 早すぎるスイング：ボールは消さずに飛び続けさせ、振り直し可能にする
  if (timingDelta < -320) {
    bBall.swung = true;
    dom.battingStatusText.textContent = "💨 ちょっと早すぎた！ボールをよく見て打とう！";
    return;
  }

  if (absTiming <= 55 && dist <= coreR) {
    result = 'PERFECT_HOMERUN';
    baseFlight = Math.floor(142 + Math.random() * 15);
  } else if (absTiming <= 95 && dist <= cursorR * 0.75) {
    result = 'HOMERUN';
    baseFlight = Math.floor(125 + Math.random() * 14);
  } else if (absTiming <= 145 && dist <= cursorR * 1.15) {
    result = 'HIT';
    baseFlight = Math.floor(75 + Math.random() * 30);
  } else {
    result = 'SWING_AND_MISS';
  }

  const flight = (result === 'SWING_AND_MISS') ? 0 : (baseFlight + powerBonus);

  bBall.swung = true;
  bBall.hitResult = result;

  if (result === 'PERFECT_HOMERUN' || result === 'HOMERUN') {
    bBall.hit = true;
    const flash = dom.battingImpactFlash;
    if (flash) {
      flash.classList.add('flash');
      addBattingTimer(() => flash.classList.remove('flash'), 50);
    }
    state.totalHomeruns++;
    state.totalHits++;
    state.maxDistance = Math.max(state.maxDistance || 0, flight);
    state.totalDistance = (state.totalDistance || 0) + flight;
    saveLocalPlayerData();
    updateHud();

    sounds.playHomerun();
    startBattingBroadcastTracking(flight, true, result === 'PERFECT_HOMERUN', timingDelta);
  } else if (result === 'HIT') {
    bBall.hit = true;
    const flash = dom.battingImpactFlash;
    if (flash) {
      flash.classList.add('flash');
      addBattingTimer(() => flash.classList.remove('flash'), 50);
    }
    state.totalHits++;
    state.maxDistance = Math.max(state.maxDistance || 0, flight);
    state.totalDistance = (state.totalDistance || 0) + flight;
    saveLocalPlayerData();
    updateHud();

    sounds.playHit();
    startBattingBroadcastTracking(flight, false, false, timingDelta);
  } else {
    // 空振り：ボールは消さずにキャッチャーミットまで飛ばす！
    dom.battingStatusText.textContent = "💨 空振り！どんまい！次の10問でリベンジだ！";
  }
}

function startBattingBroadcastTracking(dist, isHr, isPerfect, timingDelta) {
  bPitchState = 'RESULT';

  addBattingTimer(() => {
    if (!bBattingActive) return;
    setBattingCameraMode('BROADCAST');

    const ticker = dom.battingBroadcastTicker;
    const tickerText = dom.battingTickerText;
    const meterHud = dom.battingMeterHud;
    const meterVal = dom.battingMeterVal;

    const rivalName = currentRivalPitcher ? currentRivalPitcher.name : '相手投手';
    let dir = timingDelta < -10 ? 'レフトへ' : (timingDelta > 10 ? 'ライトへ' : 'バックスクリーンへ');
    if (isPerfect) {
      tickerText.textContent = `相手エース【${rivalName}】の勝負球を一閃！打った瞬間それと分かる当たり！${dir}ぐんぐん伸びるー！！`;
    } else if (isHr) {
      tickerText.textContent = `難敵【${rivalName}】を打ち砕いた！高々と上がった大飛球！${dir}行ったか！？行ったかー！？`;
    } else {
      tickerText.textContent = `強敵【${rivalName}】の球を捉えた！鋭い打球がグラウンドを抜けて${dir}クリーンヒット！！`;
    }

    if (ticker) ticker.classList.add('show');
    if (meterHud) meterHud.classList.add('show');
    if (meterVal) meterVal.textContent = '0m';

    bTrackingBall.active = true;
    bTrackingBall.startTime = performance.now();
    bTrackingBall.durationMs = isHr ? (isPerfect ? 2600 : 2300) : 1700;
    bTrackingBall.isHr = isHr;
    bTrackingBall.isPerfect = isPerfect;
    bTrackingBall.landed = false;
    bTrackingBall.targetDist = dist;
    bTrackingBall.trail = [];

    bTrackingBall.startX = bW * 0.5 + (bBatCursor.x - bStrikeZone.x) * 0.6;
    bTrackingBall.startY = bH * 0.88;

    const xOffset = (timingDelta < 0 ? -1 : 1) * Math.min(bW * 0.35, Math.abs(timingDelta) * 3);
    bTrackingBall.endX = bW * 0.5 + xOffset;
    bTrackingBall.endY = isHr ? (bH * 0.28 + (Math.random() - 0.5) * 40) : (bH * 0.65);
    bTrackingBall.apexY = isHr ? (bH * 0.08) : (bH * 0.45);

    const totalWait = bTrackingBall.durationMs + (isHr ? 2400 : 1400);
    addBattingTimer(() => {
      finishRewardBatting();
    }, totalWait);
  }, 120);
}

function onBattingHomerunLanded() {
  bTrackingBall.landed = true;
  sounds.playFirework();
  sounds.playCheer();

  const container = document.getElementById('app-container');
  if (container) {
    container.classList.add('shake');
    addBattingTimer(() => container.classList.remove('shake'), 450);
  }

  const rivalName = currentRivalPitcher ? currentRivalPitcher.name : '相手投手';
  if (dom.battingTickerText) {
    dom.battingTickerText.textContent = bTrackingBall.isPerfect
      ? `スタンド最上段へ飛び込んだぁぁ！【${rivalName}】から特大ホームラン ${bTrackingBall.targetDist}m！！`
      : `スタンド中段へ飛び込んだー！【${rivalName}】からホームラン！推定 ${bTrackingBall.targetDist}m！！`;
  }

  spawnBattingFireworks(bTrackingBall.endX, bTrackingBall.endY);
  spawnBattingFireworks(bW * 0.25, bH * 0.22);
  spawnBattingFireworks(bW * 0.75, bH * 0.22);
  spawnBattingConfetti();

  if (dom.battingHrDistText) {
    dom.battingHrDistText.textContent = `推定飛距離 ${bTrackingBall.targetDist}m！`;
  }
  if (dom.battingHomerunPopup) {
    dom.battingHomerunPopup.classList.add('show');
    addBattingTimer(() => dom.battingHomerunPopup.classList.remove('show'), 2600);
  }
}

function spawnBattingFireworks(x, y) {
  const colors = ['#ffd23f', '#ff334b', '#00d2ff', '#00ffaa', '#ff88ff', '#ffffff'];
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    bParticles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      alpha: 1.0,
      decay: 0.015 + Math.random() * 0.02
    });
  }
}

function spawnBattingConfetti() {
  const colors = ['#ffd23f', '#ff334b', '#00d2ff', '#00ffaa', '#e2e8f0', '#fb923c', '#c084fc'];
  for (let i = 0; i < 80; i++) {
    bConfetti.push({
      x: Math.random() * bW,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
      sizeW: 8 + Math.random() * 6,
      sizeH: 5 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1.0
    });
  }
}

function finishRewardBatting() {
  clearBattingTimers();
  clearRouletteAnimation();
  if (dom.battingRouletteModal) dom.battingRouletteModal.classList.add('hide');
  if (dom.rouletteDecidedCard) {
    dom.rouletteDecidedCard.classList.remove('show');
    dom.rouletteDecidedCard.classList.add('hide');
  }
  bBattingActive = false;
  bPitchTrail = [];
  if (bAnimId) {
    cancelAnimationFrame(bAnimId);
    bAnimId = null;
  }
  setBattingCameraMode('BATTER');
  if (dom.battingPitchCallout) dom.battingPitchCallout.classList.remove('show');
  if (dom.battingRivalCard) dom.battingRivalCard.classList.remove('hide-rival');

  showScreen('game');
  announce(`ナイスバッティング！第 ${state.totalSolved + 1} 問へ進もう！`);
  setupProblem();
}

function renderBatting(now) {
  if (!bBattingActive || !bCtx) return;

  try {
    if (bW <= 10 || bH <= 10) {
      resizeBattingCanvas();
    }
    bCtx.clearRect(0, 0, bW, bH);

    if (bCameraMode === 'BATTER') {
      drawBattingStrikeZone();
      drawBattingPitcherMotion(now);
      updateAndDrawPitchTrail();
      updateAndDrawBattingBall(now);
      drawBattingCursor();
      drawBattingSwingEffect();
    } else {
      updateAndDrawBattingTrackingBall(now);
      updateAndDrawBattingParticles();
      updateAndDrawBattingConfetti();
    }
  } catch (err) {
    console.error('Batting render error:', err);
  }

  bAnimId = requestAnimationFrame(renderBatting);
}

function drawBattingStrikeZone() {
  const zx = bStrikeZone.x - bStrikeZone.w / 2;
  const zy = bStrikeZone.y - bStrikeZone.h / 2;
  const zw = bStrikeZone.w;
  const zh = bStrikeZone.h;

  bCtx.save();
  bCtx.strokeStyle = 'rgba(0, 210, 255, 0.75)';
  bCtx.lineWidth = 2.5;
  bCtx.strokeRect(zx, zy, zw, zh);

  bCtx.fillStyle = 'rgba(0, 40, 90, 0.16)';
  bCtx.fillRect(zx, zy, zw, zh);

  bCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  bCtx.lineWidth = 1;
  bCtx.beginPath();
  bCtx.moveTo(zx + zw / 3, zy); bCtx.lineTo(zx + zw / 3, zy + zh);
  bCtx.moveTo(zx + (zw * 2) / 3, zy); bCtx.lineTo(zx + (zw * 2) / 3, zy + zh);
  bCtx.moveTo(zx, zy + zh / 3); bCtx.lineTo(zx + zw, zy + zh / 3);
  bCtx.moveTo(zx, zy + (zh * 2) / 3); bCtx.lineTo(zx + zw, zy + (zh * 2) / 3);
  bCtx.stroke();

  bCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  bCtx.beginPath();
  const bx = bStrikeZone.x;
  const by = zy + zh + 18;
  bCtx.moveTo(bx - 36, by);
  bCtx.lineTo(bx + 36, by);
  bCtx.lineTo(bx + 36, by + 12);
  bCtx.lineTo(bx, by + 26);
  bCtx.lineTo(bx - 36, by + 12);
  bCtx.closePath();
  bCtx.fill();
  bCtx.restore();
}

function drawBattingPitcherMotion(now) {
  if (bPitchState !== 'WINDUP') return;
  const elapsed = Math.max(0, now - bStateStartTime);
  const progress = Math.min(1, elapsed / 500);

  const pPos = getBattingPitcherPos();
  bCtx.save();
  const r = (1 - progress) * 38 + 8;
  const rival = currentRivalPitcher;
  const isSRank = rival && rival.grade === 'S';
  const ringColor = isSRank ? 'rgba(255, 51, 75,' : 'rgba(255, 210, 63,';
  bCtx.strokeStyle = `${ringColor} ${0.4 + progress * 0.6})`;
  bCtx.lineWidth = isSRank ? 4.5 : 3;
  bCtx.beginPath();
  bCtx.arc(pPos.x, pPos.y, r, 0, Math.PI * 2);
  bCtx.stroke();

  bCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  bCtx.beginPath();
  bCtx.arc(pPos.x, pPos.y, 4.5, 0, Math.PI * 2);
  bCtx.fill();
  bCtx.restore();
}

function updateAndDrawBattingBall(now) {
  if (!bBall.active || bBall.hit) return;

  const elapsed = Math.max(0, now - bBall.startTime);
  const progress = elapsed / Math.max(1, bBall.durationMs);

  if (progress >= 1.25) {
    bBall.active = false;
    sounds.playCatch();
    if (bBall.swung) {
      dom.battingStatusText.textContent = "💨 空振り！どんまい！次の10問でリベンジだ！";
    } else {
      dom.battingStatusText.textContent = "👀 見送り！次は振ってみよう！";
    }
    addBattingTimer(() => {
      finishRewardBatting();
    }, 1600);
    return;
  }

  const pPos = getBattingPitcherPos();
  const safeProgress = Math.max(0, Math.min(1.25, progress));

  // 球種ごとの変化球物理軌道オフセットを反映
  const traj = calcPitchTrajectory(bBall.pitchType, safeProgress, bBall.breakDir);
  const baseX = pPos.x + (bBall.targetX - pPos.x) * safeProgress;
  const baseY = pPos.y + (bBall.targetY - pPos.y) * safeProgress;

  bBall.x = baseX + traj.offsetX;
  bBall.y = baseY + traj.offsetY;

  const r = Math.max(4, 4 + Math.pow(safeProgress, 2.2) * 26);

  // 火の玉ストレートの炎トレイル生成
  if (bBall.pitchType === 'FIREBALL' && Math.random() < 0.75) {
    bPitchTrail.push({
      x: bBall.x + (Math.random() - 0.5) * r * 0.7,
      y: bBall.y + (Math.random() - 0.5) * r * 0.7,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 1.2,
      color: Math.random() < 0.5 ? '#ff334b' : '#ff9800',
      size: r * 0.55,
      alpha: 0.8,
      decay: 0.045
    });
  } else if (bBall.pitchType === 'CURVE' && Math.random() < 0.6) {
    bPitchTrail.push({
      x: bBall.x + (Math.random() - 0.5) * r * 0.4,
      y: bBall.y + (Math.random() - 0.5) * r * 0.4,
      vx: 0, vy: 0,
      color: '#00d2ff',
      size: r * 0.45,
      alpha: 0.6,
      decay: 0.04
    });
  }

  bCtx.save();
  // 地面影
  bCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  bCtx.beginPath();
  bCtx.ellipse(bBall.x, bStrikeZone.y + bStrikeZone.h / 2 + 10, r * 1.2, r * 0.4, 0, 0, Math.PI * 2);
  bCtx.fill();

  const rInner = Math.max(0.1, r * 0.1);
  const rOuter = Math.max(1, r);
  const grad = bCtx.createRadialGradient(bBall.x - r * 0.3, bBall.y - r * 0.3, rInner, bBall.x, bBall.y, rOuter);

  // 球種ごとのボールオーラ・質感描画
  if (bBall.pitchType === 'FIREBALL') {
    grad.addColorStop(0, '#fffbeb');
    grad.addColorStop(0.45, '#f97316');
    grad.addColorStop(1, '#dc2626');
    bCtx.shadowColor = '#ef4444';
    bCtx.shadowBlur = safeProgress > 0.6 ? 26 : 12;
  } else if (bBall.pitchType === 'CURVE') {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#38bdf8');
    grad.addColorStop(1, '#0284c7');
    bCtx.shadowColor = '#00d2ff';
    bCtx.shadowBlur = 18;
  } else if (bBall.pitchType === 'SLIDER') {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#fef08a');
    grad.addColorStop(1, '#eab308');
    bCtx.shadowColor = '#facc15';
    bCtx.shadowBlur = 16;
  } else if (bBall.pitchType === 'FORK') {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e9d5ff');
    grad.addColorStop(1, '#9333ea');
    bCtx.shadowColor = '#c084fc';
    bCtx.shadowBlur = 16;
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.75, '#f1f5f9');
    grad.addColorStop(1, '#94a3b8');
    bCtx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    bCtx.shadowBlur = safeProgress > 0.8 ? 16 : 4;
  }

  bCtx.fillStyle = grad;
  bCtx.beginPath();
  bCtx.arc(bBall.x, bBall.y, r, 0, Math.PI * 2);
  bCtx.fill();

  // ボールの縫い目
  if (safeProgress > 0.4) {
    bCtx.strokeStyle = bBall.pitchType === 'FIREBALL' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(239, 68, 68, 0.6)';
    bCtx.lineWidth = Math.max(1, r * 0.1);
    bCtx.beginPath();
    bCtx.arc(bBall.x - r * 0.2, bBall.y, r * 0.7, -0.6, 0.6);
    bCtx.stroke();
  }
  bCtx.restore();
}

function drawBattingCursor() {
  bCtx.save();
  const cx = bBatCursor.x;
  const cy = bBatCursor.y;
  const r = bBatCursor.radius;

  bCtx.strokeStyle = 'rgba(255, 210, 63, 0.85)';
  bCtx.lineWidth = 2.5;
  bCtx.fillStyle = 'rgba(255, 210, 63, 0.18)';
  bCtx.beginPath();
  bCtx.arc(cx, cy, r, 0, Math.PI * 2);
  bCtx.fill();
  bCtx.stroke();

  bCtx.strokeStyle = '#ff334b';
  bCtx.fillStyle = 'rgba(255, 51, 75, 0.5)';
  bCtx.lineWidth = 2;
  bCtx.beginPath();
  bCtx.arc(cx, cy, 10, 0, Math.PI * 2);
  bCtx.fill();
  bCtx.stroke();

  bCtx.strokeStyle = 'rgba(255, 210, 63, 0.6)';
  bCtx.lineWidth = 1.5;
  bCtx.beginPath();
  bCtx.moveTo(cx - r - 6, cy); bCtx.lineTo(cx + r + 6, cy);
  bCtx.moveTo(cx, cy - r - 6); bCtx.lineTo(cx + r + 6, cy);
  bCtx.stroke();
  bCtx.restore();
}

function drawBattingSwingEffect() {
  if (!bBatCursor.isSwinging) return;
  bBatCursor.swingProgress += 0.12;

  bCtx.save();
  const prog = bBatCursor.swingProgress;
  const alpha = Math.max(0, 1 - prog);
  bCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
  bCtx.lineWidth = 8 * (1 - prog * 0.5);
  bCtx.beginPath();
  bCtx.arc(bBatCursor.x, bBatCursor.y + 10, bBatCursor.radius * 1.6, -0.8 + prog * 1.5, 0.8 + prog * 1.5);
  bCtx.stroke();
  bCtx.restore();

  if (bBatCursor.swingProgress >= 1) {
    bBatCursor.isSwinging = false;
  }
}

function updateAndDrawBattingTrackingBall(now) {
  if (!bTrackingBall.active) return;

  const elapsed = now - bTrackingBall.startTime;
  const progress = Math.min(1.0, elapsed / bTrackingBall.durationMs);

  const curDist = Math.floor(progress * bTrackingBall.targetDist);
  if (dom.battingMeterVal) dom.battingMeterVal.textContent = `${curDist}m`;

  const curX = bTrackingBall.startX + (bTrackingBall.endX - bTrackingBall.startX) * progress;

  const p0Y = bTrackingBall.startY;
  const p1Y = bTrackingBall.apexY;
  const p2Y = bTrackingBall.endY;
  const curY = Math.pow(1 - progress, 2) * p0Y + 2 * (1 - progress) * progress * p1Y + Math.pow(progress, 2) * p2Y;

  bTrackingBall.currentX = curX;
  bTrackingBall.currentY = curY;

  const curScale = (1.0 - progress * 0.82);
  bTrackingBall.currentScale = curScale;

  const camOffsetY = Math.sin(progress * Math.PI) * -35;
  if (dom.battingImgBroadcast) {
    dom.battingImgBroadcast.style.transform = `scale(1.06) translateY(${camOffsetY}px)`;
  }

  bTrackingBall.trail.push({ x: curX, y: curY, scale: curScale, alpha: 1.0 });
  if (bTrackingBall.trail.length > 25) bTrackingBall.trail.shift();

  // トレイル
  bCtx.save();
  for (let i = 0; i < bTrackingBall.trail.length; i++) {
    const pt = bTrackingBall.trail[i];
    const trailAlpha = (i / bTrackingBall.trail.length) * 0.6;
    const trailR = Math.max(1.5, 20 * pt.scale * (i / bTrackingBall.trail.length));

    bCtx.fillStyle = bTrackingBall.isHr ? `rgba(255, 210, 63, ${trailAlpha})` : `rgba(0, 210, 255, ${trailAlpha})`;
    bCtx.shadowColor = bTrackingBall.isHr ? '#ff334b' : '#00ffaa';
    bCtx.shadowBlur = 10;
    bCtx.beginPath();
    bCtx.arc(pt.x, pt.y, trailR, 0, Math.PI * 2);
    bCtx.fill();
  }
  bCtx.restore();

  // ボール
  const ballR = Math.max(2.5, 22 * curScale);
  bCtx.save();
  bCtx.fillStyle = '#ffffff';
  bCtx.shadowColor = bTrackingBall.isHr ? '#ffd23f' : '#00d2ff';
  bCtx.shadowBlur = 24;
  bCtx.beginPath();
  bCtx.arc(curX, curY, ballR, 0, Math.PI * 2);
  bCtx.fill();

  bCtx.fillStyle = '#fff';
  bCtx.beginPath();
  bCtx.arc(curX, curY, ballR * 0.6, 0, Math.PI * 2);
  bCtx.fill();
  bCtx.restore();

  if (progress >= 1.0 && !bTrackingBall.landed) {
    if (bTrackingBall.isHr) {
      onBattingHomerunLanded();
    } else {
      bTrackingBall.landed = true;
      sounds.playCatch();
    }
  }
}

function updateAndDrawBattingParticles() {
  for (let i = bParticles.length - 1; i >= 0; i--) {
    const p = bParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      bParticles.splice(i, 1);
      continue;
    }

    bCtx.save();
    bCtx.globalAlpha = Math.max(0, p.alpha);
    bCtx.fillStyle = p.color;
    bCtx.shadowColor = p.color;
    bCtx.shadowBlur = 8;
    bCtx.beginPath();
    bCtx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.restore();
  }
}

function updateAndDrawBattingConfetti() {
  for (let i = bConfetti.length - 1; i >= 0; i--) {
    const c = bConfetti[i];
    c.x += c.vx + Math.sin(c.y * 0.02) * 1.5;
    c.y += c.vy;
    c.rot += c.rotSpeed;

    if (c.y > bH + 20) {
      bConfetti.splice(i, 1);
      continue;
    }

    bCtx.save();
    bCtx.translate(c.x, c.y);
    bCtx.rotate(c.rot);
    bCtx.fillStyle = c.color;
    bCtx.fillRect(-c.sizeW / 2, -c.sizeH / 2, c.sizeW, c.sizeH);
    bCtx.restore();
  }
}

function setBattingCursorPos(clientX, clientY) {
  if (state.screen !== 'batting' || bCameraMode !== 'BATTER' || !dom.battingCanvas) return;
  const rect = dom.battingCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const padX = bStrikeZone.w * 0.85;
  const padY = bStrikeZone.h * 0.85;
  bBatCursor.x = Math.max(bStrikeZone.x - padX, Math.min(bStrikeZone.x + padX, x));
  bBatCursor.y = Math.max(bStrikeZone.y - padY, Math.min(bStrikeZone.y + padY, y));
}

// ==========================================================================
// イベント登録
// ==========================================================================
function initEvents() {
  // つづきからスタート（前回のセーブデータで即座に再開）
  if (dom.btnResumeStart) {
    dom.btnResumeStart.addEventListener('click', () => {
      sounds.init();
      sounds.playClick();
      const lastPlayer = localStorage.getItem(STORAGE_CURRENT_PLAYER);
      if (lastPlayer) {
        startTraining(lastPlayer, false);
      }
    });
  }

  // 「最初からやる」ボタン押下 ➔ 新規選手名入力モーダルを開く
  if (dom.btnChoiceNew) {
    dom.btnChoiceNew.addEventListener('click', () => {
      sounds.init();
      sounds.playClick();
      if (dom.modalStartNew) {
        dom.modalStartNew.classList.remove('hide');
        if (dom.inputNewPlayerName) {
          dom.inputNewPlayerName.value = '';
          dom.inputNewPlayerName.focus();
        }
      }
    });
  }

  // 「記録の呼び出し」ボタン押下 ➔ 呼び出し選手名入力モーダルを開く
  if (dom.btnChoiceLoad) {
    dom.btnChoiceLoad.addEventListener('click', () => {
      sounds.init();
      sounds.playClick();
      if (dom.modalStartLoad) {
        dom.modalStartLoad.classList.remove('hide');
        if (dom.inputLoadPlayerName) {
          const lastPlayer = localStorage.getItem(STORAGE_CURRENT_PLAYER) || '';
          dom.inputLoadPlayerName.value = lastPlayer;
          dom.inputLoadPlayerName.focus();
        }
      }
    });
  }

  // 新規モーダル閉じる
  if (dom.btnCloseModalNew) {
    dom.btnCloseModalNew.addEventListener('click', () => {
      sounds.playClick();
      if (dom.modalStartNew) dom.modalStartNew.classList.add('hide');
    });
  }
  if (dom.modalStartNew) {
    dom.modalStartNew.addEventListener('click', (e) => {
      if (e.target === dom.modalStartNew) {
        dom.modalStartNew.classList.add('hide');
      }
    });
  }

  // 呼出モーダル閉じる
  if (dom.btnCloseModalLoad) {
    dom.btnCloseModalLoad.addEventListener('click', () => {
      sounds.playClick();
      if (dom.modalStartLoad) dom.modalStartLoad.classList.add('hide');
    });
  }
  if (dom.modalStartLoad) {
    dom.modalStartLoad.addEventListener('click', (e) => {
      if (e.target === dom.modalStartLoad) {
        dom.modalStartLoad.classList.add('hide');
      }
    });
  }

  // 新規スタート確定（0問から新規作成）
  function handleConfirmNew() {
    sounds.init();
    const name = dom.inputNewPlayerName ? dom.inputNewPlayerName.value.trim() : '';
    if (!name) {
      alert("選手名（なまえ）をいれてね！");
      return;
    }
    sounds.playClick();
    if (dom.modalStartNew) dom.modalStartNew.classList.add('hide');
    startTraining(name, true);
  }

  if (dom.btnConfirmNewStart) {
    dom.btnConfirmNewStart.addEventListener('click', handleConfirmNew);
  }
  if (dom.inputNewPlayerName) {
    dom.inputNewPlayerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirmNew();
    });
  }

  // 呼出スタート確定（既存データを呼び出し）
  function handleConfirmLoad() {
    sounds.init();
    const name = dom.inputLoadPlayerName ? dom.inputLoadPlayerName.value.trim() : '';
    if (!name) {
      alert("登録した選手名（なまえ）をいれてね！");
      return;
    }
    sounds.playClick();
    if (dom.modalStartLoad) dom.modalStartLoad.classList.add('hide');
    startTraining(name, false);
  }

  if (dom.btnConfirmLoadStart) {
    dom.btnConfirmLoadStart.addEventListener('click', handleConfirmLoad);
  }
  if (dom.inputLoadPlayerName) {
    dom.inputLoadPlayerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirmLoad();
    });
  }

  dom.btnTitleRanking.addEventListener('click', () => {
    sounds.init();
    sounds.playClick();
    openRankingModal();
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

  // ランキングタブ切替（正解問数 / 最長飛距離 / ホームラン数）
  document.querySelectorAll('.rank-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      sounds.playClick();
      const tab = e.currentTarget.getAttribute('data-tab');
      renderRankingTable(tab);
    });
  });

  // ⚾ バッティング画面イベントリスナー
  if (dom.battingCanvas) {
    dom.battingCanvas.addEventListener('mousemove', (e) => {
      setBattingCursorPos(e.clientX, e.clientY);
    });

    dom.battingCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        setBattingCursorPos(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    dom.battingCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        setBattingCursorPos(e.touches[0].clientX, e.touches[0].clientY);
      }
      if (state.screen === 'batting' && bCameraMode === 'BATTER') {
        executeBattingSwing();
      }
      e.preventDefault();
    }, { passive: false });

    dom.battingCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && state.screen === 'batting' && bCameraMode === 'BATTER') {
        executeBattingSwing();
      }
    });
  }

  if (dom.btnBattingSwingTouch) {
    dom.btnBattingSwingTouch.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (state.screen === 'batting' && bCameraMode === 'BATTER') {
        executeBattingSwing();
      }
    });

    dom.btnBattingSwingTouch.addEventListener('click', (e) => {
      e.currentTarget.blur();
      if (state.screen === 'batting' && bCameraMode === 'BATTER') {
        executeBattingSwing();
      }
    });
  }

  // キーボード操作（スペース・Enterキーでのスイング）
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && state.screen === 'batting' && bCameraMode === 'BATTER') {
      e.preventDefault();
      executeBattingSwing();
    }
  });

  // ボタンのフォーカスが残ってSpaceキーと干渉するのを完全防止
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('focus', (e) => e.target.blur());
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initEvents();
  checkTitleSavedData();
  showScreen('title');
  prefetchRankings();
});
