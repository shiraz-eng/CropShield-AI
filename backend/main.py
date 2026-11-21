import os
from pathlib import Path
from typing import Literal


def load_local_env(path: Path = Path(__file__).with_name(".env")) -> None:
    """Load KEY=VALUE pairs from backend/.env without overriding the process environment."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.partition("=")
        key = key.strip()
        if sep and key and not key.startswith("#") and value.strip():
            os.environ.setdefault(key, value.strip())


load_local_env()

from fastapi import FastAPI  # noqa: E402

from crop_analysis.api import router  # noqa: E402


app = FastAPI(title="CropShield AI")
app.include_router(router)


@app.get("/health")
def health() -> dict[str, Literal["ok"]]:
    return {"status": "ok"}
