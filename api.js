// 統合GASバックエンドのWebアプリURL（全単元共通スプレッドシート集中管理モデル）
const GAS_URL = "https://script.google.com/macros/s/AKfycbzUWv4NrZrbapQfqZzLIhjDzDejNG3hhMbxU5wyDZ78vA2oYsADe2qNCWwQmUs5swpj/exec";
const CURRENT_UNIT = "yakubun"; // 約分アプリ単元キー

// 本番連携のため false（初回アクセス時に自動でスプレッドシートにyakubunシートが作成されます）
const USE_MOCK = false;

const api = {
  // ネットワーク接続状態の確認
  isOnline() {
    return navigator.onLine;
  },

  // セッショントークンの取得
  async getSessionToken() {
    if (USE_MOCK || !this.isOnline()) {
      return "token_" + Date.now();
    }
    try {
      const res = await fetch(GAS_URL + "?action=getSession", { method: 'GET' });
      const json = await res.json();
      return json.token || ("session_" + Date.now());
    } catch (e) {
      return "token_" + Date.now();
    }
  },

  // スコア・記録登録（オンライン必須）
  async registerScore(name, score, token, battingStats) {
    if (USE_MOCK) {
      console.log(`Mock Register: ${name}, ${score}`);
      return new Promise(resolve => setTimeout(() => resolve({ success: true, rank: 1, totalPlayers: 10 }), 500));
    }

    // オフライン時はエラーを投げて登録不可とする（スキル絶対ルール）
    if (!this.isOnline()) {
      throw new Error("OFFLINE");
    }

    const payload = {
      action: 'register',
      unit: CURRENT_UNIT,
      name: name,
      score: score,
      token: token || ("t_" + Date.now())
    };

    if (battingStats) {
      payload.homeruns = battingStats.homeruns || 0;
      payload.maxDistance = battingStats.maxDistance || 0;
      payload.totalDistance = battingStats.totalDistance || 0;
    }

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // CORSプリフライト回避
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || '登録失敗');
    }
    return json;
  },

  // ランキング取得（nameを指定すると自分の順位も取得）
  async getRanking(name) {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const mockList = [
          { name: "スラッガー1号", score: 3500 },
          { name: "ベースボール小僧", score: 2900 },
          { name: "エースピッチャー", score: 2400 }
        ];
        mockList.myRank = name ? { name: name, rank: 2, score: 2900, totalPlayers: 3 } : null;
        mockList.totalPlayers = 3;
        resolve(mockList);
      }, 400));
    }

    if (!this.isOnline()) {
      throw new Error("OFFLINE");
    }

    let url = `${GAS_URL}?action=getRanking&unit=${CURRENT_UNIT}`;
    if (name) {
      url += `&name=${encodeURIComponent(name)}`;
    }

    const res = await fetch(url);
    const json = await res.json();
    if (json && json.success && Array.isArray(json.data)) {
      const list = json.data;
      list.myRank = json.myRank || null;
      list.totalPlayers = json.totalPlayers || list.length;
      return list;
    }
    throw new Error(json.error || '取得失敗');
  }
};
