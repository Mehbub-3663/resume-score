/* =========================================================
   ResumeScore V0.4
   Local ATS Resume Analyzer
   PDF + DOCX
========================================================= */


/* =========================================================
   PDF.JS CONFIG
   This fixes:
   "No GlobalWorkerOptions.workerSrc specified."
========================================================= */

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}


/* =========================================================
   DOM
========================================================= */

const fileInput = document.getElementById("resumeFile");
const uploadArea = document.getElementById("uploadArea");
const chooseBtn = document.getElementById("chooseBtn");

const selectedFileBox = document.getElementById("selectedFile");
const fileNameEl = document.getElementById("fileName");
const fileSizeEl = document.getElementById("fileSize");
const removeFileBtn = document.getElementById("removeFile");

const jobDescription = document.getElementById("jobDescription");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");

const loadingSection = document.getElementById("loadingSection");
const loadingTitle = document.getElementById("loadingTitle");
const loadingText = document.getElementById("loadingText");
const loadingBar = document.getElementById("loadingBar");

const reportSection = document.getElementById("reportSection");
const analyzeAnother = document.getElementById("analyzeAnother");

const overallScore = document.getElementById("overallScore");
const circleScore = document.getElementById("circleScore");
const scoreMessage = document.getElementById("scoreMessage");
const scoreRing = document.getElementById("scoreRing");

const keywordScore = document.getElementById("keywordScore");
const sectionScore = document.getElementById("sectionScore");
const contactScore = document.getElementById("contactScore");
const formatScore = document.getElementById("formatScore");

const keywordBar = document.getElementById("keywordBar");
const sectionBar = document.getElementById("sectionBar");
const contactBar = document.getElementById("contactBar");
const formatBar = document.getElementById("formatBar");

const problemsList = document.getElementById("problemsList");
const recommendationsList =
  document.getElementById("recommendationsList");

const matchedKeywords =
  document.getElementById("matchedKeywords");

const missingKeywords =
  document.getElementById("missingKeywords");


/* =========================================================
   STATE
========================================================= */

let selectedFile = null;
let resumeText = "";


/* =========================================================
   HELPERS
========================================================= */

function setStatus(message = "") {
  statusEl.textContent = message;
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + " B";
  }

  if (bytes < 1024 * 1024) {
    return Math.round(bytes / 1024) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(text) {
  return String(text || "")
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
   FILE SELECTION
========================================================= */

function handleFile(file) {

  if (!file) {
    return;
  }

  const maxSize = 5 * 1024 * 1024;

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const isDocx =
    file.type.includes("wordprocessingml") ||
    file.name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    setStatus("Please upload a PDF or DOCX file.");
    return;
  }

  if (file.size > maxSize) {
    setStatus("File is too large. Maximum size is 5MB.");
    return;
  }

  selectedFile = file;

  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatFileSize(file.size);

  const extension =
    file.name.toLowerCase().endsWith(".docx")
      ? "DOCX"
      : "PDF";

  document.querySelector(".file-icon").textContent =
    extension;

  selectedFileBox.classList.remove("hidden");

  uploadArea.classList.add("has-file");

  setStatus("");

  analyzeBtn.disabled = false;
}


/* =========================================================
   CHOOSE FILE
========================================================= */

chooseBtn.addEventListener("click", () => {
  fileInput.click();
});

uploadArea.addEventListener("click", (event) => {

  if (
    event.target.closest(".browse-button") ||
    event.target === fileInput
  ) {
    return;
  }

  fileInput.click();
});

fileInput.addEventListener("change", () => {

  const file = fileInput.files[0];

  handleFile(file);
});


/* =========================================================
   DRAG & DROP
========================================================= */

[
  "dragenter",
  "dragover"
].forEach(eventName => {

  uploadArea.addEventListener(eventName, event => {

    event.preventDefault();
    event.stopPropagation();

    uploadArea.classList.add("dragging");

  });

});


[
  "dragleave",
  "drop"
].forEach(eventName => {

  uploadArea.addEventListener(eventName, event => {

    event.preventDefault();
    event.stopPropagation();

    uploadArea.classList.remove("dragging");

  });

});


uploadArea.addEventListener("drop", event => {

  const file = event.dataTransfer.files[0];

  handleFile(file);

});


/* =========================================================
   REMOVE FILE
========================================================= */

removeFileBtn.addEventListener("click", () => {

  selectedFile = null;
  resumeText = "";

  fileInput.value = "";

  selectedFileBox.classList.add("hidden");

  setStatus("");

});


/* =========================================================
   PDF TEXT EXTRACTION
========================================================= */

async function extractPdfText(file) {

  if (!window.pdfjsLib) {
    throw new Error(
      "PDF reader could not be loaded. Please refresh and try again."
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await window.pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str || "")
      .join(" ");

    fullText += pageText + "\n";
  }

  return normalizeText(fullText);
}


/* =========================================================
   DOCX TEXT EXTRACTION
========================================================= */

async function extractDocxText(file) {

  if (!window.mammoth) {
    throw new Error(
      "DOCX reader could not be loaded. Please refresh and try again."
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await window.mammoth.extractRawText({
    arrayBuffer
  });

  return normalizeText(result.value);
}


/* =========================================================
   GENERIC TEXT EXTRACTION
========================================================= */

async function extractResumeText(file) {

  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }

  throw new Error("Unsupported resume format.");
}


/* =========================================================
   TEXT UTILITIES
========================================================= */

function hasAny(text, patterns) {

  const lower = text.toLowerCase();

  return patterns.some(pattern =>
    lower.includes(pattern.toLowerCase())
  );
}


function countMatches(text, patterns) {

  const lower = text.toLowerCase();

  return patterns.filter(pattern =>
    lower.includes(pattern.toLowerCase())
  ).length;
}


/* =========================================================
   KEYWORD EXTRACTION
========================================================= */

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "been",
  "being",
  "before",
  "between",
  "could",
  "does",
  "doing",
  "during",
  "each",
  "from",
  "have",
  "having",
  "into",
  "more",
  "most",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "very",
  "want",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
  "you",
  "will",
  "role",
  "work",
  "working",
  "using",
  "years",
  "year",
  "team",
  "job",
  "candidate",
  "required",
  "preferred",
  "responsibilities",
  "experience"
]);


function extractKeywords(jobText) {

  const words = normalizeText(jobText)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]/g, " ")
    .split(/\s+/)
    .filter(word => {
      return (
        word.length >= 3 &&
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
      );
    });

  const frequency = {};

  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(item => item[0]);
}


/* =========================================================
   ANALYZE SECTIONS
========================================================= */

function analyzeSections(text) {

  const sections = [
    {
      name: "Experience",
      patterns: [
        "experience",
        "work experience",
        "professional experience"
      ]
    },
    {
      name: "Education",
      patterns: [
        "education",
        "academic"
      ]
    },
    {
      name: "Skills",
      patterns: [
        "skills",
        "technical skills",
        "core skills"
      ]
    },
    {
      name: "Projects",
      patterns: [
        "projects",
        "project experience"
      ]
    },
    {
      name: "Summary",
      patterns: [
        "summary",
        "profile",
        "professional summary",
        "objective"
      ]
    },
    {
      name: "Certifications",
      patterns: [
        "certification",
        "certifications"
      ]
    }
  ];

  const found = [];

  sections.forEach(section => {

    if (hasAny(text, section.patterns)) {
      found.push(section.name);
    }

  });

  return {
    found,
    total: sections.length
  };
}


/* =========================================================
   CONTACT ANALYSIS
========================================================= */

function analyzeContact(text) {

  const email =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);

  const phone =
    /(\+?\d[\d\s().-]{8,}\d)/.test(text);

  const linkedin =
    /linkedin\.com/i.test(text);

  const github =
    /github\.com/i.test(text);

  let score = 0;

  if (email) score += 40;
  if (phone) score += 35;
  if (linkedin) score += 15;
  if (github) score += 10;

  return {
    email,
    phone,
    linkedin,
    github,
    score: Math.min(score, 100)
  };
}


/* =========================================================
   FORMATTING ANALYSIS
========================================================= */

function analyzeFormatting(text) {

  let score = 100;

  if (text.length < 600) {
    score -= 30;
  }

  if (text.length < 300) {
    score -= 25;
  }

  if (text.length > 15000) {
    score -= 10;
  }

  const repeatedSpaces =
    /\s{3,}/.test(text);

  if (repeatedSpaces) {
    score -= 5;
  }

  const weirdSymbols =
    /[�]{2,}/.test(text);

  if (weirdSymbols) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}


/* =========================================================
   KEYWORD ANALYSIS
========================================================= */

function analyzeKeywords(resume, job) {

  if (!job.trim()) {

    const commonResumeKeywords = [
      "javascript",
      "python",
      "java",
      "react",
      "node",
      "sql",
      "aws",
      "azure",
      "git",
      "html",
      "css",
      "figma",
      "excel",
      "leadership",
      "communication"
    ];

    const matched = commonResumeKeywords.filter(keyword =>
      resume.toLowerCase().includes(keyword)
    );

    return {
      score: Math.min(100, 55 + matched.length * 3),
      matched,
      missing: []
    };
  }


  const keywords = extractKeywords(job);

  if (!keywords.length) {
    return {
      score: 60,
      matched: [],
      missing: []
    };
  }

  const lowerResume = resume.toLowerCase();

  const matched = [];
  const missing = [];

  keywords.forEach(keyword => {

    if (lowerResume.includes(keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }

  });

  const score = Math.round(
    (matched.length / keywords.length) * 100
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    matched,
    missing
  };
}


/* =========================================================
   FULL ANALYSIS
========================================================= */

function analyzeResume(resume, job) {

  const sections = analyzeSections(resume);

  const contact = analyzeContact(resume);

  const formatting = analyzeFormatting(resume);

  const keywords = analyzeKeywords(resume, job);


  let sectionScore =
    Math.round(
      (sections.found.length / sections.total) * 100
    );


  /*
    Slightly reward resumes with useful length.
  */

  if (resume.length > 1200) {
    sectionScore = Math.min(100, sectionScore + 5);
  }


  /*
    Overall score.
  */

  let overall =
    Math.round(
      keywords.score * 0.35 +
      sectionScore * 0.25 +
      contact.score * 0.20 +
      formatting * 0.20
    );


  /*
    Prevent completely empty/garbage files
    from looking healthy.
  */

  if (resume.length < 150) {
    overall = Math.min(overall, 20);
  }


  overall = Math.max(0, Math.min(100, overall));


  const problems = [];
  const recommendations = [];


  /* Problems */

  if (contact.score < 100) {

    if (!contact.email) {
      problems.push(
        "A professional email address was not detected."
      );
    }

    if (!contact.phone) {
      problems.push(
        "A phone number was not detected."
      );
    }

    if (!contact.linkedin) {
      problems.push(
        "A LinkedIn profile link was not detected."
      );
    }
  }


  if (!sections.found.includes("Summary")) {
    problems.push(
      "A clear professional summary is missing."
    );
  }


  if (!sections.found.includes("Skills")) {
    problems.push(
      "A dedicated skills section was not detected."
    );
  }


  if (!sections.found.includes("Experience")) {
    problems.push(
      "A clear experience section was not detected."
    );
  }


  if (formatting < 75) {
    problems.push(
      "The extracted text suggests the formatting may not be very ATS-friendly."
    );
  }


  if (job.trim() && keywords.missing.length > 0) {

    problems.push(
      `${keywords.missing.length} job-relevant keywords were not found in your resume.`
    );
  }


  if (problems.length === 0) {

    problems.push(
      "No major ATS problems were detected."
    );
  }


  /* Recommendations */

  if (!contact.email) {
    recommendations.push(
      "Add a professional email address near your name."
    );
  }

  if (!contact.phone) {
    recommendations.push(
      "Add a reachable phone number to your header."
    );
  }

  if (!contact.linkedin) {
    recommendations.push(
      "Consider adding your LinkedIn profile URL."
    );
  }

  if (!sections.found.includes("Summary")) {
    recommendations.push(
      "Add a concise 2–4 line professional summary tailored to the target role."
    );
  }

  if (!sections.found.includes("Skills")) {
    recommendations.push(
      "Create a dedicated Skills section containing relevant tools and technologies."
    );
  }

  if (job.trim() && keywords.missing.length > 0) {

    recommendations.push(
      `Review the job description and naturally include relevant missing terms such as ${keywords.missing.slice(0, 5).join(", ")}.`
    );
  }

  recommendations.push(
    "Use clear section headings and simple formatting so ATS systems can parse your resume reliably."
  );


  return {
    overall,
    keywords: keywords.score,
    sections: sectionScore,
    contact: contact.score,
    formatting,

    matched: keywords.matched,
    missing: keywords.missing,

    problems: problems.slice(0, 6),
    recommendations: recommendations.slice(0, 6)
  };
}


/* =========================================================
   LOADING ANIMATION
========================================================= */

function setLoadingStep(step, title, text, progress) {

  loadingTitle.textContent = title;
  loadingText.textContent = text;
  loadingBar.style.width = progress + "%";


  const steps = [
    document.getElementById("loadStep1"),
    document.getElementById("loadStep2"),
    document.getElementById("loadStep3"),
    document.getElementById("loadStep4")
  ];


  steps.forEach((item, index) => {

    if (index < step) {

      item.classList.add("active");

      item.querySelector("span").textContent = "✓";

    } else if (index === step) {

      item.classList.add("active");

      item.querySelector("span").textContent =
        String(index + 1);

    } else {

      item.classList.remove("active");

      item.querySelector("span").textContent =
        String(index + 1);
    }

  });
}


function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* =========================================================
   RENDER SCORE
========================================================= */

function renderNumber(element, value) {

  const start = 0;
  const duration = 900;

  const startTime = performance.now();

  function animate(currentTime) {

    const elapsed = currentTime - startTime;

    const progress =
      Math.min(elapsed / duration, 1);

    const eased =
      1 - Math.pow(1 - progress, 3);

    const current =
      Math.round(start + value * eased);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }

  }

  requestAnimationFrame(animate);
}


function renderReport(result) {

  reportSection.classList.remove("hidden");


  renderNumber(overallScore, result.overall);
  renderNumber(circleScore, result.overall);

  renderNumber(keywordScore, result.keywords);
  renderNumber(sectionScore, result.sections);
  renderNumber(contactScore, result.contact);
  renderNumber(formatScore, result.formatting);


  keywordBar.style.width = result.keywords + "%";
  sectionBar.style.width = result.sections + "%";
  contactBar.style.width = result.contact + "%";
  formatBar.style.width = result.formatting + "%";


  /*
    Circle circumference ≈ 314
  */

  const circumference = 314;

  const offset =
    circumference -
    (result.overall / 100) * circumference;

  setTimeout(() => {

    scoreRing.style.strokeDashoffset =
      String(offset);

  }, 50);


  /* Score message */

  if (result.overall >= 85) {

    scoreMessage.textContent =
      "Strong foundation. Your resume looks well prepared for ATS screening.";

  } else if (result.overall >= 70) {

    scoreMessage.textContent =
      "Good foundation, but there are a few improvements worth making.";

  } else if (result.overall >= 50) {

    scoreMessage.textContent =
      "Your resume has potential, but several areas should be improved.";

  } else {

    scoreMessage.textContent =
      "Your resume needs some important improvements before applying.";
  }


  /* Problems */

  problemsList.innerHTML =
    result.problems
      .map(problem =>
        `<li>${escapeHtml(problem)}</li>`
      )
      .join("");


  /* Recommendations */

  recommendationsList.innerHTML =
    result.recommendations
      .map(item =>
        `<li>${escapeHtml(item)}</li>`
      )
      .join("");


  /* Matched */

  if (result.matched.length) {

    matchedKeywords.innerHTML =
      result.matched
        .map(keyword =>
          `<span class="keyword-tag">${escapeHtml(keyword)}</span>`
        )
        .join("");

  } else {

    matchedKeywords.innerHTML =
      `<span class="keyword-tag">No specific matches</span>`;
  }


  /* Missing */

  if (result.missing.length) {

    missingKeywords.innerHTML =
      result.missing
        .map(keyword =>
          `<span class="keyword-tag missing">${escapeHtml(keyword)}</span>`
        )
        .join("");

  } else {

    missingKeywords.innerHTML =
      `<span class="keyword-tag">No major missing keywords</span>`;
  }


  /*
    Smooth scroll to report.
  */

  setTimeout(() => {

    reportSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }, 100);
}


/* =========================================================
   ANALYZE BUTTON
========================================================= */

analyzeBtn.addEventListener("click", async () => {

  if (!selectedFile) {

    setStatus("Please upload your resume first.");

    uploadArea.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    return;
  }


  setStatus("");

  analyzeBtn.disabled = true;

  /*
    Hide previous report.
  */

  reportSection.classList.add("hidden");


  /*
    Show loading.
  */

  loadingSection.classList.remove("hidden");

  loadingSection.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });


  try {

    /* STEP 1 */

    setLoadingStep(
      0,
      "Reading your resume",
      "Extracting your resume content...",
      15
    );

    await wait(700);

    resumeText =
      await extractResumeText(selectedFile);


    if (!resumeText || resumeText.length < 40) {

      throw new Error(
        "We couldn't read enough text from this resume. Try another PDF/DOCX file."
      );
    }


    /* STEP 2 */

    setLoadingStep(
      1,
      "Checking ATS structure",
      "Looking at sections, contact details and formatting...",
      42
    );

    await wait(700);


    /* STEP 3 */

    setLoadingStep(
      2,
      "Matching keywords",
      "Comparing your resume against the job description...",
      70
    );

    await wait(800);


    /* STEP 4 */

    setLoadingStep(
      3,
      "Building your report",
      "Turning the analysis into practical recommendations...",
      91
    );

    await wait(850);


    const result =
      analyzeResume(
        resumeText,
        jobDescription.value
      );


    loadingBar.style.width = "100%";

    await wait(450);


    loadingSection.classList.add("hidden");

    renderReport(result);

  } catch (error) {

    console.error(error);

    loadingSection.classList.add("hidden");

    setStatus(
      error.message ||
      "Something went wrong while analyzing the resume."
    );

    analyzeBtn.disabled = false;

  }

});


/* =========================================================
   ANALYZE ANOTHER
========================================================= */

analyzeAnother.addEventListener("click", () => {

  reportSection.classList.add("hidden");

  selectedFile = null;
  resumeText = "";

  fileInput.value = "";

  selectedFileBox.classList.add("hidden");

  jobDescription.value = "";

  analyzeBtn.disabled = false;

  overallScore.textContent = "0";
  circleScore.textContent = "0";

  scoreRing.style.strokeDashoffset = "314";

  keywordBar.style.width = "0%";
  sectionBar.style.width = "0%";
  contactBar.style.width = "0%";
  formatBar.style.width = "0%";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

});


/* =========================================================
   INITIAL STATE
========================================================= */

analyzeBtn.disabled = false;

console.log("ResumeScore V0.4 loaded successfully.");
