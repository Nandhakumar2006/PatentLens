from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def llm_configured() -> bool:
    settings = get_settings()
    return bool(settings.LLM_API_KEY and settings.LLM_PROVIDER)


def generate_llm_text(prompt: str) -> str | None:
    settings = get_settings()
    if not llm_configured():
        return None
    provider = settings.LLM_PROVIDER.lower()
    try:
        if provider in {"openai", "openai-compatible", "groq", "together"}:
            base = settings.LLM_BASE_URL or "https://api.openai.com/v1"
            headers = {"Authorization": f"Bearer {settings.LLM_API_KEY}"}
            payload = {
                "model": settings.LLM_MODEL or "gpt-4o-mini",
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
