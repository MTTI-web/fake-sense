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
let REVEALED = []; // whether explanation has been shown for each Q

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
  return document.querySelector("#quiz-container h1");
}

// Minimal safe markdown-to-HTML for bold and newlines
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function renderMarkdownBold(s) {
  const escaped = escapeHtml(s ?? "");
  const withBreaks = escaped.replace(/\r?\n/g, "<br>");
  // Convert **bold** to <strong>bold</strong>
  return withBreaks.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

function readSelection() {
  const checked = document.querySelector('input[name="choice"]:checked');
  return checked ? parseInt(checked.value, 10) : null;
}

function setChoicesDisabled(disabled) {
  document.querySelectorAll('input[name="choice"]').forEach((inp) => {
    inp.disabled = disabled;
  });
}

// Render explanation for the current question using API fields
function showCurrentExplanation() {
  const form = document.getElementById("quiz-form");
  const existing = form.querySelector(".explain-block");
  if (existing) existing.remove();

  const q = QUESTIONS[CURRENT_INDEX];
  const userIdx = USER_ANSWERS[CURRENT_INDEX];
  const correct = userIdx === q.answer_index;

  const block = el("div", {
    className: `explain-block ${correct ? "ok" : "bad"}`,
  });

  const title = el("div", {
    className: "explain-title",
    text: correct ? "Correct" : "Incorrect",
  });
  block.appendChild(title);

  // Prefer explanation_text directly if present (now with markdown-bold support)
  if (q.explanation_text) {
    const p = el("div", {
      className: "explain-text",
      html: renderMarkdownBold(q.explanation_text),
    });
    block.appendChild(p);
  }

  // Also render top drivers if available
  const ed = q.explanation_data || {};
  const fake = Array.isArray(ed.top_fake_drivers)
    ? ed.top_fake_drivers.slice(0, 3)
    : [];
  const genu = Array.isArray(ed.top_genuine_drivers)
    ? ed.top_genuine_drivers.slice(0, 3)
    : [];

  if (fake.length || genu.length) {
    const why = el("div", { className: "explain-why" });

    if (fake.length) {
      why.appendChild(
        el("div", { className: "drivers-title", text: "Top fake drivers" })
      );
      const ul = el("ul", { className: "drivers fake" });
      fake.forEach((d) => {
        ul.appendChild(el("li", { text: `${d.feature} (${d.contribution})` }));
      });
      why.appendChild(ul);
    }

    if (genu.length) {
      why.appendChild(
        el("div", { className: "drivers-title", text: "Top genuine drivers" })
      );
      const ul2 = el("ul", { className: "drivers genuine" });
      genu.forEach((d) => {
        ul2.appendChild(el("li", { text: `${d.feature} (${d.contribution})` }));
      });
      why.appendChild(ul2);
    }

    block.appendChild(why);
  }

  form.appendChild(block);
}

function updateProgress() {
  const prog = document.getElementById("progress");
  prog.textContent = `Question ${CURRENT_INDEX + 1} of ${QUESTIONS.length}`;
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
  if (heading) heading.textContent = SUMMARY_TITLE;

  // Hide/remove the last rendered question
  form.innerHTML = "";
  controls.classList.add("hidden");
  progress.classList.add("hidden");

  // Score banner
  const score = computeScore();
  const pct = Math.round((score / QUESTIONS.length) * 100);
  resultsDiv.style.display = "block";
  resultsDiv.textContent = `You scored ${score} out of ${QUESTIONS.length} (${pct}%)`;
  resultsDiv.className = "";
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

    // Include explanation_text in summary with markdown-bold support
    if (q.explanation_text) {
      wrap.appendChild(
        el("div", {
          className: "answer",
          html: renderMarkdownBold(q.explanation_text),
        })
      );
    }

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
    REVEALED = new Array(QUESTIONS.length).fill(false);
    resultsDiv.style.display = "none";
    container.classList.add("hidden");
    renderCurrentQuestion();
  });
  actions.appendChild(retry);
  container.appendChild(actions);
  container.classList.remove("hidden");

  // Ensure the card scrolls to top for the summary
  card.scrollTop = 0;
}

// Main screen render
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
  controls.classList.remove("hidden");
  progress.classList.remove("hidden");
  summaryDiv.classList.add("hidden");
  resultsDiv.style.display = "none";
  resultsDiv.className = "";
  resultsDiv.textContent = "";

  // Restore heading to quiz title
  if (heading) heading.textContent = QUIZ_TITLE;

  // Clear and render the single current question
  form.innerHTML = "";
  const q = QUESTIONS[CURRENT_INDEX];
  const pre = USER_ANSWERS[CURRENT_INDEX] ?? null;
  const group = renderQuestionGroup(CURRENT_INDEX + 1, q, pre);
  form.appendChild(group);

  // Progress + Controls state
  updateProgress();
  prevBtn.disabled = CURRENT_INDEX === 0;

  // Unified primary button
  const onLast = CURRENT_INDEX === QUESTIONS.length - 1;
  finishBtn.classList.add("hidden");
  nextBtn.classList.remove("hidden");

  if (REVEALED[CURRENT_INDEX]) {
    // already checked: disable and show explanation
    setChoicesDisabled(true);
    showCurrentExplanation();
    nextBtn.textContent = onLast ? "Show Summary" : "Next Question";
  } else {
    setChoicesDisabled(false);
    nextBtn.textContent = "Check Answer";
  }

  // Scroll card to top for better UX
  const container = document.getElementById("quiz-container");
  container.scrollTop = 0;
}

function wireControls() {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  prevBtn.addEventListener("click", () => {
    if (!REVEALED[CURRENT_INDEX]) {
      USER_ANSWERS[CURRENT_INDEX] = readSelection();
    }
    if (CURRENT_INDEX > 0) {
      CURRENT_INDEX -= 1;
      renderCurrentQuestion();
    }
  });

  // Unified handler: first click checks, second click advances (or shows summary on last)
  nextBtn.addEventListener("click", () => {
    const onLast = CURRENT_INDEX === QUESTIONS.length - 1;

    if (!REVEALED[CURRENT_INDEX]) {
      const sel = readSelection();
      if (sel === null) {
        // brief inline nudge using the existing banner space
        const resultsDiv = document.getElementById("quiz-results");
        resultsDiv.style.display = "block";
        resultsDiv.className = "fail";
        resultsDiv.textContent = "Please choose an option to check the answer.";
        setTimeout(() => {
          resultsDiv.style.display = "none";
          resultsDiv.className = "";
          resultsDiv.textContent = "";
        }, 1200);
        return;
      }
      USER_ANSWERS[CURRENT_INDEX] = sel;
      REVEALED[CURRENT_INDEX] = true;
      setChoicesDisabled(true);
      showCurrentExplanation();
      nextBtn.textContent = onLast ? "Show Summary" : "Next Question";
      return; // stay on the question after checking
    }

    // Already revealed: advance or show summary
    if (onLast) {
      showSummary();
    } else {
      CURRENT_INDEX += 1;
      renderCurrentQuestion();
    }
  });
}

// API fetch — robust to payload wrapping either at root or under .payload
async function fetchQuestions(n = 10) {
  const candidates = [
    `${API_BASE}/quiz-questions?n=${encodeURIComponent(n)}`,
    `${API_BASE}/quiz?n=${encodeURIComponent(n)}`,
    `${API_BASE}/questions?n=${encodeURIComponent(n)}`,
  ];

  let lastErr = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const payload = json && json.payload ? json.payload : json;
      if (payload && Array.isArray(payload.questions)) {
        return payload;
      }
      if (Array.isArray(json)) {
        return {
          count: json.length,
          questions: json,
          distribution: null,
          single_class: false,
        };
      }
      throw new Error("Malformed response (no questions array)");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to load quiz questions");
}

async function loadQuiz(n = 10) {
  const resultsDiv = document.getElementById("quiz-results");
  try {
    const data = await fetchQuestions(n);
    QUESTIONS = data.questions;
    USER_ANSWERS = new Array(QUESTIONS.length).fill(null);
    REVEALED = new Array(QUESTIONS.length).fill(false);
    wireControls();
    renderCurrentQuestion();
  } catch (err) {
    resultsDiv.style.display = "block";
    resultsDiv.className = "fail";
    resultsDiv.textContent = `Error: ${err.message}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadQuiz(10);
});
