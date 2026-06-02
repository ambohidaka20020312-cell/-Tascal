# Tascal デスクトップアプリ ビルド手順

Tauri v2 を使用して Mac / Windows / Linux 向けネイティブデスクトップアプリをビルドします。

## 前提条件

### 共通
- **Node.js** 18 以上
- **Rust** (最新の stable)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### macOS
- **Xcode Command Line Tools**
  ```bash
  xcode-select --install
  ```

### Windows
- **Microsoft C++ Build Tools** または **Visual Studio** (C++ ワークロード付き)
  - [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) からインストール
- **WebView2** (Windows 10/11 は通常プリインストール済み)

### Linux
- 以下のパッケージが必要（Ubuntu/Debian系）
  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```

## セットアップ

```bash
cd frontend
npm install
```

## 開発サーバー起動

Vite の開発サーバーと Tauri ウィンドウを同時に起動します。

```bash
cd frontend
npm run tauri:dev
```

## プロダクションビルド

```bash
cd frontend
npm run tauri:build
```

## 出力ファイルの場所

ビルド成果物は `frontend/src-tauri/target/release/bundle/` 以下に出力されます。

| OS      | 形式                    | パス例                                              |
|---------|-------------------------|-----------------------------------------------------|
| macOS   | `.dmg` / `.app`         | `bundle/dmg/Tascal_0.1.0_x64.dmg`                  |
| Windows | `.msi` / `.exe`         | `bundle/msi/Tascal_0.1.0_x64_en-US.msi`            |
| Linux   | `.deb` / `.rpm` / AppImage | `bundle/deb/tascal_0.1.0_amd64.deb`             |

## アイコンの準備

`frontend/src-tauri/icons/` ディレクトリに以下のファイルを配置してください。

```
icons/
├── 32x32.png
├── 128x128.png
├── 128x128@2x.png
├── icon.icns      (macOS用)
└── icon.ico       (Windows用)
```

Tauri CLI でまとめて生成することも可能です（1024x1024 の PNG を元画像として用意）。

```bash
npm run tauri icon path/to/icon-1024.png
```

## 通知・自動起動機能

`frontend/src/hooks/useTauri.ts` にて以下のフックを提供しています。

- **`useTauriNotification`** — ネイティブ通知の送信（ブラウザでは Web Notification API にフォールバック）
- **`useAutostart`** — OS 起動時の自動起動を有効化 / 無効化
- **`isTauri()`** — Tauri 環境かどうかの判定
