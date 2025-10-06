document.getElementById("quiz-form").addEventListener("submit", function (e) {
  e.preventDefault(); // Stop the form from submitting the traditional way

  const answers = {
    q1: "c",
    q2: "b",
  };

  let score = 0;
  const form = e.target;
  const resultsDiv = document.getElementById("quiz-results");

  // Get user's answers
  const userAnswerQ1 = form.elements["q1"].value;
  const userAnswerQ2 = form.elements["q2"].value;

  // Check answers
  if (userAnswerQ1 === answers.q1) {
    score++;
  }
  if (userAnswerQ2 === answers.q2) {
    score++;
  }

  // Display the results
  resultsDiv.innerHTML = `You scored ${score} out of ${
    Object.keys(answers).length
  }!`;
  resultsDiv.style.display = "block";
});
