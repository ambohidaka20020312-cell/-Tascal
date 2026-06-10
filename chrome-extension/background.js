const API_BASE = "https://tascal-api.onrender.com/api/v1";

// コンテキストメニュー作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-page-to-tascal",
    title: "Tascalにタスクとして追加",
    contexts: ["page", "link"],
  });
  chrome.contextMenus.create({
    id: "add-selection-to-tascal",
    title: "「%s」をTascalに追加",
    contexts: ["selection"],
  });
});

// クリック処理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tokens = await getTokens();
  if (!tokens.access_token) {
    // 未ログイン → ポップアップを開くよう通知
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Tascal",
      message: "先にTascalにログインしてください（拡張機能アイコンをクリック）",
    });
    return;
  }

  let title = "";
  let notes = "";

  if (info.menuItemId === "add-selection-to-tascal") {
    title = info.selectionText?.trim().slice(0, 100) ?? "";
    notes = tab?.url ?? "";
  } else {
    // page or link
    const url = info.linkUrl ?? info.pageUrl ?? tab?.url ?? "";
    title = tab?.title?.trim().slice(0, 100) ?? url;
    notes = url;
  }

  await addTask(tokens, title, notes);
});

async function addTask(tokens, title, notes) {
  const today = new Date().toISOString().split("T")[0];
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        title,
        notes: notes || undefined,
        scheduled_date: today,
        priority: "medium",
      }),
    });

    if (res.status === 401) {
      // トークンリフレッシュを試みる
      const refreshed = await refreshToken(tokens.refresh_token);
      if (refreshed) {
        await addTask(refreshed, title, notes);
        return;
      }
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Tascal",
        message: "ログインが切れました。再ログインしてください。",
      });
      return;
    }

    if (!res.ok) throw new Error("API error");

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Tascal ✓",
      message: `「${title}」をタスクに追加しました`,
    });
  } catch {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Tascal",
      message: "タスクの追加に失敗しました。",
    });
  }
}

async function refreshToken(refreshTk) {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshTk }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newTokens = {
      access_token: data.data?.access_token ?? data.access_token,
      refresh_token: data.data?.refresh_token ?? data.refresh_token ?? refreshTk,
    };
    await chrome.storage.local.set(newTokens);
    return newTokens;
  } catch {
    return null;
  }
}

async function getTokens() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["access_token", "refresh_token"], resolve);
  });
}
