/* =========================================================
   ResumeScore v0.4 — Resume Upload + Analysis Engine
   ========================================================= */

const fileInput =
  document.getElementById("resumeFile") ||
  document.getElementById("resumeFileInput");

const chooseBtn =
  document.getElementById("chooseBtn") ||
  document.getElementById("chooseResumeBtn");

const uploadArea =
  document.getElementById("uploadArea") ||
  document.querySelector(".upload-area");

const fileName =
  document.getElementById("fileName") ||
  document.querySelector(".file-name");

const analyzeBtn =
  document.getElementById("analyzeBtn") ||
  document.querySelector("#analyzeBtn");

const jobDescription =
  document.getElementById("jobDescription") ||
  document.querySelector("textarea");

const statusEl =
  document.getElementById("status") ||
  document.querySelector(".status");

let selectedFile = null;


/* =========================================================
   HELPERS
   ========================================================= */

function setStatus(message, type = "") {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = "status";

  if (type) {
    statusEl.classList.add(type);
  }
}


function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s+#.-]/g, " ")
    .trim();
}


function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}


/* =========================================================
   FILE VALIDATION
   ========================================================= */

function validateFile(file) {
  if (!file) {
    return "Please choose a resume.";
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  const allowedExtensions = [".pdf", ".docx"];

  const name = file.name.toLowerCase();

  const validType =
    allowedTypes.includes(file.type) ||
    allowedExtensions.some(ext => name.endsWith(ext));

  if (!validType) {
    return "Only PDF and DOCX files are supported.";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "File is too large. Maximum size is 5MB.";
  }

  return null;
}


/* =========================================================
   FILE SELECTION
   ========================================================= */

function handleFile(file) {
  const error = validateFile(file);

  if (error) {
    selectedFile = null;

    if (fileInput) {
      fileInput.value = "";
    }

    setStatus(error, "error");

    if (fileName) {
      fileName.textContent = "PDF or DOCX • Max 5MB";
    }

    return;
  }

  selectedFile = file;

  if (fileName) {
    fileName.textContent =
      `${file.name} • ${formatFileSize(file.size)}`;
  }

  if (uploadArea) {
    uploadArea.classList.add("has-file");
  }

  setStatus("Resume ready for analysis.", "success");
}


/* =========================================================
   CHOOSE RESUME BUTTON
   ========================================================= */

if (chooseBtn && fileInput) {
  chooseBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    fileInput.click();
  });
}


/* =========================================================
   FILE INPUT CHANGE
   ========================================================= */

if (fileInput) {
  fileInput.addEventListener("change", function () {
    const file = this.files && this.files[0];

    if (file) {
      handleFile(file);
    }
  });
}


/* =========================================================
   DRAG & DROP
   ========================================================= */

if (uploadArea) {

  ["dragenter", "dragover"].forEach(eventName => {

    uploadArea.addEventListener(eventName, function (event) {

      event.preventDefault();
      event.stopPropagation();

      uploadArea.classList.add("dragging");

    });

  });


  ["dragleave", "drop"].forEach(eventName => {

    uploadArea.addEventListener(eventName, function (event) {

      event.preventDefault();
      event.stopPropagation();

      uploadArea.classList.remove("dragging");

    });

  });


  uploadArea.addEventListener("drop", function (event) {

    const files = event.dataTransfer.files;

    if (files && files.length > 0) {
      handleFile(files[0]);
    }

  });


  uploadArea.addEventListener("click", function (event) {

    if (
      fileInput &&
      event.target !== chooseBtn
    ) {
      fileInput.click();
    }

  });

}


/* =========================================================
   PDF TEXT EXTRACTION
   ========================================================= */

async function extractPDF(file) {

  if (!window.pdfjsLib) {

    try {

      window.pdfjsLib = await import(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
      );

      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

    } catch (error) {

      console.error(error);

      throw new Error(
        "PDF reader could not load. Please refresh and try again."
      );

    }

  }

  const buffer = await file.arrayBuffer();

  const pdf = await window.pdfjsLib.getDocument({
    data: buffer
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

  return fullText;
}


/* =========================================================
   DOCX TEXT EXTRACTION
   ========================================================= */

async function extractDOCX(file) {

  if (!window.mammoth) {
    throw new Error(
      "DOCX reader could not load. Please refresh and try again."
    );
  }

  const buffer = await file.arrayBuffer();

  const result = await window.mammoth.extractRawText({
    arrayBuffer: buffer
  });

  return result.value || "";
}


/* =========================================================
   TEXT EXTRACTION ROUTER
   ========================================================= */

async function extractResumeText(file) {

  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return await extractPDF(file);
  }

  if (name.endsWith(".docx")) {
    return await extractDOCX(file);
  }

  throw new Error("Unsupported resume format.");
}


/* =========================================================
   KEYWORD ENGINE
   ========================================================= */

const importantKeywords = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "node.js",
  "python",
  "java",
  "sql",
  "html",
  "css",
  "git",
  "github",
  "api",
  "rest",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "figma",
  "leadership",
  "communication",
  "management",
  "analytics",
  "data",
  "machine learning",
  "artificial intelligence",
  "project management",
  "problem solving",
  "teamwork",
  "agile",
  "scrum"
];


function findKeywords(text) {

  const normalized = normalizeText(text);

  return importantKeywords.filter(keyword => {

    return normalized.includes(
      normalizeText(keyword)
    );

  });

}


function getJobKeywords(jobText) {

  const normalized = normalizeText(jobText);

  return importantKeywords.filter(keyword =>
    normalized.includes(normalizeText(keyword))
  );

}


/* =========================================================
   RESUME ANALYSIS
   ========================================================= */

function analyzeResume(resumeText, jobText = "") {

  const text = normalizeText(resumeText);

  const matchedKeywords = findKeywords(text);

  const jobKeywords = getJobKeywords(jobText);

  let missingKeywords = [];

  if (jobKeywords.length > 0) {

    missingKeywords = jobKeywords.filter(
      keyword => !matchedKeywords.includes(keyword)
    );

  }

  /* CONTACT */

  let contactScore = 0;

  if (
    /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)
  ) {
    contactScore += 50;
  }

  if (
    /\+?\d[\d\s().-]{8,}/.test(text)
  ) {
    contactScore += 50;
  }


  /* SECTIONS */

  const sections = [
    "experience",
    "education",
    "skills",
    "projects",
    "summary",
    "objective",
    "certification",
    "certifications"
  ];

  const foundSections = sections.filter(
    section => text.includes(section)
  );

  const sectionScore = Math.min(
    100,
    Math.round((foundSections.length / 5) * 100)
  );


  /* KEYWORDS */

  let keywordScore = Math.min(
    100,
    matchedKeywords.length * 8
  );


  /* JOB MATCH */

  if (jobKeywords.length > 0) {

    const matchedJobKeywords =
      jobKeywords.filter(
        keyword => matchedKeywords.includes(keyword)
      );

    keywordScore = Math.round(
      (matchedJobKeywords.length / jobKeywords.length) * 100
    );

  }


  /* FORMATTING */

  let formatScore = 100;

  if (text.length < 500) {
    formatScore -= 35;
  }

  if (text.length > 15000) {
    formatScore -= 10;
  }

  if (!contactScore) {
    formatScore -= 15;
  }

  formatScore = Math.max(
    0,
    Math.min(100, formatScore)
  );


  /* OVERALL */

  const overallScore = Math.round(
    keywordScore * 0.30 +
    sectionScore * 0.25 +
    contactScore * 0.20 +
    formatScore * 0.25
  );


  /* PROBLEMS */

  const problems = [];

  if (contactScore < 100) {
    problems.push(
      "Your contact information appears incomplete."
    );
  }

  if (sectionScore < 80) {
    problems.push(
      "Some important resume sections are missing."
    );
  }

  if (keywordScore < 60) {
    problems.push(
      "Your resume could use more relevant skills and keywords."
    );
  }

  if (formatScore < 80) {
    problems.push(
      "Resume formatting or structure could be improved."
    );
  }

  if (missingKeywords.length > 0) {
    problems.push(
      `Missing ${missingKeywords.length} job-specific keyword${missingKeywords.length > 1 ? "s" : ""}.`
    );
  }

  if (problems.length === 0) {
    problems.push(
      "No major ATS problems detected."
    );
  }


  /* RECOMMENDATIONS */

  const recommendations = [];

  if (contactScore < 100) {
    recommendations.push(
      "Add a professional email address and phone number."
    );
  }

  if (sectionScore < 80) {
    recommendations.push(
      "Include clear Experience, Education and Skills sections."
    );
  }

  if (keywordScore < 60) {
    recommendations.push(
      "Add relevant technical and role-specific keywords."
    );
  }

  if (missingKeywords.length > 0) {
    recommendations.push(
      `Consider adding: ${missingKeywords.slice(0, 6).join(", ")}.`
    );
  }

  recommendations.push(
    "Use concise bullet points focused on measurable achievements."
  );


  return {
    overallScore,
    keywordScore,
    sectionScore,
    contactScore,
    formatScore,
    matchedKeywords,
    missingKeywords,
    problems,
    recommendations
  };

}


/* =========================================================
   UI UPDATE
   ========================================================= */

function setNumber(id, value) {

  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }

}


function setBar(id, value) {

  const element = document.getElementById(id);

  if (element) {
    element.style.width = value + "%";
  }

}


function fillList(id, items) {

  const element = document.getElementById(id);

  if (!element) return;

  element.innerHTML = "";

  items.forEach(item => {

    const li = document.createElement("li");

    li.textContent = item;

    element.appendChild(li);

  });

}


function fillKeywords(id, items) {

  const element = document.getElementById(id);

  if (!element) return;

  element.innerHTML = "";

  if (!items.length) {

    element.textContent = "None found";

    return;

  }

  items.forEach(keyword => {

    const span = document.createElement("span");

    span.textContent = keyword;

    element.appendChild(span);

  });

}


/* =========================================================
   SHOW REPORT
   ========================================================= */

function showReport(result) {

  const report =
    document.getElementById("reportSection") ||
    document.querySelector(".report-section");

  if (report) {
    report.classList.remove("hidden");
  }


  setNumber(
    "overallScore",
    result.overallScore
  );

  setNumber(
    "circleScore",
    result.overallScore
  );

  setNumber(
    "keywordScore",
    result.keywordScore
  );

  setNumber(
    "sectionScore",
    result.sectionScore
  );

  setNumber(
    "contactScore",
    result.contactScore
  );

  setNumber(
    "formatScore",
    result.formatScore
  );


  setBar(
    "keywordBar",
    result.keywordScore
  );

  setBar(
    "sectionBar",
    result.sectionScore
  );

  setBar(
    "contactBar",
    result.contactScore
  );

  setBar(
    "formatBar",
    result.formatScore
  );


  const message =
    document.getElementById("scoreMessage");

  if (message) {

    if (result.overallScore >= 85) {
      message.textContent =
        "Excellent ATS readiness — your resume is in strong shape.";
    } else if (result.overallScore >= 70) {
      message.textContent =
        "Good foundation — a few improvements could strengthen your resume.";
    } else if (result.overallScore >= 50) {
      message.textContent =
        "Needs improvement before applying.";
    } else {
      message.textContent =
        "Your resume needs significant improvement.";
    }

  }


  fillList(
    "problemsList",
    result.problems
  );

  fillList(
    "recommendationsList",
    result.recommendations
  );

  fillKeywords(
    "matchedKeywords",
    result.matchedKeywords
  );

  fillKeywords(
    "missingKeywords",
    result.missingKeywords
  );


  if (report) {

    setTimeout(() => {

      report.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }, 100);

  }

}


/* =========================================================
   ANALYZE BUTTON
   ========================================================= */

if (analyzeBtn) {

  analyzeBtn.addEventListener("click", async function () {

    if (!selectedFile) {

      setStatus(
        "Please upload your resume first.",
        "error"
      );

      return;
    }


    analyzeBtn.disabled = true;

    const originalText =
      analyzeBtn.textContent;

    analyzeBtn.textContent =
      "Analyzing your resume...";


    setStatus(
      "Reading your resume and checking ATS signals..."
    );


    try {

      /*
       * Small delay makes the experience feel like
       * a real analysis instead of an instant calculation.
       */

      await new Promise(resolve =>
        setTimeout(resolve, 900)
      );


      const resumeText =
        await extractResumeText(selectedFile);


      if (!resumeText || resumeText.trim().length < 20) {

        throw new Error(
          "We couldn't read meaningful text from this resume. Try another PDF or DOCX file."
        );

      }


      const jobText =
        jobDescription
          ? jobDescription.value
          : "";


      const result =
        analyzeResume(
          resumeText,
          jobText
        );


      await new Promise(resolve =>
        setTimeout(resolve, 700)
      );


      showReport(result);


      setStatus(
        "Analysis complete.",
        "success"
      );

    } catch (error) {

      console.error(
        "Resume analysis error:",
        error
      );

      setStatus(
        error.message ||
        "Something went wrong while analyzing the resume.",
        "error"
      );

    } finally {

      analyzeBtn.disabled = false;

      analyzeBtn.textContent =
        originalText || "Analyze My Resume";

    }

  });

}


/* =========================================================
   ANALYZE ANOTHER
   ========================================================= */

const analyzeAnother =
  document.getElementById("analyzeAnother");

if (analyzeAnother) {

  analyzeAnother.addEventListener(
    "click",
    function () {

      selectedFile = null;

      if (fileInput) {
        fileInput.value = "";
      }

      if (fileName) {
        fileName.textContent =
          "PDF or DOCX • Max 5MB";
      }

      if (uploadArea) {
        uploadArea.classList.remove("has-file");
      }

      const report =
        document.getElementById("reportSection") ||
        document.querySelector(".report-section");

      if (report) {
        report.classList.add("hidden");
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );

}


/* =========================================================
   INITIAL STATE
   ========================================================= */

console.log(
  "ResumeScore v0.4 loaded successfully."
);

if (!fileInput) {
  console.warn(
    "ResumeScore: file input was not found."
  );
}

if (!chooseBtn) {
  console.warn(
    "ResumeScore: choose button was not found."
  );
}

if (!analyzeBtn) {
  console.warn(
    "ResumeScore: analyze button was not found."
  );
}
