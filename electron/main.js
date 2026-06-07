const { app, BrowserWindow, shell, Menu, nativeTheme } = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const isMac = process.platform === "darwin";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../frontend/public/icon-512.png"),
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
  }

  // 外部リンクはブラウザで開く
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  // macOS: Dockアイコンクリックで再表示
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

// macOSのネイティブメニュー
if (isMac) {
  const template = [
    {
      label: "Tascal",
      submenu: [
        { label: "Tascalについて", role: "about" },
        { type: "separator" },
        { label: "設定...", accelerator: "Cmd+,", click: () => {
          BrowserWindow.getFocusedWindow()?.webContents.executeJavaScript(
            "window.location.hash = '/app/settings'"
          );
        }},
        { type: "separator" },
        { label: "Tascalを終了", role: "quit" },
      ],
    },
    {
      label: "編集",
      submenu: [
        { label: "元に戻す", role: "undo" },
        { label: "やり直す", role: "redo" },
        { type: "separator" },
        { label: "切り取り", role: "cut" },
        { label: "コピー", role: "copy" },
        { label: "貼り付け", role: "paste" },
        { label: "すべて選択", role: "selectAll" },
      ],
    },
    {
      label: "表示",
      submenu: [
        { label: "再読み込み", role: "reload" },
        { type: "separator" },
        { label: "実際のサイズ", role: "resetZoom" },
        { label: "拡大", role: "zoomIn" },
        { label: "縮小", role: "zoomOut" },
        { type: "separator" },
        { label: "全画面表示", role: "togglefullscreen" },
      ],
    },
    {
      label: "ウインドウ",
      submenu: [
        { label: "しまう", role: "minimize" },
        { label: "拡大/縮小", role: "zoom" },
        { type: "separator" },
        { label: "すべてを手前に移動", role: "front" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
