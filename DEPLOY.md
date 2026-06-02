# Tascal デプロイ手順書

## Railway デプロイ手順

1. **Railwayプロジェクト作成**
   - [Railway](https://railway.app) にログインし、「New Project」→「Deploy from GitHub repo」を選択。
   - `Tascal` リポジトリを連携し、`main` ブランチをデプロイ対象に設定する。

2. **PostgreSQL サービスを追加**
   - プロジェクト画面で「Add Service」→「Database」→「PostgreSQL」を追加。
   - 自動的に `DATABASE_URL` 環境変数がバックエンドサービスに注入される。

3. **環境変数を設定**
   - バックエンドサービスの「Variables」タブで下記「環境変数設定一覧」を入力する。
   - `railway.json` に従い Dockerfile ビルドが自動で走る。

4. **マイグレーションを実行**
   - Railway の「Shell」タブで以下を実行する:
     ```bash
     cd backend && flask db upgrade
     ```
   - または `wsgi.py` の `db.create_all()` により初回起動時に自動作成される。

5. **デプロイ確認**
   - サービスのログを確認し、`Running on 0.0.0.0` が表示されればOK。
   - `/health` エンドポイントにアクセスして `200 OK` を確認する。

---

## Render デプロイ手順

1. **Renderアカウントと連携**
   - [Render](https://render.com) にログインし、「New」→「Blueprint」を選択。
   - `render.yaml` を含むリポジトリを選択すると、バックエンド・フロントエンド・DBが一括作成される。

2. **DBの起動を確認**
   - `tascal-db` (PostgreSQL) サービスが起動するまで待つ（通常1〜2分）。
   - 接続文字列はバックエンドに自動で注入される。

3. **環境変数を設定**
   - `tascal-api` サービスの「Environment」から下記「環境変数設定一覧」を入力する。
   - `SECRET_KEY` / `JWT_SECRET_KEY` は `render.yaml` の `generateValue: true` で自動生成される。

4. **マイグレーションを実行**
   - Render の「Shell」タブで以下を実行する:
     ```bash
     cd backend && flask db upgrade
     ```

5. **フロントエンドのビルド確認**
   - `tascal-frontend` サービスの「Events」でビルドログを確認する。
   - ビルド完了後に発行されるURLにアクセスして動作を確認する。

---

## 環境変数設定一覧

### バックエンド (tascal-api)

| キー | 説明 | 必須 |
|------|------|------|
| `FLASK_ENV` | `production` 固定 | 必須 |
| `DATABASE_URL` | PostgreSQL接続文字列 | 必須（自動注入） |
| `SECRET_KEY` | Flaskセッション秘密鍵 | 必須 |
| `JWT_SECRET_KEY` | JWT署名鍵 | 必須 |
| `ANTHROPIC_API_KEY` | Claude API キー | 必須 |
| `STRIPE_SECRET_KEY` | Stripe秘密キー (`sk_live_...`) | 必須 |
| `STRIPE_WEBHOOK_SECRET` | Stripeウェブフック署名シークレット | 必須 |
| `STRIPE_PRICE_ID_PRO` | ProプランのStripe価格ID | 必須 |
| `STRIPE_PRICE_ID_TEAM` | TeamプランのStripe価格ID | 必須 |
| `REDIS_URL` | Redis接続URL（Celery用） | 任意 |

### フロントエンド (tascal-frontend)

| キー | 説明 | 必須 |
|------|------|------|
| `VITE_API_BASE_URL` | バックエンドAPIのURL | 必須 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe公開キー (`pk_live_...`) | 必須 |
| `VITE_ADSENSE_CLIENT_ID` | AdSenseクライアントID | 任意 |

---

## Stripeウェブフック設定手順

1. [Stripe ダッシュボード](https://dashboard.stripe.com) →「開発者」→「Webhook」→「エンドポイントを追加」をクリック。
2. エンドポイントURL に本番URLを設定する:
   - Railway: `https://<サービス名>.up.railway.app/api/v1/billing/webhook`
   - Render: `https://tascal-api.onrender.com/api/v1/billing/webhook`
3. リッスンするイベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. 「エンドポイントを追加」をクリックし、表示された「署名シークレット」(`whsec_...`) をコピー。
5. バックエンドの環境変数 `STRIPE_WEBHOOK_SECRET` に設定する。

---

## カスタムドメイン設定

### Railway
1. サービスの「Settings」→「Domains」→「Custom Domain」をクリック。
2. 使用するドメイン（例: `api.tascal.app`）を入力。
3. 表示されるCNAMEレコードをDNSプロバイダーに追加する。
4. SSL証明書はRailwayが自動発行する。

### Render
1. サービスの「Settings」→「Custom Domains」→「Add Custom Domain」をクリック。
2. ドメインを入力し、表示されるCNAMEレコードをDNSに追加する。
3. フロントエンド（`tascal-frontend`）にはSPAルーティング用のリライトルールが `render.yaml` に設定済み。

### DNS設定例

| タイプ | ホスト名 | 値 |
|--------|----------|-----|
| CNAME | `api` | `<railway/render が発行するCNAME>` |
| CNAME | `www` | `<frontend サービスのCNAME>` |
| A / CNAME | `@` | `<apex ドメイン用レコード>` |
