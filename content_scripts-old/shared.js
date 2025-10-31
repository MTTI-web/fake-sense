// content_scripts/shared.js

// Ensure a single modal exists; create if missing
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
  const percentage = (score * 100).toFixed(2);
  let authenticityLevel = "Genuine";
  let color = "#28a745"; // Green
  if (score > 0.5) {
    authenticityLevel = "Suspicious";
    color = "#ffc107";
  }
  if (score > 0.8) {
    authenticityLevel = "Likely Fake";
    color = "#dc3545";
  }

  modalContent.innerHTML = `
    <h2>Review Analysis</h2>
    <div class="frd-score-circle" style="border-color: ${color}; color: ${color};">
      ${percentage}%
      <span>Likely Fake</span>
    </div>
    <p>This review is rated as <strong>${authenticityLevel}</strong>.</p>
  `;
}

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

// Creates and injects a single "Check Authenticity" button into a review element
// extractors: { getReviewText(reviewEl), getReviewRating(reviewEl), getInjectionPoint?(reviewEl) }
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
