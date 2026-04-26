# TalentMiner Project Report

## 1) Project Overview
TalentMiner is an AI-based resume and job description matching platform with:
- ML-based resume category prediction
- Semantic similarity scoring between resume and JD
- Skill extraction and priority-based skill gap analysis
- Web app workflow for upload/paste, analysis, and results
- Auth flow (signup/login/logout/profile/password update)

## 2) Dataset and Training Setup
- Dataset path used in current training script default: `/content/drive/MyDrive/TalenMiner/Resume.csv`
- Required columns: `Resume_str`, `Category`
- Rows used: 2484
- Train/Test split: 1987 / 497 (stratified)
- Classes: 24 categories (including `ENGINEERING`, `HR`, `INFORMATION-TECHNOLOGY`, etc.)

Source of latest training metadata:
- [model/metadata.json](model/metadata.json)

## 3) Preprocessing and Feature Engineering
Training pipeline steps:
1. Lowercasing
2. URL removal
3. Non-alphabet removal
4. Stopword removal
5. Optional lemmatization (with NLTK + safe fallback if WordNet missing)

Feature extraction:
- `TfidfVectorizer`
- `ngram_range=(1,2)`
- `max_features=5000`
- `sublinear_tf=True`
- `min_df=2`

Dimensionality reduction:
- `TruncatedSVD`
- `n_components=100`

Implementation:
- [model/train_and_export.py](model/train_and_export.py)

## 4) Models Trained and Selection Strategy
Candidate models in training pipeline:
- Decision Tree
- Logistic Regression
- Random Forest
- Linear SVC
- Multinomial Naive Bayes (may be skipped when feature values become negative due to SVD)

Selection criterion:
- Best model chosen by highest macro F1 on validation split

Latest best model:
- `linear_svc`
- Accuracy: `0.6519`
- Precision (macro): `0.6408`
- Recall (macro): `0.6140`
- F1 (macro): `0.6011`

Source:
- [model/metadata.json](model/metadata.json)

## 5) Similarity Techniques Used
### 5.1 Semantic Similarity
Backend supports dual semantic modes:
- BERT embeddings (SentenceTransformers `all-MiniLM-L6-v2`) when enabled and installed
- TF-IDF cosine fallback when BERT unavailable/disabled

Runtime selection is reflected in response field `semanticEngine` (`bert` or `tfidf`).

### 5.2 Skill Priority Ranking
- JD is segmented and skills are extracted from curated alias dictionary
- Skills are assigned priorities:
  - High: if JD segment contains words like required/must/mandatory/critical/minimum
  - Medium: preferred/nice to have/plus/bonus
  - Normal: default
- Weighted skill coverage score is computed from matched skill priorities

### 5.3 Final Match Score
Final score blends:
- Semantic score (BERT or TF-IDF cosine)
- Priority-weighted skill coverage

Also returned:
- Matched skills
- Missing skills
- Ranked skill list with priority and matched state

Implementation:
- [backend/app.py](backend/app.py)

## 6) Backend Architecture and Endpoints
Core backend file:
- [backend/app.py](backend/app.py)

### 6.1 Health and Analysis
- `GET /api/health`
  - Reports model readiness
  - Reports BERT/PDF capabilities
- `POST /api/analysis`
  - Input: `resumeText`, `jobDescription`
  - Output: score, status, predictedCategory, matched/missing skills, suggestions, skillRanking, semanticEngine
- `POST /api/analysis-upload`
  - Input: PDF resume + job description
  - Uses PDF parser to extract text and analyze

### 6.2 Auth and Profile
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/profile`
- `POST /api/change-password`

Auth notes:
- Password hashing via Werkzeug
- Token-based session map in memory
- User records stored in local JSON file (`backend/users.json`)

## 7) Frontend Integration Status
Frontend is integrated with backend for required analysis and auth flows.

Key frontend integration files:
- [frontend/hassan-code-canvas-main/src/store/analysis.ts](frontend/hassan-code-canvas-main/src/store/analysis.ts)
- [frontend/hassan-code-canvas-main/src/pages/UploadPage.tsx](frontend/hassan-code-canvas-main/src/pages/UploadPage.tsx)
- [frontend/hassan-code-canvas-main/src/pages/Results.tsx](frontend/hassan-code-canvas-main/src/pages/Results.tsx)
- [frontend/hassan-code-canvas-main/src/pages/Dashboard.tsx](frontend/hassan-code-canvas-main/src/pages/Dashboard.tsx)
- [frontend/hassan-code-canvas-main/src/store/auth.ts](frontend/hassan-code-canvas-main/src/store/auth.ts)
- [frontend/hassan-code-canvas-main/src/components/ProtectedRoute.tsx](frontend/hassan-code-canvas-main/src/components/ProtectedRoute.tsx)
- [frontend/hassan-code-canvas-main/src/pages/Login.tsx](frontend/hassan-code-canvas-main/src/pages/Login.tsx)
- [frontend/hassan-code-canvas-main/src/pages/Signup.tsx](frontend/hassan-code-canvas-main/src/pages/Signup.tsx)
- [frontend/hassan-code-canvas-main/src/pages/Profile.tsx](frontend/hassan-code-canvas-main/src/pages/Profile.tsx)
- [frontend/hassan-code-canvas-main/src/components/AppLayout.tsx](frontend/hassan-code-canvas-main/src/components/AppLayout.tsx)

## 8) Exported Model Artifacts
Expected artifacts in model directory:
- `best_model.pkl`
- `tfidf_vectorizer.pkl`
- `label_encoder.pkl`
- `svd.pkl`
- `metadata.json`

Directory:
- [model](model)

## 9) Dependency and Runtime Notes
### 9.1 Backend base requirements
- Flask
- Flask-CORS
- joblib
- scikit-learn pinned to 1.6.1 to match artifact compatibility

File:
- [backend/requirements.txt](backend/requirements.txt)

### 9.2 Advanced ATS requirements (optional)
- pypdf
- sentence-transformers

File:
- [backend/requirements-ats-advanced.txt](backend/requirements-ats-advanced.txt)

### 9.3 Training requirements
- pandas, numpy, scikit-learn, joblib, nltk

File:
- [model/requirements.txt](model/requirements.txt)

## 10) Practical Deployment Guidance
- For low-spec local PCs: train on Colab, download artifacts, run inference locally.
- Ensure scikit-learn version matches artifact version to avoid pickle compatibility warnings.
- Flask development server warning is expected locally; use production WSGI server for deployment.

## 11) Current Known Limitations
1. Auth tokens are in-memory and reset on backend restart.
2. User persistence is file-based JSON (suitable for dev/small demos, not production scale).
3. BERT model is loaded at runtime and may increase startup/inference latency.
4. Model quality can vary by domain-specific resume/JD phrasing; further calibration may be needed for specific industries.

## 12) Suggested Next Enhancements
1. Move auth/session storage to a database + JWT with expiry/refresh.
2. Add audit logging for analysis runs and auth events.
3. Add report export endpoint (PDF/CSV) from real backend data.
4. Add per-category confidence and calibrated probability outputs.
5. Add automated evaluation suite for representative test cases (Engineering/HR/etc.).
