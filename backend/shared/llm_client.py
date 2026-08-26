import os
from typing import Dict, Any, Optional


class LLMClient:
    """
    SkillTwin LLM Client Foundation.
    Provides structured intelligence interface with graceful fallbacks.
    (Detailed prompt engineering & extraction logic will be activated in later phases).
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model

    @property
    def is_configured(self) -> bool:
        """Check if LLM credentials are provided."""
        return bool(self.api_key and self.api_key.strip())

    def get_status(self) -> Dict[str, Any]:
        """Return LLM client status for system health reports."""
        return {
            "configured": self.is_configured,
            "model": self.model if self.is_configured else "none",
            "provider": "OpenAI Compatible" if self.is_configured else "not_configured"
        }


# Singleton client instance
llm_client = LLMClient()
