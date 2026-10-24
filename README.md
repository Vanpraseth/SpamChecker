# SpamChecker

SpamChecker is a full-stack machine-learning web application that classifies messages as spam or safe. It combines a React interface, a FastAPI service, TF-IDF text features, and saved Logistic Regression and Random Forest models.

## Features

- Check a single message or a batch of messages
- Switch between Logistic Regression and Random Forest models
- Review spam probability, model confidence, and risk charts
- Import plain-text and CSV input
- Export batch results as CSV or JSON
- Export charts as an image
- Responsive interface with live backend status

## Architecture

```text
React + Vite frontend
        |
        | JSON over HTTP
        v
FastAPI backend
        |
        | TF-IDF features
        v
Logistic Regression / Random Forest
```

```text
SpamChecker/
├── backend/              API routes, configuration, and model registry
├── data/                 Local training data (not version-controlled)
├── frontend/             React application
├── models/               Metrics and local model artifacts
├── scripts/              Dataset conversion and model training tools
├── .env.example          Safe backend configuration template
├── main.py               FastAPI entry point
└── requirements.txt      Python dependencies
```

## Privacy and repository safety

Training datasets are intentionally excluded from version control because source messages can contain names, email addresses, phone numbers, message headers, and other identifiers. Only use datasets that you are permitted to download, process, and redistribute.

Saved `.pkl` and `.joblib` model artifacts are also excluded. They are generated files, and the Random Forest artifact is larger than GitHub's normal per-file limit. Never load a model file from an untrusted source because Python serialization formats can execute code while loading.

Real `.env` files, local databases, virtual environments, build output, caches, and editor files are ignored. The checked-in `.env.example` files contain placeholders only.

## Local setup

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

The API starts at `http://127.0.0.1:8000` by default. API documentation is available at `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Configuration

Backend configuration is read from environment variables. Use `.env.example` as a reference and set real values through your shell or hosting provider. The frontend API address is controlled by `VITE_API_URL`; use `frontend/.env.example` as its template.

Never put a password, token, or private API key in a variable beginning with `VITE_`. Vite includes those values in browser code.

## Training the models

Place permitted CSV datasets in `data/`. Each CSV must have a `text` column and a `label` column whose value is `spam` or `ham`.

```bash
.venv/bin/python scripts/train_models.py \
  data/sms_spam_collection.csv \
  data/enron_spam_combined.csv \
  data/spamassassin_combined.csv \
  data/menthos/spam_train.csv \
  data/menthos/spam_val.csv \
  data/menthos/spam_test.csv \
  data/hard_examples.csv
```

The current local models were trained on 123,673 deduplicated labelled messages. The saved test-split results are:

| Model | Accuracy |
| --- | ---: |
| Logistic Regression | 97.34% |
| Random Forest | 98.64% |

These results describe one held-out test split and do not guarantee that every prediction will be correct.

## Verification

```bash
cd frontend
npm run lint
npm run build
```

The repository currently has no automated backend test suite. Before a production deployment, add API tests, rate limiting, production logging, and a trusted method for supplying the trained model artifacts.

## Responsible use

SpamChecker is an educational classifier, not a replacement for professional security tooling. Do not submit passwords, confidential messages, or regulated personal information to a deployment you do not control.
