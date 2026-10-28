import numpy as np
import pytest
from pydantic import ValidationError

from main import health_alias, root
from api import routes
from api.schemas import TextPredictRequest


class FakeVectorizer:
    def transform(self, texts):
        return np.zeros((len(texts), 3))


class FakeModel:
    classes_ = np.array([0, 1])

    def __init__(self, spam_probability):
        self.spam_probability = spam_probability

    def predict_proba(self, features):
        return np.array(
            [
                [1 - self.spam_probability, self.spam_probability]
                for _ in range(features.shape[0])
            ]
        )


def run_prediction(monkeypatch, spam_probability):
    monkeypatch.setattr(routes, "_load_vectorizer", lambda: FakeVectorizer())
    monkeypatch.setattr(
        routes,
        "get_model",
        lambda _model_name: FakeModel(spam_probability),
    )

    request = TextPredictRequest(texts=["Test message"])
    return routes.predict_text(request)


def test_root_metadata():
    response = root()

    assert response["name"] == "SpamChecker"
    assert response["docs"] == "/docs"


def test_health_response():
    response = health_alias()

    assert response["status"] == "ok"
    assert isinstance(response["models"], dict)
    assert "logistic_regression" in response["models"]
    assert "random_forest" in response["models"]


def test_empty_message_is_rejected():
    with pytest.raises(ValidationError):
        TextPredictRequest(texts=["   "])


def test_invalid_threshold_is_rejected():
    with pytest.raises(ValidationError):
        TextPredictRequest(texts=["Hello"], threshold=1.5)


def test_spam_prediction(monkeypatch):
    response = run_prediction(monkeypatch, 0.9)

    assert response.predicted_label == "spam"
    assert response.confidence == pytest.approx(0.9)


def test_safe_prediction(monkeypatch):
    response = run_prediction(monkeypatch, 0.1)

    assert response.predicted_label == "ham"
    assert response.confidence == pytest.approx(0.9)