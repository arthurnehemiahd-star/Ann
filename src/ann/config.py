from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / "ann.db"


@dataclass
class AppConfig:
    app_name: str = "ANN"
    db_path: str = str(DB_PATH)
    system_prompt: str = (
        "You are ANN, an AI assistant that helps with messaging, device tasks, "
        "games, and memory-driven conversations."
    )


config = AppConfig()
