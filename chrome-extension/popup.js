const API_BASE = "https://tascal-api.onrender.com/api/v1";

const loginView = document.getElementById("login-view");
const loggedView = document.getElementById("logged-view");
const statusDot = document.getElementById("status-dot");
const loginError = document.getElementById("login-error");
const addSuccess = document.getElementById("add-success");

async function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

async function init() {
  const { access_token, user_name, user_email } = await getStorage([
    "access_token", "user_name", "user_email",
  ]);

  if (access_token) {
    showLoggedIn(user_name, user_email);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.style.display = "block";
  loggedView.style.display = "none";
  statusDot.classList.remove("logged-in");
}

function showLoggedIn(name, email) {
  loginView.style.display = "none";
  loggedView.style.display = "block";
  statusDot.classList.add("logged-in");
  document.getElementById("user-name").textContent = name || "ユーザー";
  document.getElementById("user-email").textContent = email || "";
}

// ログイン
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("login-btn");

  if (!email || !password) return;
  btn.disabled = true;
  btn.textContent = "...";
  loginError.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data?.error?.message ?? "ログインに失敗しました";
      loginError.style.display = "block";
      return;
    }
    const d = data.data ?? data;
    await chrome.storage.local.set({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      user_name: d.user?.name ?? "",
      user_email: d.user?.email ?? email,
    });
    showLoggedIn(d.user?.name, d.user?.email ?? email);
  } catch {
    loginError.textContent = "ネットワークエラーが発生しました";
    loginError.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "ログイン";
  }
});

// Enter でログイン
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

// クイックタスク追加
document.getElementById("add-btn").addEventListener("click", async () => {
  const input = document.getElementById("task-input");
  const title = input.value.trim();
  if (!title) return;

  const btn = document.getElementById("add-btn");
  btn.disabled = true;
  btn.textContent = "...";
  addSuccess.style.display = "none";

  const { access_token, refresh_token } = await getStorage(["access_token", "refresh_token"]);
  const today = new Date().toISOString().split("T")[0];

  try {
    let res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ title: title.slice(0, 100), scheduled_date: today, priority: "medium" }),
    });

    if (res.status === 401 && refresh_token) {
      const refreshed = await doRefresh(refresh_token);
      if (refreshed) {
        res = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshed.access_token}`,
          },
          body: JSON.stringify({ title: title.slice(0, 100), scheduled_date: today, priority: "medium" }),
        });
      }
    }

    if (res.ok) {
      input.value = "";
      addSuccess.style.display = "block";
      setTimeout(() => (addSuccess.style.display = "none"), 2000);
    }
  } catch {
    // silent fail
  } finally {
    btn.disabled = false;
    btn.textContent = "タスクを追加";
  }
});

// Enter で追加（Shift+Enterは改行）
document.getElementById("task-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("add-btn").click();
  }
});

// ログアウト
document.getElementById("logout-btn").addEventListener("click", async () => {
  await chrome.storage.local.clear();
  showLogin();
});

async function doRefresh(refreshToken) {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tokens = {
      access_token: data.data?.access_token ?? data.access_token,
      refresh_token: data.data?.refresh_token ?? data.refresh_token ?? refreshToken,
    };
    await chrome.storage.local.set(tokens);
    return tokens;
  } catch {
    return null;
  }
}

init();
