function saveOptions(e) {
  e.preventDefault();
  const apiKey = document.querySelector("#api-key").value;
  const autoRun = document.querySelector("#auto-run").checked;

  browser.storage.sync
    .set({
      apiKey: apiKey,
      autoRun: autoRun,
    })
    .then(() => {
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(() => {
        status.textContent = "";
      }, 1500);
    });
}

function restoreOptions() {
  function setCurrentChoice(result) {
    document.querySelector("#api-key").value = result.apiKey || "";
    document.querySelector("#auto-run").checked = result.autoRun || false;
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  let getting = browser.storage.sync.get(["apiKey", "autoRun"]);
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
