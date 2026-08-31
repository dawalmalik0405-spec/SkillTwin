import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import httpx

# Load environment variables from project root .env
_root_dir = Path(__file__).resolve().parent.parent.parent
_env_path = _root_dir / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)


class LLMClient:
    """
    SkillTwin LLM Client - OpenRouter Integration.
    Provides structured intelligence interface using OpenRouter API.
    OpenRouter provides access to multiple LLM models through a unified API.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: str = "https://openrouter.ai/api/v1"
    ):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model or os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
        self.base_url = base_url
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def is_configured(self) -> bool:
        """Check if OpenRouter credentials are provided."""
        return bool(self.api_key and self.api_key.strip())

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "https://skilltwin.app",
                    "X-Title": "SkillTwin",
                    "Content-Type": "application/json"
                },
                timeout=60.0
            )
        return self._client

    def get_status(self) -> Dict[str, Any]:
        """Return LLM client status for system health reports."""
        return {
            "configured": self.is_configured,
            "model": self.model if self.is_configured else "none",
            "provider": "OpenRouter" if self.is_configured else "not_configured",
            "base_url": self.base_url
        }

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """
        Send a chat completion request to OpenRouter.

        Args:
            messages: List of message objects with 'role' and 'content'
            system_prompt: Optional system prompt to prepend
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate

        Returns:
            Dict containing the response and metadata
        """
        if not self.is_configured:
            return {
                "error": "OpenRouter API key not configured",
                "content": None,
                "usage": None
            }

        # Build messages with system prompt
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        try:
            response = await self.client.post(
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": full_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            response.raise_for_status()
            data = response.json()

            return {
                "error": None,
                "content": data["choices"][0]["message"]["content"],
                "usage": data.get("usage"),
                "model": data.get("model"),
                "id": data.get("id")
            }
        except httpx.HTTPStatusError as e:
            return {
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
                "content": None,
                "usage": None
            }
        except Exception as e:
            return {
                "error": str(e),
                "content": None,
                "usage": None
            }

    async def extract_structured_json(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        json_schema: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extract structured JSON from LLM response.

        Args:
            messages: List of message objects
            system_prompt: System prompt for structured extraction
            json_schema: Optional JSON schema for response format

        Returns:
            Parsed JSON response or error
        """
        if not self.is_configured:
            return {"error": "OpenRouter API key not configured"}

        # Add instruction to return JSON in the system prompt (works with all models)
        enhanced_system = system_prompt + "\n\nIMPORTANT: Return ONLY valid JSON in your response. No additional text, no markdown code blocks. Just the raw JSON object."

        full_messages = [{"role": "system", "content": enhanced_system}]
        full_messages.extend(messages)

        try:
            request_json = {
                "model": self.model,
                "messages": full_messages,
                "temperature": 0.3,
                "max_tokens": 4096
            }

            response = await self.client.post(
                "/chat/completions",
                json=request_json
            )
            response.raise_for_status()
            data = response.json()

            if "choices" not in data:
                return {"error": f"Unexpected response: {data}", "data": None}

            content = data["choices"][0]["message"]["content"]

            if not content:
                return {"error": "Empty response from LLM", "data": None}

            # Parse JSON from response - try multiple strategies
            try:
                # Try direct parse first
                return {"error": None, "data": json.loads(content)}
            except json.JSONDecodeError:
                pass

            # Try to extract JSON from markdown code blocks
            if "```json" in content:
                try:
                    start = content.find("```json") + 7
                    end = content.find("```", start)
                    json_str = content[start:end].strip()
                    return {"error": None, "data": json.loads(json_str)}
                except (json.JSONDecodeError, ValueError):
                    pass

            if "```" in content:
                try:
                    start = content.find("```") + 3
                    end = content.find("```", start)
                    json_str = content[start:end].strip()
                    return {"error": None, "data": json.loads(json_str)}
                except (json.JSONDecodeError, ValueError):
                    pass

            # Try to find JSON-like content
            try:
                start = content.find("{")
                end = content.rfind("}") + 1
                if start >= 0 and end > start:
                    json_str = content[start:end]
                    return {"error": None, "data": json.loads(json_str)}
            except json.JSONDecodeError:
                pass

            return {"error": f"Could not parse JSON from response: {content[:200]}", "data": None}

        except Exception as e:
            return {"error": str(e), "data": None}


# Singleton client instance
llm_client = LLMClient()
