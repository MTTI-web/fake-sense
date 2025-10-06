document.getElementById("analyzeBtn").addEventListener("click", () => {
  // We will send a message to the content script to start analysis
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { command: "analyze" });
  });
});

// --- Add this at the end of the file ---

/**
 * Opens the quiz.html page in a new browser tab.
 */
function openQuizPage() {
  // chrome.runtime.getURL() gets the full, correct path to the file
  const quizUrl = chrome.runtime.getURL("quiz.html");
  chrome.tabs.create({ url: quizUrl });
}

// Listen for clicks on the new button
document.addEventListener("DOMContentLoaded", () => {
  const quizButton = document.getElementById("open-quiz");
  if (quizButton) {
    quizButton.addEventListener("click", openQuizPage);
  }
});
