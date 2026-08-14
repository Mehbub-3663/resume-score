// ResumeScore V0.2 - Resume Analyzer

const fileInput = document.getElementById("resumeFile");
const chooseBtn = document.getElementById("chooseBtn");
const uploadArea = document.getElementById("uploadArea");
const fileName = document.getElementById("fileName");
const analyzeBtn = document.getElementById("analyzeBtn");
const analyzeAnother = document.getElementById("analyzeAnother");
const statusEl = document.getElementById("status");

let selectedFile = null;
let resumeText = "";


// ================================
// FILE SELECTION
// ================================

chooseBtn.addEventListener("click", () => {
  fileInput.click();
});

uploadArea.addEventListener("click", (event) => {
  if (
    event.target !== chooseBtn &&
    !event.target.closest("button")
  ) {
    fileInput.click();
  }
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];

  if (!file) return;

  handleFile(file);
});


// ================================
// DRAG & DROP
// ================================

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragging");
});

uploadArea.addEventListener("drop", (event) => {
  event.preventDefault();

  uploadArea.classList.remove("dragging");

  const file = event.dataTransfer.files[0];

  if (!file) return;

  handleFile(file);
});


// ================================
// HANDLE FILE
// ================================

async function handleFile(file) {

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  const extension = file.name.toLowerCase();

  const isPDF =
    file.type === "application/pdf" ||
    extension.endsWith(".pdf");

  const isDOCX =
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension.endsWith(".docx");

  if (!isPDF && !isDOCX) {
    showStatus("Please upload a PDF or DOCX file.", true);
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showStatus("File must be smaller than 5MB.", true);
    return;
  }

  selectedFile = file;

  fileName.textContent = file.name;

  showStatus("Reading your resume...");

  try {

    if (isPDF) {
      resumeText = await extractPDFText(file);
    } else {
      resumeText = await extractDOCXText(file);
    }

    if (!resumeText.trim()) {
      throw new Error("No readable text found.");
    }

    showStatus(
      `Resume loaded successfully ✓`
    );

  } catch (error) {

    console.error(error);

    resumeText = "";

    showStatus(
      "Could not read this resume. Try another PDF or DOCX.",
      true
    );
  }
}


// ================================
// PDF TEXT EXTRACTION
// ================================

async function extractPDFText(file) {

  // Load PDF.js directly here.
  // This avoids timing problems with module loading.

  const pdfjsLib = await import(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
  );

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str || "")
      .join(" ");

    text += pageText + "\n";
  }

  return text;
}


// ================================
// DOCX TEXT EXTRACTION
// ================================

async function extractDOCXText(file) {

  if (!window.mammoth) {

    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await window.mammoth.extractRawText({
    arrayBuffer
  });

  return result.value || "";
}


// ================================
// LOAD EXTERNAL SCRIPT
// ================================

function loadScript(src) {

  return new Promise((resolve, reject) => {

    const script = document.createElement("script");

    script.src = src;

    script.onload = resolve;

    script.onerror = reject;

    document.head.appendChild(script);
  });
}


// ================================
// ANALYZE BUTTON
// ================================

analyzeBtn.addEventListener("click", async () => {

  if (!selectedFile) {
    showStatus("Please upload your resume first.", true);
    return;
  }

  if (!resumeText.trim()) {
    showStatus(
      "Your resume text could not be read. Please upload it again.",
      true
    );
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  showStatus("Analyzing your resume...");

  try {

    const jobDescription =
      document.getElementById("jobDescription").value.trim();

    const result = analyzeResume(
      resumeText,
      jobDescription
    );

    displayReport(result);

    document
      .getElementById("reportSection")
      .classList.remove("hidden");

    document
      .getElementById("reportSection")
      .scrollIntoView({
        behavior: "smooth"
      });

    showStatus("Analysis complete ✓");

  } catch (error) {

    console.error(error);

    showStatus(
      "Something went wrong while analyzing the resume.",
      true
    );

  } finally {

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze My Resume";
  }
});


// ================================
// RESUME ANALYZER
// ================================

function analyzeResume(text, jobDescription) {

  const lower = text.toLowerCase();

  // Common resume sections
  const sections = [
    "experience",
    "education",
    "skills",
    "projects",
    "summary",
    "objective",
    "certifications"
  ];

  const foundSections =
    sections.filter(section =>
      lower.includes(section)
    );

  const sectionScore =
    Math.min(
      100,
      Math.round(
        (foundSections.length / 5) * 100
      )
    );


  // Contact information
  const hasEmail =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);

  const hasPhone =
    /(\+?\d[\d\s().-]{7,}\d)/.test(text);

  const hasLinkedIn =
    lower.includes("linkedin");

  let contactScore = 0;

  if (hasEmail) contactScore += 40;
  if (hasPhone) contactScore += 40;
  if (hasLinkedIn) contactScore += 20;

  contactScore = Math.min(100, contactScore);


  // Formatting / ATS signals
  let formatScore = 100;

  if (text.length < 500) {
    formatScore -= 25;
  }

  if (text.length > 15000) {
    formatScore -= 10;
  }

  if ((text.match(/[^\x00-\x7F]/g) || []).length > 100) {
    formatScore -= 10;
  }

  formatScore = Math.max(0, formatScore);


  // Job-specific keywords
  let matchedKeywords = [];
  let missingKeywords = [];
  let keywordScore = 60;

  if (jobDescription) {

    const keywords = extractKeywords(jobDescription);

    matchedKeywords =
      keywords.filter(keyword =>
        lower.includes(keyword.toLowerCase())
      );

    missingKeywords =
      keywords.filter(keyword =>
        !lower.includes(keyword.toLowerCase())
      );

    if (keywords.length > 0) {

      keywordScore = Math.round(
        (matchedKeywords.length / keywords.length) * 100
      );

    }

  } else {

    // Without JD, check common professional keywords
    const commonKeywords = [
      "communication",
      "leadership",
      "management",
      "team",
      "project",
      "analysis",
      "development",
      "strategy",
      "skills",
      "experience"
    ];

    matchedKeywords =
      commonKeywords.filter(keyword =>
        lower.includes(keyword)
      );

    keywordScore = Math.round(
      (matchedKeywords.length /
        commonKeywords.length) * 100
    );
  }


  // Problems
  const problems = [];

  if (!hasEmail) {
    problems.push(
      "Email address was not detected."
    );
  }

  if (!hasPhone) {
    problems.push(
      "Phone number was not detected."
    );
  }

  if (foundSections.length < 4) {
    problems.push(
      "Some standard resume sections may be missing."
    );
  }

  if (text.length < 500) {
    problems.push(
      "Very little resume text was detected."
    );
  }

  if (jobDescription && missingKeywords.length > 0) {
    problems.push(
      `${missingKeywords.length} job-related keywords are missing.`
    );
  }

  if (problems.length === 0) {
    problems.push(
      "No major ATS problems were detected."
    );
  }


  // Recommendations
  const recommendations = [];

  if (!hasEmail) {
    recommendations.push(
      "Add a professional email address."
    );
  }

  if (!hasPhone) {
    recommendations.push(
      "Add a phone number with country/area code."
    );
  }

  if (foundSections.length < 4) {
    recommendations.push(
      "Use standard sections such as Experience, Education and Skills."
    );
  }

  if (jobDescription && missingKeywords.length > 0) {
    recommendations.push(
      "Naturally include relevant keywords from the job description."
    );
  }

  recommendations.push(
    "Use simple headings and avoid excessive graphics or tables."
  );

  recommendations.push(
    "Use achievement-focused bullet points where possible."
  );


  // Overall score
  const overallScore =
    Math.round(
      keywordScore * 0.30 +
      sectionScore * 0.25 +
      contactScore * 0.20 +
      formatScore * 0.25
    );


  return {
    overallScore,
    keywordScore,
    sectionScore,
    contactScore,
    formatScore,
    problems,
    recommendations,
    matchedKeywords,
    missingKeywords
  };
}


// ================================
// KEYWORD EXTRACTION
// ================================

function extractKeywords(text) {

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
    "job",
    "role",
    "work",
    "years",
    "using",
    "into",
    "about",
    "their",
    "they",
    "who",
    "all",
    "can",
    "should"
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter(word =>
      word.length >= 3 &&
      !stopWords.has(word)
    );

  const frequency = {};

  words.forEach(word => {
    frequency[word] =
      (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(item => item[0]);
}


// ================================
// DISPLAY REPORT
// ================================

function displayReport(result) {

  setText(
    "overallScore",
    result.overallScore
  );

  setText(
    "circleScore",
    result.overallScore
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


  setWidth(
    "keywordBar",
    result.keywordScore
  );

  setWidth(
    "sectionBar",
    result.sectionScore
  );

  setWidth(
    "contactBar",
    result.contactScore
  );

  setWidth(
    "formatBar",
    result.formatScore
  );


  let message = "Needs improvement before applying.";

  if (result.overallScore >= 80) {
    message =
      "Strong ATS readiness. A few improvements can make it better.";
  } else if (result.overallScore >= 60) {
    message =
      "Good foundation, but improvements are recommended.";
  }

  setText(
    "scoreMessage",
    message
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
    result.matchedKeywords
  );

  renderKeywords(
    "missingKeywords",
    result.missingKeywords
  );
}


// ================================
// UI HELPERS
// ================================

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


function setWidth(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.style.width =
      `${Math.max(0, Math.min(100, value))}%`;
  }
}


function renderList(id, items) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.innerHTML = "";

  items.forEach(item => {

    const li =
      document.createElement("li");

    li.textContent = item;

    element.appendChild(li);
  });
}


function renderKeywords(id, keywords) {

  const element =
    document.getElementById(id);

  if (!element) return;

  if (!keywords || keywords.length === 0) {
    element.textContent = "None detected";
    return;
  }

  element.innerHTML = "";

  keywords.forEach(keyword => {

    const span =
      document.createElement("span");

    span.textContent = keyword;

    span.style.display = "inline-block";
    span.style.margin = "4px";
    span.style.padding = "5px 9px";
    span.style.borderRadius = "8px";
    span.style.background = "#f0efff";

    element.appendChild(span);
  });
}


function showStatus(message, error = false) {

  if (!statusEl) return;

  statusEl.textContent = message;

  statusEl.style.color =
    error ? "#d93025" : "";
}


// ================================
// ANALYZE ANOTHER
// ================================

if (analyzeAnother) {

  analyzeAnother.addEventListener(
    "click",
    () => {

      selectedFile = null;
      resumeText = "";

      fileInput.value = "";

      fileName.textContent =
        "PDF or DOCX • Max 5MB";

      document.getElementById(
        "reportSection"
      ).classList.add("hidden");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );
}
