// content_scripts/amazon/index.js
(async () => {
  const shared = await import(
    chrome.runtime.getURL("content_scripts/shared.js")
  );
  const { injectButton, observeWithThrottle } = shared;

  const extractors = {
    getReviewText(reviewEl) {
      const span = reviewEl.querySelector('[data-hook="review-body"] span');
      return span ? span.innerText : "";
    },
    getReviewRating(reviewEl) {
      const ratingSpan = reviewEl.querySelector(
        '[data-hook="review-star-rating"] span, i[data-hook="review-star-rating"] span'
      );
      if (!ratingSpan) return 5;
      const m = ratingSpan.innerText.match(/^([\d.]+)\s+out of 5/i);
      return m ? parseFloat(m[1]) : 5;
    },
    getInjectionPoint(reviewEl) {
      return reviewEl.querySelector(".review-comments") || reviewEl;
    },
  };

  function processReviews() {
    const reviews = document.querySelectorAll('[data-hook="review"]');
    reviews.forEach((review) => injectButton(review, extractors));
  }

  processReviews();

  [
    document.getElementById("reviews-medley-footer"),
    document.getElementById("cm_cr-review_list"),
    document.body,
  ]
    .filter(Boolean)
    .forEach((node) => observeWithThrottle(node, processReviews));
})();
