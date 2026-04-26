# TalentMiner Model Pipeline

## 1) Install dependencies

```bash
pip install -r model/requirements.txt
```

## 2) Train and export artifacts

```bash
python model/train_and_export.py
```

This creates:
- `model/best_model.pkl`
- `model/tfidf_vectorizer.pkl`
- `model/label_encoder.pkl`
- `model/svd.pkl`
- `model/metadata.json`

## 3) Run inference smoke check

```bash
python model/inference_check.py
```

Optional custom text:

```bash
python model/inference_check.py --text "Skilled in recruitment, onboarding, employee relations, and HR operations"
```

## 4) Frontend integration note

The backend endpoint `/api/analysis` expects plain text for both:
- `resumeText`
- `jobDescription`

If you upload PDF/image files in the frontend, you still need pasted resume text unless OCR/PDF parsing is added.

## 5) Train on Colab, run local inference

If local training is slow, use Colab to generate artifacts and copy them back.

Colab commands:

```python
!pip install -r /content/TalentMiner/model/requirements.txt
!python /content/TalentMiner/model/train_and_export.py
!zip -j /content/talentminer-model-artifacts.zip \
	/content/TalentMiner/model/best_model.pkl \
	/content/TalentMiner/model/tfidf_vectorizer.pkl \
	/content/TalentMiner/model/label_encoder.pkl \
	/content/TalentMiner/model/svd.pkl \
	/content/TalentMiner/model/metadata.json
```

Download the ZIP and extract these files into local `model/`.
