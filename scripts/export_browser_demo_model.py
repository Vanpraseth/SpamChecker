import csv
import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "hard_examples.csv"
DEFAULT_OUTPUT = (
    PROJECT_ROOT
    / "frontend"
    / "public"
    / "models"
    / "browser_logistic_model.json"
)


def load_curated_examples(path):
    texts = []
    labels = []
    with path.open("r", encoding="utf-8-sig", newline="") as dataset:
        for row in csv.DictReader(dataset):
            text = str(row.get("text", "")).strip()
            label = str(row.get("label", "")).strip().lower()
            if text and label in {"ham", "spam"}:
                texts.append(text)
                labels.append(label)
    if len(texts) < 10 or len(set(labels)) != 2:
        raise ValueError("The browser demo needs at least ten examples across both classes.")
    return texts, labels


def export_model(dataset_path=DEFAULT_DATASET, output_path=DEFAULT_OUTPUT):
    texts, labels = load_curated_examples(Path(dataset_path))
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        max_features=1000,
        ngram_range=(1, 2),
    )
    features = vectorizer.fit_transform(texts)
    model = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    model.fit(features, labels)

    payload = {
        "format": "spamchecker-browser-model-v1",
        "purpose": "portfolio-demo",
        "training_rows": len(texts),
        "classes": model.classes_.tolist(),
        "intercept": float(model.intercept_[0]),
        "coefficients": model.coef_[0].tolist(),
        "vocabulary": {term: int(index) for term, index in vectorizer.vocabulary_.items()},
        "idf": vectorizer.idf_.tolist(),
        "stop_words": sorted(vectorizer.get_stop_words()),
        "ngram_range": list(vectorizer.ngram_range),
    }
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Exported browser demo model to {output_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    export_model()
