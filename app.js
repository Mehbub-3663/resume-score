// ==========================================
// ResumeScore V0.4
// ==========================================

const fileInput =
  document.getElementById("resumeFile");

const chooseBtn =
  document.getElementById("chooseBtn");

const uploadArea =
  document.getElementById("uploadArea");

const fileName =
  document.getElementById("fileName");

const analyzeBtn =
  document.getElementById("analyzeBtn");

const analyzeAnother =
  document.getElementById("analyzeAnother");

const statusEl =
  document.getElementById("status");

const loadingSection =
  document.getElementById("loadingSection");

const reportSection =
  document.getElementById("reportSection");


let selectedFile = null;

let resumeText = "";


// ==========================================
// NORMALIZE
// ==========================================

function normalizeText(text) {

  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


// ==========================================
// FILE PICKER
// ==========================================

chooseBtn.addEventListener(
  "click",
  function (event) {

    event.stopPropagation();

    fileInput.click();
  }
);


uploadArea.addEventListener(
  "click",
  function (event) {

    if (
      event.target !== chooseBtn &&
      !event.target.closest("button")
    ) {

      fileInput.click();
    }
  }
);


fileInput.addEventListener(
  "change",
  async function () {

    const file =
      fileInput.files[0];

    if (!file) return;

    await handleFile(file);
  }
);


// ==========================================
// DRAG DROP
// ==========================================

uploadArea.addEventListener(
  "dragover",
  function (event) {

    event.preventDefault();

    uploadArea.classList.add(
      "dragging"
    );
  }
);


uploadArea.addEventListener(
  "dragleave",
  function () {

    uploadArea.classList.remove(
      "dragging"
    );
  }
);


uploadArea.addEventListener(
  "drop",
  async function (event) {

    event.preventDefault();

    uploadArea.classList.remove(
      "dragging"
    );

    const file =
      event.dataTransfer.files[0];

    if (!file) return;

    await handleFile(file);
  }
);


// ==========================================
// HANDLE FILE
// ==========================================

async function handleFile(file) {

  const name =
    file.name.toLowerCase();

  const isPDF =
    name.endsWith(".pdf");

  const isDOCX =
    name.endsWith(".docx");


  if (!isPDF && !isDOCX) {

    showStatus(
      "Please upload a PDF or DOCX file.",
      true
    );

    return;
  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    showStatus(
      "File must be smaller than 5MB.",
      true
    );

    return;
  }


  selectedFile = file;

  fileName.textContent =
    file.name;


  showStatus(
    "Reading your resume..."
  );


  try {

    if (isPDF) {

      resumeText =
        await extractPDFText(file);

    } else {

      resumeText =
        await extractDOCXText(file);
    }


    resumeText =
      normalizeText(resumeText);


    if (!resumeText) {

      throw new Error(
        "No readable text found."
      );
    }


    showStatus(
      "Resume ready ✓"
    );


  } catch (error) {

    console.error(error);

    selectedFile = null;

    resumeText = "";

    showStatus(
      "Could not read this resume. Try another file.",
      true
    );
  }
}


// ==========================================
// PDF
// ==========================================

async function extractPDFText(file) {

  const pdfjsLib =
    await import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
    );


  pdfjsLib
    .GlobalWorkerOptions
    .workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


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
      await pdf.getPage(
        pageNumber
      );


    const content =
      await page.getTextContent();


    const pageText =
      content.items
        .map(
          item => item.str || ""
        )
        .join(" ");


    text +=
      pageText + "\n";
  }


  return text;
}


// ==========================================
// DOCX
// ==========================================

async function extractDOCXText(file) {

  if (!window.mammoth) {

    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"
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


// ==========================================
// LOAD SCRIPT
// ==========================================

function loadScript(src) {

  return new Promise(
    function (resolve, reject) {

      const script =
        document.createElement(
          "script"
        );


      script.src = src;


      script.onload =
        resolve;


      script.onerror =
        reject;


      document.head.appendChild(
        script
      );
    }
  );
}


// ==========================================
// ANALYZE BUTTON
// ==========================================

analyzeBtn.addEventListener(
  "click",
  async function () {

    if (!selectedFile) {

      showStatus(
        "Please upload your resume first.",
        true
      );

      return;
    }


    if (!resumeText) {

      showStatus(
        "Resume text could not be read.",
        true
      );

      return;
    }


    const jobDescription =
      document.getElementById(
        "jobDescription"
      ).value;


    analyzeBtn.disabled =
      true;


    analyzeBtn.querySelector(
      "span:first-child"
    ).textContent =
      "Preparing analysis...";


    await startLoading();


    const result =
      analyzeResume(
        resumeText,
        jobDescription
      );


    await delay(500);


    hideLoading();


    displayReport(result);


    reportSection.classList.remove(
      "hidden"
    );


    reportSection.scrollIntoView({
      behavior: "smooth"
    });


    analyzeBtn.disabled =
      false;


    analyzeBtn.querySelector(
      "span:first-child"
    ).textContent =
      "Analyze My Resume";


    showStatus(
      "Analysis complete ✓"
    );
  }
);


// ==========================================
// LOADING EXPERIENCE
// ==========================================

async function startLoading() {

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


  const steps = [
    {
      id: "loadingStep1",
      title: "Reading your resume...",
      subtitle:
        "Extracting your experience and skills."
    },

    {
      id: "loadingStep2",
      title: "Checking ATS structure...",
      subtitle:
        "Looking for important resume sections."
    },

    {
      id: "loadingStep3",
      title: "Matching keywords...",
      subtitle:
        "Comparing your resume with relevant terms."
    },

    {
      id: "loadingStep4",
      title: "Checking formatting...",
      subtitle:
        "Looking for common ATS formatting issues."
    }
  ];


  for (
    let i = 0;
    i < steps.length;
    i++
  ) {

    activateLoadingStep(
      i
    );


    document.getElementById(
      "loadingTitle"
    ).textContent =
      steps[i].title;


    document.getElementById(
      "loadingSubtitle"
    ).textContent =
      steps[i].subtitle;


    await delay(
      i === 0
        ? 650
        : 600
    );
  }
}


function activateLoadingStep(
  index
) {

  for (
    let i = 0;
    i <= index;
    i++
  ) {

    const element =
      document.getElementById(
        [
          "loadingStep1",
          "loadingStep2",
          "loadingStep3",
          "loadingStep4"
        ][i]
      );


    if (!element) continue;


    if (i < index) {

      element.classList.remove(
        "active"
      );

      element.classList.add(
        "done"
      );

      element.querySelector(
        "span"
      ).textContent =
        "✓";

    } else {

      element.classList.add(
        "active"
      );
    }
  }
}


function hideLoading() {

  loadingSection.classList.add(
    "hidden"
  );
}


// ==========================================
// ANALYZER
// ==========================================

function analyzeResume(
  text,
  jobDescription
) {

  const resume =
    normalizeText(text);


  // SECTIONS

  const sections = [
    "experience",
    "work experience",
    "education",
    "skills",
    "projects",
    "summary",
    "professional summary",
    "objective",
    "certifications"
  ];


  const found =
    sections.filter(
      section =>
        resume.includes(section)
    );


  const uniqueSections =
    [...new Set(found)];


  const sectionScore =
    Math.min(
      100,
      Math.round(
        uniqueSections.length /
        5 *
        100
      )
    );


  // CONTACT

  const hasEmail =
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
      .test(text);


  const hasPhone =
    /(?:\+?\d[\d\s().-]{7,}\d)/
      .test(text);


  const hasLinkedIn =
    resume.includes(
      "linkedin"
    );


  let contactScore = 0;


  if (hasEmail)
    contactScore += 40;


  if (hasPhone)
    contactScore += 40;


  if (hasLinkedIn)
    contactScore += 20;


  // FORMAT

  let formatScore = 100;


  if (text.length < 500)
    formatScore -= 25;


  if (text.length > 15000)
    formatScore -= 10;


  formatScore =
    Math.max(
      0,
      formatScore
    );


  // KEYWORDS

  let matchedKeywords = [];

  let missingKeywords = [];

  let keywordScore = 60;


  if (
    jobDescription.trim()
  ) {

    const keywords =
      extractKeywords(
        jobDescription
      );


    matchedKeywords =
      keywords.filter(
        keyword =>
          resume.includes(
            normalizeText(keyword)
          )
      );


    missingKeywords =
      keywords.filter(
        keyword =>
          !resume.includes(
            normalizeText(keyword)
          )
      );


    if (keywords.length) {

      keywordScore =
        Math.round(
          matchedKeywords.length /
          keywords.length *
          100
        );
    }

  } else {

    const common = [
      "communication",
      "leadership",
      "management",
      "team",
      "project",
      "analysis",
      "development",
      "strategy",
      "problem solving",
      "skills"
    ];


    matchedKeywords =
      common.filter(
        keyword =>
          resume.includes(keyword)
      );


    keywordScore =
      Math.round(
        matchedKeywords.length /
        common.length *
        100
      );
  }


  // PROBLEMS

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


  if (
    uniqueSections.length < 4
  ) {

    problems.push(
      "Some standard resume sections may be missing."
    );
  }


  if (text.length < 500) {

    problems.push(
      "Very little resume text was detected."
    );
  }


  if (
    jobDescription.trim() &&
    missingKeywords.length
  ) {

    problems.push(
      missingKeywords.length +
      " job-related keywords are missing."
    );
  }


  if (!problems.length) {

    problems.push(
      "No major ATS problems were detected."
    );
  }


  // RECOMMENDATIONS

  const recommendations = [];


  if (!hasEmail) {

    recommendations.push(
      "Add a professional email address."
    );
  }


  if (!hasPhone) {

    recommendations.push(
      "Add a phone number."
    );
  }


  if (
    uniqueSections.length < 4
  ) {

    recommendations.push(
      "Use standard sections such as Experience, Education and Skills."
    );
  }


  if (
    jobDescription.trim() &&
    missingKeywords.length
  ) {

    recommendations.push(
      "Naturally add relevant keywords from the job description."
    );
  }


  recommendations.push(
    "Use simple headings and avoid excessive graphics, tables or columns."
  );


  recommendations.push(
    "Use achievement-focused bullet points with measurable results."
  );


  // SCORE

  const overallScore =
    Math.round(
      keywordScore * .30 +
      sectionScore * .25 +
      contactScore * .20 +
      formatScore * .25
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


// ==========================================
// KEYWORDS
// ==========================================

function extractKeywords(text) {

  const stopWords =
    new Set([
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
      "should",
      "looking",
      "required",
      "responsibilities",
      "candidate"
    ]);


  const words =
    normalizeText(text)
      .replace(
        /[^a-z0-9+#.\s-]/g,
        " "
      )
      .split(/\s+/)
      .filter(
        word =>
          word.length >= 3 &&
          !stopWords.has(word)
      );


  const frequency = {};


  words.forEach(
    word => {

      frequency[word] =
        (frequency[word] || 0) + 1;
    }
  );


  return Object.entries(
    frequency
  )
    .sort(
      (a,b) =>
        b[1] - a[1]
    )
    .slice(0,30)
    .map(
      item =>
        item[0]
    );
}


// ==========================================
// DISPLAY
// ==========================================

function displayReport(
  result
) {

  animateNumber(
    "overallScore",
    result.overallScore
  );


  animateNumber(
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


  const ring =
    document.getElementById(
      "scoreRing"
    );


  if (ring) {

    const circumference =
      314;


    const offset =
      circumference -
      (
        result.overallScore /
        100
      ) *
      circumference;


    setTimeout(
      function () {

        ring.style.strokeDashoffset =
          offset;

      },
      100
    );
  }


  let headline =
    "Your resume needs some work.";


  if (
    result.overallScore >= 80
  ) {

    headline =
      "Strong ATS readiness.";

  } else if (
    result.overallScore >= 60
  ) {

    headline =
      "Good foundation — room to improve.";
  }


  setText(
    "scoreHeadline",
    headline
  );


  let message =
    "Fix the highlighted issues before applying.";


  if (
    result.overallScore >= 80
  ) {

    message =
      "Your resume looks well prepared for ATS screening.";

  } else if (
    result.overallScore >= 60
  ) {

    message =
      "A few targeted improvements could strengthen your resume.";
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


// ==========================================
// ANIMATE NUMBER
// ==========================================

function animateNumber(
  id,
  target
) {

  const element =
    document.getElementById(id);


  if (!element) return;


  let current = 0;


  const duration = 900;

  const start =
    performance.now();


  function update(
    timestamp
  ) {

    const progress =
      Math.min(
        (timestamp - start) /
        duration,
        1
      );


    current =
      Math.round(
        target * progress
      );


    element.textContent =
      current;


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


// ==========================================
// HELPERS
// ==========================================

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      value;
  }
}


function setWidth(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    setTimeout(
      function () {

        element.style.width =
          Math.max(
            0,
            Math.min(
              100,
              value
            )
          ) + "%";

      },
      100
    );
  }
}


function renderList(
  id,
  items
) {

  const element =
    document.getElementById(id);


  if (!element) return;


  element.innerHTML = "";


  items.forEach(
    item => {

      const li =
        document.createElement(
          "li"
        );


      li.textContent =
        item;


      element.appendChild(
        li
      );
    }
  );
}


function renderKeywords(
  id,
  keywords
) {

  const element =
    document.getElementById(id);


  if (!element) return;


  if (
    !keywords ||
    !keywords.length
  ) {

    element.textContent =
      "None detected";

    return;
  }


  element.innerHTML = "";


  keywords.forEach(
    keyword => {

      const span =
        document.createElement(
          "span"
        );


      span.textContent =
        keyword;


      element.appendChild(
        span
      );
    }
  );
}


function showStatus(
  message,
  error = false
) {

  if (!statusEl) return;


  statusEl.textContent =
    message;


  statusEl.style.color =
    error
      ? "#ff6577"
      : "";
}


function delay(
  milliseconds
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}


// ==========================================
// ANALYZE ANOTHER
// ==========================================

analyzeAnother.addEventListener(
  "click",
  function () {

    selectedFile = null;

    resumeText = "";

    fileInput.value = "";

    fileName.textContent =
      "No file selected";


    reportSection.classList.add(
      "hidden"
    );


    loadingSection.classList.add(
      "hidden"
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
);
