from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

# Optional: Try importing NLTK for lemmatization (better preprocessing than just stopword removal)
try:
    import nltk
    from nltk.stem import WordNetLemmatizer

    LEMMATIZER = WordNetLemmatizer()
    HAVE_NLTK = True

    # Colab often has nltk installed but not corpora (wordnet/omw).
    # Try a quick check and best-effort download; if it still fails, disable lemmatization.
    try:
        _ = LEMMATIZER.lemmatize("testing")
    except LookupError:
        try:
            nltk.download("wordnet", quiet=True)
            nltk.download("omw-1.4", quiet=True)
            _ = LEMMATIZER.lemmatize("testing")
        except Exception:
            HAVE_NLTK = False
except ImportError:
    LEMMATIZER = None
    HAVE_NLTK = False


RANDOM_STATE = 42


def preprocess_text(text: str, use_lemmatization: bool = True) -> str:
    """
    Apply text preprocessing: lowercasing, URL removal, punctuation removal, 
    stopword removal, and optionally lemmatization.
    
    Based on Phase 3 notebook findings: lemmatization + stopword removal performs better.
    """
    text = str(text).lower()
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    
    tokens = [token for token in text.split() if token not in ENGLISH_STOP_WORDS and len(token) > 1]
    
    if use_lemmatization and HAVE_NLTK and LEMMATIZER:
        # If corpus lookup fails at runtime, continue without lemmatization instead of crashing.
        try:
            tokens = [LEMMATIZER.lemmatize(token) for token in tokens]
        except LookupError:
            pass
    
    return " ".join(tokens)


def safe_multiclass_auc(y_true: np.ndarray, scores: np.ndarray) -> float | None:
    """Safely compute multiclass AUC; return None if computation fails."""
    try:
        # Handle both binary and multiclass cases
        if scores.ndim == 1:
            scores = np.vstack([-scores, scores]).T
        return float(roc_auc_score(y_true, scores, multi_class="ovr", average="macro"))
    except Exception:
        return None


def evaluate_model(
    name: str,
    model: Any,
    X_train_features: Any,
    y_train: np.ndarray,
    X_test_features: Any,
    y_test: np.ndarray,
) -> Dict[str, Any]:
    """Train model and return evaluation metrics."""
    model.fit(X_train_features, y_train)
    y_pred = model.predict(X_test_features)

    metrics: Dict[str, Any] = {
        "model": name,
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
    }

    # Try to get probability scores for AUC
    scores = None
    try:
        if hasattr(model, "predict_proba"):
            scores = model.predict_proba(X_test_features)
        elif hasattr(model, "decision_function"):
            scores = model.decision_function(X_test_features)
    except Exception:
        pass

    if scores is not None:
        if getattr(scores, "ndim", 1) == 1:
            scores = np.vstack([-scores, scores]).T
        auc = safe_multiclass_auc(y_test, scores)
        metrics["auc_macro_ovr"] = auc
    else:
        metrics["auc_macro_ovr"] = None

    return metrics


def train_and_export(dataset_path: Path, output_dir: Path) -> Tuple[Dict[str, Any], Path]:
    """Train model using best practices from Phase 3 notebook."""
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    # Load and clean data
    df = pd.read_csv(dataset_path)
    required_columns = {"Resume_str", "Category"}
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {sorted(missing)}")

    df = df.dropna(subset=["Resume_str", "Category"]).copy()
    df["Resume_str"] = df["Resume_str"].astype(str).map(preprocess_text)
    df["Category"] = df["Category"].astype(str)

    # Encode labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["Category"].values)
    X = df["Resume_str"].values

    # Stratified train-test split (preserves class distribution)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    # Feature extraction: TF-IDF with bigrams (from Phase 3)
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True,
        min_df=2,
    )

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Dimensionality reduction using TruncatedSVD (from Phase 3 notebook)
    # This helps prevent overfitting and improves stability
    n_features = X_train_vec.shape[1]
    n_components = min(100, n_features - 1) if n_features > 1 else 1
    
    svd = None
    if n_components >= 2:
        svd = TruncatedSVD(n_components=n_components, random_state=RANDOM_STATE)
        X_train_features = svd.fit_transform(X_train_vec)
        X_test_features = svd.transform(X_test_vec)
    else:
        X_train_features = X_train_vec.toarray()
        X_test_features = X_test_vec.toarray()

    # Model candidates (Phase 3 showed Decision Tree performs well)
    candidates = {
        "decision_tree": DecisionTreeClassifier(
            max_depth=25,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=RANDOM_STATE,
        ),
        "logistic_regression": LogisticRegression(
            max_iter=2000,
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=25,
            min_samples_leaf=2,
            class_weight="balanced",
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
        "linear_svc": LinearSVC(
            max_iter=2000,
            random_state=RANDOM_STATE,
            dual=False,
        ),
        "multinomial_nb": MultinomialNB(),
    }

    # Train all candidates and rank by F1 score
    leaderboard = []
    trained_models = {}

    for name, model in candidates.items():
        try:
            metrics = evaluate_model(
                name,
                model,
                X_train_features,
                y_train,
                X_test_features,
                y_test,
            )
            leaderboard.append(metrics)
            trained_models[name] = model
        except Exception as e:
            print(f"Warning: {name} failed during training: {e}")
            continue

    if not leaderboard:
        raise RuntimeError("No models trained successfully")

    # Sort by F1 score (Phase 3 prioritized F1 for best classification)
    leaderboard.sort(key=lambda row: row.get("f1_macro", 0), reverse=True)
    best = leaderboard[0]
    best_model_name = best["model"]
    best_model = trained_models[best_model_name]

    # Save artifacts
    output_dir.mkdir(parents=True, exist_ok=True)

    model_path = output_dir / "best_model.pkl"
    vectorizer_path = output_dir / "tfidf_vectorizer.pkl"
    label_encoder_path = output_dir / "label_encoder.pkl"
    metadata_path = output_dir / "metadata.json"
    svd_path = output_dir / "svd.pkl"

    joblib.dump(best_model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    joblib.dump(label_encoder, label_encoder_path)
    if svd is not None:
        joblib.dump(svd, svd_path)

    # Save metadata
    metadata: Dict[str, Any] = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(dataset_path),
        "rows_used": int(df.shape[0]),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "preprocessing": {
            "lowercase": True,
            "remove_urls": True,
            "remove_non_alpha": True,
            "remove_stopwords": True,
            "lemmatization": HAVE_NLTK,
        },
        "feature_extraction": {
            "type": "TfidfVectorizer",
            "ngram_range": [1, 2],
            "max_features": 5000,
            "sublinear_tf": True,
            "min_df": 2,
        },
        "dimensionality_reduction": {
            "type": "TruncatedSVD",
            "n_components": int(n_components) if n_components >= 2 else 0,
        },
        "classes": label_encoder.classes_.tolist(),
        "best_model": best_model_name,
        "best_metrics": best,
        "leaderboard": leaderboard,
        "artifacts": {
            "model": model_path.name,
            "vectorizer": vectorizer_path.name,
            "label_encoder": label_encoder_path.name,
            "svd": svd_path.name if svd is not None else None,
        },
        "note": "Based on Phase 3 findings: uses lemmatization, TruncatedSVD, and compares Decision Tree, Random Forest, Logistic Regression, and others.",
    }

    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata, output_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train TalentMiner classifier and export model artifacts.")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("/content/drive/MyDrive/TalenMiner/Resume.csv"),
        help="Path to Resume.csv",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Directory to write artifacts",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    metadata, out_dir = train_and_export(args.dataset, args.out_dir)
    print("Training completed.")
    print(f"Best model: {metadata['best_model']}")
    print(f"Best F1 (macro): {metadata['best_metrics']['f1_macro']:.4f}")
    print(f"Artifacts saved in: {out_dir}")


if __name__ == "__main__":
    main()
