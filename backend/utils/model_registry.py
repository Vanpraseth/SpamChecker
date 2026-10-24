import os
from typing import Dict, Any, Optional
import joblib

from core.config import MODEL_DIR, ALLOWED_MODELS

#optimisation
#when a file is loaded, it's saved here so no more requests get sent for the same file
_loaded: Dict[str, Any] = {}

#maps the file pathing
def model_path(name: str) -> str:
    fname = {
        "logistic_regression": "logistic_regression_model.pkl",
        "random_forest": "random_forest_model.pkl",
    }.get(name, f"{name}.pkl")
    return os.path.join(MODEL_DIR, fname)

#loads the model and stores it in _loaded
def get_model(name: str) -> Any:
    if name not in ALLOWED_MODELS:
        raise ValueError(f"Unknown model '{name}'. Allowed: {ALLOWED_MODELS}")
    if name in _loaded:
        return _loaded[name]
    path = model_path(name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found at {path}.")
    model = joblib.load(path)
    _loaded[name] = model
    return model

#checks which models are available to be used
def available_models() -> Dict[str, bool]:
    return {m: os.path.exists(model_path(m)) for m in ALLOWED_MODELS}

def reload_models() -> None:
    #clears internal memory so the models are reloaded upon reset
    _loaded.clear()
