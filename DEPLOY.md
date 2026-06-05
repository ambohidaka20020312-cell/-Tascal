# Tascal デプロイ手順書

## Render（本番環境）へのデプロイ

### 初回デプロイ手順

1. [render.com](https://render.com) にログイン
2. 「New → Blueprint」を選択
3. GitHubリポジトリを連携して選択
4. `render.yaml` が自動検出されるので「Apply」をクリック
5. **tascal-api の Environment タブ** で手動設定：

| 変数名 | 値 |
|--------|-----|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_ID_PRO` | `price_...` |
| `MAIL_PASSWORD` | Gmailアプリパスワード（16桁） |
| `ALLOWED_ORIGINS` | `https://tascal-frontend.onrender.com` |
| `FRONTEND_URL` | `https://tascal-frontend.onrender.com` |

6. **tascal-frontend の Environment タブ** で設定：

| 変数名 | 値 |
|--------|-----|
| `VITE_API_BASE_URL` | `https://tascal-api.onrender.com/api/v1` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

---

### Gmail アプリパスワードの取得

1. [myaccount.google.com/security](https://myaccount.google.com/security) で2段階認証を有効化
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) を開く
3. アプリ名「Tascal」で作成 → 16桁のパスワードをコピー
4. Render の `MAIL_PASSWORD` に設定（スペースなし）

---

### Stripe Webhook 設定

1. Stripe → Webhooks → 「Add endpoint」
2. URL: `https://tascal-api.onrender.com/api/v1/billing/webhook`
3. イベント: `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Signing secret を `STRIPE_WEBHOOK_SECRET` に設定

---

### デプロイ後の確認

```bash
curl https://tascal-api.onrender.com/api/v1/health
# 期待レスポンス: {"status":"ok"}
```

---

## ローカル開発環境（Docker）

```bash
cp backend/.env.example backend/.env
docker-compose up -d
docker-compose exec backend flask db upgrade
```

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:5000

---

## 注意事項

- Renderの**無料プラン**はアクセスがないとスリープ（コールドスタート約30秒）。有料プラン$7/月で常時起動
- Gmailは1日500通上限。ユーザーが増えたらResendまたはSendGridへ移行
- PostgreSQL無料プランは90日間放置で自動削除
