# Tascal モバイルアプリ ビルド手順

## 前提条件

### 共通
- Node.js 18 以上
- npm 9 以上
- Capacitor CLI（`frontend/package.json` の devDependency として管理）

### iOS ビルド
- macOS 13 (Ventura) 以上
- Xcode 15 以上（App Store Connect への提出には最新版を推奨）
- CocoaPods（`sudo gem install cocoapods`）
- Apple Developer アカウント（実機テスト・配布に必要）

### Android ビルド
- Android Studio Hedgehog (2023.1.1) 以上
- Android SDK API Level 33 以上
- JDK 17 以上（Android Studio に同梱）

---

## ビルドコマンド

### 初回セットアップ

```bash
cd frontend
npm install

# iOS プラットフォームを追加（初回のみ）
npx cap add ios

# Android プラットフォームを追加（初回のみ）
npx cap add android
```

### iOS ビルド & Xcode 起動

```bash
cd frontend
npm run cap:ios
```

上記コマンドは以下を順に実行します:
1. `npm run build` — React アプリを `dist/` へビルド
2. `npx cap sync ios` — `dist/` を `ios/` へコピーし、プラグインを同期
3. `npx cap open ios` — Xcode プロジェクトを開く

### Android ビルド & Android Studio 起動

```bash
cd frontend
npm run cap:android
```

上記コマンドは以下を順に実行します:
1. `npm run build` — React アプリを `dist/` へビルド
2. `npx cap sync android` — `dist/` を `android/` へコピーし、プラグインを同期
3. `npx cap open android` — Android Studio プロジェクトを開く

### Web アセットのみ同期（コード変更後）

```bash
cd frontend
npm run cap:build
```

---

## iOS 証明書設定手順（概要）

1. **Apple Developer Portal** (`https://developer.apple.com`) にサインイン

2. **App ID の登録**
   - Identifiers → App IDs → `+` ボタン
   - Bundle ID: `app.tascal.tasks`
   - Push Notifications ケイパビリティを有効化

3. **プロビジョニングプロファイルの作成**
   - 開発用: Development プロファイルを作成し、テストデバイスを追加
   - 本番用: App Store Distribution プロファイルを作成

4. **Xcode での設定**
   - `ios/App/App.xcworkspace` を開く
   - ターゲット → Signing & Capabilities タブ
   - Team を選択し、Bundle Identifier を `app.tascal.tasks` に設定
   - 自動署名 (Automatically manage signing) を有効化、または手動でプロビジョニングプロファイルを選択

5. **Push Notifications の有効化（Xcode）**
   - `+ Capability` → Push Notifications を追加
   - Background Modes → Remote notifications にチェック

---

## Android 証明書設定手順（概要）

1. **リリース用キーストアの生成**（初回のみ）

   ```bash
   keytool -genkey -v -keystore tascal-release.jks \
     -alias tascal -keyalg RSA -keysize 2048 -validity 10000
   ```

   生成した `.jks` ファイルはリポジトリに含めず、安全な場所で管理してください。

2. **`android/app/build.gradle` への署名設定追加**

   ```groovy
   android {
     signingConfigs {
       release {
         storeFile file("path/to/tascal-release.jks")
         storePassword "YOUR_STORE_PASSWORD"
         keyAlias "tascal"
         keyPassword "YOUR_KEY_PASSWORD"
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
       }
     }
   }
   ```

   パスワードは環境変数または `~/.gradle/gradle.properties` に記載することを推奨します。

3. **APK / AAB のビルド**
   - Android Studio → Build → Generate Signed Bundle/APK
   - Google Play への提出には AAB 形式を選択

---

## トラブルシューティング

| 現象 | 対処 |
|------|------|
| `pod install` が失敗する | `cd ios/App && pod repo update && pod install` を実行 |
| Capacitor のバージョン不一致警告 | `npx cap sync` を再実行し、iOS/Android プロジェクトを更新 |
| Android ビルドで Gradle エラー | Android Studio の SDK Manager でビルドツールを最新化 |
| Push 通知がシミュレータで動作しない | 実機でテスト（iOS シミュレータは Push 非対応） |
