const MYPAGE_URL = "http://localhost:5173"; // 本番時は変更

// DOM要素
const viewLoggedIn = document.getElementById("view-loggedin");
const viewAuth = document.getElementById("view-auth");
const userEmailEl = document.getElementById("user-email");
const savedCountEl = document.getElementById("saved-count");
const mypageLink = document.getElementById("mypage-link");
const logoutBtn = document.getElementById("logout-btn");

const loginEmailEl = document.getElementById("login-email");
const loginPasswordEl = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginErrorEl = document.getElementById("login-error");

const regNameEl = document.getElementById("reg-name");
const regEmailEl = document.getElementById("reg-email");
const regPasswordEl = document.getElementById("reg-password");
const registerBtn = document.getElementById("register-btn");
const registerErrorEl = document.getElementById("register-error");

// タブ切り替え
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.tab;
    document.getElementById("form-login").classList.toggle("hidden", target !== "login");
    document.getElementById("form-register").classList.toggle("hidden", target !== "register");
  });
});

// 起動時に認証状態を確認
chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (res) => {
  if (res?.isLoggedIn) {
    showLoggedIn(res.user);
    fetchSavedCount(res.token);
  } else {
    showAuth();
  }
});

function showLoggedIn(user) {
  viewLoggedIn.classList.remove("hidden");
  viewAuth.classList.add("hidden");
  userEmailEl.textContent = user?.display_name || user?.email || "";
  mypageLink.href = MYPAGE_URL;
}

function showAuth() {
  viewLoggedIn.classList.add("hidden");
  viewAuth.classList.remove("hidden");
}

function fetchSavedCount(token) {
  fetch("http://localhost:8000/api/ads/?per_page=1", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => {
      savedCountEl.textContent = `${data.total || 0}件 保存済み`;
    })
    .catch(() => {
      savedCountEl.textContent = "-- 件";
    });
}

// ログイン
loginBtn.addEventListener("click", async () => {
  const email = loginEmailEl.value.trim();
  const password = loginPasswordEl.value;

  if (!email || !password) {
    showError(loginErrorEl, "メールアドレスとパスワードを入力してください");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "ログイン中...";
  loginErrorEl.classList.add("hidden");

  chrome.runtime.sendMessage({ type: "LOGIN", payload: { email, password } }, (res) => {
    loginBtn.disabled = false;
    loginBtn.textContent = "ログイン";

    if (res?.success) {
      showLoggedIn(res.user);
      fetchSavedCount(res.user.access_token);
    } else {
      showError(loginErrorEl, res?.error || "ログインに失敗しました");
    }
  });
});

// 新規登録
registerBtn.addEventListener("click", async () => {
  const email = regEmailEl.value.trim();
  const password = regPasswordEl.value;
  const display_name = regNameEl.value.trim();

  if (!email || !password) {
    showError(registerErrorEl, "メールアドレスとパスワードを入力してください");
    return;
  }
  if (password.length < 8) {
    showError(registerErrorEl, "パスワードは8文字以上にしてください");
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = "登録中...";
  registerErrorEl.classList.add("hidden");

  chrome.runtime.sendMessage(
    { type: "REGISTER", payload: { email, password, display_name } },
    (res) => {
      registerBtn.disabled = false;
      registerBtn.textContent = "登録して始める";

      if (res?.success) {
        showLoggedIn(res.user);
      } else {
        showError(registerErrorEl, res?.error || "登録に失敗しました");
      }
    }
  );
});

// ログアウト
logoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    showAuth();
  });
});

// Enterキー対応
loginPasswordEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});
regPasswordEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") registerBtn.click();
});

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}
