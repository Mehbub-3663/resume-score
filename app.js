import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


/* =========================
   ELEMENTS
========================= */

const fileInput =
  document.getElementById("resumeFile");

const chooseBtn =
  document.getElementById("chooseBtn");

const uploadArea =
  document.getElementById("uploadArea");

const fileName =
  document.getElementById("fileName");

const jobDescription =
  document.getElementById("jobDescription");

const analyzeBtn =
  document.getElementById("analyzeBtn");

const status =
  document.getElementById("status");

const reportSection =
  document.getElementById("reportSection");

const loadingSection =
  document.getElementById("loadingSection");

const analyzeAnother =
  document.getElementById("analyzeAnother");

const overallScore =
  document.getElementById("overallScore");

const circleScore =
  document.getElementById("circleScore");

const scoreMessage =
  document.getElementById("scoreMessage");

const scoreRing =
  document.getElementById("scoreRing");

const keywordScore =
  document.getElementById("keywordScore");

const sectionScore =
  document.getElementById("sectionScore");

const contactScore =
  document.getElementById("contactScore");

const formatScore =
  document.getElementById("formatScore");

const keywordBar =
  document.getElementById("keywordBar");

const sectionBar =
  document.getElementById("sectionBar");

const contactBar =
  document.getElementById("contactBar");

const formatBar =
  document.getElementById("formatBar");

const problemsList =
  document.getElementById("problemsList");

const recommendationsList =
  document.getElementById("recommendationsList");

const matchedKeywords =
  document.getElementById("matchedKeywords");

const missingKeywords =
  document.getElementById("missingKeywords");

const reportIntro =
  document.getElementById("reportIntro");

const loadingTitle =
  document.getElementById("loadingTitle");

const loadingText =
  document.getElementById("loadingText");

const loadingProgressBar =
  document.getElementById("loadingProgressBar");

const loadStep1 =
  document.getElementById("loadStep1");

const loadStep2 =
  document.getElementById("loadStep2");

const loadStep3 =
  document.getElementById("loadStep3");


let selectedFile = null;


/* =========================
   FILE PICKER
========================= */

chooseBtn.addEventListener("click", () => {
  fileInput.click();
});


uploadArea.addEventListener("click", (event) => {

  if (
    event.target.closest("button") ||
    event.target.closest("input")
  ) {
    return;
  }

  fileInput.click();
});


fileInput.addEventListener("change", () => {

  if (!fileInput.files.length) {
    return;
  }

  handleFile(fileInput.files[0]);

});


/* =========================
   DRAG & DROP
========================= */

uploadArea.addEventListener(
  "dragover",
  (event) => {

    event.preventDefault();

    uploadArea.classList.add("dragover");

  }
);


uploadArea.addEventListener(
  "dragleave",
  () => {

    uploadArea.classList.remove("dragover");

  }
);


uploadArea.addEventListener(
  "drop",
  (event) => {

    event.preventDefault();

    uploadArea.classList.remove("dragover");

    const file =
      event.dataTransfer.files[0];

    if (file) {
      handleFile(file);
    }

  }
);


/* =========================
   FILE HANDLING
========================= */

function handleFile(file) {

  status.textContent = "";

  const validType =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.name.toLowerCase().endsWith(".docx");

  if (!validType) {

    status.textContent =
      "Please upload a PDF or DOCX file.";

    return;
  }


  if (file.size > 5 * 1024 * 1024) {

    status.textContent =
      "File is larger than 5MB.";

    return;
  }


  selectedFile = file;

  fileName.textContent =
    `${file.name} · ${formatFileSize(file.size)}`;

  fileName.style.color =
    "#0a66c2";

  fileName.style.fontWeight =
    "700";

}


function formatFileSize(bytes) {

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;

}


/* =========================
   ANALYZE
========================= */

analyzeBtn.addEventListener(
  "click",
  analyzeResume
);


async function analyzeResume() {

  status.textContent = "";

  if (!selectedFile) {

    status.textContent =
      "Please choose your resume first.";

    uploadArea.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    return;
  }


  analyzeBtn.disabled = true;

  const originalText =
    analyzeBtn.querySelector(".btn-text").textContent;

  analyzeBtn.querySelector(".btn-text").textContent =
    "Analyzing...";


  try {

    const resumeText =
      await extractText(selectedFile);

    if (!resumeText.trim()) {

      throw new Error(
        "We couldn't read any text from this file."
      );

    }


    const jobText =
      jobDescription.value.trim();


    const analysis =
      analyzeResumeText(
        resumeText,
        jobText
      );


    await showLoadingExperience();


    renderReport(
      analysis,
      selectedFile.name
    );


  } catch (error) {

    console.error(error);

    status.textContent =
      error.message ||
      "Something went wrong while analyzing your resume.";

  } finally {

    analyzeBtn.disabled = false;

    analyzeBtn.querySelector(".btn-text").textContent =
      originalText;

  }

}


/* =========================
   TEXT EXTRACTION
========================= */

async function extractText(file) {

  const name =
    file.name.toLowerCase();


  if (name.endsWith(".pdf")) {

    return extractPDF(file);

  }


  if (name.endsWith(".docx")) {

    return extractDOCX(file);

  }


  throw new Error(
    "Unsupported file format."
  );

}


/* PDF */

async function extractPDF(file) {

  const buffer =
    await file.arrayBuffer();


  const pdf =
    await pdfjsLib.getDocument({
      data: buffer
    }).promise;


  let text = "";


  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {

    const page =
      await pdf.getPage(pageNumber);


    const content =
      await page.getTextContent();


    const pageText =
      content.items
        .map(item => item.str)
        .join(" ");


    text +=
      pageText + "\n";

  }


  return text;

}


/* DOCX */

async function extractDOCX(file) {

  if (
    typeof mammoth === "undefined"
  ) {

    throw new Error(
      "DOCX reader is still loading. Please try again."
    );

  }


  const buffer =
    await file.arrayBuffer();


  const result =
    await mammoth.extractRawText({
      arrayBuffer: buffer
    });


  return result.value || "";

}


/* =========================
   NORMALIZATION
========================= */

function normalizeText(text) {

  return text
    .toLowerCase()
    .replace(/[^\w\s+#.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================
   KEYWORD EXTRACTION
========================= */

function extractKeywords(text) {

  const normalized =
    normalizeText(text);


  const words =
    normalized.split(/\s+/);


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
    "was",
    "were",
    "their",
    "they",
    "them",
    "into",
    "about",
    "using",
    "use",
    "job",
    "role",
    "work",
    "working",
    "team",
    "years",
    "year",
    "required",
    "requirements",
    "experience",
    "skills",
    "ability",
    "strong",
    "looking",
    "candidate",
    "responsibilities",
    "including",
    "such",
    "more",
    "other",
    "than",
    "who",
    "what",
    "where",
    "when",
    "how",
    "can",
    "should",
    "must",
    "our",
    "you",
    "we",
    "to",
    "of",
    "in",
    "on",
    "a",
    "an",
    "is",
    "as",
    "be",
    "or",
    "by"
  ]);


  const frequency = {};


  words.forEach(word => {

    const clean =
      word.replace(/^[.-]+|[.-]+$/g, "");


    if (
      clean.length < 3 ||
      stopWords.has(clean) ||
      /^\d+$/.test(clean)
    ) {
      return;
    }


    frequency[clean] =
      (frequency[clean] || 0) + 1;

  });


  return Object.entries(frequency)

    .sort(
      (a, b) => b[1] - a[1]
    )

    .slice(0, 40)

    .map(
      item => item[0]
    );

}


/* =========================
   ANALYSIS ENGINE
========================= */

function analyzeResumeText(
  resumeText,
  jobText
) {

  const text =
    normalizeText(resumeText);


  const job =
    normalizeText(jobText);


  /* CONTACT */

  let contactPoints = 0;


  const hasEmail =
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
      .test(resumeText);


  const hasPhone =
    /(?:\+?\d[\d\s().-]{7,}\d)/
      .test(resumeText);


  const hasLinkedIn =
    /linkedin\.com/i
      .test(resumeText);


  if (hasEmail) {
    contactPoints += 40;
  }

  if (hasPhone) {
    contactPoints += 40;
  }

  if (hasLinkedIn) {
    contactPoints += 20;
  }


  const contact =
    Math.min(contactPoints, 100);


  /* SECTIONS */

  const sectionPatterns = {

    experience:
      /\b(experience|employment|work history|professional experience)\b/i,

    education:
      /\b(education|academic|university|college|degree)\b/i,

    skills:
      /\b(skills|technical skills|core skills|competencies)\b/i,

    projects:
      /\b(projects|personal projects|academic projects)\b/i,

    summary:
      /\b(summary|professional summary|profile|objective)\b/i,

    certifications:
      /\b(certifications|certification|licenses)\b/i

  };


  const foundSections =
    Object.entries(sectionPatterns)
      .filter(
        ([, pattern]) =>
          pattern.test(resumeText)
      )
      .map(
        ([name]) => name
      );


  const section =
    Math.round(
      foundSections.length /
      Object.keys(sectionPatterns).length *
      100
    );


  /* JOB KEYWORDS */

  const resumeKeywords =
    extractKeywords(resumeText);


  let matched = [];
  let missing = [];


  if (job) {

    const jobKeywords =
      extractKeywords(job);


    const resumeNormalized =
      new Set(
        resumeKeywords
      );


    matched =
      jobKeywords.filter(
        keyword =>
          resumeNormalized.has(keyword) ||
          text.includes(keyword)
      );


    missing =
      jobKeywords.filter(
        keyword =>
          !matched.includes(keyword)
      );


  } else {

    matched =
      resumeKeywords.slice(0, 12);

  }


  let keyword;


  if (job) {

    const total =
      matched.length + missing.length;

    keyword =
      total === 0
        ? 0
        : Math.round(
            matched.length /
            total *
            100
          );

  } else {

    keyword =
      Math.min(
        100,
        35 +
        Math.min(
          65,
          resumeKeywords.length * 3
        )
      );

  }


  /* FORMATTING */

  let formatting = 100;

  const issues = [];


  if (resumeText.length < 500) {

    formatting -= 25;

    issues.push(
      "Your resume appears to contain very little text."
    );

  }


  if (resumeText.length > 15000) {

    formatting -= 15;

    issues.push(
      "Your resume is unusually long. Consider making it more concise."
    );

  }


  const lines =
    resumeText
      .split(/\n+/)
      .map(
        line => line.trim()
      )
      .filter(Boolean);


  if (lines.length < 8) {

    formatting -= 20;

  }


  formatting =
    Math.max(0, formatting);


  /* PROBLEMS */

  const problems = [];


  if (!hasEmail) {

    problems.push(
      "No email address was detected."
    );

  }


  if (!hasPhone) {

    problems.push(
      "No phone number was detected."
    );

  }


  if (foundSections.length < 4) {

    problems.push(
      "Some standard resume sections appear to be missing."
    );

  }


  if (job && missing.length > 0) {

    problems.push(
      `${Math.min(missing.length, 8)} important job keywords were not found in your resume.`
    );

  }


  if (formatting < 80) {

    problems.push(
      "The resume structure may be difficult for an ATS to parse cleanly."
    );

  }


  if (problems.length === 0) {

    problems.push(
      "No major ATS issues were detected."
    );

  }


  /* RECOMMENDATIONS */

  const recommendations = [];


  if (!hasEmail) {

    recommendations.push(
      "Add a professional email address near your name."
    );

  }


  if (!hasPhone) {

    recommendations.push(
      "Add a reachable phone number in the contact section."
    );

  }


  if (!hasLinkedIn) {

    recommendations.push(
      "Consider adding your LinkedIn profile to your contact information."
    );

  }


  if (!foundSections.includes("summary")) {

    recommendations.push(
      "Add a concise professional summary tailored to the role."
    );

  }


  if (!foundSections.includes("projects")) {

    recommendations.push(
      "Add relevant projects if they strengthen your application."
    );

  }


  if (job && missing.length > 0) {

    recommendations.push(
      `Consider naturally adding relevant missing keywords such as ${missing.slice(0, 4).join(", ")}.`
    );

  }


  recommendations.push(
    "Use clear section headings and simple formatting so ATS software can parse your resume."
  );


  /* OVERALL */

  let overall =
    Math.round(
      keyword * 0.35 +
      section * 0.25 +
      contact * 0.20 +
      formatting * 0.20
    );


  /*
    Small quality adjustment:
    Extremely empty resumes shouldn't accidentally
    receive a high score.
  */

  if (resumeText.length < 700) {
    overall = Math.min(
      overall,
      65
    );
  }


  overall =
    Math.max(
      0,
      Math.min(
        100,
        overall
      )
    );


  return {

    overall,

    keyword,

    section,

    contact,

    formatting,

    problems,

    recommendations,

    matched,

    missing,

    wordCount:
      text
        .split(/\s+/)
        .filter(Boolean)
        .length

  };

}


/* =========================
   LOADING EXPERIENCE
========================= */

async function showLoadingExperience() {

  loadingSection.classList.remove(
    "hidden"
  );


  reportSection.classList.add(
    "hidden"
  );


  loadingSection.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });


  loadingProgressBar.style.width =
    "5%";


  loadStep1.classList.add(
    "active"
  );

  loadStep2.classList.remove(
    "active"
  );

  loadStep3.classList.remove(
    "active"
  );


  loadingTitle.textContent =
    "Reading your resume";


  loadingText.textContent =
    "Extracting text and understanding your resume structure.";


  await wait(700);


  loadingProgressBar.style.width =
    "35%";


  loadStep1.classList.add(
    "active"
  );

  loadStep2.classList.add(
    "active"
  );


  loadingTitle.textContent =
    "Checking ATS signals";


  loadingText.textContent =
    "Looking for sections, contact details and formatting issues.";


  await wait(850);


  loadingProgressBar.style.width =
    "68%";


  loadingTitle.textContent =
    "Matching keywords";


  loadingText.textContent =
    "Comparing your resume with the job requirements.";


  loadStep3.classList.add(
    "active"
  );


  await wait(850);


  loadingProgressBar.style.width =
    "100%";


  loadingTitle.textContent =
    "Your report is ready";


  loadingText.textContent =
    "We've finished analyzing your resume.";


  await wait(450);


  loadingSection.classList.add(
    "hidden"
  );

}


function wait(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


/* =========================
   REPORT
========================= */

function renderReport(
  analysis,
  fileNameValue
) {

  reportSection.classList.remove(
    "hidden"
  );


  reportIntro.textContent =
    `${fileNameValue} was analyzed for ATS readiness, resume structure and keyword compatibility.`;


  animateNumber(
    overallScore,
    analysis.overall
  );


  animateNumber(
    circleScore,
    analysis.overall
  );


  const circumference =
    2 *
    Math.PI *
    61;


  const offset =
    circumference -
    (
      analysis.overall /
      100
    ) *
    circumference;


  requestAnimationFrame(() => {

    scoreRing.style.strokeDashoffset =
      offset;

  });


  animateMetric(
    keywordScore,
    keywordBar,
    analysis.keyword
  );


  animateMetric(
    sectionScore,
    sectionBar,
    analysis.section
  );


  animateMetric(
    contactScore,
    contactBar,
    analysis.contact
  );


  animateMetric(
    formatScore,
    formatBar,
    analysis.formatting
  );


  scoreMessage.textContent =
    getScoreMessage(
      analysis.overall
    );


  renderList(
    problemsList,
    analysis.problems
  );


  renderList(
    recommendationsList,
    analysis.recommendations
  );


  renderKeywords(
    matchedKeywords,
    analysis.matched,
    false
  );


  renderKeywords(
    missingKeywords,
    analysis.missing,
    true
  );


  setTimeout(() => {

    reportSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }, 150);

}


/* =========================
   ANIMATIONS
========================= */

function animateNumber(
  element,
  target
) {

  const duration = 1100;

  const startTime =
    performance.now();


  function update(now) {

    const progress =
      Math.min(
        1,
        (now - startTime) /
        duration
      );


    const eased =
      1 -
      Math.pow(
        1 - progress,
        3
      );


    element.textContent =
      Math.round(
        target * eased
      );


    if (progress < 1) {

      requestAnimationFrame(
        update
      );

    }

  }


  requestAnimationFrame(
    update
  );

}


function animateMetric(
  numberElement,
  barElement,
  target
) {

  animateNumber(
    numberElement,
    target
  );


  setTimeout(() => {

    barElement.style.width =
      `${target}%`;

  }, 100);

}


/* =========================
   SCORE MESSAGE
========================= */

function getScoreMessage(score) {

  if (score >= 90) {

    return "Excellent ATS readiness. Your resume is in strong shape.";

  }


  if (score >= 75) {

    return "Good foundation. A few improvements could make it stronger.";

  }


  if (score >= 60) {

    return "Decent foundation, but there are several opportunities to improve.";

  }


  if (score >= 40) {

    return "Your resume needs improvement before you apply.";

  }


  return "Your resume has several important ATS issues to fix.";

}


/* =========================
   LIST RENDERING
========================= */

function renderList(
  element,
  items
) {

  element.innerHTML = "";


  items.forEach(item => {

    const li =
      document.createElement("li");

    li.textContent =
      item;

    element.appendChild(li);

  });

}


/* =========================
   KEYWORD RENDERING
========================= */

function renderKeywords(
  element,
  keywords,
  missing
) {

  element.innerHTML = "";


  if (!keywords.length) {

    const empty =
      document.createElement("span");

    empty.textContent =
      missing
        ? "No missing keywords detected."
        : "No keywords detected.";

    empty.style.color =
      "#98a2b3";

    empty.style.fontSize =
      "11px";

    element.appendChild(
      empty
    );

    return;

  }


  keywords
    .slice(0, 18)
    .forEach(keyword => {

      const pill =
        document.createElement("span");

      pill.className =
        "keyword-pill";

      pill.textContent =
        keyword;

      element.appendChild(
        pill
      );

    });

}


/* =========================
   ANALYZE ANOTHER
========================= */

analyzeAnother.addEventListener(
  "click",
  () => {

    reportSection.classList.add(
      "hidden"
    );

    loadingSection.classList.add(
      "hidden"
    );


    selectedFile = null;

    fileInput.value = "";

    fileName.textContent =
      "PDF or DOCX · Max 5MB";

    fileName.style.color =
      "";

    fileName.style.fontWeight =
      "";


    jobDescription.value = "";

    status.textContent = "";


    overallScore.textContent =
      "0";

    circleScore.textContent =
      "0";


    scoreRing.style.strokeDashoffset =
      "383.27";


    [
      keywordScore,
      sectionScore,
      contactScore,
      formatScore
    ].forEach(
      element =>
        element.textContent = "0"
    );


    [
      keywordBar,
      sectionBar,
      contactBar,
      formatBar
    ].forEach(
      element =>
        element.style.width = "0%"
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


/* =========================
   KEYBOARD ACCESS
========================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      event.ctrlKey
    ) {

      analyzeResume();

    }

  }
);
