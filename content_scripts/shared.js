// content_scripts/shared.js

// ---------- Modal (details view) ----------
export function ensureModal() {
  let modal = document.getElementById("frd-modal");
  if (modal) {
    const modalContent = document.getElementById("frd-modal-content");
    return { modal, modalContent };
  }
  modal = document.createElement("div");
  modal.id = "frd-modal";
  modal.className = "frd-modal-hidden";

  const modalContent = document.createElement("div");
  modalContent.id = "frd-modal-content";
  modal.appendChild(modalContent);

  const closeButton = document.createElement("span");
  closeButton.id = "frd-close-button";
  closeButton.innerHTML = "&times;";
  closeButton.onclick = () => (modal.className = "frd-modal-hidden");
  modal.appendChild(closeButton);

  document.body.appendChild(modal);
  return { modal, modalContent };
}

export function showLoading(modalContent, message = "Analyzing review...") {
  modalContent.innerHTML = `<div class="frd-loader"></div><p>${message}</p>`;
}

export function displayResult(modalContent, response) {
  if (response?.error) {
    modalContent.innerHTML = `<p class="frd-error"><strong>Analysis Failed</strong></p><p>${response.error}</p><p>Is the local server running?</p>`;
    return;
  }
  const score = Number(response?.score ?? 0);
  const { label, color } = scoreToVisual(score);
  const percentage = (score * 100).toFixed(2);

  modalContent.innerHTML = `
    <h2>Review Analysis</h2>
    <div class="frd-score-circle" style="border-color: ${color}; color: ${color};">
      ${percentage}%
      <span>Likely Fake</span>
    </div>
    <p>This review is rated as <strong>${label}</strong>.</p>
  `;
}

// ---------- Background prediction ----------
export function predictAuthenticity({ text, rating }) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "predict", data: { text, rating } },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// ---------- Inline badge UI ----------
function scoreToVisual(score) {
  if (score > 0.8)
    return { label: "Likely Fake", color: "#dc3545", cls: "frd-badge--red" };
  if (score > 0.5)
    return { label: "Suspicious", color: "#ffc107", cls: "frd-badge--yellow" };
  return { label: "Genuine", color: "#28a745", cls: "frd-badge--green" };
}

function getOrCreateInlineSlot(reviewEl, injectionPoint) {
  let slot = reviewEl.querySelector(".frd-inline-slot");
  if (slot) return slot;
  slot = document.createElement("span");
  slot.className = "frd-inline-slot";
  try {
    (injectionPoint || reviewEl).prepend(slot);
  } catch {
    (injectionPoint || reviewEl).appendChild(slot);
  }
  return slot;
}

function renderBadgeLoading(slot) {
  slot.innerHTML = `
    <span class="frd-badge frd-badge--loading" title="Analyzing review">
      <span class="frd-mini-spinner" aria-hidden="true"></span>
      <span class="frd-badge-text">Analyzing</span>
    </span>
  `;
}

function renderBadgeResult(slot, score, onDetails) {
  const { label, cls } = scoreToVisual(score);
  const pct = (Number(score) * 100).toFixed(0);
  slot.innerHTML = `
    <button class="frd-badge ${cls}" title="Fake score: ${pct}% — ${label}" type="button" aria-label="Fake score ${pct} percent, ${label}">
      <span class="frd-dot"></span>
      <span class="frd-badge-text">${pct}% · ${label}</span>
      <span class="frd-badge-more" aria-hidden="true">Details</span>
    </button>
  `;
  const btn = slot.querySelector(".frd-badge");
  if (btn && onDetails) {
    btn.addEventListener("click", onDetails, { once: false });
  }
}

function renderBadgeError(slot, message) {
  slot.innerHTML = `
    <span class="frd-badge frd-badge--error" title="${message}">
      <span class="frd-dot"></span>
      <span class="frd-badge-text">Error</span>
    </span>
  `;
}

// ---------- Manual button (fallback/optional) ----------
export function injectButton(reviewElement, extractors) {
  if (!reviewElement || reviewElement.querySelector(".frd-button")) return;

  const button = document.createElement("button");
  button.innerText = "Check Authenticity";
  button.className = "frd-button";

  button.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const { modal, modalContent } = ensureModal();
    showLoading(modalContent);
    modal.className = "frd-modal-visible";

    try {
      const reviewText = (
        extractors.getReviewText?.(reviewElement) || ""
      ).trim();
      if (!reviewText) {
        modalContent.innerHTML = `<p class="frd-error">Could not find review text in this element.</p>`;
        return;
      }
      const rating = Number(extractors.getReviewRating?.(reviewElement) ?? 5);
      const response = await predictAuthenticity({ text: reviewText, rating });
      displayResult(modalContent, response);
    } catch (err) {
      modalContent.innerHTML = `<p class="frd-error">Error: ${
        err?.message || "Unknown error"
      }</p>`;
    }
  });

  const target =
    (extractors.getInjectionPoint &&
      extractors.getInjectionPoint(reviewElement)) ||
    reviewElement;
  try {
    target.prepend(button);
  } catch {
    reviewElement.appendChild(button);
  }
}

// ---------- Auto-scoring with IntersectionObserver ----------
export function enableAutoScoring({
  findReviewElements,
  extractors,
  observeRoots = [document.body],
  rootMargin = "200px 0px",
  threshold = 0.1,
  maxConcurrent = 4,
}) {
  const state = new WeakMap(); // { status, slot, response }
  const queue = [];
  let active = 0;

  function pump() {
    while (active < maxConcurrent && queue.length) {
      const el = queue.shift();
      const s = state.get(el);
      if (!s || s.status === "done") continue;
      s.status = "processing";
      active++;

      const text = (extractors.getReviewText?.(el) || "").trim();
      const rating = Number(extractors.getReviewRating?.(el) ?? 5);

      predictAuthenticity({ text, rating })
        .then((response) => {
          s.response = response;
          s.status = "done";
          if (response?.error) {
            renderBadgeError(s.slot, response.error || "Prediction error");
          } else {
            renderBadgeResult(s.slot, Number(response.score), () => {
              const { modal, modalContent } = ensureModal();
              displayResult(modalContent, response);
              modal.className = "frd-modal-visible";
            });
          }
        })
        .catch((err) => {
          s.status = "done";
          renderBadgeError(s.slot, err?.message || "Prediction failed");
        })
        .finally(() => {
          active--;
          pump();
        });
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        const s = state.get(el) || {};
        if (
          s.status === "done" ||
          s.status === "processing" ||
          s.status === "queued"
        )
          continue;

        const injectionPoint = extractors.getInjectionPoint?.(el) || el;
        s.slot = s.slot || getOrCreateInlineSlot(el, injectionPoint);
        renderBadgeLoading(s.slot);
        s.status = "queued";
        state.set(el, s);
        queue.push(el);
        pump();

        // Once queued, we can stop observing this node; if it gets replaced, MutationObserver will re-add
        io.unobserve(el);
      }
    },
    { root: null, rootMargin, threshold }
  );

  function addAllCurrent() {
    const list = Array.from(findReviewElements() || []);
    list.forEach((el) => {
      if (!state.get(el)) {
        state.set(el, { status: "idle" });
        io.observe(el);
      }
    });
  }

  // Initial pass
  addAllCurrent();

  // Watch for list changes
  observeRoots.filter(Boolean).forEach((root) => {
    const mo = new MutationObserver(() => addAllCurrent());
    mo.observe(root, { childList: true, subtree: true });
  });

  return { refresh: addAllCurrent };
}

// ---------- Generic mutation observer helper ----------
export function observeWithThrottle(
  targetNode,
  process,
  options = { childList: true, subtree: true },
  delay = 250
) {
  let timer = null;
  const obs = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      process();
    }, delay);
  });
  obs.observe(targetNode || document.body, options);
  return obs;
}
