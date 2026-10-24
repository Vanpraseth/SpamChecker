import os
from typing import List


APP_NAME: str = os.getenv("APP_NAME", "SpamChecker")
APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
ALLOWED_MODELS: List[str] = ["logistic_regression", "random_forest"]

_here = os.path.dirname(__file__)
_default_model_dir = os.path.abspath(os.path.join(_here, "..", "..", "models"))
MODEL_DIR: str = os.getenv("MODEL_DIR", _default_model_dir)

_default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
ALLOW_ORIGINS: List[str] = [
    origin.strip()
    for origin in os.getenv("ALLOW_ORIGINS", ",".join(_default_origins)).split(",")
    if origin.strip()
]

MAX_BATCH_ROWS: int = int(os.getenv("MAX_BATCH_ROWS", "1000"))
MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "20000"))
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
DEFAULT_SPAM_THRESHOLD: float = float(os.getenv("DEFAULT_SPAM_THRESHOLD", "0.50"))
SSE_HEARTBEAT_SEC: float = float(os.getenv("SSE_HEARTBEAT_SEC", "1"))

API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
API_PORT: int = int(os.getenv("API_PORT", "8000"))
API_RELOAD: bool = os.getenv("API_RELOAD", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
