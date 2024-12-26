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

// Add these variables at the top with other declarations
let restartCount = 0;
const maxRestarts = 5;

// Add these at the top with your other constants
const uploadBtn = document.querySelector(".upload");
const transcribeBtn = document.querySelector(".transcribe");
const audioFileInput = document.getElementById("audioFileInput");

let audioFile = null;

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
      console.log("Got result:", event.results); // Debug log
      restartCount = 0;

      // Loop through all the results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          console.log("Final result:", transcript); // Debug log
          result.innerHTML += " " + transcript;
          // Remove any interim element
          const interimElement = document.querySelector(".interim");
          if (interimElement) {
            interimElement.remove();
          }
        } else {
          console.log("Interim result:", transcript); // Debug log
          let interimElement = document.querySelector(".interim");
          if (!interimElement) {
            interimElement = document.createElement("p");
            interimElement.classList.add("interim");
            result.appendChild(interimElement);
          }
          interimElement.innerHTML = transcript;
        }
      }
      downloadBtn.disabled = false;
    };
    recognition.onend = () => {
      console.log("Recognition ended");
      // Auto restart if not manually stopped and within restart limit
      if (!isStoppingManually && recording && restartCount < maxRestarts) {
        restartCount++;
        console.log(`Attempting restart #${restartCount}`);
        try {
          setTimeout(() => {
            if (recording && !isStoppingManually) {
              recognition.start();
            }
          }, 100);
        } catch (error) {
          console.error("Failed to restart recognition:", error);
        }
      } else if (restartCount >= maxRestarts) {
        alert("Recording session timed out. Please start again.");
        stopRecording();
      }
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

// Add these new functions
uploadBtn.addEventListener("click", () => {
  audioFileInput.click();
});

audioFileInput.addEventListener("change", (e) => {
  audioFile = e.target.files[0];
  if (audioFile) {
    transcribeBtn.disabled = false;
    uploadBtn.querySelector("p").innerHTML = audioFile.name;
  }
});

transcribeBtn.addEventListener("click", async () => {
  if (!audioFile) return;

  try {
    transcribeBtn.disabled = true;
    transcribeBtn.querySelector("p").innerHTML = "Transcribing...";

    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Read the file
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create audio source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create media stream destination
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    source.connect(mediaStreamDestination);
    
    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = inputLanguage.value;

    // Set up recognition handlers
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          result.innerHTML += " " + transcript;
        }
      }
      downloadBtn.disabled = false;
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      finishTranscription();
    };

    recognition.onend = () => {
      finishTranscription();
    };

    // Start playback and recognition
    recognition.start();
    source.start(0);
    
    // Stop recognition when audio ends
    source.onended = () => {
      recognition.stop();
    };

  } catch (error) {
    console.error('Transcription failed:', error);
    alert('Failed to transcribe audio file. Please try again.');
    finishTranscription();
  }
});

function finishTranscription() {
  transcribeBtn.disabled = false;
  transcribeBtn.querySelector("p").innerHTML = "Transcribe Audio";
}

// Add some CSS styles
const style = document.createElement('style');
style.textContent = `
  .upload-section {
    display: flex;
    gap: 10px;
    margin: 10px 0;
  }
  
  .upload-section .btn {
    flex: 1;
  }
`;
document.head.appendChild(style);
