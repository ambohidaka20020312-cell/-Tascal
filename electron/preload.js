const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  // 将来の拡張用（通知、ファイルダイアログ等）
});
