import argparse
import csv
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


DEFAULT_MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))

csv.field_size_limit(sys.maxsize)


def public_dataset_name(path):
    """Return a useful dataset label without exposing a local absolute path."""
    return os.path.basename(os.path.normpath(path))


def normalize_label(value):
    label = str(value).strip().lower()
    if label in {"spam", "1", "true", "yes", "suspicious"}:
        return "spam"
    if label in {"ham", "0", "false", "no", "not spam", "safe"}:
        return "ham"
    raise ValueError(f"Unsupported label: {value!r}. Use spam/ham or 1/0.")


def read_dataset(path, text_column, label_column):
    rows = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("Dataset CSV has no header row.")

        missing = [c for c in (text_column, label_column) if c not in reader.fieldnames]
        if missing:
            raise ValueError(
                f"Missing column(s): {', '.join(missing)}. Found: {', '.join(reader.fieldnames)}"
            )

        for row in reader:
            text = str(row.get(text_column, "")).strip()
            label_raw = row.get(label_column, "")
            if not text:
                continue
            rows.append((text, normalize_label(label_raw)))

    if len(rows) < 10:
        raise ValueError("Dataset is too small after cleaning. Add more labelled messages.")
    return rows


def read_datasets(paths, text_column, label_column):
    combined = []
    seen = set()
    source_counts = {}

    for path in paths:
        rows = read_dataset(path, text_column, label_column)
        source_counts[public_dataset_name(path)] = len(rows)
        for text, label in rows:
            key = (text.lower(), label)
            if key in seen:
                continue
            seen.add(key)
            combined.append((text, label))

    if len(combined) < 10:
        raise ValueError("Combined dataset is too small after cleaning.")
    return combined, source_counts


def train(dataset_paths, text_column, label_column, model_dir, test_size, random_state):
    rows, source_counts = read_datasets(dataset_paths, text_column, label_column)
    texts = [text for text, _ in rows]
    labels = [label for _, label in rows]

    label_counts = Counter(labels)
    stratify = labels if min(label_counts.values()) >= 2 else None
    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify,
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        max_features=5000,
        ngram_range=(1, 2),
    )
    x_train_vec = vectorizer.fit_transform(x_train)
    x_test_vec = vectorizer.transform(x_test)

    logistic = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=random_state)
    logistic.fit(x_train_vec, y_train)

    forest = RandomForestClassifier(
        n_estimators=250,
        max_depth=None,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1,
    )
    forest.fit(x_train_vec, y_train)

    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_paths": [public_dataset_name(path) for path in dataset_paths],
        "source_counts": source_counts,
        "dataset_rows": len(rows),
        "label_counts": dict(label_counts),
        "train_rows": len(x_train),
        "test_rows": len(x_test),
        "text_column": text_column,
        "label_column": label_column,
        "models": {},
    }

    for name, model in (("logistic_regression", logistic), ("random_forest", forest)):
        predicted = model.predict(x_test_vec)
        metrics["models"][name] = {
            "accuracy": float(accuracy_score(y_test, predicted)),
            "report": classification_report(y_test, predicted, output_dict=True, zero_division=0),
        }

    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(vectorizer, os.path.join(model_dir, "tfidf_vectorizer.pkl"))
    joblib.dump(logistic, os.path.join(model_dir, "logistic_regression_model.pkl"))
    joblib.dump(forest, os.path.join(model_dir, "random_forest_model.pkl"))

    metrics_path = os.path.join(model_dir, "training_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    return metrics_path, metrics


def main():
    parser = argparse.ArgumentParser(description="Train SpamChecker spam detection models.")
    parser.add_argument("dataset", nargs="+", help="One or more CSV datasets with message text and labels.")
    parser.add_argument("--text-column", default="text", help="CSV column containing message text.")
    parser.add_argument("--label-column", default="label", help="CSV column containing spam/ham label.")
    parser.add_argument("--model-dir", default=DEFAULT_MODEL_DIR, help="Directory to write model files.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Fraction of data used for testing.")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed for repeatable training.")
    args = parser.parse_args()

    metrics_path, metrics = train(
        dataset_paths=args.dataset,
        text_column=args.text_column,
        label_column=args.label_column,
        model_dir=args.model_dir,
        test_size=args.test_size,
        random_state=args.random_state,
    )

    print(f"Trained with {metrics['dataset_rows']} labelled messages.")
    print(f"Saved models to {os.path.abspath(args.model_dir)}")
    print(f"Saved metrics to {metrics_path}")
    for model_name, model_metrics in metrics["models"].items():
        if "accuracy" in model_metrics:
            print(f"{model_name}: accuracy {model_metrics['accuracy']:.4f}")


if __name__ == "__main__":
    main()
