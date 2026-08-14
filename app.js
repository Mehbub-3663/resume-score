const fileInput =
  document.getElementById("fileInput");

const uploadButton =
  document.getElementById("uploadButton");

const analyzeButton =
  document.getElementById("analyzeButton");

const fileName =
  document.getElementById("fileName");

const status =
  document.getElementById("status");

let selectedFile = null;


/* UPLOAD BUTTON */

uploadButton.addEventListener(
  "click",
  function () {

    fileInput.click();

  }
);


/* FILE SELECTED */

fileInput.addEventListener(
  "change",
  function () {

    const file =
      fileInput.files[0];

    if (!file) return;


    /* MAX 5 MB */

    if (file.size > 5 * 1024 * 1024) {

      status.textContent =
        "Your file must be smaller than 5 MB.";

      analyzeButton.disabled = true;

      return;
    }


    /* PDF / DOCX */

    const valid =
      /\.(pdf|docx)$/i.test(file.name);

    if (!valid) {

      status.textContent =
        "Please upload a PDF or DOCX file.";

      analyzeButton.disabled = true;

      return;
    }


    selectedFile = file;

    fileName.textContent =
      "Selected: " + file.name;

    status.textContent = "";

    analyzeButton.disabled = false;

  }
);


/* ANALYZE */

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


      const report =
        analyzeResume(text);


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
        "Analysis complete.";

    }

    catch (error) {

      status.textContent =
        error.message;

    }

    finally {

      analyzeButton.disabled = false;

    }

  }
);


/* READ FILE */

async function extractText(file) {


  /* DOCX */

  if (
    /\.docx$/i.test(file.name)
  ) {

    const buffer =
      await file.arrayBuffer();

    const result =
      await window.mammoth.extractRawText({
        arrayBuffer: buffer
      });

    return result.value || "";

  }


  /* PDF */

  if (
    /\.pdf$/i.test(file.name)
  ) {

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
      let page = 1;
      page <= pdf.numPages;
      page++
    ) {

      const pdfPage =
        await pdf.getPage(page);


      const content =
        await pdfPage.getTextContent();


      text +=
        content.items
          .map(item => item.str)
          .join(" ") + "\n";

    }


    return text;

  }


  throw new Error(
    "Unsupported file type."
  );

}


/* ANALYZE RESUME */

function analyzeResume(text) {

  const lower =
    text.toLowerCase();


  let score = 0;

  const issues = [];

  const recommendations = [];


  /* CONTACT */

  const email =
    /[^\s@]+@[^\s@]+\.[^\s@]+/
      .test(text);


  const phone =
    /(?:\+?\d[\d\s().-]{8,}\d)/
      .test(text);


  const linkedin =
    /linkedin\.com/
      .test(lower);


  if (email) {

    score += 7;

  } else {

    issues.push(
      "Email address was not detected."
    );

  }


  if (phone) {

    score += 5;

  } else {

    issues.push(
      "Phone number was not detected."
    );

  }


  if (linkedin) {

    score += 3;

  } else {

    recommendations.push(
      "Consider adding your LinkedIn profile."
    );

  }


  /* EXPERIENCE */

  if (
    /experience|employment|work history/
      .test(lower)
  ) {

    score += 10;

  } else {

    issues.push(
      "Work experience section was not clearly detected."
    );

  }


  /* EDUCATION */

  if (
    /education|university|college|degree/
      .test(lower)
  ) {

    score += 7;

  } else {

    issues.push(
      "Education section was not clearly detected."
    );

  }


  /* SKILLS */

  if (
    /skills|technical skills|competencies/
      .test(lower)
  ) {

    score += 7;

  } else {

    issues.push(
      "Skills section was not clearly detected."
    );

  }


  /* PROJECTS */

  if (
    /projects|project experience/
      .test(lower)
  ) {

    score += 6;

  } else {

    recommendations.push(
      "Add relevant projects if they strengthen your application."
    );

  }


  /* ACTION WORDS */

  const actionWords =
    /\b(led|built|created|managed|increased|decreased|improved|launched|developed|optimized|generated|grew|reduced|delivered|achieved|implemented|automated)\b/gi;


  const actionMatches =
    text.match(actionWords) || [];


  score +=
    Math.min(
      10,
      actionMatches.length
    );


  if (
    actionMatches.length < 4
  ) {

    issues.push(
      "Not enough strong action verbs were detected."
    );


    recommendations.push(
      "Start bullet points with strong verbs such as Built, Led, Improved or Increased."
    );

  }


  /* NUMBERS / ACHIEVEMENTS */

  const numbers =
    text.match(
      /\b\d+(?:\.\d+)?\s*(?:%|percent|x|k|m|million|thousand)?\b/gi
    ) || [];


  score +=
    Math.min(
      10,
      numbers.length
    );


  if (
    numbers.length < 3
  ) {

    issues.push(
      "Few measurable achievements were detected."
    );


    recommendations.push(
      "Add truthful numbers such as growth %, users, revenue, time saved or results."
    );

  }


  /* LENGTH */

  const words =
    lower
      .split(/\s+/)
      .filter(Boolean);


  const wordCount =
    words.length;


  if (
    wordCount >= 350 &&
    wordCount <= 1100
  ) {

    score += 10;

  }

  else if (
    wordCount < 350
  ) {

    score += 5;

    issues.push(
      "The resume may be too short."
    );

  }

  else {

    score += 5;

    issues.push(
      "The resume may be too long or repetitive."
    );

    recommendations.push(
      "Remove repetitive or irrelevant content."
    );

  }


  /* PERSONAL DETAILS */

  if (
    /date of birth|marital status|father's name/
      .test(lower)
  ) {

    score -= 5;


    issues.push(
      "Some personal details may not be necessary."
    );


    recommendations.push(
      "Remove non-job-related personal information unless required."
    );

  }


  /* FINAL SCORE */

  score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );


  if (
    score >= 85
  ) {

    recommendations.unshift(
      "Strong baseline. Tailor your keywords to each job description."
    );

  }

  else if (
    score >= 70
  ) {

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
    score,
    issues,
    recommendations
  };

}


/* SHOW RESULTS */

function showResults(report) {

  document
    .getElementById("score")
    .textContent =
    report.score;


  document
    .getElementById("circleScore")
    .textContent =
    report.score;


  let label;


  if (
    report.score >= 85
  ) {

    label =
      "Strong ATS-readiness signals";

  }

  else if (
    report.score >= 70
  ) {

    label =
      "Good foundation, but needs improvement";

  }

  else {

    label =
      "Needs improvement before applying";

  }


  document
    .getElementById("scoreLabel")
    .textContent =
    label;


  const issuesHTML =
    report.issues.length

      ? report.issues
          .map(
            item =>
              `<div class="item">⚠️ ${escapeHTML(item)}</div>`
          )
          .join("")

      : `<div class="item">✅ No major issues detected.</div>`;


  const recommendationsHTML =
    report.recommendations
      .map(
        item =>
          `<div class="item">→ ${escapeHTML(item)}</div>`
      )
      .join("");


  document
    .getElementById("issues")
    .innerHTML =
    issuesHTML;


  document
    .getElementById("recommendations")
    .innerHTML =
    recommendationsHTML;

}


/* SECURITY */

function escapeHTML(text) {

  return text.replace(
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
