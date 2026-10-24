from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import numpy as np
import scipy.sparse as sp

from api.schemas import (
    HealthResponse,
    TextPredictRequest,
    TextPredictResponse,
)
from utils.model_registry import get_model, available_models
from utils.logger import get_logger
from core.config import DEFAULT_SPAM_THRESHOLD, MODEL_DIR, SSE_HEARTBEAT_SEC
import os
import joblib
import json
import asyncio
import time

#imports necessary API, libraries, helpers, and logger
router = APIRouter()
log = get_logger(__name__)

#confirms that models exist
@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", models=available_models())

#checks for model availability
@router.get("/models", response_model=Dict[str, bool])
def models() -> Dict[str, bool]:
    return available_models()

_vectorizer_cache = None
def _load_vectorizer():
    global _vectorizer_cache
    if _vectorizer_cache is not None:
        return _vectorizer_cache
    vec_path = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")
    if not os.path.exists(vec_path):
        raise FileNotFoundError(f"Vectorizer not found at {vec_path}.")
    _vectorizer_cache = joblib.load(vec_path)
    return _vectorizer_cache

def _spam_index_from_classes(model) -> int:
    try:
        classes = list(getattr(model, "classes_", []))
        if not classes:
            #assume that 1 is spam
            return 1
        if "spam" in classes:
            return classes.index("spam")
        if 1 in classes:
            return classes.index(1)
        if True in classes:
            return classes.index(True)
        #default to highest class index
        return len(classes) - 1
    except Exception:
        return 1

#heartbeat system that allows for the user to know that the system is running
@router.get("/events")
async def events(request: Request):
    async def event_generator():
        i = 0
        interval = max(0.25, float(SSE_HEARTBEAT_SEC))  
        while True:
            if await request.is_disconnected():
                break
            payload = {"type": "heartbeat", "i": i, "ts": time.time()}
            yield f"data: {json.dumps(payload)}\n\n"
            i += 1
            await asyncio.sleep(interval)
    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)

@router.post("/predict_text", response_model=TextPredictResponse)
def predict_text(req: TextPredictRequest) -> TextPredictResponse:
    #accepts text from the UI
    if not req.texts:
        raise HTTPException(status_code=400, detail="No texts provided.")

    try:
        vectorizer = _load_vectorizer()
        model = get_model(req.model)
    except FileNotFoundError:
        log.exception("A required model artifact is unavailable")
        raise HTTPException(status_code=503, detail="A required model artifact is unavailable.")
    except Exception:
        log.exception("The selected model could not be loaded")
        raise HTTPException(status_code=500, detail="The selected model could not be loaded.")

    #extract features from the input text
    try:
        X = vectorizer.transform(req.texts)
    except Exception:
        log.exception("Vectorizer.transform failed")
        raise HTTPException(status_code=400, detail="The message could not be processed.")

    #try to align the features with the model's metrics
    try:
        n_expected = getattr(model, 'n_features_in_', None)
        if n_expected is not None and X.shape[1] != int(n_expected):
            diff = int(n_expected) - X.shape[1]
            if diff > 0:
                #pad the features with 0 columns
                X = sp.hstack([X, sp.csr_matrix((X.shape[0], diff))], format='csr')
            elif diff < 0:
                #truncate extra columns
                X = X[:, :int(n_expected)]
            log.warning(f"Adjusted feature {X.shape[1] - diff} to {int(n_expected)} to match model")
    except Exception as e:
        log.warning(f"Couldn't align feature dims: {e}")

    #use a slightly higher default threshold to reduce false spam results
    prob_spam = None
    predicted_label = None
    threshold_used = req.threshold if req.threshold is not None else DEFAULT_SPAM_THRESHOLD

    if hasattr(model, "predict_proba"):
        try:
            probs = model.predict_proba(X)
            spam_idx = _spam_index_from_classes(model)
            #uses the first text as probability
            prob_spam = float(probs[0, spam_idx])
            predicted_label = "spam" if prob_spam >= float(threshold_used) else "ham"
        except Exception as e:
            #prevents the model from failing becaue of no prediction metrics
            log.warning(f"predict_proba failed: {e}")
            prob_spam = None

    if predicted_label is None:
        #fallback to discrete predictions
        try:
            pred = model.predict(X)[0]
        except Exception:
            log.exception("model.predict failed")
            raise HTTPException(status_code=500, detail="The model could not produce a prediction.")
        if isinstance(pred, (np.bool_, bool)):
            predicted_label = "spam" if bool(pred) else "ham"
        elif isinstance(pred, (np.integer, int)):
            predicted_label = "spam" if int(pred) == 1 else "ham"
        else:
            predicted_label = "spam" if str(pred).lower() == "spam" else "ham"

    #confidence is based on probability if not then proceed with default values
    if prob_spam is not None:
        confidence = prob_spam if predicted_label == "spam" else 1.0 - prob_spam
    else:
        confidence = 1.0 if predicted_label == "spam" else 1.0  # treat deterministic output as high confidence

    #clamp response to either 0 or 1
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except Exception:
        confidence = 0.5

    return TextPredictResponse(
        predicted_label=predicted_label,
        confidence=float(confidence),
        threshold_used=float(threshold_used) if threshold_used is not None else None,
        model=req.model,
        prob_spam=float(prob_spam) if prob_spam is not None else None,
    )
