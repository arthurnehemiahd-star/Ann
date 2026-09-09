from __future__ import annotations

from typing import Any


class AnnBrain:
    """Routes user requests to AI, tools, or games."""

    def __init__(self, db=None):
        self.db = db

    def process(self, user_input: str, source: str = "whatsapp") -> str:
        normalized = user_input.strip()
        if not normalized:
            return "I did not receive any message."

        if self.db is not None:
            self.db.save_message(source, normalized)

        lower = normalized.lower()

        if "time" in lower and "what" in lower:
            from datetime import datetime
            return f"The current time is {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."

        if "tool" in lower:
            return "I can use tools and external actions through the host device layer."

        if "game" in lower:
            return "I can start a mini-game if you want."

        if "remember" in lower:
            key = "last_user_memory"
            self.db.set_memory(key, normalized) if self.db else None
            return "I will remember that for the next conversation."

        if "memory" in lower:
            memory_value = self.db.get_memory("last_user_memory") if self.db else None
            if memory_value:
                return f"I remember: {memory_value}"
            return "I have no saved memory yet."

        return (
            "ANN is active. I can help with chat, device actions, tools, games, "
            "and memory-backed responses."
        )

    def route(self, user_input: str, source: str = "whatsapp") -> dict[str, Any]:
        response = self.process(user_input, source)
        return {
            "source": source,
            "input": user_input,
            "response": response,
        }
