import sqlite3
from pathlib import Path


class Database:
    """Simple SQLite-based storage for ANN state and message history."""

    def __init__(self, db_path: str | Path):
        self.db_path = str(db_path)
        self._initialize()

    def _initialize(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memory (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def save_message(self, source: str, content: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO messages (source, content) VALUES (?, ?)",
                (source, content),
            )
            conn.commit()

    def get_recent_messages(self, limit: int = 10):
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT source, content, created_at FROM messages ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return list(reversed(rows))

    def set_memory(self, key: str, value: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO memory(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )
            conn.commit()

    def get_memory(self, key: str):
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT value FROM memory WHERE key = ?",
                (key,),
            ).fetchone()
        return row[0] if row else None
