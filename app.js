import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";


/* =========================================================
   PDF.JS WORKER
   ========================================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


/* =========================================================
   DOM
   ========================================================= */

const fileInput = document.getElementById("resumeFile");
const dropZone = document.getElementById("dropZone");
const fileName = document.getElementById("fileName");

const jobDescription =
  document.getElementById("jobDescription");

const analyzeBtn =
  document.getElementById("analyzeBtn");

const status =
  document.getElementById("status");

const loadingState =
  document.getElementById("loadingState");

const loadingTitle =
  document.getElementById("loadingTitle");

const loadingText =
  document.getElementById("loadingText");

const loadingBar =
  document.getElementById("loadingBar");

const reportSection =
  document.getElementById("reportSection");

const analyzeAnother =
  document.getElementById("analyzeAnother");


/* =========================================================
   STATE
   ========================================================= */

let selectedFile = null;


/* =========================================================
   FILE SELECT
   ========================================================= */

fileInput.addEventListener("change", () => {

  const file = fileInput.files?.[0];

  if (!file) return;

  handleFile(file);

});


function handleFile(file) {

  status.textContent = "";

  const allowed =
    file.type === "application/pdf" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.pdf$/i.test(file.name) ||
    /\.docx$/i.test(file.name);

  if (!allowed) {

    selectedFile = null;

    fileName.textContent =
      "Please choose a PDF or DOCX file.";

    status.textContent =
      "Only PDF and DOCX resumes are supported.";

    return;
  }


  if (file.size > 5 * 1024 * 1024) {

    selectedFile = null;

    fileName.textContent =
      "File is too large.";

    status.textContent =
      "Maximum file size is 5MB.";

    return;
  }


  selectedFile = file;

  fileName.textContent =
    `${file.name} · ${formatBytes(file.size)}`;

  dropZone.classList.add("has-file");

}


function formatBytes(bytes) {

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


/* =========================================================
   DRAG & DROP
   ========================================================= */

["dragenter", "dragover"].forEach(eventName => {

  dropZone.addEventListener(eventName, event => {

    event.preventDefault();

    dropZone.classList.add("dragover");

  });

});


["dragleave", "drop"].forEach(eventName => {

  dropZone.addEventListener(eventName, event => {

    event.preventDefault();

    dropZone.classList.remove("dragover");

  });

});


dropZone.addEventListener("drop", event => {

  const file = event.dataTransfer.files?.[0];

  if (file) {
    handleFile(file);
  }

});


/* =========================================================
   ANALYZE
   ========================================================= */

analyzeBtn.addEventListener("click", async () => {

  if (!selectedFile) {

    status.textContent =
      "Please upload your resume first.";

    dropZone.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    return;
  }


  status.textContent = "";

  analyzeBtn.disabled = true;

  loadingState.classList.remove("hidden");

  loadingBar.style.width = "8%";


  try {

    const resumeText =
      await extractResumeText(selectedFile);

    loadingBar.style.width = "32%";

    await sleep(550);

    loadingTitle.textContent =
      "Checking your resume";

    loadingText.textContent =
      "Analyzing sections, contact details and ATS signals...";

    loadingBar.style.width = "54%";

    await sleep(650);


    const result =
      analyzeResume(
        resumeText,
        jobDescription.value
      );


    loadingTitle.textContent =
      "Calculating your ATS score";

    loadingText.textContent =
      "Comparing your resume against common ATS requirements...";

    loadingBar.style.width = "78%";

    await sleep(650);


    loadingTitle.textContent =
      "Almost done";

    loadingText.textContent =
      "Preparing your personalized report...";

    loadingBar.style.width = "94%";

    await sleep(500);

    loadingBar.style.width = "100%";

    await sleep(250);


    renderReport(result);


    loadingState.classList.add("hidden");

    reportSection.classList.remove("hidden");

    reportSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


  } catch (error) {

    console.error(error);

    loadingState.classList.add("hidden");

    status.textContent =
      "We couldn't read this file. Please try another PDF or DOCX.";

  } finally {

    analyzeBtn.disabled = false;

  }

});


/* =========================================================
   EXTRACT TEXT
   ========================================================= */

async function extractResumeText(file) {

  const extension =
    file.name.split(".").pop().toLowerCase();


  if (extension === "pdf") {

    return extractPDF(file);

  }


  if (extension === "docx") {

    return extractDOCX(file);

  }


  throw new Error("Unsupported file type.");

}


/* =========================================================
   PDF
   ========================================================= */

async function extractPDF(file) {

  const buffer =
    await file.arrayBuffer();


  const pdf =
    await pdfjsLib.getDocument({
      data: buffer
    }).promise;


  let fullText = "";


  for (let pageNumber = 1;
       pageNumber <= pdf.numPages;
       pageNumber++) {

    const page =
      await pdf.getPage(pageNumber);


    const content =
      await page.getTextContent();


    const pageText =
      content.items
        .map(item => item.str)
        .join(" ");


    fullText +=
      pageText + "\n";

  }


  if (!fullText.trim()) {

    throw new Error(
      "No readable text found in PDF."
    );

  }


  return normalizeText(fullText);

}


/* =========================================================
   DOCX
   ========================================================= */

async function extractDOCX(file) {

  if (!window.mammoth) {

    throw new Error(
      "DOCX parser unavailable."
    );

  }


  const buffer =
    await file.arrayBuffer();


  const result =
    await window.mammoth.extractRawText({
      arrayBuffer: buffer
    });


  if (!result.value.trim()) {

    throw new Error(
      "No readable text found in DOCX."
    );

  }


  return normalizeText(result.value);

}


/* =========================================================
   NORMALIZE
   ========================================================= */

function normalizeText(text) {

  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

}


/* =========================================================
   ANALYSIS ENGINE
   ========================================================= */

function analyzeResume(resume, jobText) {

  const text =
    normalizeText(resume);

  const lower =
    text.toLowerCase();


  /* CONTACT */

  const hasEmail =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
      .test(text);

  const hasPhone =
    /(?:\+?\d[\d\s().-]{8,}\d)/
      .test(text);

  const hasLinkedIn =
    /linkedin\.com/i.test(text);


  let contactScore = 0;

  if (hasEmail) contactScore += 45;
  if (hasPhone) contactScore += 35;
  if (hasLinkedIn) contactScore += 20;


  /* SECTIONS */

  const sectionPatterns = [
    /experience|work experience|employment/i,
    /education|academic/i,
    /skills|technical skills|core skills/i,
    /projects|project experience/i,
    /summary|profile|objective/i,
    /certifications|certificates/i
  ];


  let sectionCount = 0;

  sectionPatterns.forEach(pattern => {

    if (pattern.test(text)) {
      sectionCount++;
    }

  });


  const sectionScore =
    Math.round(
      (sectionCount / sectionPatterns.length) * 100
    );


  /* FORMATTING */

  const lines =
    text.split("\n").filter(Boolean);


  let formatScore = 100;


  if (text.length < 500) {
    formatScore -= 20;
  }

  if (lines.length < 8) {
    formatScore -= 20;
  }

  if (/(.)\1{7,}/.test(text)) {
    formatScore -= 10;
  }

  if (text.includes("�")) {
    formatScore -= 15;
  }

  formatScore =
    Math.max(
      0,
      Math.min(100, formatScore)
    );


  /* KEYWORDS */

  const jobKeywords =
    extractKeywords(jobText);


  let matchedKeywords = [];
  let missingKeywords = [];


  if (jobKeywords.length) {

    jobKeywords.forEach(keyword => {

      if (
        lower.includes(keyword.toLowerCase())
      ) {

        matchedKeywords.push(keyword);

      } else {

        missingKeywords.push(keyword);

      }

    });

  } else {

    const defaultKeywords = [
      "communication",
      "leadership",
      "problem solving",
      "teamwork",
      "project management",
      "analysis",
      "management",
      "research",
      "technical",
      "strategy"
    ];


    defaultKeywords.forEach(keyword => {

      if (lower.includes(keyword)) {
        matchedKeywords.push(keyword);
      }

    });

  }


  let keywordScore;


  if (jobKeywords.length) {

    keywordScore =
      Math.round(
        (matchedKeywords.length /
          jobKeywords.length) * 100
      );

  } else {

    keywordScore =
      Math.min(
        100,
        35 + matchedKeywords.length * 7
      );

  }


  /* OVERALL */

  const overall =
    Math.round(
      keywordScore * 0.35 +
      sectionScore * 0.25 +
      contactScore * 0.20 +
      formatScore * 0.20
    );


  /* PROBLEMS */

  const problems = [];
  const recommendations = [];


  if (!hasEmail) {

    problems.push(
      "No email address was detected."
    );

    recommendations.push(
      "Add a professional email address near the top of your resume."
    );

  }


  if (!hasPhone) {

    problems.push(
      "No phone number was detected."
    );

    recommendations.push(
      "Add a reachable phone number in your contact section."
    );

  }


  if (!hasLinkedIn) {

    problems.push(
      "LinkedIn profile was not detected."
    );

    recommendations.push(
      "Consider adding your LinkedIn profile to strengthen your professional presence."
    );

  }


  if (sectionCount < 4) {

    problems.push(
      "Some standard resume sections appear to be missing."
    );

    recommendations.push(
      "Use clear sections such as Experience, Education, Skills and Projects."
    );

  }


  if (formatScore < 80) {

    problems.push(
      "The extracted resume text suggests formatting or readability issues."
    );

    recommendations.push(
      "Keep formatting simple, consistent and ATS-friendly."
    );

  }


  if (jobKeywords.length &&
      missingKeywords.length) {

    problems.push(
      `${missingKeywords.length} job-specific keywords were not found in your resume.`
    );

    recommendations.push(
      "Add relevant missing keywords only where they accurately describe your experience."
    );

  }


  if (!problems.length) {

    problems.push(
      "No major ATS issues were detected."
    );

  }


  if (!recommendations.length) {

    recommendations.push(
      "Your resume has a solid ATS foundation. Keep improving it for each specific role."
    );

  }


  return {

    overall,
    keywordScore,
    sectionScore,
    contactScore,
    formatScore,

    matchedKeywords:
      matchedKeywords.slice(0, 18),

    missingKeywords:
      missingKeywords.slice(0, 18),

    problems:
      problems.slice(0, 6),

    recommendations:
      recommendations.slice(0, 6),

    resumeLength:
      text.length

  };

}


/* =========================================================
   KEYWORD EXTRACTION
   ========================================================= */

function extractKeywords(jobText) {

  if (!jobText.trim()) {
    return [];
  }


  const stopWords = new Set([

    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "your",
    "you",
    "our",
    "are",
    "will",
    "have",
    "has",
    "not",
    "but",
    "who",
    "what",
    "when",
    "where",
    "how",
    "their",
    "they",
    "them",
    "into",
    "about",
    "using",
    "work",
    "working",
    "role",
    "team",
    "job",
    "candidate",
    "years",
    "year",
    "experience",
    "ability",
    "strong",
    "skills",
    "skill",
    "required",
    "preferred",
    "responsibilities",
    "responsibility",
    "including",
    "also",
    "should",
    "must"

  ]);


  const words =
    jobText
      .toLowerCase()
      .replace(/[^a-z0-9+#.\- ]/g, " ")
      .split(/\s+/)
      .filter(word =>
        word.length >= 3 &&
        !stopWords.has(word)
      );


  const frequency = new Map();


  words.forEach(word => {

    frequency.set(
      word,
      (frequency.get(word) || 0) + 1
    );

  });


  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(item => item[0]);

}


/* =========================================================
   RENDER REPORT
   ========================================================= */

function renderReport(result) {

  setText(
    "overallScore",
    result.overall
  );

  setText(
    "circleScore",
    result.overall
  );


  setText(
    "keywordScore",
    result.keywordScore
  );

  setText(
    "sectionScore",
    result.sectionScore
  );

  setText(
    "contactScore",
    result.contactScore
  );

  setText(
    "formatScore",
    result.formatScore
  );


  setText(
    "reportSummary",
    `Your resume has been analyzed locally. ${result.resumeLength.toLocaleString()} characters were reviewed.`
  );


  let message =
    "Your resume needs improvement before applying.";

  if (result.overall >= 80) {
    message =
      "Strong ATS foundation — you're in a good position to apply.";
  } else if (result.overall >= 65) {
    message =
      "Good foundation, but there are a few areas worth improving.";
  } else if (result.overall >= 45) {
    message =
      "Several improvements could make your resume more ATS-friendly.";
  }


  setText(
    "scoreMessage",
    message
  );


  setProgress(
    "keywordBar",
    result.keywordScore
  );

  setProgress(
    "sectionBar",
    result.sectionScore
  );

  setProgress(
    "contactBar",
    result.contactScore
  );

  setProgress(
    "formatBar",
    result.formatScore
  );


  renderList(
    "problemsList",
    result.problems
  );

  renderList(
    "recommendationsList",
    result.recommendations
  );


  renderKeywords(
    "matchedKeywords",
    result.matchedKeywords,
    false
  );

  renderKeywords(
    "missingKeywords",
    result.missingKeywords,
    true
  );


  updateRing(result.overall);

}


function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


function setProgress(id, value) {

  const element =
    document.getElementById(id);

  if (element) {

    requestAnimationFrame(() => {

      element.style.width =
        `${Math.max(0, Math.min(100, value))}%`;

    });

  }

}


function renderList(id, items) {

  const element =
    document.getElementById(id);

  element.innerHTML = "";


  items.forEach(item => {

    const li =
      document.createElement("li");

    li.textContent = item;

    element.appendChild(li);

  });

}


function renderKeywords(id, items, missing) {

  const element =
    document.getElementById(id);

  element.innerHTML = "";


  if (!items.length) {

    const span =
      document.createElement("span");

    span.className = "keyword-tag";

    span.textContent =
      missing
        ? "No missing keywords detected"
        : "No matched keywords yet";

    element.appendChild(span);

    return;
  }


  items.forEach(item => {

    const span =
      document.createElement("span");

    span.className =
      missing
        ? "keyword-tag missing"
        : "keyword-tag";

    span.textContent = item;

    element.appendChild(span);

  });

}


function updateRing(score) {

  const ring =
    document.getElementById("ringProgress");

  if (!ring) return;


  const circumference = 314;

  const offset =
    circumference -
    (score / 100) * circumference;


  setTimeout(() => {

    ring.style.strokeDashoffset =
      offset;

  }, 100);

}


/* =========================================================
   ANALYZE ANOTHER
   ========================================================= */

analyzeAnother.addEventListener(
  "click",
  () => {

    selectedFile = null;

    fileInput.value = "";

    fileName.textContent =
      "No resume selected";

    jobDescription.value = "";

    status.textContent = "";

    reportSection.classList.add("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


/* =========================================================
   HELPERS
   ========================================================= */

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}
