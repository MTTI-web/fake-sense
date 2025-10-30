// quiz/script.js

// Try same-origin first; fall back to localhost:5051 (adjust if needed)
// Simple and reliable for local dev:
const API_BASE = "http://localhost:5051";

/**
 * Utility to create a question group DOM node.
 * q = { qid, prompt, choices: [..], answer_index }
 */
function createQuestionGroup(idx, q) {
  const group = document.createElement("div");
  group.className = "question-group";
  group.dataset.qid = q.qid;
  group.dataset.answerIndex = String(q.answer_index);

  const qLabel = document.createElement("label");
  qLabel.textContent = `${idx}. ${q.prompt}`;
  group.appendChild(qLabel);

  q.choices.forEach((choice, cIdx) => {
    const option = document.createElement("div");
    option.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = q.qid;
    input.id = `${q.qid}_${cIdx}`;
    input.value = String(cIdx);

    const lab = document.createElement("label");
    lab.className = "option-label";
    lab.setAttribute("for", input.id);
    lab.textContent = choice;

    option.appendChild(input);
    option.appendChild(lab);
    group.appendChild(option);
  });

  // Placeholder for per-question feedback revealed after submit
  const solution = document.createElement("div");
  solution.className = "solution";
  solution.style.marginTop = "8px";
  solution.style.fontSize = "0.95em";
  solution.style.display = "none";
  group.appendChild(solution);

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

function ensureSubmitButton(form) {
  let submitBtn = form.querySelector("button[type='submit']");
  if (!submitBtn) {
    submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "See My Score";
    form.appendChild(submitBtn);
  }
}

function gradeQuiz(form, questions) {
  let score = 0;

  questions.forEach((q) => {
    const group = form.querySelector(`.question-group[data-qid="${q.qid}"]`);
    const correctIdx = parseInt(group.dataset.answerIndex, 10);

    const checked = form.querySelector(`input[name="${q.qid}"]:checked`);
    const userIdx = checked ? parseInt(checked.value, 10) : null;

    // Reveal per-question solution
    const solutionEl = group.querySelector(".solution");
    const correctText = q.choices[correctIdx];
    if (userIdx === null) {
      solutionEl.textContent = `Answer: ${correctText} (you did not answer)`;
      solutionEl.style.color = "#d9534f";
      solutionEl.style.display = "block";
      return;
    }

    if (userIdx === correctIdx) {
      score += 1;
      solutionEl.textContent = `Correct ✓`;
      solutionEl.style.color = "#1d7a46";
      solutionEl.style.display = "block";
    } else {
      solutionEl.textContent = `Incorrect ✗ — Correct: ${correctText}`;
      solutionEl.style.color = "#d9534f";
      solutionEl.style.display = "block";
    }
  });

  return score;
}

async function loadQuiz(n = 10) {
  const form = document.getElementById("quiz-form");
  const resultsDiv = document.getElementById("quiz-results");

  // Reset UI
  resultsDiv.style.display = "none";
  resultsDiv.classList.remove("success", "fail");
  resultsDiv.textContent = "";
  form.innerHTML = ""; // clear all static content

  // Fetch and render
  const questions = await fetchQuestions(n);

  questions.forEach((q, i) => {
    const group = createQuestionGroup(i + 1, q);
    form.appendChild(group);
  });

  ensureSubmitButton(form);

  // Bind submit handler
  form.addEventListener("submit", function onSubmit(e) {
    e.preventDefault();

    // Disable multiple result appends by removing the listener after first run
    form.removeEventListener("submit", onSubmit);

    const score = gradeQuiz(form, questions);
    const pct = Math.round((score / questions.length) * 100);

    resultsDiv.style.display = "block";
    resultsDiv.textContent = `You scored ${score} out of ${questions.length} (${pct}%)`;
    if (pct >= 70) {
      resultsDiv.classList.add("success");
    } else {
      resultsDiv.classList.add("fail");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadQuiz(10).catch((err) => {
    const resultsDiv = document.getElementById("quiz-results");
    resultsDiv.style.display = "block";
    resultsDiv.classList.add("fail");
    resultsDiv.textContent = `Error: ${err.message}`;
  });
});
