// Saves options to browser.storage.sync.

function saveOptions(e) {
  e.preventDefault();
  const apiKey = document.querySelector("#api-key").value;
  const autoRun = document.querySelector("#auto-run").checked;

  const storage =
    typeof browser !== "undefined" ? browser.storage.sync : chrome.storage.sync;

  storage
    .set({
      apiKey: apiKey,
      autoRun: autoRun,
    })
    .then(() => {
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      status.style.color = "green";
      setTimeout(() => {
        status.textContent = "";
      }, 1500);
    });
}

function restoreOptions() {
  const storage =
    typeof browser !== "undefined" ? browser.storage.sync : chrome.storage.sync;

  function onError(error) {
    console.log(`Error restoring options: ${error}`);
  }

  storage.get(["apiKey", "autoRun"]).then(setCurrentChoice, onError);
}

async function fetchApi() {
  const status = document.getElementById("status");
  status.textContent = "Testing API connection...";
  status.style.color = "orange";
  try {
    const res = await fetch("http://localhost:5051/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Send some sample review data for the model to predict
      body: JSON.stringify({
        reviews: [
          "This product is amazing! I love it so much, best purchase of the year.",
          "Worst purchase ever. Broke after one use. Totally fake and a waste of money.",
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Response from server:", data);
    status.textContent =
      "API connection successful! Check the console for the response.";
    status.style.color = "green";
  } catch (err) {
    console.error("Error fetching API:", err);
    status.textContent = `Error connecting to API. Is the server running? Details: ${err.message}`;
    status.style.color = "red";
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("test-api").addEventListener("click", fetchApi);
