document.getElementById("analyzeBtn").addEventListener("click", () => {
  // We will send a message to the content script to start analysis
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { command: "analyze" });
  });
});
