# Tascal — AI-Powered Task Management App

## Project Overview

FlaskバックエンドとReact（PWA）フロントエンドで構成するタスク管理アプリ。
AIによるタスク最適化、Stripeサブスクリプション、AdSense広告でのマネタイズを実装する。

## Architecture

```
-Tascal/
├── backend/                  # Flask API サーバー
│   ├── app/
│   │   ├── api/              # REST APIルート (Blueprint)
│   │   ├── models/           # SQLAlchemyモデル
│   │   ├── services/         # ビジネスロジック・AI最適化
│   │   └── utils/            # ヘルパー・認証
│   ├── migrations/           # Flask-Migrate
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # React PWA
│   ├── public/
│   │   └── manifest.json     # PWA設定
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # 共通UI（Button, Modal等）
│   │   │   ├── tasks/        # タスク関連コンポーネント
│   │   │   ├── calendar/     # カレンダービュー
│   │   │   ├── ai/           # AIアドバイス・最適化UI
│   │   │   └── subscription/ # Stripe決済UI
│   │   ├── pages/            # ルートページ
│   │   ├── hooks/            # カスタムフック
│   │   ├── store/            # Zustand状態管理
│   │   ├── utils/            # API クライアント等
│   │   └── styles/           # Tailwind + CSS
│   └── package.json
└── docker-compose.yml
```

## Tech Stack

### Backend
- **Flask** — APIサーバー
- **SQLAlchemy + Flask-Migrate** — ORM / マイグレーション
- **PostgreSQL** — 本番DB（開発はSQLite可）
- **Flask-JWT-Extended** — 認証
- **Stripe Python SDK** — サブスク課金
- **Anthropic SDK (claude-sonnet-4-6)** — AIタスク最適化
- **Celery + Redis** — 非同期処理（AI計算・通知）

### Frontend
- **React 18 + Vite** — UIフレームワーク
- **TypeScript** — 型安全
- **Tailwind CSS** — スタイリング
- **Zustand** — 状態管理
- **React Query (TanStack)** — サーバー状態管理
- **FullCalendar** — カレンダーUI
- **Stripe.js** — 決済フォント
- **Workbox** — PWAサービスワーカー

### Infrastructure
- **Docker Compose** — ローカル開発環境
- **Nginx** — リバースプロキシ（本番）

## Core Features

### 1. タスク管理
- タスクのCRUD（タイトル・説明・優先度・カテゴリ）
- 目標完了時間の設定（分単位）
- 実際の所要時間の記録
- ステータス管理（未着手 / 進行中 / 完了 / 超過）

### 2. AIタスク最適化（メイン機能）
- 1日のタスクを優先度・目標時間・締め切りで最適化
- 目標時間超過を検知し、残りタスクをリアルタイムで再スケジュール
- Claude APIを使った自然言語でのアドバイス生成
- 過去の実績データから個人の傾向を学習

### 3. カレンダービュー
- 月・週・日ビュー切り替え
- ドラッグ＆ドロップでタスク移動
- 別日のタスク事前登録
- 繰り返しタスク設定

### 4. マネタイズ
#### Stripe サブスクリプション
- **Free**: タスク20件/月、AI最適化3回/日
- **Pro (¥980/月)**: 無制限タスク、AI最適化無制限、高度な分析
- **Team (¥2,980/月)**: Pro機能 + チーム共有（最大5名）

#### Google AdSense
- Freeプランのみ広告表示
- Pro/Team は広告非表示

## Development Commands

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
flask run --debug
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker（推奨）
```bash
docker-compose up -d
```

## API Design

### Base URL
- 開発: `http://localhost:5000/api/v1`
- 本番: `https://api.tascal.app/api/v1`

### Endpoints
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

GET    /tasks                  # タスク一覧（日付フィルタ対応）
POST   /tasks                  # タスク作成
PATCH  /tasks/:id              # タスク更新
DELETE /tasks/:id              # タスク削除
POST   /tasks/:id/complete     # タスク完了（実績時間記録）

GET    /ai/optimize            # 今日のタスク最適化プラン取得
POST   /ai/replan              # 超過時の再計画
GET    /ai/insights            # 週次インサイト

GET    /calendar/tasks         # 期間指定タスク取得
POST   /calendar/tasks/bulk    # 複数タスク一括登録

POST   /billing/checkout       # Stripeチェックアウトセッション作成
POST   /billing/portal         # Stripe顧客ポータル
POST   /billing/webhook        # Stripeウェブフック受信
GET    /billing/subscription   # 現在のサブスク状態
```

## Environment Variables

### Backend (.env)
```
FLASK_ENV=development
SECRET_KEY=
DATABASE_URL=postgresql://user:pass@localhost/tascal
JWT_SECRET_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_TEAM=
REDIS_URL=redis://localhost:6379
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_ADSENSE_CLIENT_ID=
```

## Code Conventions

### Python (Backend)
- Black + isort でフォーマット
- pytest でテスト
- APIレスポンスは `{"data": ..., "message": ...}` 形式に統一
- エラーは `{"error": {"code": ..., "message": ...}}` 形式

### TypeScript (Frontend)
- ESLint + Prettier
- コンポーネントは `PascalCase`、ファイルも同様
- カスタムフックは `use` プレフィックス
- API呼び出しは `src/utils/api.ts` に集約

## AI Optimization Logic

タスク最適化アルゴリズムの概要（`backend/app/services/ai_optimizer.py`）:

1. その日のタスク一覧と目標時間を取得
2. 優先度・締め切り・推定時間でスコアリング
3. 利用可能時間内に収まるようスケジューリング
4. Claude APIでユーザーへの自然言語メッセージを生成
5. タスク超過検知時: 残り時間と未完タスクで再計算し再スケジュール

## Git Workflow

- ブランチ: `feature/*`, `fix/*`, `chore/*`
- コミット: Conventional Commits形式 (`feat:`, `fix:`, `chore:` 等)
- メインブランチへの直プッシュ禁止、PRでマージ
