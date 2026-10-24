import csv
import sys
from collections import Counter
from pathlib import Path


LABEL_BY_FOLDER = {
    "easy_ham": "ham",
    "easy_ham_2": "ham",
    "hard_ham": "ham",
    "spam": "spam",
    "spam_2": "spam",
}


def iter_messages(root):
    root = Path(root)
    for folder_name, label in LABEL_BY_FOLDER.items():
        folder = root / folder_name
        if not folder.exists():
            continue
        for path in sorted(folder.rglob("*")):
            if not path.is_file():
                continue
            if path.name.startswith("."):
                continue
            text = path.read_text(encoding="latin-1", errors="replace").strip()
            if text:
                yield text, label


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/convert_spamassassin.py <spamassassin_root> <output.csv>")
        raise SystemExit(2)

    root = Path(sys.argv[1])
    output = Path(sys.argv[2])
    counts = Counter()
    rows = 0

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "label"])
        writer.writeheader()
        for text, label in iter_messages(root):
            writer.writerow({"text": text, "label": label})
            counts[label] += 1
            rows += 1

    print(f"Wrote {rows} rows to {output}")
    print(dict(counts))


if __name__ == "__main__":
    main()
