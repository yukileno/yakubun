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
      const res = await fetch(GAS_URL + "?action=getSession", { 
        method: 'GET',
        credentials: 'omit',
        redirect: 'follow'
      });
      const text = await res.text();
      const json = JSON.parse(text);
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
      credentials: 'omit',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // CORSプリフライト回避
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("registerScore parsing failed:", text.substring(0, 200));
      throw new Error("通信エラーが発生しました");
    }

    if (!json.success) {
      throw new Error(json.error || '登録失敗');
    }
    return json;
  },

  // ランキング取得（POSTを優先し、Googleアカウント認証競合・AccountChooserリダイレクトを完全回避）
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

    const payload = {
      action: 'getRanking',
      unit: CURRENT_UNIT
    };
    if (name) {
      payload.name = name;
    }

    // ★ まず安全なPOST（text/plain Simple Request）で試行（GoogleアカウントCookieの干渉を受けない）
    try {
      const postRes = await fetch(GAS_URL, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      const postText = await postRes.text();
      const postJson = JSON.parse(postText);
      if (postJson && postJson.success && Array.isArray(postJson.data)) {
        const list = postJson.data;
        list.myRank = postJson.myRank || null;
        list.totalPlayers = postJson.totalPlayers || list.length;
        return list;
      }
    } catch (postErr) {
      console.warn("POST getRanking failed, trying GET fallback:", postErr);
    }

    // ★ POSTが万一失敗した場合はGETフォールバック
    let url = `${GAS_URL}?action=getRanking&unit=${CURRENT_UNIT}`;
    if (name) {
      url += `&name=${encodeURIComponent(name)}`;
    }
    url += `&_t=${Date.now()}`; // キャッシュバスター

    const getRes = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'follow'
    });
    const getText = await getRes.text();
    let getJson;
    try {
      getJson = JSON.parse(getText);
    } catch (e) {
      console.error("GET getRanking parsing failed:", getText.substring(0, 200));
      if (getText.trim().startsWith('<')) {
        throw new Error('Googleアカウントの認証競合が発生しました。別タブのGoogleアカウントを確認するか、しばらく待って再読み込みしてください。');
      }
      throw new Error('ランキングの解析に失敗しました');
    }

    if (getJson && getJson.success && Array.isArray(getJson.data)) {
      const list = getJson.data;
      list.myRank = getJson.myRank || null;
      list.totalPlayers = getJson.totalPlayers || list.length;
      return list;
    }
    throw new Error(getJson ? getJson.error : 'ランキング取得失敗');
  }
};
