// content_scripts/flipkart/index.js
(async () => {
  const shared = await import(
    chrome.runtime.getURL("content_scripts/shared.js")
  );
  const { enableAutoScoring } = shared;

  const getText = (el) => (el?.innerText || el?.textContent || "").trim();

  function extractBodyFromZmyHeo(reviewEl) {
    const host = reviewEl.querySelector(".ZmyHeo");
    if (!host) return "";
    const clone = host.cloneNode(true);
    // Read-more buttons container commonly present
    clone.querySelectorAll(".wTYmpv").forEach((n) => n.remove());
    const candidates = Array.from(clone.querySelectorAll("div, p, span"))
      .map((n) => getText(n))
      .filter((t) => t && t.length >= 20);
    candidates.sort((a, b) => b.length - a.length);
    return candidates[0] || getText(clone);
  }

  function findReviewCards() {
    // Each review card currently uses RcXBOT
    const cards = Array.from(document.querySelectorAll(".RcXBOT"));
    return cards.filter(
      (el) => el.querySelector(".XQDdHH") && el.querySelector(".ZmyHeo")
    );
  }

  function getReviewText(reviewEl) {
    const primary = extractBodyFromZmyHeo(reviewEl);
    if (primary) return primary;
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
    const header = reviewEl.querySelector(".XQDdHH");
    if (header) {
      const num = parseFloat((header.textContent || "").trim());
      if (!Number.isNaN(num) && num >= 1 && num <= 5) return num;
    }
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
    // Actions/footer area if present
    const actions = reviewEl.querySelector("._23BI2I");
    if (actions) return actions;
    const votes = reviewEl.querySelector(".qhmk-f");
    if (votes) return votes;
    return reviewEl.querySelector(".EPCmJX") || reviewEl;
  }

  const extractors = { getReviewText, getReviewRating, getInjectionPoint };

  enableAutoScoring({
    findReviewElements: findReviewCards,
    extractors,
    observeRoots: [
      document.querySelector(".cPHDOP"), // Ratings & Reviews block
      document.querySelector("div[id*='reviews']"),
      document.body,
    ],
    rootMargin: "200px 0px",
    threshold: 0.1,
    maxConcurrent: 4,
  });
})();
