const recordBtn = document.querySelector(".record"),
  result = document.querySelector(".result"),
  downloadBtn = document.querySelector(".download"),
  inputLanguage = document.querySelector("#language"),
  clearBtn = document.querySelector(".clear");

let SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition,
  recognition,
  recording = false;

// Add this variable to track if we're manually stopping
let isStoppingManually = false;

function populateLanguages() {
  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.innerHTML = lang.name;
    inputLanguage.appendChild(option);
  });
}

populateLanguages();

function speechToText() {
  try {
    recognition = new SpeechRecognition();
    recognition.lang = inputLanguage.value;
    recognition.interimResults = true;
    // Add these configurations
    recognition.continuous = true; // Keep recording even after silence
    recognition.maxAlternatives = 1;

    recordBtn.classList.add("recording");
    recordBtn.querySelector("p").innerHTML = "Listening...";
    recognition.start();
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      //detect when intrim results
      if (event.results[0].isFinal) {
        result.innerHTML += " " + speechResult;
        result.querySelector("p").remove();
      } else {
        //creative p with class interim if not already there
        if (!document.querySelector(".interim")) {
          const interim = document.createElement("p");
          interim.classList.add("interim");
          result.appendChild(interim);
        }
        //update the interim p with the speech result
        document.querySelector(".interim").innerHTML = " " + speechResult;
      }
      downloadBtn.disabled = false;
    };
    recognition.onspeechend = () => {
      // Only restart if we're not manually stopping
      if (!isStoppingManually) {
        recognition.stop();
        recognition.start();
      }
    };
    recognition.onerror = (event) => {
      console.log("Error occurred:", event.error); // Add this for debugging

      // Only handle error if we're not manually stopping
      if (!isStoppingManually) {
        if (event.error === "no-speech") {
          // Instead of stopping, try to restart
          recognition.stop();
          recognition.start();
          return;
        } else if (event.error === "audio-capture") {
          alert(
            "No microphone was found. Ensure that a microphone is installed."
          );
        } else if (event.error === "not-allowed") {
          alert(
            "Permission to use microphone is blocked. Please enable it in your browser settings."
          );
        } else if (event.error === "aborted" && !isStoppingManually) {
          // Only show alert if we didn't manually stop
          alert("Listening Stopped.");
        } else {
          alert("Error occurred in recognition: " + event.error);
        }
        stopRecording();
      }
    };
  } catch (error) {
    recording = false;
    console.error(error);
  }
}

recordBtn.addEventListener("click", () => {
  if (!recording) {
    speechToText();
    recording = true;
  } else {
    stopRecording();
  }
});

function stopRecording() {
  isStoppingManually = true;
  recognition.stop();
  recordBtn.querySelector("p").innerHTML = "Start Listening";
  recordBtn.classList.remove("recording");
  recording = false;
  // Reset the flag after a short delay
  setTimeout(() => {
    isStoppingManually = false;
  }, 1000);
}

function download() {
  const text = result.innerText;
  const filename = "speech.txt";

  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

downloadBtn.addEventListener("click", download);

clearBtn.addEventListener("click", () => {
  result.innerHTML = "";
  downloadBtn.disabled = true;
});
