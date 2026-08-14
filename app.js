const fileInput = document.getElementById("resumeFile");
const chooseBtn = document.getElementById("chooseBtn");
const uploadArea = document.getElementById("uploadArea");
const fileName = document.getElementById("fileName");
const analyzeBtn = document.getElementById("analyzeBtn");
const jobDescription = document.getElementById("jobDescription");
const statusEl = document.getElementById("status");

const reportSection = document.getElementById("reportSection");
const analyzeAnother = document.getElementById("analyzeAnother");

let selectedFile = null;
let resumeText = "";


/* -----------------------------
   FILE SELECTION
----------------------------- */

chooseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadArea.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {

  const file = fileInput.files[0];

  if (!file) return;

  handleFile(file);
});


function handleFile(file) {

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  const extension = file.name.toLowerCase();

  if (
    !allowedTypes.includes(file.type) &&
    !extension.endsWith(".pdf") &&
    !extension.endsWith(".docx")
  ) {
    setStatus("Please upload a PDF or DOCX file.", true);
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setStatus("File is too large. Maximum size is 5MB.", true);
    return;
  }

  selectedFile = file;

  fileName.textContent = `Selected: ${file.name}`;

  setStatus("Resume selected. Ready to analyze.");

}


/* -----------------------------
   DRAG & DROP
----------------------------- */

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadArea.style.borderColor = "#6256ff";
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "";
});

uploadArea.addEventListener("drop", (event) => {

  event.preventDefault();

  uploadArea.style.borderColor = "";

  const file = event.dataTransfer.files[0];

  if (file) {
    handleFile(file);
  }

});


/* -----------------------------
   ANALYZE BUTTON
----------------------------- */

analyzeBtn.addEventListener("click", async () => {

  if (!selectedFile) {
    setStatus("Please upload your resume first.", true);
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";
  setStatus("Reading your resume...");

  try {

    resumeText = await extractText(selectedFile);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error(
        "We couldn't read enough text from this file."
      );
    }

    setStatus("Checking ATS signals...");

    const jdText = jobDescription.value.trim();

    const result = analyzeResume(
      resumeText,
      jdText
    );

    renderReport(result);

    reportSection.classList.remove("hidden");

    reportSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    setStatus("Analysis complete.");

  } catch (error) {

    console.error(error);

    setStatus(
      error.message || "Something went wrong while analyzing the resume.",
      true
    );

  } finally {

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze My Resume";

  }

});


/* -----------------------------
   TEXT EXTRACTION
----------------------------- */

async function extractText(file) {

  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return await extractPDF(file);
  }

  if (name.endsWith(".docx")) {
    return await extractDOCX(file);
  }

  throw new Error("Unsupported file type.");

}


/* PDF */

async function extractPDF(file) {

  if (!window.pdfjsLib) {
    throw new Error(
      "PDF reader is still loading. Please try again."
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await window.pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str)
      .join(" ");

    text += pageText + "\n";

  }

  return cleanText(text);

}


/* DOCX */

async function extractDOCX(file) {

  if (!window.mammoth) {
    throw new Error(
      "DOCX reader is still loading. Please try again."
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await window.mammoth.extractRawText({
    arrayBuffer
  });

  return cleanText(result.value);

}


/* -----------------------------
   TEXT CLEANING
----------------------------- */

function cleanText(text) {

  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

}


/* -----------------------------
   RESUME ANALYSIS
----------------------------- */

function analyzeResume(resume, jd) {

  const text = resume.toLowerCase();

  const normalizedResume = normalizeText(text);

  const sections = checkSections(normalizedResume);

  const sectionScore =
    Math.round(
      (sections.found.length / sections.total) * 100
    );

  const contactScore = checkContactInfo(normalizedResume);

  const formatResult = checkFormatting(
    resume,
    normalizedResume
  );

  let keywordScore = 75;
  let matchedKeywords = [];
  let missingKeywords = [];

  if (jd.length > 20) {

    const jdKeywords = extractKeywords(jd);

    matchedKeywords = jdKeywords.filter(keyword =>
      normalizedResume.includes(keyword)
    );

    missingKeywords = jdKeywords.filter(keyword =>
      !normalizedResume.includes(keyword)
    );

    if (jdKeywords.length > 0) {

      keywordScore = Math.round(
        (matchedKeywords.length / jdKeywords.length) * 100
      );

    }

  } else {

    keywordScore = checkResumeKeywords(
      normalizedResume
    );

  }


  const metricsScore = checkAchievements(
    normalizedResume
  );

  const bulletScore = checkBulletUsage(
    resume
  );

  const lengthScore = checkLength(
    normalizedResume
  );


  /*
    Overall score.

    Job-specific keyword matching receives
    the highest weight when a JD is supplied.
  */

  let overallScore;

  if (jd.length > 20) {

    overallScore = Math.round(
      keywordScore * 0.40 +
      sectionScore * 0.20 +
      contactScore * 0.10 +
      formatResult.score * 0.10 +
      metricsScore * 0.10 +
      bulletScore * 0.05 +
      lengthScore * 0.05
    );

  } else {

    overallScore = Math.round(
      keywordScore * 0.25 +
      sectionScore * 0.25 +
      contactScore * 0.10 +
      formatResult.score * 0.15 +
      metricsScore * 0.10 +
      bulletScore * 0.10 +
      lengthScore * 0.05
    );

  }


  overallScore = Math.max(
    0,
    Math.min(100, overallScore)
  );


  const problems = [];
  const recommendations = [];


  /* Sections */

  if (sections.missing.length > 0) {

    problems.push(
      `Missing or unclear sections: ${sections.missing.join(", ")}.`
    );

    recommendations.push(
      `Add clear headings for: ${sections.missing.join(", ")}.`
    );

  }


  /* Contact */

  if (contactScore < 100) {

    problems.push(
      "Some important contact information appears to be missing."
    );

    recommendations.push(
      "Include your email, phone number and LinkedIn profile near the top."
    );

  }


  /* Keywords */

  if (jd.length > 20 && missingKeywords.length > 0) {

    const shown = missingKeywords
      .slice(0, 8)
      .join(", ");

    problems.push(
      `Your resume is missing important job-description keywords such as ${shown}.`
    );

    recommendations.push(
      "Naturally add relevant missing keywords where they are truthful and supported by your experience."
    );

  }


  /* Metrics */

  if (metricsScore < 70) {

    problems.push(
      "Your experience bullets contain few measurable achievements."
    );

    recommendations.push(
      "Add numbers where possible: revenue, users, time saved, growth %, projects completed, etc."
    );

  }


  /* Bullets */

  if (bulletScore < 70) {

    problems.push(
      "Your resume could use more concise bullet points."
    );

    recommendations.push(
      "Use short achievement-focused bullets instead of long paragraphs."
    );

  }


  /* Length */

  if (lengthScore < 70) {

    problems.push(
      "Resume length may need improvement."
    );

    recommendations.push(
      "Keep the resume focused on experience and skills relevant to the target role."
    );

  }


  /* Formatting */

  if (formatResult.score < 70) {

    problems.push(
      ...formatResult.problems
    );

    recommendations.push(
      ...formatResult.recommendations
    );

  }


  if (problems.length === 0) {

    problems.push(
      "No major issues detected by the current checks."
    );

  }


  if (recommendations.length === 0) {

    recommendations.push(
      "Your resume looks solid. Focus on tailoring it to each job description."
    );

  }


  return {

    overallScore,

    keywordScore,
    sectionScore,
    contactScore,

    formatScore: formatResult.score,

    sections,

    matchedKeywords,
    missingKeywords,

    problems,
    recommendations

  };

}


/* -----------------------------
   SECTION CHECK
----------------------------- */

function checkSections(text) {

  const sectionDefinitions = [

    {
      name: "Experience",
      keywords: [
        "experience",
        "work experience",
        "professional experience",
        "employment"
      ]
    },

    {
      name: "Education",
      keywords: [
        "education",
        "academic"
      ]
    },

    {
      name: "Skills",
      keywords: [
        "skills",
        "technical skills",
        "core skills",
        "competencies"
      ]
    },

    {
      name: "Summary",
      keywords: [
        "summary",
        "professional summary",
        "profile",
        "objective"
      ]
    },

    {
      name: "Projects",
      keywords: [
        "projects",
        "personal projects",
        "academic projects"
      ]
    },

    {
      name: "Certifications",
      keywords: [
        "certifications",
        "certificates",
        "licenses"
      ]
    }

  ];


  const found = [];
  const missing = [];


  for (const section of sectionDefinitions) {

    const exists = section.keywords.some(
      keyword => text.includes(keyword)
    );

    if (exists) {
      found.push(section.name);
    } else {
      missing.push(section.name);
    }

  }


  return {

    found,

    missing,

    total: sectionDefinitions.length

  };

}


/* -----------------------------
   CONTACT CHECK
----------------------------- */

function checkContactInfo(text) {

  let score = 0;

  const email =
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
      .test(text);

  const phone =
    /(\+?\d[\d\s().-]{8,}\d)/.test(text);

  const linkedin =
    text.includes("linkedin");

  if (email) score += 40;

  if (phone) score += 30;

  if (linkedin) score += 30;

  return score;

}


/* -----------------------------
   FORMATTING CHECK
----------------------------- */

function checkFormatting(
  original,
  normalized
) {

  let score = 100;

  const problems = [];
  const recommendations = [];


  if (original.length > 30000) {

    score -= 20;

    problems.push(
      "The extracted resume text is unusually long."
    );

    recommendations.push(
      "Remove unnecessary content and keep the resume focused."
    );

  }


  const repeatedSpaces =
    / {3,}/.test(original);

  if (repeatedSpaces) {

    score -= 10;

    problems.push(
      "There may be excessive spacing in the document."
    );

    recommendations.push(
      "Use consistent spacing and simple formatting."
    );

  }


  const weirdCharacters =
    /[�]/.test(original);

  if (weirdCharacters) {

    score -= 15;

    problems.push(
      "Some characters could not be read correctly."
    );

    recommendations.push(
      "Use standard fonts and export the resume as a text-readable PDF."
    );

  }


  if (normalized.length < 800) {

    score -= 20;

    problems.push(
      "Very little readable resume text was detected."
    );

    recommendations.push(
      "Make sure your resume contains selectable text rather than being only an image."
    );

  }


  return {

    score: Math.max(0, score),

    problems,

    recommendations

  };

}


/* -----------------------------
   KEYWORD CHECK
----------------------------- */

function checkResumeKeywords(text) {

  const usefulKeywords = [

    "javascript",
    "typescript",
    "react",
    "node",
    "python",
    "java",
    "sql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "git",
    "html",
    "css",
    "api",
    "rest",
    "machine learning",
    "data analysis",
    "figma",
    "excel",
    "project management",
    "communication",
    "leadership"

  ];


  const found = usefulKeywords.filter(
    keyword => text.includes(keyword)
  );


  return Math.min(
    100,
    50 + found.length * 3
  );

}


/* -----------------------------
   JD KEYWORD EXTRACTION
----------------------------- */

function extractKeywords(text) {

  const stopWords = new Set([

    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "our",
    "are",
    "this",
    "that",
    "will",
    "from",
    "have",
    "has",
    "who",
    "what",
    "when",
    "where",
    "their",
    "they",
    "them",
    "about",
    "into",
    "over",
    "under",
    "than",
    "then",
    "also",
    "must",
    "should",
    "would",
    "could",
    "work",
    "working",
    "role",
    "team",
    "job",
    "candidate",
    "company",
    "years",
    "year",
    "using",
    "use",
    "including",
    "such",
    "other",
    "all",
    "any",
    "not",
    "our",
    "its",
    "within",
    "through",
    "across",
    "more",
    "less",
    "very",
    "strong",
    "good",
    "excellent",
    "required",
    "preferred",
    "responsibilities",
    "requirements",
    "experience"

  ]);


  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ");


  const words = cleaned
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => {

      if (!word) return false;

      if (word.length < 3) return false;

      if (stopWords.has(word)) return false;

      if (/^\d+$/.test(word)) return false;

      return true;

    });


  const frequency = {};

  for (const word of words) {

    frequency[word] =
      (frequency[word] || 0) + 1;

  }


  /*
    Prefer terms appearing more than once,
    then add other useful terms.
  */

  const keywords = Object.entries(frequency)
    .sort((a, b) => {

      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);

    })
    .map(item => item[0])
    .slice(0, 30);


  return keywords;

}


/* -----------------------------
   ACHIEVEMENT CHECK
----------------------------- */

function checkAchievements(text) {

  const numbers =
    text.match(
      /\b\d+(\.\d+)?(%|k|m|b)?\b/gi
    ) || [];


  const actionVerbs = [

    "built",
    "created",
    "developed",
    "designed",
    "managed",
    "led",
    "improved",
    "increased",
    "reduced",
    "launched",
    "implemented",
    "automated",
    "optimized",
    "delivered",
    "achieved",
    "generated",
    "saved",
    "grew"

  ];


  const verbCount =
    actionVerbs.filter(
      verb => text.includes(verb)
    ).length;


  let score = 45;

  score += Math.min(
    35,
    numbers.length * 7
  );

  score += Math.min(
    20,
    verbCount * 2
  );


  return Math.min(
    100,
    score
  );

}


/* -----------------------------
   BULLET CHECK
----------------------------- */

function checkBulletUsage(text) {

  const bulletMatches =
    text.match(/[•●▪◦]/g) || [];

  const lineMatches =
    text.match(/(^|\n)\s*[-*]\s+/g) || [];

  const totalBullets =
    bulletMatches.length +
    lineMatches.length;


  if (totalBullets >= 8) return 100;

  if (totalBullets >= 5) return 85;

  if (totalBullets >= 3) return 70;

  if (totalBullets >= 1) return 55;

  return 40;

}


/* -----------------------------
   LENGTH CHECK
----------------------------- */

function checkLength(text) {

  const wordCount =
    text
      .split(/\s+/)
      .filter(Boolean)
      .length;


  if (wordCount >= 250 && wordCount <= 1000) {
    return 100;
  }

  if (wordCount >= 150 && wordCount <= 1200) {
    return 85;
  }

  if (wordCount >= 100 && wordCount <= 1400) {
    return 70;
  }

  return 50;

}


/* -----------------------------
   RENDER REPORT
----------------------------- */

function renderReport(result) {

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


  const message =
    getScoreMessage(
      result.overallScore
    );

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
    result.matchedKeywords,
    false
  );

  renderKeywords(
    "missingKeywords",
    result.missingKeywords,
    true
  );

}


/* -----------------------------
   UI HELPERS
----------------------------- */

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
    element.style.width =
      `${Math.max(0, Math.min(100, value))}%`;
  }

}


function renderList(id, items) {

  const list =
    document.getElementById(id);

  list.innerHTML = "";

  items.forEach(item => {

    const li =
      document.createElement("li");

    li.textContent = item;

    list.appendChild(li);

  });

}


function renderKeywords(
  id,
  keywords,
  missing
) {

  const container =
    document.getElementById(id);

  container.innerHTML = "";

  if (!keywords.length) {

    container.textContent =
      "No keywords detected.";

    return;

  }


  keywords
    .slice(0, 20)
    .forEach(keyword => {

      const span =
        document.createElement("span");

      span.className =
        missing
          ? "keyword missing"
          : "keyword";

      span.textContent = keyword;

      container.appendChild(span);

    });

}


function getScoreMessage(score) {

  if (score >= 90) {
    return "Excellent ATS readiness. Keep tailoring it to each job.";
  }

  if (score >= 75) {
    return "Good foundation, but there are still improvements to make.";
  }

  if (score >= 60) {
    return "Needs improvement before applying.";
  }

  if (score >= 40) {
    return "Several ATS issues could reduce your chances.";
  }

  return "Your resume needs significant improvement.";

}


function setStatus(message, error = false) {

  statusEl.textContent = message;

  statusEl.style.color =
    error
      ? "#b3261e"
      : "#666";

}


/* -----------------------------
   ANALYZE ANOTHER
----------------------------- */

analyzeAnother.addEventListener(
  "click",
  () => {

    reportSection.classList.add("hidden");

    selectedFile = null;
    resumeText = "";

    fileInput.value = "";

    fileName.textContent =
      "PDF or DOCX • Max 5MB";

    statusEl.textContent = "";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);
