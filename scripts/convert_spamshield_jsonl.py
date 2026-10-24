import argparse
import csv
import json
import os


def normalize_label(value):
    label = str(value).strip().lower()
    if label in {"spam", "1", "true", "yes", "suspicious"}:
        return "spam"
    if label in {"ham", "0", "false", "no", "not spam", "safe"}:
        return "ham"
    raise ValueError(f"Unsupported label: {value!r}")


def iter_jsonl_files(input_paths):
    for input_path in input_paths:
        if os.path.isdir(input_path):
            for root, _, files in os.walk(input_path):
                for filename in sorted(files):
                    if filename.endswith(".jsonl"):
                        yield os.path.join(root, filename)
        else:
            yield input_path


def convert(input_paths, output_path):
    rows = []
    counts = {"ham": 0, "spam": 0}

    for path in iter_jsonl_files(input_paths):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if not line.strip():
                    continue
                item = json.loads(line)
                text = str(item.get("text", "")).strip()
                if not text:
                    continue
                label = normalize_label(item.get("label", ""))
                rows.append((text, label))
                counts[label] += 1

    if not rows:
        raise ValueError("No labelled messages were found.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {output_path}")
    print(f"Ham: {counts['ham']}")
    print(f"Spam: {counts['spam']}")


def main():
    parser = argparse.ArgumentParser(description="Convert SpamShield JSONL files to SpamChecker CSV format.")
    parser.add_argument("input", nargs="+", help="JSONL file(s) or folder(s) containing text and label fields.")
    parser.add_argument("--output", required=True, help="Output CSV path.")
    args = parser.parse_args()
    convert(args.input, args.output)


if __name__ == "__main__":
    main()
