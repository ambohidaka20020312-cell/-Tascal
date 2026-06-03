import os
from abc import ABC, abstractmethod

import anthropic
import requests
from flask import current_app


class BaseLLMClient(ABC):
    @abstractmethod
    def chat(self, prompt: str, max_tokens: int = 512) -> str:
        ...


class ClaudeClient(BaseLLMClient):
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = anthropic.Anthropic(
                api_key=current_app.config["ANTHROPIC_API_KEY"]
            )
        return self._client

    def chat(self, prompt: str, max_tokens: int = 512) -> str:
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            current_app.logger.error(f"Claude API error: {e}")
            return "AIアドバイスを取得できませんでした。"

    @property
    def model(self) -> str:
        return "claude-sonnet-4-6"


class OllamaClient(BaseLLMClient):
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self._model = os.getenv("OLLAMA_MODEL", "llama3.2")

    def chat(self, prompt: str, max_tokens: int = 512) -> str:
        try:
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": self._model,
                "prompt": prompt,
                "stream": False,
                "options": {"num_predict": max_tokens},
            }
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            return response.json().get("response", "AIアドバイスを取得できませんでした。")
        except requests.exceptions.ConnectionError:
            current_app.logger.error(
                f"Ollama connection error: cannot reach {self.base_url}"
            )
            return "ローカルAI（Ollama）に接続できませんでした。Ollamaが起動しているか確認してください。"
        except Exception as e:
            current_app.logger.error(f"Ollama API error: {e}")
            return "AIアドバイスを取得できませんでした。"

    @property
    def model(self) -> str:
        return self._model


def get_llm_client() -> BaseLLMClient:
    provider = os.getenv("AI_PROVIDER", "claude")
    if provider == "ollama":
        return OllamaClient()
    return ClaudeClient()
