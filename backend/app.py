from __future__ import annotations

import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

try:
    from pypdf import PdfReader
    HAVE_PDF_PARSER = True
except ImportError:
    PdfReader = None
    HAVE_PDF_PARSER = False

try:
    from sentence_transformers import SentenceTransformer
    HAVE_BERT = True
except ImportError:
    SentenceTransformer = None
    HAVE_BERT = False


app = Flask(__name__)
CORS(app)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = PROJECT_ROOT / "model"
MODEL_PATH = MODEL_DIR / "best_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "tfidf_vectorizer.pkl"
LABEL_ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"
METADATA_PATH = MODEL_DIR / "metadata.json"
USERS_PATH = Path(__file__).resolve().parent / "users.json"

MODEL: Any = None
VECTORIZER: Any = None
LABEL_ENCODER: Any = None
SVD: Any = None
BERT_MODEL: Any = None
TOKENS: dict[str, str] = {}


SKILL_ALIASES: dict[str, set[str]] = {
    # Web / software
    "frontend": {"front end", "frontend", "front-end", "ui"},
    "backend": {"backend", "back end", "back-end"},
    "react": {"react", "reactjs", "react.js"},
    "javascript": {"javascript", "js"},
    "typescript": {"typescript", "ts"},
    "html": {"html", "html5"},
    "css": {"css", "css3"},
    "java": {"java"},
    "python": {"python"},
    "sql": {"sql", "mysql", "postgres", "postgresql", "sql server"},
    "node": {"node", "nodejs", "node.js"},
    "docker": {"docker"},
    "aws": {"aws", "amazon web services"},
    "api": {"api", "apis", "rest", "rest api", "restful"},
    "git": {"git", "github", "gitlab"},
    # HR / AI recruiting operations
    "hr": {"hr", "human resource", "human resources", "hr operations"},
    "recruiting": {"recruiting", "recruitment", "technical recruiting", "sourcing", "technical sourcing"},
    "talent acquisition": {"talent acquisition", "talent team"},
    "ats": {"ats", "workday", "lever", "greenhouse"},
    "boolean search": {"boolean search"},
    "dei": {"dei", "diversity", "inclusion", "diversity inclusion"},
    "compliance": {"compliance", "fair hiring", "gdpr", "ccpa", "privacy"},
    "bias testing": {"bias", "bias testing", "algorithmic bias", "bias mitigation", "ethical ai"},
    "uat": {"uat", "user acceptance testing", "acceptance testing"},
    "quality assurance": {"quality assurance", "qa"},
    "skill gap analysis": {"skill gap analysis", "skill-gap analysis"},
    "semantic search": {"semantic search", "similarity matching", "similarity score"},
    "stakeholder training": {"stakeholder training", "workshops", "recruiter training"},
    "process optimization": {"process optimization", "time to fill", "time-to-fill", "success failure"},
    "ai hiring tools": {"ai tools", "automated hiring", "matching models", "resume to jd", "resume parser"},
}

PRIORITY_HIGH = {"required", "must", "mandatory", "critical", "minimum"}
PRIORITY_MEDIUM = {"preferred", "nice to have", "plus", "bonus"}
ENABLE_BERT = os.getenv("ENABLE_BERT", "1").lower() in {"1", "true", "yes"}


def load_users() -> list[dict[str, Any]]:
    if not USERS_PATH.exists():
        return []
    try:
        import json

        data = json.loads(USERS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_users(users: list[dict[str, Any]]) -> None:
    import json

    USERS_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")


def sanitize_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "email": user.get("email"),
        "createdAt": user.get("createdAt"),
        "latestMatchScore": user.get("latestMatchScore"),
        "latestPredictedCategory": user.get("latestPredictedCategory"),
        "latestStatus": user.get("latestStatus"),
        "lastAnalysisAt": user.get("lastAnalysisAt"),
        "lastAnalysisSource": user.get("lastAnalysisSource"),
    }


def auth_token_from_request() -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header.split(" ", 1)[1].strip() or None


def current_user_from_request() -> dict[str, Any] | None:
    token = auth_token_from_request()
    if not token:
        return None

    user_id = TOKENS.get(token)
    if not user_id:
        return None

    users = load_users()
    for user in users:
        if user.get("id") == user_id:
            return user
    return None


def persist_user_analysis(user_id: str, result: dict[str, Any], source_name: str) -> dict[str, Any] | None:
    users = load_users()
    updated_user: dict[str, Any] | None = None

    for user in users:
        if user.get("id") == user_id:
            user["latestMatchScore"] = result.get("score")
            user["latestPredictedCategory"] = result.get("predictedCategory")
            user["latestStatus"] = result.get("status")
            user["lastAnalysisAt"] = datetime.now(timezone.utc).isoformat()
            user["lastAnalysisSource"] = source_name
            updated_user = user
            break

    if updated_user is not None:
        save_users(users)

    return updated_user


def preprocess_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    tokens = [tok for tok in text.split() if tok not in ENGLISH_STOP_WORDS and len(tok) > 2]
    return " ".join(tokens)


def status_from_score(score: float) -> str:
    if score >= 80:
        return "Good Match"
    if score >= 60:
        return "Average Match"
    return "Poor Match"


def ensure_model_loaded() -> tuple[bool, str]:
    global MODEL, VECTORIZER, LABEL_ENCODER, SVD

    if MODEL is not None and VECTORIZER is not None:
        return True, "Model loaded"

    required = [MODEL_PATH, VECTORIZER_PATH]
    missing = [str(p) for p in required if not p.exists()]
    if missing:
        return False, f"Missing files: {missing}"

    try:
        MODEL = joblib.load(MODEL_PATH)
        VECTORIZER = joblib.load(VECTORIZER_PATH)

        LABEL_ENCODER = joblib.load(LABEL_ENCODER_PATH) if LABEL_ENCODER_PATH.exists() else None

        SVD = None
        if METADATA_PATH.exists():
            import json

            metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
            svd_name = metadata.get("artifacts", {}).get("svd")
            if svd_name:
                svd_path = MODEL_DIR / svd_name
                if svd_path.exists():
                    SVD = joblib.load(svd_path)

        return True, "Model loaded"
    except Exception as exc:
        return False, f"Model load error: {exc}"


def ensure_bert_loaded() -> tuple[bool, str]:
    global BERT_MODEL

    if not ENABLE_BERT:
        return False, "BERT disabled (set ENABLE_BERT=1 to enable)"

    if not HAVE_BERT:
        return False, "sentence-transformers not installed"

    if BERT_MODEL is not None:
        return True, "BERT loaded"

    try:
        # Industry-friendly lightweight embedding model.
        BERT_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        return True, "BERT loaded"
    except Exception as exc:
        return False, f"BERT load error: {exc}"


def transform_features(texts: list[str]):
    vec = VECTORIZER.transform(texts)
    if SVD is not None:
        return SVD.transform(vec)
    return vec


def predict_category(resume_clean: str) -> str:
    features = transform_features([resume_clean])
    pred = MODEL.predict(features)[0]

    if LABEL_ENCODER is not None:
        try:
            idx = int(pred)
            return str(LABEL_ENCODER.inverse_transform([idx])[0])
        except Exception:
            pass

    return str(pred)


def tfidf_cosine_similarity(resume_clean: str, jd_clean: str) -> float:
    vectors = VECTORIZER.transform([resume_clean, jd_clean])
    r_vec = vectors[0]
    j_vec = vectors[1]

    dot = float(r_vec.dot(j_vec.T).toarray()[0][0])
    r_norm = float((r_vec.power(2).sum()) ** 0.5)
    j_norm = float((j_vec.power(2).sum()) ** 0.5)
    return dot / (r_norm * j_norm) if r_norm and j_norm else 0.0


def bert_similarity(resume_text: str, jd_text: str) -> float | None:
    ok, _ = ensure_bert_loaded()
    if not ok:
        return None

    try:
        embeddings = BERT_MODEL.encode([resume_text, jd_text], normalize_embeddings=True)
        return float((embeddings[0] * embeddings[1]).sum())
    except Exception:
        return None


def extract_found_skills(text: str) -> set[str]:
    lowered = str(text).lower()
    found: set[str] = set()

    for skill_name, aliases in SKILL_ALIASES.items():
        for alias in aliases:
            if re.search(r"\b" + re.escape(alias) + r"\b", lowered):
                found.add(skill_name)
                break

    return found


def rank_jd_skills(job_description: str) -> dict[str, int]:
    lowered = str(job_description).lower()
    segments = [seg.strip() for seg in re.split(r"[\n\r\.;]", lowered) if seg.strip()]

    priorities: dict[str, int] = {}

    for segment in segments:
        segment_priority = 1
        if any(tag in segment for tag in PRIORITY_HIGH):
            segment_priority = 3
        elif any(tag in segment for tag in PRIORITY_MEDIUM):
            segment_priority = 2

        for skill_name, aliases in SKILL_ALIASES.items():
            for alias in aliases:
                if re.search(r"\b" + re.escape(alias) + r"\b", segment):
                    priorities[skill_name] = max(priorities.get(skill_name, 0), segment_priority)
                    break

    # If no curated skill is detected, create dynamic tokens with normal priority.
    if not priorities:
        cleaned = preprocess_text(job_description)
        dynamic_tokens = [tok for tok in cleaned.split() if len(tok) > 3]
        for tok in dynamic_tokens[:30]:
            priorities[tok] = 1

    return priorities


def priority_name(level: int) -> str:
    if level >= 3:
        return "high"
    if level == 2:
        return "medium"
    return "normal"


def extract_pdf_text(file_storage) -> str:
    if not HAVE_PDF_PARSER:
        raise RuntimeError("PDF parser is not installed. Install pypdf to enable PDF parsing.")

    reader = PdfReader(file_storage.stream)
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)

    return "\n".join(pages).strip()


def analyze_texts(resume_text: str, job_description: str, source_name: str) -> dict[str, Any]:
    resume_clean = preprocess_text(resume_text)
    jd_clean = preprocess_text(job_description)

    predicted_category = predict_category(resume_clean)

    tfidf_score = tfidf_cosine_similarity(resume_clean, jd_clean)
    bert_score = bert_similarity(resume_text, job_description)
    semantic_score = bert_score if bert_score is not None else tfidf_score

    resume_skills = extract_found_skills(resume_text)
    jd_skill_priority = rank_jd_skills(job_description)

    weighted_total = sum(jd_skill_priority.values())
    weighted_matched = sum(weight for skill, weight in jd_skill_priority.items() if skill in resume_skills)
    skill_score = weighted_matched / max(1, weighted_total)

    ranked_items = sorted(jd_skill_priority.items(), key=lambda item: (-item[1], item[0]))

    matched = [skill for skill, _ in ranked_items if skill in resume_skills]
    missing = [skill for skill, _ in ranked_items if skill not in resume_skills]

    # Blend semantic + priority skill coverage.
    final_score = 0.55 * semantic_score + 0.45 * skill_score
    score = round(max(0.0, min(1.0, final_score)) * 100, 2)

    ranked_view = [
        {
            "skill": skill,
            "priority": priority_name(priority),
            "matched": skill in resume_skills,
        }
        for skill, priority in ranked_items
    ]

    suggestions = []
    if missing:
        high_missing = [skill for skill, pr in ranked_items if pr >= 3 and skill not in resume_skills]
        if high_missing:
            suggestions.append(f"Add high-priority missing skills: {', '.join(high_missing[:5])}")
        else:
            suggestions.append("Add missing skills from the job description.")

    if score < 70:
        suggestions.append("Improve alignment by adding role-specific keywords and measurable impact.")

    suggestions.append("Keep bullet points results-focused (metrics, outcomes, scope).")

    return {
        "score": score,
        "status": status_from_score(score),
        "predictedCategory": predicted_category,
        "matched": matched[:20],
        "missing": missing[:20],
        "suggestions": suggestions,
        "skillRanking": ranked_view[:40],
        "semanticEngine": "bert" if bert_score is not None else "tfidf",
        "source": source_name,
    }


@app.get("/api/health")
def health() -> Any:
    ok, msg = ensure_model_loaded()
    bert_ok = ENABLE_BERT and HAVE_BERT and BERT_MODEL is not None
    if not ENABLE_BERT:
        bert_msg = "BERT disabled (set ENABLE_BERT=1 to enable)"
    elif not HAVE_BERT:
        bert_msg = "sentence-transformers not installed"
    elif BERT_MODEL is None:
        bert_msg = "BERT enabled but not loaded yet"
    else:
        bert_msg = "BERT loaded"
    return jsonify(
        {
            "status": "ok",
            "modelReady": ok,
            "message": msg,
            "bertReady": bert_ok,
            "bertMessage": bert_msg,
            "bertEnabled": ENABLE_BERT,
            "bertInstalled": HAVE_BERT,
            "pdfParsingAvailable": HAVE_PDF_PARSER,
        }
    )


@app.post("/api/auth/signup")
def signup() -> Any:
    try:
        data = request.get_json(silent=True) or {}
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", "")).strip()

        if len(name) < 2:
            return jsonify({"error": "Name must be at least 2 characters"}), 400
        if "@" not in email:
            return jsonify({"error": "Valid email is required"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        users = load_users()
        if any(u.get("email") == email for u in users):
            return jsonify({"error": "Email already registered"}), 409

        user = {
            "id": secrets.token_hex(12),
            "name": name,
            "email": email,
            "passwordHash": generate_password_hash(password),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "latestMatchScore": None,
            "latestPredictedCategory": None,
            "latestStatus": None,
            "lastAnalysisAt": None,
            "lastAnalysisSource": None,
        }
        users.append(user)
        save_users(users)

        token = secrets.token_urlsafe(32)
        TOKENS[token] = user["id"]
        return jsonify({"token": token, "user": sanitize_user(user)})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/api/auth/login")
def login() -> Any:
    try:
        data = request.get_json(silent=True) or {}
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", "")).strip()

        users = load_users()
        user = next((u for u in users if u.get("email") == email), None)
        if user is None or not check_password_hash(user.get("passwordHash", ""), password):
            return jsonify({"error": "Invalid email or password"}), 401

        token = secrets.token_urlsafe(32)
        TOKENS[token] = user["id"]
        return jsonify({"token": token, "user": sanitize_user(user)})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/api/auth/logout")
def logout() -> Any:
    token = auth_token_from_request()
    if token and token in TOKENS:
        TOKENS.pop(token, None)
    return jsonify({"ok": True})


@app.get("/api/auth/me")
def me() -> Any:
    user = current_user_from_request()
    if user is None:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"user": sanitize_user(user)})


@app.put("/api/profile")
def update_profile() -> Any:
    user = current_user_from_request()
    if user is None:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", user.get("name", ""))).strip()
    email = str(data.get("email", user.get("email", ""))).strip().lower()

    if len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400
    if "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400

    users = load_users()
    for u in users:
        if u.get("id") != user.get("id") and u.get("email") == email:
            return jsonify({"error": "Email already in use"}), 409

    updated_user: dict[str, Any] | None = None
    for u in users:
        if u.get("id") == user.get("id"):
            u["name"] = name
            u["email"] = email
            updated_user = u
            break

    save_users(users)
    return jsonify({"user": sanitize_user(updated_user or user)})


@app.post("/api/change-password")
def change_password() -> Any:
    user = current_user_from_request()
    if user is None:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    current_password = str(data.get("currentPassword", "")).strip()
    new_password = str(data.get("newPassword", "")).strip()

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    if not check_password_hash(user.get("passwordHash", ""), current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    users = load_users()
    for u in users:
        if u.get("id") == user.get("id"):
            u["passwordHash"] = generate_password_hash(new_password)
            break
    save_users(users)
    return jsonify({"ok": True})


@app.post("/api/analysis")
def analyze_json() -> Any:
    try:
        ok, msg = ensure_model_loaded()
        if not ok:
            return jsonify({"error": msg}), 500

        data = request.get_json(silent=True) or {}
        resume_text = str(data.get("resumeText", "")).strip()
        job_description = str(data.get("jobDescription", "")).strip()

        if not resume_text:
            return jsonify({"error": "resumeText is required"}), 400
        if len(job_description) < 20:
            return jsonify({"error": "jobDescription must be at least 20 characters"}), 400

        result = analyze_texts(resume_text, job_description, source_name="text")

        user = current_user_from_request()
        if user is not None and user.get("id"):
            persist_user_analysis(str(user.get("id")), result, source_name="text")

        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/api/analysis-upload")
def analyze_upload() -> Any:
    """Industry-style ATS endpoint: upload PDF + JD in one request."""
    try:
        ok, msg = ensure_model_loaded()
        if not ok:
            return jsonify({"error": msg}), 500

        job_description = str(request.form.get("jobDescription", "")).strip()
        if len(job_description) < 20:
            return jsonify({"error": "jobDescription must be at least 20 characters"}), 400

        resume_file = request.files.get("resumeFile")
        if resume_file is None or not resume_file.filename:
            return jsonify({"error": "resumeFile is required"}), 400

        filename = resume_file.filename.lower()

        if filename.endswith(".pdf"):
            resume_text = extract_pdf_text(resume_file)
            if not resume_text:
                return jsonify({"error": "Could not extract text from PDF"}), 400
        else:
            return jsonify({"error": "Only PDF upload is supported on this endpoint"}), 400

        result = analyze_texts(resume_text, job_description, source_name=resume_file.filename)
        result["extractedTextLength"] = len(resume_text)

        user = current_user_from_request()
        if user is not None and user.get("id"):
            persist_user_analysis(str(user.get("id")), result, source_name=str(resume_file.filename))

        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.errorhandler(404)
def not_found(_: Any) -> Any:
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(_: Any) -> Any:
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
