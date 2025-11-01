// script.js

// Simple and reliable for local dev:
const API_BASE = "http://localhost:5051";

// Constants
const QUIZ_TITLE = "Spot the Fake Review!";
const SUMMARY_TITLE = "Summary";

// State
let QUESTIONS = [];
let CURRENT_INDEX = 0;
let USER_ANSWERS = []; // selected choice index or null per question

// Utilities
function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text) node.textContent = opts.text;
  if (opts.html) node.innerHTML = opts.html;
  if (opts.attrs)
    Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function getHeadingEl() {
  return document.querySelector("#quiz-container h1"); // select the heading element [web:69]
}

/**
 * Build a single-question group.
 * q = { qid, prompt, choices: [..], answer_index }
 */
function renderQuestionGroup(idx, q, preselectedIdx = null) {
  const group = el("div", { className: "question-group" });
  group.dataset.qid = q.qid;
  group.dataset.answerIndex = String(q.answer_index);

  const qLabel = el("label", { text: `${idx}. ${q.prompt}` });
  group.appendChild(qLabel);

  q.choices.forEach((choice, cIdx) => {
    const option = el("div", { className: "option" });

    const input = el("input", {
      attrs: {
        type: "radio",
        name: "choice",
        id: `${q.qid}_${cIdx}`,
        value: String(cIdx),
      },
    });

    if (preselectedIdx !== null && preselectedIdx === cIdx) {
      input.checked = true; // restore selection
    }

    const lab = el("label", { className: "option-label", text: choice });
    lab.setAttribute("for", input.id);

    option.appendChild(input);
    option.appendChild(lab);
    group.appendChild(option);
  });

  return group;
}

async function fetchQuestions(n = 10) {
  const url = `${API_BASE}/quiz-questions?n=${encodeURIComponent(n)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    let msg = `Failed to load quiz questions (HTTP ${res.status})`;
    try {
      const payload = await res.json();
      if (payload && payload.error) msg = payload.error;
    } catch (_) {}
    throw new Error(msg);
  }
  const payload = await res.json();
  if (!payload || !Array.isArray(payload.questions)) {
    throw new Error("Malformed response: missing questions array");
  }
  return payload.questions;
}

function updateProgress() {
  const prog = document.getElementById("progress");
  prog.textContent = `Question ${CURRENT_INDEX + 1} of ${QUESTIONS.length}`;
}

function renderCurrentQuestion() {
  const form = document.getElementById("quiz-form");
  const resultsDiv = document.getElementById("quiz-results");
  const summaryDiv = document.getElementById("quiz-summary");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const finishBtn = document.getElementById("finish-btn");
  const controls = document.getElementById("controls");
  const progress = document.getElementById("progress");
  const heading = getHeadingEl();

  // Ensure quiz UI is visible when rendering questions again
  controls.classList.remove("hidden"); // show controls [web:46]
  progress.classList.remove("hidden"); // show progress [web:46]
  summaryDiv.classList.add("hidden"); // hide summary [web:46]
  resultsDiv.style.display = "none"; // hide banner
  resultsDiv.className = "";
  resultsDiv.textContent = "";

  // Restore heading to quiz title
  if (heading) heading.textContent = QUIZ_TITLE; // set visible text content [web:61]

  // Clear and render the single current question
  form.innerHTML = ""; // remove any previous question content [web:41]
  const q = QUESTIONS[CURRENT_INDEX];
  const pre = USER_ANSWERS[CURRENT_INDEX] ?? null;
  const group = renderQuestionGroup(CURRENT_INDEX + 1, q, pre);
  form.appendChild(group);

  // Progress + Controls state
  updateProgress();

  prevBtn.disabled = CURRENT_INDEX === 0;
  const onLast = CURRENT_INDEX === QUESTIONS.length - 1;
  nextBtn.classList.toggle("hidden", onLast);
  finishBtn.classList.toggle("hidden", !onLast);

  // Scroll card to top for better UX
  const container = document.getElementById("quiz-container");
  container.scrollTop = 0;
}

function readSelection() {
  const checked = document.querySelector('input[name="choice"]:checked');
  return checked ? parseInt(checked.value, 10) : null;
}

function computeScore() {
  let score = 0;
  QUESTIONS.forEach((q, i) => {
    const u = USER_ANSWERS[i];
    if (u !== null && u === q.answer_index) score += 1;
  });
  return score;
}

function showSummary() {
  const form = document.getElementById("quiz-form");
  const resultsDiv = document.getElementById("quiz-results");
  const container = document.getElementById("quiz-summary");
  const controls = document.getElementById("controls");
  const progress = document.getElementById("progress");
  const card = document.getElementById("quiz-container");
  const heading = getHeadingEl();

  // Update heading to "Summary"
  if (heading) heading.textContent = SUMMARY_TITLE; // set summary heading text [web:61]

  // Hide/remove the last rendered question
  form.innerHTML = ""; // clears the question markup so it disappears [web:41]
  controls.classList.add("hidden"); // hide nav controls so only summary shows [web:46]
  progress.classList.add("hidden"); // hide "Question X of Y" [web:46]

  // Score banner
  const score = computeScore();
  const pct = Math.round((score / QUESTIONS.length) * 100);
  resultsDiv.style.display = "block";
  resultsDiv.textContent = `You scored ${score} out of ${QUESTIONS.length} (${pct}%)`;
  resultsDiv.classList.add(pct >= 70 ? "success" : "fail");

  // Build full summary
  container.innerHTML = "";
  QUESTIONS.forEach((q, i) => {
    const wrap = el("div", { className: "question-group" });
    wrap.dataset.qid = q.qid;
    wrap.dataset.answerIndex = String(q.answer_index);

    const title = el("div", {
      className: "summary-title",
      text: `${i + 1}. ${q.prompt}`,
    });
    wrap.appendChild(title);

    const userIdx = USER_ANSWERS[i];
    const userText =
      userIdx === null ? "You did not answer" : q.choices[userIdx];
    const correctText = q.choices[q.answer_index];

    const correct = userIdx !== null && userIdx === q.answer_index;

    const userLine = el("div", {
      className: correct ? "answer correct" : "answer incorrect",
      text: correct ? `Your answer: ${userText} ✓` : `Your answer: ${userText}`,
    });

    const correctLine = el("div", {
      className: "answer correct-key",
      text: `Correct: ${correctText}`,
    });

    wrap.appendChild(userLine);
    wrap.appendChild(correctLine);
    container.appendChild(wrap);
  });

  // Retake action
  const actions = el("div", { className: "summary-actions" });
  const retry = el("button", {
    className: "btn-secondary",
    text: "Retake Quiz",
  });
  retry.type = "button";
  retry.addEventListener("click", () => {
    CURRENT_INDEX = 0;
    USER_ANSWERS = new Array(QUESTIONS.length).fill(null);

    // Reset panels and return to first question
    resultsDiv.style.display = "none";
    container.classList.add("hidden");
    renderCurrentQuestion(); // also restores heading to quiz title
  });
  actions.appendChild(retry);
  container.appendChild(actions);

  container.classList.remove("hidden");

  // Ensure the card scrolls to top for the summary
  card.scrollTop = 0;
}

function wireControls() {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const finishBtn = document.getElementById("finish-btn");

  prevBtn.addEventListener("click", () => {
    USER_ANSWERS[CURRENT_INDEX] = readSelection();
    if (CURRENT_INDEX > 0) {
      CURRENT_INDEX -= 1;
      renderCurrentQuestion();
    }
  });

  nextBtn.addEventListener("click", () => {
    USER_ANSWERS[CURRENT_INDEX] = readSelection();
    if (CURRENT_INDEX < QUESTIONS.length - 1) {
      CURRENT_INDEX += 1;
      renderCurrentQuestion();
    }
  });

  finishBtn.addEventListener("click", () => {
    USER_ANSWERS[CURRENT_INDEX] = readSelection();
    showSummary();
  });
}

async function loadQuiz(n = 10) {
  const resultsDiv = document.getElementById("quiz-results");

  try {
    QUESTIONS = await fetchQuestions(n);
    USER_ANSWERS = new Array(QUESTIONS.length).fill(null);
    wireControls();
    renderCurrentQuestion();
  } catch (err) {
    resultsDiv.style.display = "block";
    resultsDiv.classList.add("fail");
    resultsDiv.textContent = `Error: ${err.message}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadQuiz(10);
});
