const imageInput = document.getElementById("imageInput");
const previewImage = document.getElementById("previewImage");
const hiddenCanvas = document.getElementById("hiddenCanvas");
const analyzeBtn = document.getElementById("analyzeBtn");

const scoreValue = document.getElementById("scoreValue");
const verdictValue = document.getElementById("verdictValue");
const cardNumberValue = document.getElementById("cardNumberValue");
const setValue = document.getElementById("setValue");
const blurValue = document.getElementById("blurValue");
const ratioValue = document.getElementById("ratioValue");
const reasonsList = document.getElementById("reasonsList");
const ocrText = document.getElementById("ocrText");

let currentImage = null;

imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewImage.style.display = "block";
    currentImage = new Image();
    currentImage.onload = () => {};
    currentImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

analyzeBtn.addEventListener("click", async () => {
  if (!currentImage || !currentImage.src) {
    alert("נא להעלות תמונה קודם");
    return;
  }

  resetResults();
  verdictValue.textContent = "בודק...";
  ocrText.value = "מזהה טקסט...";

  const imageData = drawImageToCanvas(currentImage);
  const blur = calculateBlurScore(imageData);
  const ratio = calculateAspectRatio(currentImage.width, currentImage.height);
  const text = await extractTextFromImage(hiddenCanvas);
  const cardNumber = findCardNumber(text);
  const detectedSet = detectSet(text);

  const result = analyzeCard({
    blur,
    ratio,
    text,
    cardNumber,
    detectedSet
  });

  renderResults(result, text, blur, ratio, cardNumber, detectedSet);
});

function drawImageToCanvas(image) {
  const ctx = hiddenCanvas.getContext("2d");
  hiddenCanvas.width = image.width;
  hiddenCanvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

function calculateAspectRatio(width, height) {
  return width / height;
}

function calculateBlurScore(imageData) {
  const { data, width, height } = imageData;
  const gray = [];

  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(g);
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const laplacian =
        gray[i - width] +
        gray[i - 1] -
        4 * gray[i] +
        gray[i + 1] +
        gray[i + width];

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.max(0, variance);
}

async function extractTextFromImage(canvas) {
  try {
    const result = await Tesseract.recognize(canvas, "eng", {
      logger: () => {}
    });
    return result.data.text || "";
  } catch (error) {
    return "";
  }
}

function findCardNumber(text) {
  const match = text.match(/\b\d{1,3}\/\d{1,3}\b/);
  return match ? match[0] : null;
}

function detectSet(text) {
  const lower = text.toLowerCase();

  const knownSets = [
    "base set",
    "jungle",
    "fossil",
    "team rocket",
    "gym heroes",
    "gym challenge",
    "neo genesis",
    "neo discovery",
    "expedition",
    "aquapolis",
    "skyridge",
    "ex ruby",
    "hidden fates",
    "shining fates",
    "evolving skies",
    "fusion strike",
    "brilliant stars",
    "silver tempest",
    "crown zenith",
    "obsidian flames",
    "paldea evolved",
    "paradox rift",
    "temporal forces",
    "surging sparks"
  ];

  for (const setName of knownSets) {
    if (lower.includes(setName)) {
      return setName;
    }
  }

  return "לא זוהה";
}

function detectSuspiciousWords(text) {
  const lower = text.toLowerCase();
  const suspicious = [];

  const patterns = [
    "pokernon",
    "p0kemon",
    "enerqy",
    "trarner",
    "h p",
    "1p"
  ];

  for (const pattern of patterns) {
    if (lower.includes(pattern)) {
      suspicious.push(pattern);
    }
  }

  return suspicious;
}

function analyzeCard({ blur, ratio, text, cardNumber, detectedSet }) {
  let score = 100;
  const reasons = [];

  if (blur < 80) {
    score -= 20;
    reasons.push("התמונה נראית מטושטשת או לא חדה מספיק");
  }

  if (ratio < 0.68 || ratio > 0.75) {
    score -= 20;
    reasons.push("יחס התמונה לא נראה כמו יחס תקין של קלף");
  }

  if (!cardNumber) {
    score -= 15;
    reasons.push("לא זוהה מספר קלף בפורמט רגיל");
  }

  if (text.trim().length < 10) {
    score -= 10;
    reasons.push("לא זוהה מספיק טקסט על הקלף");
  }

  const suspiciousWords = detectSuspiciousWords(text);
  if (suspiciousWords.length > 0) {
    score -= Math.min(20, suspiciousWords.length * 5);
    reasons.push("זוהו מילים או תווים חשודים: " + suspiciousWords.join(", "));
  }

  if (detectedSet === "לא זוהה") {
    score -= 5;
    reasons.push("לא זוהה סט בצורה ברורה");
  }

  score = Math.max(0, Math.min(100, score));

  let verdict = "חשוד";
  if (score >= 80) verdict = "כנראה אמיתי";
  else if (score >= 55) verdict = "דרושה בדיקה ידנית";
  else verdict = "כנראה מזויף";

  if (reasons.length === 0) {
    reasons.push("לא נמצאו סימנים חריגים בבדיקה הראשונית");
  }

  return { score, verdict, reasons };
}

function renderResults(result, text, blur, ratio, cardNumber, detectedSet) {
  scoreValue.textContent = `${result.score}/100`;
  verdictValue.textContent = result.verdict;
  cardNumberValue.textContent = cardNumber || "לא זוהה";
  setValue.textContent = detectedSet || "לא זוהה";
  blurValue.textContent = blur.toFixed(2);
  ratioValue.textContent = ratio.toFixed(3);
  ocrText.value = text || "לא זוהה טקסט";

  reasonsList.innerHTML = "";
  result.reasons.forEach((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    reasonsList.appendChild(li);
  });
}

function resetResults() {
  scoreValue.textContent = "-";
  verdictValue.textContent = "-";
  cardNumberValue.textContent = "-";
  setValue.textContent = "-";
  blurValue.textContent = "-";
  ratioValue.textContent = "-";
  ocrText.value = "";
  reasonsList.innerHTML = "";
}
