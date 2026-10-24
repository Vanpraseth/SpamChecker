import csv
import sys
from collections import Counter
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/convert_sms_spam_collection.py <SMSSpamCollection> <output.csv>")
        raise SystemExit(2)

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    counts = Counter()
    rows = 0

    dst.parent.mkdir(parents=True, exist_ok=True)
    with src.open("r", encoding="utf-8", errors="replace") as f, dst.open(
        "w", encoding="utf-8", newline=""
    ) as out:
        writer = csv.DictWriter(out, fieldnames=["text", "label"])
        writer.writeheader()
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            label, text = line.split("\t", 1)
            counts[label] += 1
            rows += 1
            writer.writerow({"text": text, "label": label})

    print(f"Wrote {rows} rows to {dst}")
    print(dict(counts))


if __name__ == "__main__":
    main()
