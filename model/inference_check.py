from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import List, Tuple

import joblib
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

# Optional NLTK lemmatization (matches training script)
try:
    from nltk.stem import WordNetLemmatizer
    LEMMATIZER = WordNetLemmatizer()
    HAVE_NLTK = True
except ImportError:
    LEMMATIZER = None
    HAVE_NLTK = False


def preprocess_text(text: str) -> str:
    """Match preprocessing from training script."""
    text = str(text).lower()
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    
    tokens = [token for token in text.split() if token not in ENGLISH_STOP_WORDS and len(token) > 1]
    
    if HAVE_NLTK and LEMMATIZER:
        tokens = [LEMMATIZER.lemmatize(token) for token in tokens]
    
    return " ".join(tokens)


def load_artifacts(model_dir: Path):
    model = joblib.load(model_dir / "best_model.pkl")
    vectorizer = joblib.load(model_dir / "tfidf_vectorizer.pkl")
    label_encoder = joblib.load(model_dir / "label_encoder.pkl")
    metadata = json.loads((model_dir / "metadata.json").read_text(encoding="utf-8"))
    svd_artifact = metadata.get("artifacts", {}).get("svd")
    svd = joblib.load(model_dir / svd_artifact) if svd_artifact else None
    return model, vectorizer, label_encoder, svd, metadata


def predict_top_k(text: str, model_dir: Path, top_k: int = 3) -> Tuple[str, List[Tuple[str, float]]]:
    model, vectorizer, label_encoder, svd, _ = load_artifacts(model_dir)
    cleaned = preprocess_text(text)
    X_vec = vectorizer.transform([cleaned])
    X = svd.transform(X_vec) if svd is not None else X_vec

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X)[0]
        top_indices = probs.argsort()[::-1][:top_k]
        top = [(label_encoder.inverse_transform([i])[0], float(probs[i])) for i in top_indices]
        best_label = top[0][0]
        return best_label, top

    pred_idx = int(model.predict(X)[0])
    best_label = label_encoder.inverse_transform([pred_idx])[0]
    return best_label, [(best_label, 1.0)]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke-check TalentMiner exported model artifacts.")
    parser.add_argument(
        "--text",
        type=str,
        default="Experienced Python developer building REST APIs, data pipelines, and machine learning models.",
        help="Sample resume text",
    )
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Directory containing exported artifacts",
    )
    parser.add_argument("--top-k", type=int, default=3, help="How many classes to print")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    best_label, top = predict_top_k(args.text, args.model_dir, top_k=args.top_k)

    print("Inference check completed.")
    print(f"Predicted category: {best_label}")
    print("Top predictions:")
    for label, score in top:
        print(f"- {label}: {score:.4f}")


if __name__ == "__main__":
    main()
