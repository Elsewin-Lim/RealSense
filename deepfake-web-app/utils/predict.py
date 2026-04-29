import io
import os
from typing import Any, Dict

import numpy as np
from PIL import Image, ImageOps
import tensorflow as tf

from utils.custom_layers import ClassToken, AddPositionEmbedding

# Change these from environment variables if needed.
MODEL_PATH = os.environ.get("MODEL_PATH", "model/deepfake_model.keras")
IMAGE_SIZE = int(os.environ.get("IMAGE_SIZE", "224"))
THRESHOLD = float(os.environ.get("THRESHOLD", "0.39"))

# Options: "efficientnet", "rescale", or "none".
# For many tf.keras EfficientNet models, efficientnet preprocessing is safe.
PREPROCESS_MODE = os.environ.get("PREPROCESS_MODE", "efficientnet").lower()

# If your model output is probability of REAL instead of FAKE, set this to false:
# macOS/Linux: export SCORE_MEANS_FAKE=false
# Windows PowerShell: $env:SCORE_MEANS_FAKE="false"
SCORE_MEANS_FAKE = os.environ.get("SCORE_MEANS_FAKE", "true").lower() == "true"

MODEL = None

CUSTOM_OBJECTS = {
    "ClassToken": ClassToken,
    "AddPositionEmbedding": AddPositionEmbedding,
}


def load_model_once():
    global MODEL
    if MODEL is not None:
        return MODEL

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at '{MODEL_PATH}'. Put your trained .keras model in the model folder "
            "or set MODEL_PATH to the correct file path."
        )

    MODEL = tf.keras.models.load_model(
        MODEL_PATH,
        custom_objects=CUSTOM_OBJECTS,
        compile=False,
    )
    return MODEL


def model_status() -> Dict[str, Any]:
    return {
        "path": MODEL_PATH,
        "exists": os.path.exists(MODEL_PATH),
        "loaded": MODEL is not None,
        "image_size": IMAGE_SIZE,
        "threshold": THRESHOLD,
        "preprocess_mode": PREPROCESS_MODE,
        "score_means_fake": SCORE_MEANS_FAKE,
    }


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes))
    image = ImageOps.exif_transpose(image).convert("RGB")
    image = image.resize((IMAGE_SIZE, IMAGE_SIZE))

    arr = np.asarray(image).astype("float32")

    if PREPROCESS_MODE == "efficientnet":
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    elif PREPROCESS_MODE == "rescale":
        arr = arr / 255.0
    elif PREPROCESS_MODE == "none":
        pass
    else:
        raise ValueError("PREPROCESS_MODE must be 'efficientnet', 'rescale', or 'none'.")

    return np.expand_dims(arr, axis=0)


def _extract_score(raw_prediction: Any) -> float:
    """Convert different Keras prediction shapes into one score from 0 to 1."""
    pred = np.asarray(raw_prediction)

    # Case 1: sigmoid output shape like (1, 1) or (1,)
    if pred.size == 1:
        return float(pred.reshape(-1)[0])

    # Case 2: softmax output shape like (1, 2). Assume index 1 is fake by default.
    pred = pred.reshape((pred.shape[0], -1))
    if pred.shape[1] == 2:
        return float(pred[0, 1])

    raise ValueError(f"Unsupported model output shape: {pred.shape}. Expected sigmoid or 2-class softmax.")


def predict_image(image_bytes: bytes) -> Dict[str, Any]:
    model = load_model_once()
    x = preprocess_image(image_bytes)
    raw = model.predict(x, verbose=0)

    score = _extract_score(raw)
    fake_probability = score if SCORE_MEANS_FAKE else 1.0 - score
    real_probability = 1.0 - fake_probability

    threshold_percent = THRESHOLD * 100
    fake_percent = fake_probability * 100
    real_percent = real_probability * 100
    classified_as_fake = fake_probability >= THRESHOLD

    label = (
        "Likely Fake / AI-generated"
        if classified_as_fake
        else "Likely Real / Human-created"
    )
    confidence = fake_probability if classified_as_fake else real_probability
    decision_text = "Fake / AI-generated" if classified_as_fake else "Real / Human-created"

    return {
        "label": label,
        "fake_probability": round(fake_percent, 2),
        "real_probability": round(real_percent, 2),
        "confidence": round(confidence * 100, 2),
        "threshold": THRESHOLD,
        "note": (
            f"Decision rule: if fake probability is {threshold_percent:.2f}% or higher, we label the image "
            f"as Fake / AI-generated; otherwise, we label it as Real / Human-created. This image scored "
            f"{fake_percent:.2f}% fake and {real_percent:.2f}% real, so the final result is {decision_text}. "
            "This is a model prediction, not absolute proof. Use it as decision support only."
        ),
    }
