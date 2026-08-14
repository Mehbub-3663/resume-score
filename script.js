/* =========================================================
   ResumeScore
   Local ATS Resume Analyzer
========================================================= */


/* ---------------------------------------------------------
   PDF.JS WORKER SETUP
--------------------------------------------------------- */

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}


/* ---------------------------------------------------------
   DOM
--------------------------------------------------------- */

const resumeFile = document.getElementById("resumeFile");
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");

const selectedFile = document.getElementById("selectedFile");

const jobDescription =
  document.getElementById("jobDescription");

const analyzeBtn =
  document.getElementById("analyzeBtn");

const errorMessage =
  document.getElementById("errorMessage");

const analysisLoading =
  document.getElementById("analysisLoading");

const loadingTitle =
  document.getElementById("loadingTitle");

const loadingText =
  document.getElementById("loadingText");

const reportSection =
  document.getElementById("reportSection");

const analyzerCard =
  document.getElementById("analyzerCard");

const analyzeAnother =
  document.getElementById("analyzeAnother");

const navCheckBtn =
  document.getElementById("navCheckBtn");


/* ---------------------------------------------------------
   STATE
--------------------------------------------------------- */

let selectedResume = null;


/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function normalizeText(text) {

  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[•●▪◦]/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
}


function escapeHTML(text) {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showError(message) {

  errorMessage.textContent = message;
  errorMessage.classList.add("show");
}


function clearError() {

  errorMessage.textContent = "";
  errorMessage.classList.remove("show");
}


function sleep(ms) {

  return new Promise(resolve => setTimeout(resolve, ms));
}


function clamp(value, min, max) {

  return Math.max(min, Math.min(max, value));
}


/* ---------------------------------------------------------
   FILE SELECTION
--------------------------------------------------------- */

chooseBtn.addEventListener("click", () => {
  resumeFile.click();
});


resumeFile.addEventListener("change", () => {

  if (resumeFile.files.length) {
    handleFile(resumeFile.files[0]);
  }

});


dropZone.addEventListener("dragover", event => {

  event.preventDefault();

  dropZone.classList.add("dragover");

});


dropZone.addEventListener("dragleave", () => {

  dropZone.classList.remove("dragover");

});


dropZone.addEventListener("drop", event => {

  event.preventDefault();

  dropZone.classList.remove("dragover");

  const file = event.dataTransfer.files[0];

  if (file) {
    handleFile(file);
  }

});


function handleFile(file) {

  clearError();

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  const extension =
    file.name.toLowerCase().split(".").pop();

  const validExtension =
    extension === "pdf" || extension === "docx";

  if (!validExtension && !allowedTypes.includes(file.type)) {

    showError(
      "Please upload a PDF or DOCX resume."
    );

    return;
  }


  if (file.size > 5 * 1024 * 1024) {

    showError(
      "Your resume is larger than 5MB."
    );

    return;
  }


  selectedResume = file;


  selectedFile.textContent =
    `✓ ${file.name} · ${formatBytes(file.size)}`;

  selectedFile.style.color = "#16845b";

}


function formatBytes(bytes) {

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


/* ---------------------------------------------------------
   PDF EXTRACTION
--------------------------------------------------------- */

async function extractPDF(file) {

  if (!window.pdfjsLib) {

    throw new Error(
      "PDF reader failed to load. Please refresh and try again."
    );

  }


  const buffer =
    await file.arrayBuffer();


  const pdf =
    await window.pdfjsLib.getDocument({
      data: buffer
    }).promise;


  let fullText = "";


  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

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


  return fullText;
}


/* ---------------------------------------------------------
   DOCX EXTRACTION
--------------------------------------------------------- */

async function extractDOCX(file) {

  if (!window.mammoth) {

    throw new Error(
      "DOCX reader failed to load. Please refresh and try again."
    );

  }


  const buffer =
    await file.arrayBuffer();


  const result =
    await window.mammoth.extractRawText({
      arrayBuffer: buffer
    });


  return result.value || "";
}


/* ---------------------------------------------------------
   UNIVERSAL EXTRACTION
--------------------------------------------------------- */

async function extractResumeText(file) {

  const extension =
    file.name.toLowerCase().split(".").pop();


  if (extension === "pdf") {

    return extractPDF(file);

  }


  if (extension === "docx") {

    return extractDOCX(file);

  }


  throw new Error(
    "Unsupported resume format."
  );
}


/* ---------------------------------------------------------
   CONTACT SCORE
--------------------------------------------------------- */

function calculateContactScore(text) {

  let score = 0;

  const email =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);

  const phone =
    /(?:\+?\d[\d\s().-]{8,}\d)/.test(text);

  const linkedin =
    /linkedin\.com/i.test(text);

  const location =
    /\b(?:india|usa|uk|canada|remote|new york|mumbai|delhi|bangalore|bengaluru|hyderabad|pune)\b/i.test(text);


  if (email) score += 35;
  if (phone) score += 30;
  if (linkedin) score += 25;
  if (location) score += 10;


  return clamp(score, 0, 100);
}


/* ---------------------------------------------------------
   SECTION SCORE
--------------------------------------------------------- */

function calculateSectionScore(text) {

  const sections = {

    experience:
      /\b(?:experience|work experience|employment|professional experience)\b/i,

    education:
      /\b(?:education|academic|degree|university|college)\b/i,

    skills:
      /\b(?:skills|technical skills|core skills|technologies)\b/i,

    projects:
      /\b(?:projects|personal projects|academic projects)\b/i,

    summary:
      /\b(?:summary|profile|professional summary|objective)\b/i,

    certifications:
      /\b(?:certifications|certificates|licenses)\b/i

  };


  const found =
    Object.values(sections)
      .filter(regex => regex.test(text))
      .length;


  return clamp(
    Math.round((found / 6) * 100),
    0,
    100
  );
}


/* ---------------------------------------------------------
   FORMATTING SCORE
--------------------------------------------------------- */

function calculateFormattingScore(text, file) {

  let score = 55;


  const lines =
    text.split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean);


  if (lines.length >= 15) {
    score += 10;
  }


  if (lines.length >= 30) {
    score += 8;
  }


  if (text.length >= 800) {
    score += 8;
  }


  if (text.length >= 1500) {
    score += 8;
  }


  if (text.length > 5000) {
    score -= 8;
  }


  if (file.name.toLowerCase().endsWith(".pdf")) {
    score += 5;
  }


  return clamp(score, 0, 100);
}


/* ---------------------------------------------------------
   KEYWORD EXTRACTION
--------------------------------------------------------- */

const stopWords = new Set([

  "about",
  "after",
  "again",
  "against",
  "also",
  "and",
  "are",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "can",
  "could",
  "from",
  "have",
  "having",
  "into",
  "more",
  "most",
  "other",
  "our",
  "out",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "using",
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
  "work",
  "working",
  "role",
  "team",
  "teams",
  "job",
  "position",
  "candidate",
  "experience",
  "required",
  "preferred",
  "looking",
  "including",
  "strong",
  "ability",
  "skills",
  "skill"

]);


function extractKeywords(text) {

  const words =
    normalizeText(text)
      .match(/[a-z][a-z0-9+#.-]{2,}/g) || [];


  const frequency = {};


  words.forEach(word => {

    if (stopWords.has(word)) {
      return;
    }


    if (/^\d+$/.test(word)) {
      return;
    }


    frequency[word] =
      (frequency[word] || 0) + 1;

  });


  return Object.entries(frequency)

    .sort((a, b) => b[1] - a[1])

    .slice(0, 25)

    .map(item => item[0]);
}


/* ---------------------------------------------------------
   JOB KEYWORDS
--------------------------------------------------------- */

function getJobKeywords(jobText) {

  if (!jobText.trim()) {
    return [];
  }


  return extractKeywords(jobText);
}


function compareKeywords(resumeText, jobText) {

  const jobKeywords =
    getJobKeywords(jobText);


  if (!jobKeywords.length) {

    return {
      score: 70,
      matched: [],
      missing: []
    };

  }


  const normalizedResume =
    normalizeText(resumeText);


  const matched =
    jobKeywords.filter(keyword =>
      normalizedResume.includes(keyword)
    );


  const missing =
    jobKeywords.filter(keyword =>
      !normalizedResume.includes(keyword)
    );


  const score =
    Math.round(
      (matched.length / jobKeywords.length) * 100
    );


  return {
    score: clamp(score, 0, 100),
    matched,
    missing
  };
}


/* ---------------------------------------------------------
   GENERAL PROBLEMS
--------------------------------------------------------- */

function generateProblems(
  text,
  contactScore,
  sectionScore,
  formattingScore,
  keywordData
) {

  const problems = [];


  if (contactScore < 70) {

    problems.push(
      "Your contact information is incomplete. Add a clear email, phone number and LinkedIn profile."
    );

  }


  if (sectionScore < 70) {

    problems.push(
      "Some standard resume sections are missing or difficult for ATS systems to detect."
    );

  }


  if (formattingScore < 65) {

    problems.push(
      "The resume structure may be difficult for automated systems to parse."
    );

  }


  if (text.length < 700) {

    problems.push(
      "Your resume contains relatively little searchable content."
    );

  }


  if (
    keywordData.missing.length > 0 &&
    keywordData.matched.length > 0
  ) {

    problems.push(
      `Your resume is missing ${Math.min(keywordData.missing.length, 6)} relevant job keywords.`
    );

  }


  if (!problems.length) {

    problems.push(
      "No major ATS problems were detected."
    );

  }


  return problems.slice(0, 5);
}


/* ---------------------------------------------------------
   RECOMMENDATIONS
--------------------------------------------------------- */

function generateRecommendations(
  contactScore,
  sectionScore,
  formattingScore,
  keywordData
) {

  const recommendations = [];


  if (contactScore < 80) {

    recommendations.push(
      "Add your professional email, phone number, location and LinkedIn URL near the top of the resume."
    );

  }


  if (sectionScore < 80) {

    recommendations.push(
      "Use clear section headings such as Summary, Experience, Education, Skills and Projects."
    );

  }


  if (formattingScore < 80) {

    recommendations.push(
      "Keep the layout simple: consistent headings, readable spacing and minimal decorative elements."
    );

  }


  if (keywordData.missing.length) {

    recommendations.push(
      `Naturally include relevant terms such as ${keywordData.missing.slice(0, 5).join(", ")} where they genuinely match your experience.`
    );

  }


  recommendations.push(
    "Use measurable achievements instead of only listing responsibilities."
  );


  return recommendations.slice(0, 5);
}


/* ---------------------------------------------------------
   SCORE MESSAGE
--------------------------------------------------------- */

function getScoreMessage(score) {

  if (score >= 90) {

    return "Excellent ATS readiness — your resume is strongly structured.";

  }


  if (score >= 80) {

    return "Strong foundation — a few improvements could make it even better.";

  }


  if (score >= 70) {

    return "Good foundation, but there are several opportunities to improve.";

  }


  if (score >= 55) {

    return "Needs improvement before applying to competitive roles.";

  }


  return "Your resume needs significant improvement before applying.";

}


/* ---------------------------------------------------------
   REPORT UI
--------------------------------------------------------- */

function setMetric(id, barId, value) {

  const number =
    document.getElementById(id);

  const bar =
    document.getElementById(barId);


  number.textContent = value;

  requestAnimationFrame(() => {

    bar.style.width = `${value}%`;

  });

}


function renderKeywordTags(elementId, keywords, missing = false) {

  const element =
    document.getElementById(elementId);


  if (!keywords.length) {

    element.innerHTML =
      `<span>${missing ? "No missing keywords detected" : "Add a job description to see matches"}</span>`;

    return;
  }


  element.innerHTML =
    keywords
      .slice(0, 15)
      .map(keyword =>
        `<span>${escapeHTML(keyword)}</span>`
      )
      .join("");
}


function renderList(elementId, items) {

  const element =
    document.getElementById(elementId);


  element.innerHTML =
    items
      .map(item =>
        `<li>${escapeHTML(item)}</li>`
      )
      .join("");
}


/* ---------------------------------------------------------
   SCORE ANIMATION
--------------------------------------------------------- */

async function animateNumber(
  elementId,
  target,
  duration = 900
) {

  const element =
    document.getElementById(elementId);


  const startTime =
    performance.now();


  return new Promise(resolve => {

    function tick(now) {

      const progress =
        Math.min(
          (now - startTime) / duration,
          1
        );


      const eased =
        1 - Math.pow(1 - progress, 3);


      const value =
        Math.round(target * eased);


      element.textContent = value;


      if (progress < 1) {

        requestAnimationFrame(tick);

      } else {

        resolve();

      }

    }


    requestAnimationFrame(tick);

  });
}


function animateRing(score) {

  const ring =
    document.getElementById("scoreRing");


  const circumference =
    2 * Math.PI * 50;


  const offset =
    circumference -
    (score / 100) * circumference;


  ring.style.strokeDasharray =
    circumference;


  requestAnimationFrame(() => {

    ring.style.strokeDashoffset =
      offset;

  });
}


/* ---------------------------------------------------------
   LOADING UI
--------------------------------------------------------- */

async function showAnalysisLoading() {

  analysisLoading.classList.remove("hidden");


  loadingTitle.textContent =
    "Reading your resume";


  loadingText.textContent =
    "Extracting text and checking ATS signals...";


  await sleep(750);


  loadingTitle.textContent =
    "Analyzing your resume";


  loadingText.textContent =
    "Checking sections, contact details and formatting...";


  await sleep(800);


  loadingTitle.textContent =
    "Matching keywords";


  loadingText.textContent =
    "Comparing your resume against important ATS terms...";


  await sleep(700);


  loadingTitle.textContent =
    "Building your report";


  loadingText.textContent =
    "Calculating your ATS readiness score...";

}


/* ---------------------------------------------------------
   MAIN ANALYSIS
--------------------------------------------------------- */

analyzeBtn.addEventListener("click", analyzeResume);


async function analyzeResume() {

  clearError();


  if (!selectedResume) {

    showError(
      "Please choose your resume first."
    );

    return;
  }


  analyzeBtn.disabled = true;

  analyzeBtn.innerHTML =
    `<span>Analyzing...</span><span class="button-arrow">⌛</span>`;


  reportSection.classList.add("hidden");


  try {

    const extractionPromise =
      extractResumeText(selectedResume);


    const loadingPromise =
      showAnalysisLoading();


    const resumeText =
      await extractionPromise;


    if (!resumeText || resumeText.trim().length < 50) {

      throw new Error(
        "We couldn't extract enough text from this resume. Try another PDF/DOCX file."
      );

    }


    await loadingPromise;


    /*
      Slight extra delay so the transition
      feels intentional instead of instant.
    */

    await sleep(500);


    const normalized =
      normalizeText(resumeText);


    const contactScore =
      calculateContactScore(normalized);


    const sectionScore =
      calculateSectionScore(normalized);


    const formattingScore =
      calculateFormattingScore(
        normalized,
        selectedResume
      );


    const keywordData =
      compareKeywords(
        normalized,
        jobDescription.value
      );


    /*
      Overall score.

      Job-specific:
      Keywords receive more weight.

      General:
      Other ATS signals dominate.
    */

    let overall;


    if (jobDescription.value.trim()) {

      overall = Math.round(
        keywordData.score * 0.30 +
        sectionScore * 0.25 +
        contactScore * 0.20 +
        formattingScore * 0.25
      );

    } else {

      overall = Math.round(
        70 * 0.20 +
        sectionScore * 0.30 +
        contactScore * 0.20 +
        formattingScore * 0.30
      );

      /*
        Add text-quality signal so two
        different resumes don't look identical.
      */

      const lengthBonus =
        clamp(
          Math.round(normalized.length / 120),
          0,
          10
        );

      overall += lengthBonus;

    }


    overall =
      clamp(overall, 0, 100);


    const problems =
      generateProblems(
        normalized,
        contactScore,
        sectionScore,
        formattingScore,
        keywordData
      );


    const recommendations =
      generateRecommendations(
        contactScore,
        sectionScore,
        formattingScore,
        keywordData
      );


    /* Report summary */

    document.getElementById("reportSummary").textContent =
      jobDescription.value.trim()
        ? "Your resume was compared against the job description and checked for ATS compatibility."
        : "Your resume was checked for structure, contact information, formatting and ATS readability.";


    document.getElementById("scoreMessage").textContent =
      getScoreMessage(overall);


    setMetric(
      "keywordScore",
      "keywordBar",
      keywordData.score
    );


    setMetric(
      "sectionScore",
      "sectionBar",
      sectionScore
    );


    setMetric(
      "contactScore",
      "contactBar",
      contactScore
    );


    setMetric(
      "formatScore",
      "formatBar",
      formattingScore
    );


    renderList(
      "problemsList",
      problems
    );


    renderList(
      "recommendationsList",
      recommendations
    );


    renderKeywordTags(
      "matchedKeywords",
      keywordData.matched
    );


    renderKeywordTags(
      "missingKeywords",
      keywordData.missing,
      true
    );


    /* Show report */

    analysisLoading.classList.add("hidden");

    reportSection.classList.remove("hidden");


    /*
      Reset score before animation.
    */

    document.getElementById("overallScore").textContent =
      "0";

    document.getElementById("circleScore").textContent =
      "0";


    animateRing(overall);


    await Promise.all([

      animateNumber(
        "overallScore",
        overall,
        1100
      ),

      animateNumber(
        "circleScore",
        overall,
        1100
      )

    ]);


    reportSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


  } catch (error) {

    console.error(error);


    analysisLoading.classList.add("hidden");


    showError(
      error.message ||
      "Something went wrong while analyzing your resume."
    );

  } finally {

    analyzeBtn.disabled = false;

    analyzeBtn.innerHTML =
      `<span>Analyze my resume</span><span class="button-arrow">→</span>`;

  }

}


/* ---------------------------------------------------------
   ANALYZE ANOTHER
--------------------------------------------------------- */

analyzeAnother.addEventListener("click", () => {

  selectedResume = null;

  resumeFile.value = "";

  selectedFile.textContent =
    "PDF or DOCX · Max 5MB";

  selectedFile.style.color =
    "#98a2b3";


  reportSection.classList.add("hidden");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

});


/* ---------------------------------------------------------
   NAV BUTTON
--------------------------------------------------------- */

navCheckBtn.addEventListener("click", () => {

  analyzerCard.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

});


/* ---------------------------------------------------------
   INITIAL SAFETY CHECK
--------------------------------------------------------- */

if (!window.pdfjsLib) {

  console.warn(
    "PDF.js did not load. PDF uploads may not work until the CDN is available."
  );

}


if (!window.mammoth) {

  console.warn(
    "Mammoth did not load. DOCX uploads may not work until the CDN is available."
  );

}
