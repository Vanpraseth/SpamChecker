from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, field_validator

from core.config import MAX_TEXT_LENGTH

#response for health endpoint
class HealthResponse(BaseModel):
    status: Literal["ok"]
    models: Dict[str, bool]

class TextPredictRequest(BaseModel):
    texts: List[str] = Field(
        ...,
        min_length=1,
        max_length=1,
        description="One raw text message to classify.",
    )
    #defaults to logistic_regression for Standard Mode
    model: Literal["logistic_regression", "random_forest"] = "logistic_regression"
    #threshold system
    threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    @field_validator("texts")
    @classmethod
    def validate_text(cls, texts: List[str]) -> List[str]:
        text = texts[0]
        if not text.strip():
            raise ValueError("Message text cannot be empty.")
        if len(text) > MAX_TEXT_LENGTH:
            raise ValueError(f"Message exceeds the {MAX_TEXT_LENGTH}-character limit.")
        return texts

class TextPredictResponse(BaseModel):
    predicted_label: Literal["spam", "ham"]
    confidence: float = Field(..., ge=0.0, le=1.0, description="Probability of the predicted class")
    threshold_used: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    #debugging echoes to print out model and probability
    model: str
    prob_spam: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
