// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Buttons
const dialog = document.getElementById("quiz");
const openers = [
  document.getElementById("open-quiz"),
  document.getElementById("cta-quiz"),
].filter(Boolean);
const closeBtn = document.getElementById("close-quiz");
openers.forEach((btn) =>
  btn?.addEventListener("click", () => dialog.showModal())
);
closeBtn?.addEventListener("click", () => dialog.close());

// Install CTAs (placeholder handlers)
document.getElementById("install")?.addEventListener("click", () => {
  alert("Link this to your Chrome Web Store listing when ready.");
});
document.getElementById("install-chrome")?.addEventListener("click", () => {
  alert("Open Chrome Web Store listing here.");
});
document.getElementById("install-firefox")?.addEventListener("click", () => {
  alert("Open Firefox Add-ons listing here.");
});

// Simple training set (replace with your real training data feed)
const DATASET = [
  {
    text: "Absolutely amazing product! Changed my life!!! I will buy 10 more tomorrow, cannot recommend enough!!!",
    label: "fake",
    source: "Generic",
    why: "Excessive punctuation and vague praise without specifics often indicate low-credibility reviews.",
  },
  {
    text: "Received on 12th, tested mic on Zoom and WhatsApp; noise floor around -60dB. Battery lasted 3h 12m at 50% volume.",
    label: "real",
    source: "Electronics",
    why: "Specific, testable details and measurements are consistent with authentic user experience.",
  },
  {
    text: "Best ever. So good. Very nice quality. Good good good.",
    label: "fake",
    source: "Multiple",
    why: "Repetition, minimal detail, and unnatural phrasing are common in synthetic or incentivized reviews.",
  },
  {
    text: 'Color matches the listing photo. Stitching on inner pocket had a loose thread, fixed it in 2 mins. Fits a 13" laptop snugly.',
    label: "real",
    source: "Bags & Apparel",
    why: "Balanced pros/cons and concrete fit details improve credibility.",
  },
  {
    text: "Seller refunded immediately after I posted a review. Updating to 5 stars for support.",
    label: "fake",
    source: "Marketplace",
    why: "Star manipulation tied to incentives or refunds is a common red flag.",
  },
  {
    text: "Flipkart delivery took 2 days to Pune. Packaging intact. Ran benchmarks; thermals peaked at 78°C under load.",
    label: "real",
    source: "Computing",
    why: "Verifiable logistics and benchmark context suggests genuine usage.",
  },
  {
    text: "Works as advertised. Using with Samsung M34 on Amazon; HDR toggles off if cable is loose—tightening fixed it.",
    label: "real",
    source: "Accessories",
    why: "Platform-specific behavior and troubleshooting indicate first-hand use.",
  },
  {
    text: "Amazing amazing amazing! Five stars because it's awesome and the best in the world!",
    label: "fake",
    source: "Generic",
    why: "Overly enthusiastic, generic language without product specifics is suspect.",
  },
];

// Quiz logic
let order = [];
let idx = 0;
let score = 0;
let answered = false;

const $score = document.getElementById("score");
const $text = document.getElementById("review-text");
const $source = document.getElementById("source");
const $explain = document.getElementById("explain");
const $next = document.getElementById("next");
const $skip = document.getElementById("skip");

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newRound() {
  // pick 5 samples
  order = shuffle([...DATASET]).slice(0, 5);
  idx = 0;
  score = 0;
  answered = false;
  render();
}

function render() {
  const cur = order[idx];
  $text.textContent = cur.text;
  $source.textContent = "Source: " + cur.source;
  $explain.style.display = "none";
  $explain.textContent = "";
  $next.disabled = true;
  $score.textContent = `Q${idx + 1} of ${order.length} · Score ${score}`;
}

function answer(choice) {
  if (answered) return;
  answered = true;
  const cur = order[idx];
  const correct = choice === cur.label;
  if (correct) score++;
  $explain.style.display = "block";
  $explain.textContent = (correct ? "Correct — " : "Not quite — ") + cur.why;
  $next.disabled = false;
  $score.textContent = `Q${idx + 1} of ${order.length} · Score ${score}`;
}

document
  .getElementById("btn-fake")
  ?.addEventListener("click", () => answer("fake"));
document
  .getElementById("btn-real")
  ?.addEventListener("click", () => answer("real"));

$next?.addEventListener("click", () => {
  if (idx < order.length - 1) {
    idx++;
    answered = false;
    render();
  } else {
    alert(`Quiz done! Final score: ${score}/${order.length}`);
    newRound();
  }
});

$skip?.addEventListener("click", () => {
  if (idx < order.length - 1) {
    idx++;
    answered = false;
    render();
  } else {
    newRound();
  }
});

dialog?.addEventListener("close", () => newRound());
dialog?.addEventListener("cancel", (e) => {
  e.preventDefault();
  dialog.close();
});

// Initialize on load
newRound();
