// Create a popup element to inject into the page
const popup = document.createElement("div");
popup.id = "popup";
popup.innerHTML = `
    <div id="review-detective-header">
        Review Detective
        <button id="review-detective-close">X</button>
    </div>
    <div id="review-detective-content">
        <p>Click "Analyze Reviews" in the toolbar to start.</p>
    </div>
`;
document.body.appendChild(popup);

// Handle showing/hiding the popup
const closeButton = document.getElementById("review-detective-close");
closeButton.addEventListener("click", () => {
  popup.style.display = "none";
});

// Listen for messages from the popup script
browser.runtime.onMessage.addListener((request) => {
  if (request.command === "analyze") {
    popup.style.display = "block"; // Show the popup
    const content = document.getElementById("review-detective-content");
    content.innerHTML =
      "<p>Analyzing... This is where your analysis results would go!</p>";
    // This is where you would add your logic to scrape reviews and send them to a backend for analysis.
    console.log("Analysis started on this page.");
  }
});

