/**
 * Listens for messages from the content script.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is for prediction
  if (request.action === "predict") {
    const reviewObj = request.data; // { text: ..., rating: ... }

    // Call the local API to get the authenticity score
    console.log("FETCHING FROM API");
    fetch("http://localhost:5051/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviews: [reviewObj],
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        // Send the score back to the content script
        sendResponse({ score: data.scores[0] });
      })
      .catch((error) => {
        // Send an error message back if the API call fails
        console.error("API Error:", error);
        sendResponse({ error: error.message });
      });

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});
