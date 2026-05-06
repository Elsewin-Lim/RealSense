const dropArea = document.getElementById("dropArea");
const imageInput = document.getElementById("imageInput");
const chooseBtn = document.getElementById("chooseBtn");
const preview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const predictBtn = document.getElementById("predictBtn");
const resultCard = document.getElementById("resultCard");
const emptyResult = document.getElementById("emptyResult");
const predictionText = document.getElementById("predictionText");
const confidenceText = document.getElementById("confidenceText");
const fakeProb = document.getElementById("fakeProb");
const realProb = document.getElementById("realProb");
const fakeBar = document.getElementById("fakeBar");
const realBar = document.getElementById("realBar");
const resultNote = document.getElementById("resultNote");
const uploadInstructions = document.getElementById("uploadInstructions");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const decisionChip = document.getElementById("decisionChip");
const thresholdValue = document.getElementById("thresholdValue");
const decisionRule = document.getElementById("decisionRule");
const imageSizeStat = document.getElementById("imageSizeStat");
const thresholdStat = document.getElementById("thresholdStat");
const modelStatusStat = document.getElementById("modelStatusStat");
const whyFakeTitle = document.getElementById("whyFakeTitle");
const whyFakeText = document.getElementById("whyFakeText");
const whyRealTitle = document.getElementById("whyRealTitle");
const whyRealText = document.getElementById("whyRealText");
const themeToggle = document.getElementById("themeToggle");
const revealItems = document.querySelectorAll(".reveal");

let selectedFile = null;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

chooseBtn.addEventListener("click", openFilePicker);
themeToggle.addEventListener("click", toggleTheme);

dropArea.addEventListener("click", () => imageInput.click());
dropArea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    imageInput.click();
  }
});

imageInput.addEventListener("change", () => {
  if (imageInput.files.length > 0) {
    handleFile(imageInput.files[0]);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropArea.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropArea.classList.remove("drag-over");
  });
});

dropArea.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    handleFile(file);
  }
});

predictBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  predictBtn.disabled = true;
  predictBtn.textContent = "Analyzing...";
  decisionChip.textContent = "Analyzing image";
  decisionChip.className = "decision-chip neutral";

  const formData = new FormData();
  formData.append("image", selectedFile);

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Prediction failed.");
    }

    showResult(data);
  } catch (error) {
    showError(error.message);
  } finally {
    predictBtn.disabled = false;
    predictBtn.textContent = "Analyze Image";
  }
});

async function loadModelStatus() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    const model = data.model || {};

    if (model.image_size) {
      animateTextNumber(imageSizeStat, model.image_size, {
        suffix: ` x ${model.image_size}`,
        integer: true,
      });
    } else {
      imageSizeStat.textContent = "Unknown";
    }

    if (typeof model.threshold === "number") {
      animateTextNumber(thresholdStat, model.threshold * 100, { suffix: "%", integer: true });
    } else {
      thresholdStat.textContent = "Unknown";
    }

    modelStatusStat.textContent = model.loaded ? "Loaded" : model.exists ? "Available" : "Missing";
    thresholdValue.textContent = typeof model.threshold === "number" ? formatPercent(model.threshold * 100) : "-";
  } catch (_error) {
    modelStatusStat.textContent = "Unavailable";
  }
}

function openFilePicker(event) {
  if (event) {
    event.stopPropagation();
  }
  imageInput.click();
}

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Please choose a valid image file.");
    return;
  }

  selectedFile = file;
  predictBtn.disabled = false;
  resetResultState();

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  uploadInstructions.classList.add("hidden");
  preview.classList.remove("hidden");
  previewPlaceholder.classList.add("hidden");

  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = event.target.result;
    previewImage.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function showResult(data) {
  emptyResult.classList.add("hidden");
  resultCard.classList.remove("hidden");
  resultCard.classList.remove("is-entering");
  void resultCard.offsetWidth;
  resultCard.classList.add("is-entering");

  predictionText.textContent = data.label;
  confidenceText.textContent = `Confidence ${data.confidence}%`;
  animateTextNumber(fakeProb, data.fake_probability, { suffix: "%", decimals: 2 });
  animateTextNumber(realProb, data.real_probability, { suffix: "%", decimals: 2 });
  fakeBar.style.width = `${data.fake_probability}%`;
  realBar.style.width = `${data.real_probability}%`;
  resultNote.textContent = data.note;
  thresholdValue.textContent = formatPercent(data.threshold * 100);
  decisionRule.textContent = `Fake at ${formatPercent(data.threshold * 100)} or higher`;

  if (data.label.toLowerCase().includes("fake")) {
    decisionChip.textContent = "Likely Fake";
    decisionChip.className = "decision-chip fake";
    whyFakeTitle.textContent = "Why fake";
    whyFakeText.textContent = `${data.fake_probability}% is above the threshold.`;
    whyRealTitle.textContent = "Why not real";
    whyRealText.textContent = `${data.real_probability}% was lower.`;
  } else {
    decisionChip.textContent = "Likely Real";
    decisionChip.className = "decision-chip real";
    whyFakeTitle.textContent = "Why not fake";
    whyFakeText.textContent = `${data.fake_probability}% stayed below the threshold.`;
    whyRealTitle.textContent = "Why real";
    whyRealText.textContent = `${data.real_probability}% was stronger.`;
  }
}

function showError(message) {
  emptyResult.classList.add("hidden");
  resultCard.classList.remove("hidden");

  predictionText.textContent = "Prediction error";
  confidenceText.textContent = "Try another image.";
  fakeProb.textContent = "0%";
  realProb.textContent = "0%";
  fakeBar.style.width = "0%";
  realBar.style.width = "0%";
  thresholdValue.textContent = "-";
  decisionRule.textContent = "No decision was produced.";
  resultNote.textContent = message;
  decisionChip.textContent = "Error";
  decisionChip.className = "decision-chip neutral";
  whyFakeTitle.textContent = "Why fake";
  whyFakeText.textContent = "No result.";
  whyRealTitle.textContent = "Why real";
  whyRealText.textContent = "No result.";
}

function resetResultState() {
  resultCard.classList.add("hidden");
  emptyResult.classList.remove("hidden");
  decisionChip.textContent = "Ready to analyze";
  decisionChip.className = "decision-chip neutral";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("deepfake-theme", theme);
}

function toggleTheme() {
  const currentTheme = document.body.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("deepfake-theme");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || systemTheme);
}

function initializeRevealAnimations() {
  revealItems.forEach((item) => {
    item.style.setProperty("--reveal-delay", item.dataset.delay || 0);
  });

  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function animateTextNumber(element, value, options = {}) {
  const { suffix = "", decimals = 0, integer = false } = options;

  if (prefersReducedMotion) {
    element.textContent = formatAnimatedValue(value, { suffix, decimals, integer });
    return;
  }

  const duration = 900;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = value * eased;
    element.textContent = formatAnimatedValue(current, { suffix, decimals, integer });

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      element.textContent = formatAnimatedValue(value, { suffix, decimals, integer });
    }
  }

  requestAnimationFrame(frame);
}

function formatAnimatedValue(value, options = {}) {
  const { suffix = "", decimals = 0, integer = false } = options;

  if (integer) {
    return `${Math.round(value)}${suffix}`;
  }

  return `${Number(value).toFixed(decimals)}${suffix}`;
}

function formatFileSize(bytes) {
  if (!bytes) return "-";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(0)}%`;
}

initializeTheme();
initializeRevealAnimations();
loadModelStatus();
