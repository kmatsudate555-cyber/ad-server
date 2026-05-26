const API_BASE = "http://localhost:8000"; // 本番時は変更

// ストレージからトークンを取得するヘルパー
async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token"], (result) => {
      resolve(result.token || null);
    });
  });
}

// メッセージリスナー（Content Script / Popup からの通信）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_AD") {
    handleSaveAd(message.payload).then(sendResponse);
    return true; // 非同期応答を示す
  }

  if (message.type === "LOGIN") {
    handleLogin(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === "REGISTER") {
    handleRegister(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === "GET_AUTH_STATE") {
    getAuthState().then(sendResponse);
    return true;
  }

  if (message.type === "LOGOUT") {
    chrome.storage.local.remove(["token", "user"]);
    sendResponse({ success: true });
  }
});

async function handleSaveAd(adData) {
  const token = await getToken();
  if (!token) {
    return { success: false, error: "ログインが必要です" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/ads/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(adData),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "保存に失敗しました" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: "サーバーに接続できません" };
  }
}

async function handleLogin({ email, password }) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "ログインに失敗しました" };
    }

    const data = await response.json();
    chrome.storage.local.set({
      token: data.access_token,
      user: { email: data.email, display_name: data.display_name, user_id: data.user_id },
    });
    return { success: true, user: data };
  } catch (e) {
    return { success: false, error: "サーバーに接続できません" };
  }
}

async function handleRegister({ email, password, display_name }) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.detail || "登録に失敗しました" };
    }

    const data = await response.json();
    chrome.storage.local.set({
      token: data.access_token,
      user: { email: data.email, display_name: data.display_name, user_id: data.user_id },
    });
    return { success: true, user: data };
  } catch (e) {
    return { success: false, error: "サーバーに接続できません" };
  }
}

async function getAuthState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token", "user"], (result) => {
      resolve({
        isLoggedIn: !!result.token,
        user: result.user || null,
        token: result.token || null,
      });
    });
  });
}
