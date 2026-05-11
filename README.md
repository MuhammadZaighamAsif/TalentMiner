# TalentMiner

TalentMiner is an AI-powered resume screening platform that matches a candidate resume against a job description and returns:
- Match score (0-100)
- Match status (Good Match, Average Match, Poor Match)
- Predicted resume category
- Matched and missing skills
- Actionable improvement suggestions

It includes a Python Flask backend, a React + TypeScript frontend, and a machine learning pipeline for resume category classification.

## Features

- Resume and job description analysis via API (`/api/analysis`)
- Resume upload flow with text extraction support in frontend
- ATS-style skill gap analysis (matched vs missing keywords)
- Weighted scoring from semantic similarity and skill-priority matching
- Resume category prediction using trained ML artifacts
- Optional semantic engine using SentenceTransformers (`all-MiniLM-L6-v2`)
- Auth flow: signup, login, logout, profile update, password change

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router
- Backend: Flask, Flask-CORS, scikit-learn, joblib, Werkzeug auth
- Optional NLP/ATS extras: `pypdf`, `sentence-transformers`
- Model training: pandas, numpy, scikit-learn, nltk

## Project Structure

```text
TalentMiner/
  backend/                  # Flask API and auth/session logic
  dataset/                  # Resume.csv dataset
  frontend/
    hassan-code-canvas-main/  # React + Vite client app
  model/                    # Training scripts, inference check, model artifacts
  notebook/                 # Phase notebooks and reports
  PROJECT_REPORT.md         # Detailed project report
```

## How Scoring Works

Final score combines:
- Semantic similarity between resume and JD
- Priority-weighted skill coverage from JD keyword ranking

Formula used in backend:

```text
final_score = 0.55 * semantic_score + 0.45 * skill_score
score = clamp(final_score, 0, 1) * 100
```

Where skill priority is inferred from JD wording (for example: required, mandatory, preferred, bonus).

## Model Details

Current model metadata (`model/metadata.json`):
- Best model: `linear_svc`
- Dataset rows used: 2484
- Classes: 24
- Vectorizer: TF-IDF (1,2)-grams, max_features=5000
- Dimensionality reduction: TruncatedSVD (100 components)
- Best macro F1: ~0.601

### Artifacts expected in `model/`

- `best_model.pkl`
- `tfidf_vectorizer.pkl`
- `label_encoder.pkl`
- `svd.pkl`
- `metadata.json`

## Setup and Run

## 1) Backend (Flask)

From project root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

Optional advanced ATS features:

```bash
pip install -r backend/requirements-ats-advanced.txt
```

Run backend:

```bash
python backend/app.py
```

Backend runs on:
- `http://127.0.0.1:5000`

Health check:
- `GET http://127.0.0.1:5000/api/health`

## 2) Frontend (React + Vite)

```bash
cd frontend/hassan-code-canvas-main
npm install
npm run dev
```

Frontend default dev URL:
- `http://localhost:5173`

API base URL is read from `VITE_API_BASE_URL` and defaults to:
- `http://127.0.0.1:5000`

You can create a `.env` in `frontend/hassan-code-canvas-main`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:5000
```

## API Endpoints

### Health and analysis

- `GET /api/health`
- `POST /api/analysis`
  - Body: `{ "resumeText": string, "jobDescription": string }`
- `POST /api/analysis-upload`
  - Multipart with resume file + job description

### Auth and profile

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/profile`
- `POST /api/change-password`

## Training and Inference

Install model dependencies:

```bash
pip install -r model/requirements.txt
```

Train and export artifacts:

```bash
python model/train_and_export.py
```

Run inference smoke check:

```bash
python model/inference_check.py
```

Optional custom text:

```bash
python model/inference_check.py --text "Experienced Python developer building REST APIs and ML pipelines"
```

## Notes and Limitations

- Sessions/tokens are in-memory in backend and reset when server restarts.
- User persistence is JSON-file based (`backend/users.json`) and intended for demo/small-scale usage.
- BERT loading can increase startup time when enabled.
- For production, use a real database and a production WSGI server.

## Roadmap Ideas

- JWT-based auth with refresh tokens and expiry
- Persistent database for users and analysis history
- Exportable PDF/CSV analysis reports
- Better confidence calibration and per-category explainability
- Automated regression and integration testing

## References

- Full report: `PROJECT_REPORT.md`
- Model docs: `model/README.md`
- Phase notebooks: `notebook/`
