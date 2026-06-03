# ローカルLLM（Ollama）セットアップガイド

Tascalは法人ユーザー向けに、データを外部に送らずAI機能を利用できる **Ollamaローカルモード** に対応しています。

---

## 1. Ollamaのインストール

### macOS
```bash
brew install ollama
```
または https://ollama.com/download から `.dmg` をダウンロード。

### Windows
https://ollama.com/download から `.exe` インストーラーをダウンロード。

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

インストール後、Ollamaサービスを起動:
```bash
ollama serve
```

---

## 2. 推奨モデルと性能比較

| モデル | サイズ | 速度 | 品質 | 用途 |
|--------|--------|------|------|------|
| `llama3.2` | 2GB | ★★★ | ★★★ | バランス型（デフォルト） |
| `llama3.2:1b` | 1.3GB | ★★★★ | ★★ | 低スペックPC向け |
| `qwen2.5` | 4.7GB | ★★ | ★★★★ | 日本語精度が高い（推奨） |
| `qwen2.5:3b` | 1.9GB | ★★★ | ★★★ | 日本語・軽量バランス |
| `mistral` | 4.1GB | ★★ | ★★★ | 汎用英語タスク向け |

**日本語タスク管理には `qwen2.5` または `llama3.2` がおすすめです。**

モデルのダウンロード:
```bash
ollama pull llama3.2
# または
ollama pull qwen2.5
```

---

## 3. Tascal の `.env` 設定

`backend/.env` を編集してローカルモードに切り替えます:

```dotenv
# AIプロバイダーをollamaに変更
AI_PROVIDER=ollama

# Ollamaのエンドポイント（デフォルト: http://localhost:11434）
OLLAMA_BASE_URL=http://localhost:11434

# 使用するモデル
OLLAMA_MODEL=llama3.2
```

Claude APIに戻すには:
```dotenv
AI_PROVIDER=claude
```

---

## 4. Docker Compose での起動

`docker-compose.yml` のOllamaサービスのコメントを解除します:

```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama

volumes:
  pgdata:
  ollama_data:
```

起動後、コンテナ内でモデルをダウンロード:
```bash
docker compose exec ollama ollama pull llama3.2
```

backendサービスのOLLAMA_BASE_URLはDockerネットワーク内のサービス名を使います:
```dotenv
OLLAMA_BASE_URL=http://ollama:11434
```

---

## 5. GPU使用の設定（NVIDIA）

`docker-compose.yml` のGPU設定コメントを解除:

```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

事前に [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) のインストールが必要です。

ホスト上でGPUを使う場合は、`ollama serve` を実行するだけで自動的にGPUが利用されます。

---

## 6. 動作確認

APIエンドポイントでプロバイダー情報を確認:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/v1/ai/provider
# {"data": {"provider": "ollama", "model": "llama3.2", "is_local": true}}
```

フロントエンドのAIアドバイスパネルにも「🔒 ローカルAI」バッジが表示されます。
