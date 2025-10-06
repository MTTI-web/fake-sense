/**
 * Creates the modal that will display the authenticity score.
 * It's created once and then shown/hidden as needed.
 */
function createModal() {
  const modal = document.createElement("div");
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
  return modal;
}

const modal = createModal();
const modalContent = document.getElementById("frd-modal-content");

/**
 * Injects a "Check Authenticity" button next to a review element.
 * @param {HTMLElement} reviewElement - The DOM element containing the review.
 */
function injectButton(reviewElement) {
  // Check if a button has already been injected to prevent duplicates
  if (reviewElement.querySelector(".frd-button")) {
    return;
  }

  const button = document.createElement("button");
  button.innerText = "Check Authenticity";
  button.className = "frd-button";

  button.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Find the review text within the review element
    const reviewBody = reviewElement.querySelector(
      '[data-hook="review-body"] span'
    );
    if (!reviewBody) {
      console.error("Could not find review body for this element.");
      return;
    }
    const reviewText = reviewBody.innerText;

    // Show loading state in modal
    modalContent.innerHTML = `<div class="frd-loader"></div><p>Analyzing review...</p>`;
    modal.className = "frd-modal-visible";

    // Send the review text to the background script for processing
    chrome.runtime.sendMessage(
      {
        action: "predict",
        data: reviewText,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // Handle errors, e.g., if the background script is not available
          console.error(
            "Error sending message:",
            chrome.runtime.lastError.message
          );
          modalContent.innerHTML = `<p class="frd-error">Error: Could not connect to the extension's background script. Please try reloading the page.</p>`;
          return;
        }

        // Display the result from the background script
        displayResult(response);
      }
    );
  });

  // Append the button to the review element's footer/actions area
  const footer = reviewElement.querySelector(".review-comments");
  if (footer) {
    footer.prepend(button);
  }
}

/**
 * Displays the prediction result in the modal.
 * @param {object} response - The response object from the background script.
 */
function displayResult(response) {
  if (response.error) {
    modalContent.innerHTML = `<p class="frd-error"><strong>Analysis Failed</strong></p><p>${response.error}</p><p>Is the local server running?</p>`;
  } else {
    const score = response.score;
    const percentage = (score * 100).toFixed(2);
    let authenticityLevel = "Genuine";
    let color = "#28a745"; // Green

    if (score > 0.5) {
      authenticityLevel = "Suspicious";
      color = "#ffc107"; // Yellow
    }
    if (score > 0.8) {
      authenticityLevel = "Likely Fake";
      color = "#dc3545"; // Red
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
}

/**
 * Finds all review elements on the page and injects the button.
 */
function processReviews() {
  const reviews = document.querySelectorAll('[data-hook="review"]');
  reviews.forEach((review) => injectButton(review));
}

// --- Main Execution ---

// Initial run to catch reviews already on the page
processReviews();

// Use a MutationObserver to detect when new reviews are loaded (e.g., by scrolling)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      processReviews();
    }
  });
});

// Start observing the part of the page where reviews are loaded.
const reviewContainer = document.getElementById("reviews-medley-footer");
if (reviewContainer) {
  observer.observe(reviewContainer, {
    childList: true,
    subtree: true,
  });
}

// Also observe the main reviews section
const mainReviews = document.getElementById("cm_cr-review_list");
if (mainReviews) {
  observer.observe(mainReviews, {
    childList: true,
    subtree: true,
  });
}
