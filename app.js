const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const analyzeButton = document.getElementById("analyzeButton");
const dropZone = document.getElementById("dropZone");

const fileName = document.getElementById("fileName");
const status = document.getElementById("status");

const jobDescription =
  document.getElementById("jobDescription");

let selectedFile = null;


/* =========================
   FILE SELECTION
========================= */

uploadButton.addEventListener("click", function () {
  fileInput.click();
});


fileInput.addEventListener("change", function () {

  const file = fileInput.files[0];

  if (file) {
    handleFile(file);
  }

});


function handleFile(file) {

  if (file.size > 5 * 1024 * 1024) {

    selectedFile = null;

    fileName.textContent =
      "File is too large. Maximum size is 5 MB.";

    analyzeButton.disabled = true;

    return;
  }


  if (!/\.(pdf|docx)$/i.test(file.name)) {

    selectedFile = null;

    fileName.textContent =
      "Please upload a PDF or DOCX file.";

    analyzeButton.disabled = true;

    return;
  }


  selectedFile = file;

  fileName.textContent =
    "✓ " + file.name;

  status.textContent = "";

  analyzeButton.disabled = false;
}


/* =========================
   DRAG & DROP
========================= */

dropZone.addEventListener(
  "dragover",
  function (event) {

    event.preventDefault();

    dropZone.classList.add("dragging");

  }
);


dropZone.addEventListener(
  "dragleave",
  function () {

    dropZone.classList.remove("dragging");

  }
);


dropZone.addEventListener(
  "drop",
  function (event) {

    event.preventDefault();

    dropZone.classList.remove("dragging");

    const file =
      event.dataTransfer.files[0];

    if (file) {
      handleFile(file);
    }

  }
);


/* =========================
   ANALYZE
========================= */

analyzeButton.addEventListener(
  "click",
  async function () {

    if (!selectedFile) return;

    analyzeButton.disabled = true;

    status.textContent =
      "Reading your resume...";


    try {

      const text =
        await extractText(selectedFile);


      if (text.trim().length < 80) {

        throw new Error(
          "We could not read enough text from this file. Try another PDF or DOCX."
        );

      }


      status.textContent =
        "Analyzing your resume...";


      const report =
        analyzeResume(
          text,
          jobDescription.value
        );


      showResults(report);


      document
        .getElementById("result")
        .classList
        .remove("hidden");


      document
        .getElementById("result")
        .scrollIntoView({
          behavior: "smooth"
        });


      status.textContent =
        "Analysis complete ✓";

    }


    catch (error) {

      console.error(error);

      status.textContent =
        error.message ||
        "Something went wrong.";

    }


    finally {

      analyzeButton.disabled = false;

    }

  }
);


/* =========================
   EXTRACT TEXT
========================= */

async function extractText(file) {


  if (/\.docx$/i.test(file.name)) {

    const buffer =
      await file.arrayBuffer();


    const result =
      await window.mammoth.extractRawText({
        arrayBuffer: buffer
      });


    return result.value || "";

  }


  if (/\.pdf$/i.test(file.name)) {

    const pdfjs =
      await import(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
      );


    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";


    const buffer =
      await file.arrayBuffer();


    const pdf =
      await pdfjs
        .getDocument({
          data: buffer
        })
        .promise;


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
          .map(
            item => item.str
          )
          .join(" ");


      text +=
        pageText + "\n";

    }


    return text;

  }


  throw new Error(
    "Unsupported file type."
  );
}


/* =========================
   RESUME ANALYSIS
========================= */

function analyzeResume(
  text,
  jobText
) {

  const lower =
    text.toLowerCase();


  let issues = [];

  let recommendations = [];


  /* CONTACT */

  const email =
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(
      text
    );


  const phone =
    /(?:\+?\d[\d\s().-]{8,}\d)/.test(
      text
    );


  const linkedin =
    /linkedin\.com/.test(
      lower
    );


  let contactScore = 0;


  if (email) {

    contactScore += 50;

  } else {

    issues.push(
      "Email address was not detected."
    );

  }


  if (phone) {

    contactScore += 50;

  } else {

    issues.push(
      "Phone number was not detected."
    );

  }


  if (!linkedin) {

    recommendations.push(
      "Consider adding your LinkedIn profile."
    );

  }


  /* SECTIONS */

  const sections = {

    experience:
      /experience|employment|work history/.test(
        lower
      ),

    education:
      /education|university|college|degree/.test(
        lower
      ),

    skills:
      /skills|technical skills|competencies/.test(
        lower
      ),

    projects:
      /projects|project experience/.test(
        lower
      ),

    summary:
      /summary|profile|objective|professional summary/.test(
        lower
      )

  };


  let sectionScore = 0;

  let sectionCount = 0;


  Object.keys(sections).forEach(
    key => {

      if (sections[key]) {

        sectionCount++;

      }

    }
  );


  sectionScore =
    Math.round(
      (sectionCount / 5) * 100
    );


  if (!sections.experience) {

    issues.push(
      "Work experience section was not clearly detected."
    );

  }


  if (!sections.education) {

    issues.push(
      "Education section was not clearly detected."
    );

  }


  if (!sections.skills) {

    issues.push(
      "Skills section was not clearly detected."
    );

  }


  /* ACTION VERBS */

  const actionWords = [

    "built",
    "created",
    "developed",
    "led",
    "managed",
    "improved",
    "increased",
    "decreased",
    "launched",
    "optimized",
    "generated",
    "grew",
    "reduced",
    "delivered",
    "achieved",
    "implemented",
    "automated",
    "designed",
    "organized",
    "analyzed"

  ];


  let actionCount = 0;


  actionWords.forEach(
    word => {

      const regex =
        new RegExp(
          "\\b" +
          word +
          "\\b",
          "gi"
        );


      const matches =
        text.match(regex);


      if (matches) {

        actionCount +=
          matches.length;

      }

    }
  );


  const achievementScore =
    Math.min(
      100,
      actionCount * 8 +
      countNumbers(text) * 8
    );


  if (actionCount < 4) {

    issues.push(
      "Not enough strong action verbs were detected."
    );

    recommendations.push(
      "Start bullet points with strong verbs such as Built, Led, Improved or Increased."
    );

  }


  /* NUMBERS */

  const numberCount =
    countNumbers(text);


  if (numberCount < 3) {

    issues.push(
      "Few measurable achievements were detected."
    );

    recommendations.push(
      "Add truthful numbers such as growth %, users, revenue, time saved or results."
    );

  }


  /* FORMATTING */

  const words =
    text
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  const wordCount =
    words.length;


  let formattingScore = 70;


  if (
    wordCount >= 350 &&
    wordCount <= 1000
  ) {

    formattingScore += 20;

  }


  else if (wordCount < 250) {

    formattingScore -= 15;

    issues.push(
      "Your resume may be too short."
    );

  }


  else if (wordCount > 1200) {

    formattingScore -= 15;

    issues.push(
      "Your resume may be too long or repetitive."
    );

    recommendations.push(
      "Remove repetitive or less relevant content."
    );

  }


  if (
    /date of birth|marital status|father's name/.test(
      lower
    )
  ) {

    formattingScore -= 15;

    issues.push(
      "Some personal details may not be necessary for most jobs."
    );

    recommendations.push(
      "Remove non-job-related personal information unless specifically required."
    );

  }


  formattingScore =
    Math.max(
      0,
      Math.min(
        100,
        formattingScore
      )
    );


  /* KEYWORDS */

  let keywordScore = 55;


  const commonSkills = [

    "python",
    "javascript",
    "typescript",
    "java",
    "react",
    "node",
    "sql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "excel",
    "powerpoint",
    "sales",
    "marketing",
    "seo",
    "analytics",
    "leadership",
    "communication",
    "project management",
    "figma",
    "git",
    "html",
    "css",
    "machine learning",
    "data analysis"

  ];


  const detectedSkills =
    commonSkills.filter(
      skill =>
        lower.includes(skill)
    );


  keywordScore +=
    Math.min(
      35,
      detectedSkills.length * 4
    );


  if (detectedSkills.length < 4) {

    recommendations.push(
      "Add relevant technical or role-specific skills that you genuinely have."
    );

  }


  keywordScore =
    Math.min(
      100,
      keywordScore
    );


  /* JOB DESCRIPTION */

  const jobMatch =
    analyzeJobMatch(
      text,
      jobText
    );


  if (jobMatch) {

    keywordScore =
      Math.round(
        keywordScore * 0.55 +
        jobMatch.score * 0.45
      );

  }


  /* FINAL SCORE */

  let finalScore =
    Math.round(

      contactScore * 0.15 +

      sectionScore * 0.20 +

      formattingScore * 0.20 +

      keywordScore * 0.20 +

      achievementScore * 0.25

    );


  finalScore =
    Math.max(
      0,
      Math.min(
        100,
        finalScore
      )
    );


  if (finalScore >= 85) {

    recommendations.unshift(
      "Strong baseline. Tailor your resume to each job before applying."
    );

  }

  else if (finalScore >= 70) {

    recommendations.unshift(
      "Good foundation. Fix the flagged issues before applying."
    );

  }

  else {

    recommendations.unshift(
      "Your resume has several opportunities for improvement."
    );

  }


  return {

    score: finalScore,

    contactScore,

    sectionScore,

    formattingScore,

    keywordScore,

    achievementScore,

    issues: unique(issues),

    recommendations:
      unique(recommendations),

    jobMatch

  };

}


/* =========================
   JOB MATCH
========================= */

function analyzeJobMatch(
  resumeText,
  jobText
) {

  if (
    !jobText ||
    jobText.trim().length < 40
  ) {

    return null;

  }


  const resume =
    resumeText.toLowerCase();


  const job =
    jobText.toLowerCase();


  const words =
    job
      .match(
        /\b[a-z][a-z+#.-]{2,}\b/gi
      ) || [];


  const stopWords = new Set([

    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "our",
    "are",
    "will",
    "this",
    "that",
    "from",
    "have",
    "has",
    "not",
    "but",
    "they",
    "their",
    "into",
    "about",
    "role",
    "work",
    "team",
    "job",
    "years",
    "using",
    "looking",
    "responsibilities",
    "requirements",
    "experience",
    "skills"

  ]);


  const frequency = {};


  words.forEach(
    word => {

      const clean =
        word
          .toLowerCase()
          .replace(
            /[^a-z0-9+#.-]/g,
            ""
          );


      if (
        clean.length >= 3 &&
        !stopWords.has(clean)
      ) {

        frequency[clean] =
          (frequency[clean] || 0) + 1;

      }

    }
  );


  const keywords =
    Object.keys(frequency)
      .sort(
        (a, b) =>
          frequency[b] -
          frequency[a]
      )
      .slice(
        0,
        25
      );


  const matched =
    keywords.filter(
      keyword =>
        resume.includes(keyword)
    );


  const missing =
    keywords.filter(
      keyword =>
        !resume.includes(keyword)
    );


  const score =
    keywords.length
      ? Math.round(
          (matched.length /
            keywords.length) *
          100
        )
      : 0;


  return {

    score,

    matched,

    missing

  };

}


/* =========================
   NUMBERS
========================= */

function countNumbers(text) {

  const matches =
    text.match(
      /\b\d+(?:\.\d+)?\s*(?:%|percent|x|k|m|million|thousand)?\b/gi
    ) || [];


  return matches.length;

}


/* =========================
   SHOW RESULTS
========================= */

function showResults(report) {


  document.getElementById(
    "score"
  ).textContent =
    report.score;


  document.getElementById(
    "circleScore"
  ).textContent =
    report.score;


  let label;


  if (report.score >= 85) {

    label =
      "Strong ATS-readiness signals.";

  }

  else if (report.score >= 70) {

    label =
      "Good foundation, but there is room to improve.";

  }

  else {

    label =
      "Needs improvement before applying.";

  }


  document.getElementById(
    "scoreLabel"
  ).textContent =
    label;


  updateCategory(
    "formatScore",
    "formatBar",
    report.formattingScore
  );


  updateCategory(
    "sectionScore",
    "sectionBar",
    report.sectionScore
  );


  updateCategory(
    "keywordScore",
    "keywordBar",
    report.keywordScore
  );


  updateCategory(
    "achievementScore",
    "achievementBar",
    report.achievementScore
  );


  const issues =
    report.issues;


  document.getElementById(
    "issues"
  ).innerHTML =

    issues.length

      ? issues
          .map(
            issue =>
              `<div class="item">⚠️ ${escapeHTML(issue)}</div>`
          )
          .join("")

      : `<div class="item">✓ No major issues detected.</div>`;


  document.getElementById(
    "recommendations"
  ).innerHTML =

    report.recommendations
      .map(
        recommendation =>
          `<div class="item">→ ${escapeHTML(recommendation)}</div>`
      )
      .join("");


  /* SCORE RING */

  const circumference =
    314;


  const offset =
    circumference -
    (
      report.score /
      100
    ) *
    circumference;


  document.getElementById(
    "scoreRing"
  ).style.strokeDashoffset =
    offset;


  /* JOB MATCH */

  if (report.jobMatch) {

    document
      .getElementById("jobMatch")
      .classList
      .remove("hidden");


    document.getElementById(
      "jobMatchScore"
    ).textContent =
      report.jobMatch.score;


    document.getElementById(
      "matchedKeywords"
    ).innerHTML =
      report.jobMatch.matched.length

        ? report.jobMatch.matched
            .map(
              word =>
                `<span class="keyword">✓ ${escapeHTML(word)}</span>`
            )
            .join("")

        : `<span class="keyword">No strong matches detected</span>`;


    document.getElementById(
      "missingKeywords"
    ).innerHTML =
      report.jobMatch.missing.length

        ? report.jobMatch.missing
            .map(
              word =>
                `<span class="keyword missing">+ ${escapeHTML(word)}</span>`
            )
            .join("")

        : `<span class="keyword">No major missing keywords detected</span>`;

  }

  else {

    document
      .getElementById("jobMatch")
      .classList
      .add("hidden");

  }

}


/* =========================
   CATEGORY
========================= */

function updateCategory(
  scoreId,
  barId,
  value
) {

  document.getElementById(
    scoreId
  ).textContent =
    value;


  document.getElementById(
    barId
  ).style.width =
    value + "%";

}


/* =========================
   NEW RESUME
========================= */

document
  .getElementById(
    "newResumeButton"
  )
  .addEventListener(
    "click",
    function () {

      document
        .getElementById("result")
        .classList
        .add("hidden");


      fileInput.value = "";

      selectedFile = null;

      fileName.textContent = "";

      status.textContent = "";

      analyzeButton.disabled =
        true;


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );


/* =========================
   COMING SOON
========================= */

function showComingSoon() {

  alert(
    "AI Resume Builder is coming soon. 🚀"
  );

}


/* =========================
   SECURITY
========================= */

function escapeHTML(text) {

  return String(text)
    .replace(
      /[&<>"']/g,
      function (character) {

        const map = {

          "&": "&amp;",

          "<": "&lt;",

          ">": "&gt;",

          '"': "&quot;",

          "'": "&#039;"

        };

        return map[character];

      }
    );

}


/* =========================
   UNIQUE ARRAY
========================= */

function unique(array) {

  return [
    ...new Set(array)
  ];

}
