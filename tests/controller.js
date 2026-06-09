let targetWindow = null;
const WAIT_TIME = 200; // time to wait for window loads

function updateStatus(msg) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.innerText = msg;
  }
  console.log(msg);
}

// Connect to the game window
document.getElementById("btn-connect").onclick = () => {
  if (window.opener) {
    targetWindow = window.opener;
    updateStatus("Connected to parent window!");
    injectScripts();
  } else {
    // Try to open it if we are not opened by it
    const urlInput = document.getElementById("url-input").value;
    targetWindow = window.open(urlInput, "game_window");
    updateStatus("Opened game window! Waiting for load...");
    
    // Inject scripts after short delay to let it load
    setTimeout(injectScripts, 1500);
  }
};

function injectScripts() {
  if (!targetWindow) {
    updateStatus("No target window connected.");
    return;
  }

  try {
    // Intercept onload/onunload in the target window to re-inject scripts
    targetWindow.onbeforeunload = function() {
      updateStatus("Target window reloading... Re-injecting shortly.");
      // Let change complete window.
      window.onload = function continueWindow() {
        console.log("Checking target window.onload status logic");
        if (
          targetWindow.document.title.toLowerCase() !== "post.aspx" &&
          targetWindow.document.title.toLowerCase() !== "mainpage.aspx"
        ) {
          setTimeout(continueWindow, WAIT_TIME);
        } else {
          injectScripts();
        }
      };
    };

    const script = targetWindow.document.createElement("script");
    script.type = "text/javascript";
    script.innerText = `
      (function() {
        // Detect current input elements
        window.isAutoPlayActive = false;
        
        window.getAnswerInput = function() {
            var allInputs = document.getElementsByTagName('input');
            for (var i = 0; i < allInputs.length; i++) {
                if (allInputs[i].id && allInputs[i].id.indexOf('Answer') !== -1) {
                    return allInputs[i];
                }
            }
            return null;
        }

        window.submitBtn = function() {
            var submitButtons = document.getElementsByName('Submit');
            if (submitButtons && submitButtons.length > 0) {
                return submitButtons[0];
            }
            return null;
        }

        window.startAutoplay = function() {
            if (window.isAutoPlayActive) return;
            window.isAutoPlayActive = true;
            console.log("Auto-play started!");
            runCheckLoop();
        }

        window.stopAutoplay = function() {
            window.isAutoPlayActive = false;
            console.log("Auto-play stopped!");
        }

        function runCheckLoop() {
            if (!window.isAutoPlayActive) return;
            
            var answerInput = window.getAnswerInput();
            var subBtn = window.submitBtn();
            
            if (answerInput && subBtn && answerInput.value.trim() !== '') {
                console.log("Answer input found and populated! Value: " + answerInput.value + ". Submitting...");
                // Clear active state before submitting so it doesn't get stuck across page loads
                window.isAutoPlayActive = false; 
                subBtn.click();
                return; // Let page reload
            }
            
            setTimeout(runCheckLoop, 100);
        }
        
        // Auto-run if the parent stored that autoplay is active
        var autoPlayValue = localStorage.getItem('autoplay_active');
        if (autoPlayValue === 'true') {
            window.startAutoplay();
        }
      })();
    `;
    targetWindow.document.head.appendChild(script);

    // Build the visual dashboard control panel in our controller UI (index.html)
    updateStatus("Connected to target window! Direct connection active.");
    
    // Set up button event handlers in our index.html page
    document.getElementById("btn-fetch-question").onclick = () => {
      fetchQuestionText(targetWindow);
    };
    
    document.getElementById("btn-submit-answer").onclick = () => {
      submitAnswerText(targetWindow);
    };

    document.getElementById("btn-autoplay").onclick = () => {
      const btn = document.getElementById("btn-autoplay");
      if (btn.innerText === "Start Auto-Submit") {
        btn.innerText = "Stop Auto-Submit";
        btn.className = "btn danger";
        targetWindow.localStorage.setItem('autoplay_active', 'true');
        if (targetWindow.startAutoplay) {
          targetWindow.startAutoplay();
        }
      } else {
        btn.innerText = "Start Auto-Submit";
        btn.className = "btn success";
        targetWindow.localStorage.setItem('autoplay_active', 'false');
        if (targetWindow.stopAutoplay) {
          targetWindow.stopAutoplay();
        }
      }
    };
  } catch (err) {
    console.error("Injection failed:", err);
    updateStatus("Error injecting control scripts: " + err.message);
  }
}

// Function to fetch the question text from the target window
function fetchQuestionText(targetWindow) {
  try {
    const cells = targetWindow.document.getElementsByTagName('td');
    let question = "";
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.getAttribute('align') === 'center' && cell.style.fontSize === 'xx-large') {
        question = cell.innerText.trim();
        break;
      }
    }
    
    if (!question) {
      const bodyText = targetWindow.document.body.innerText;
      const match = bodyText.match(/\\d+\\s*[\\+\\-\\*\\/]\\s*\\d+\\s*=\\s*\\?/);
      if (match) {
        question = match[0];
      } else {
        question = "Question not found. Make sure the game is started!";
      }
    }
    
    document.getElementById("question-display").innerText = question;
    updateStatus("Fetched question: " + question);
    solveQuestion(question);
  } catch (err) {
    updateStatus("Error fetching question: " + err.message);
  }
}

// Simple arithmetic solver
function solveQuestion(question) {
  try {
    const cleanExpr = question.replace('=\\s*\\?', '').replace('=', '').trim();
    if (/^[0-9\\s\\+\\-\\*\\/\\(\\)]+$/.test(cleanExpr)) {
      const result = eval(cleanExpr);
      document.getElementById("answer-input").value = result;
      updateStatus("Solved mathematically: " + cleanExpr + " = " + result);
    } else {
      updateStatus("Unsupported question format for auto-solver.");
    }
  } catch (err) {
    updateStatus("Error solving question: " + err.message);
  }
}

// Submit answer to the target window
function submitAnswerText(targetWindow) {
  try {
    const val = document.getElementById("answer-input").value;
    const answerInput = targetWindow.getAnswerInput ? targetWindow.getAnswerInput() : null;
    
    if (answerInput) {
      answerInput.value = val;
      updateStatus("Populated answer: " + val);
      
      const subBtn = targetWindow.submitBtn ? targetWindow.submitBtn() : null;
      if (subBtn) {
        subBtn.click();
        updateStatus("Submitted answer: " + val);
      } else {
        updateStatus("Submit button not found in target window.");
      }
    } else {
      const allInputs = targetWindow.document.getElementsByTagName('input');
      let foundInput = null;
      for (let i = 0; i < allInputs.length; i++) {
        if (allInputs[i].id && allInputs[i].id.indexOf('Answer') !== -1) {
          foundInput = allInputs[i];
          break;
        }
      }
      if (foundInput) {
        foundInput.value = val;
        const submitButtons = targetWindow.document.getElementsByName('Submit');
        if (submitButtons && submitButtons.length > 0) {
          submitButtons[0].click();
          updateStatus("Submitted answer via fallback: " + val);
        } else {
          updateStatus("Submit button fallback not found.");
        }
      } else {
        updateStatus("Answer input field not found.");
      }
    }
  } catch (err) {
    updateStatus("Error submitting answer: " + err.message);
  }
}
