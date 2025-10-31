// content_scripts/flipkart/index.js
// Works in Firefox/Chrome. Requires content_scripts/shared.js listed in web_accessible_resources.

(async () => {
  // Dynamically import the shared helpers from the extension package
  const shared = await import(
    chrome.runtime.getURL("content_scripts/shared.js")
  );
  const { injectButton, observeWithThrottle } = shared;

  // --- Utilities ---
  const getText = (el) => (el?.innerText || el?.textContent || "").trim();

  // Remove inline "READ MORE" UI and get the cleanest long text node inside ZmyHeo
  function extractBodyFromZmyHeo(reviewEl) {
    const host = reviewEl.querySelector(".ZmyHeo");
    if (!host) return "";

    // Clone to strip interactive parts without touching the live DOM
    const clone = host.cloneNode(true);
    // Remove "READ MORE" containers if present
    clone.querySelectorAll(".wTYmpv").forEach((n) => n.remove());

    // Prefer deeper blocks with substantial text
    const candidates = Array.from(clone.querySelectorAll("div, p, span"))
      .map((n) => getText(n))
      .filter((t) => t && t.length >= 20);

    candidates.sort((a, b) => b.length - a.length);
    return candidates[0] || getText(clone);
  }

  // --- Core selectors derived from current Flipkart markup ---
  // Each review appears to be wrapped by a `.RcXBOT` card
  function findReviewCards() {
    const cards = Array.from(document.querySelectorAll(".RcXBOT"));
    // Keep only elements that look like actual reviews (have rating header + body block)
    return cards.filter(
      (el) => el.querySelector(".XQDdHH") && el.querySelector(".ZmyHeo")
    );
  }

  function getReviewText(reviewEl) {
    // Primary: text inside the ZmyHeo content block
    const fromBlock = extractBodyFromZmyHeo(reviewEl);
    if (fromBlock) return fromBlock;

    // Fallback: longest textual paragraph anywhere in the card
    const blocks = Array.from(reviewEl.querySelectorAll("p, div, span"))
      .map((n) => getText(n))
      .filter((t) => t && t.length >= 20)
      .filter(
        (t) => !/Certified Buyer|Helpful|Report|Permalink|READ MORE/i.test(t)
      );
    blocks.sort((a, b) => b.length - a.length);
    return blocks[0] || "";
  }

  function getReviewRating(reviewEl) {
    // Current header renders a plain number (e.g., 4 or 5) followed by a star icon in .XQDdHH
    const header = reviewEl.querySelector(".XQDdHH");
    if (header) {
      const num = parseFloat((header.textContent || "").trim());
      if (!Number.isNaN(num) && num >= 1 && num <= 5) return num;
    }

    // Attribute/text fallbacks
    const aria = reviewEl.querySelector(
      "[aria-label*='out of 5'], [aria-label*='stars']"
    );
    if (aria) {
      const m = (aria.getAttribute("aria-label") || "").match(
        /([1-5](?:\.[0-9])?)\s*out of 5/i
      );
      if (m) return parseFloat(m[1]);
    }

    const text = getText(reviewEl);
    let m = text.match(/\b([1-5](?:\.[0-9])?)\s*★/);
    if (m) return parseFloat(m[1]);
    m = text.match(/\b([1-5](?:\.[0-9])?)\s*out of 5\b/i);
    if (m) return parseFloat(m[1]);

    return 5;
  }

  function getInjectionPoint(reviewEl) {
    // Action/footer row with "Permalink" / "Report Abuse" when present
    const actions = reviewEl.querySelector("._23BI2I");
    if (actions) return actions;

    // Else near the helpful votes row
    const votes = reviewEl.querySelector(".qhmk-f");
    if (votes) return votes;

    // Else the main column container for the card
    const mainCol = reviewEl.querySelector(".EPCmJX") || reviewEl;

    return mainCol;
  }

  const extractors = { getReviewText, getReviewRating, getInjectionPoint };

  function processReviews() {
    const reviews = findReviewCards();
    reviews.forEach((review) => injectButton(review, extractors));
  }

  // Initial pass
  processReviews();

  // Observe updates; Flipkart loads/filters reviews dynamically
  const probableContainers = [
    document.querySelector(".cPHDOP"), // top-level Ratings & Reviews area
    document.querySelector("div[id*='reviews']"),
    document.body,
  ].filter(Boolean);

  probableContainers.forEach((node) =>
    observeWithThrottle(node, processReviews)
  );
})();
