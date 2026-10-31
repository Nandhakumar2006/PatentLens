from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def llm_configured() -> bool:
    settings = get_settings()
    provider = (settings.LLM_PROVIDER or "").lower()
    if provider in {"ollama", "local", "vllm"}:
        return True
    return bool(settings.LLM_API_KEY and settings.LLM_PROVIDER)


def generate_llm_text(prompt: str) -> str | None:
    settings = get_settings()
    if not llm_configured():
        return None

    provider = (settings.LLM_PROVIDER or "").lower()
    try:
        # 1. Local GPU-accelerated LLM (Ollama / vLLM / Local OpenAI compatible)
        if provider in {"ollama", "local", "vllm"}:
            base = settings.LLM_BASE_URL or "http://localhost:11434/v1"
            headers = {"Authorization": f"Bearer {settings.LLM_API_KEY}"} if settings.LLM_API_KEY else {}
            payload = {
                "model": settings.LLM_MODEL or "llama3.2:3b",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You summarize retrieved patent text. "
                            "Use only the provided excerpts. Never invent claims, citations, or metadata."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }
            with httpx.Client(timeout=45) as client:
                response = client.post(f"{base.rstrip('/')}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"].strip()

        # 2. Cloud OpenAI / Groq / Together Provider
        if provider in {"openai", "openai-compatible", "groq", "together"}:
            base = settings.LLM_BASE_URL or "https://api.openai.com/v1"
            headers = {"Authorization": f"Bearer {settings.LLM_API_KEY}"}
            payload = {
                "model": settings.LLM_MODEL or "llama-3.1-8b-instant",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You summarize retrieved patent text. "
                            "Use only the provided excerpts. Never invent claims, citations, or metadata."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }
            with httpx.Client(timeout=30) as client:
                response = client.post(f"{base.rstrip('/')}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"].strip()

        logger.warning("Unsupported LLM provider: %s", settings.LLM_PROVIDER)
        return None
    except Exception as exc:
        logger.warning("LLM request failed: %s", exc)
        return None
