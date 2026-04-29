---
title: Deepfake Web App
emoji: 🌍
colorFrom: gray
colorTo: purple
sdk: docker
pinned: false
license: mit
short_description: deepfake web app
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# Deepfake Image Detection Web App

A simple Flask web application for a deepfake image detection class project. The app lets users upload an image, sends it to a Flask backend, loads your trained TensorFlow/Keras model, and returns a Real/Fake prediction with confidence scores.

## Project structure

```text
deepfake-web-app/
├── app.py
├── requirements.txt
├── README.md
├── model/
│   └── deepfake_model.keras        # put your trained model here
├── templates/
│   └── index.html
├── static/
│   ├── css/style.css
│   └── js/app.js
└── utils/
    ├── custom_layers.py
    └── predict.py
```

## How to run

### 1. Copy your model

Put your trained model into the `model` folder and rename it:

```text
model/deepfake_model.keras
```

If your model has another name or location, set `MODEL_PATH` instead.

### 2. Create virtual environment

```bash
python -m venv .venv
```

Activate it:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

### 3. Install packages

```bash
pip install -r requirements.txt
```

### 4. Run the app

```bash
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## Important settings

The default settings are in `utils/predict.py`.

```text
MODEL_PATH=model/deepfake_model.keras
IMAGE_SIZE=224
THRESHOLD=0.50
PREPROCESS_MODE=efficientnet
SCORE_MEANS_FAKE=true
```

### If the result is reversed

If the app says Real when it should say Fake, your model may output probability of Real instead of probability of Fake. Run:

```bash
export SCORE_MEANS_FAKE=false
```

Windows PowerShell:

```powershell
$env:SCORE_MEANS_FAKE="false"
```

### If preprocessing is wrong

Try one of these:

```bash
export PREPROCESS_MODE=efficientnet
export PREPROCESS_MODE=rescale
export PREPROCESS_MODE=none
```

Use the same preprocessing method that you used during model training.

## Notes

- This version is for image-level detection.
- For video detection, you would add frame extraction, face detection, prediction per frame, and voting/averaging.
- The prediction should be presented as decision support, not absolute proof.
