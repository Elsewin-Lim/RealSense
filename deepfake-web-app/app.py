import os
from flask import Flask, jsonify, render_template, request
from werkzeug.utils import secure_filename

from utils.predict import predict_image, load_model_once, model_status

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8 MB

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "model": model_status()})


@app.route("/api/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image file was uploaded. Please choose an image first."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "The uploaded file has no filename."}), 400

    safe_name = secure_filename(file.filename)
    if not allowed_file(safe_name):
        return jsonify({"error": "Unsupported file type. Please upload PNG, JPG, JPEG, or WEBP."}), 400

    try:
        image_bytes = file.read()
        result = predict_image(image_bytes)
        result["filename"] = safe_name
        return jsonify(result)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"error": f"Prediction failed: {exc}"}), 500


if __name__ == "__main__":
    # Load once when the server starts, so the first prediction is faster.
    # If the model is missing, the app still opens and will show a clear error when predicting.
    try:
        load_model_once()
        print("✅ Model loaded successfully.")
    except Exception as exc:
        print(f"⚠️ Model not loaded yet: {exc}")

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
