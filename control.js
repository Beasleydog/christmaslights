let isRunning = false;

const elements = {
  colorPreset: document.getElementById("colorPreset"),
  position: document.getElementById("position"),
  numLights: document.getElementById("numLights"),
  speed: document.getElementById("speed"),
  toggleButton: document.getElementById("toggleButton"),
  status: document.getElementById("status"),
};

function updateButtonState(running) {
  isRunning = running;
  elements.toggleButton.textContent = isRunning
    ? "Stop Lights"
    : "Start Lights";
  elements.toggleButton.className = isRunning ? "stop" : "";
  elements.status.textContent = `Status: ${isRunning ? "Running" : "Stopped"}`;
}

function getSettings() {
  const settings = {
    colorPreset: elements.colorPreset.value,
    position: elements.position.value,
    numLights: parseInt(elements.numLights.value),
    speed: parseFloat(elements.speed.value),
  };
  return settings;
}

async function toggleLights() {
  if (!isRunning) {
    await window.electronAPI.startLights(getSettings());
  } else {
    await window.electronAPI.stopLights();
  }
  updateButtonState(!isRunning);
}

// Initialize
async function init() {
  const running = await window.electronAPI.getLightsStatus();
  updateButtonState(running);
}

// Event listeners
elements.toggleButton.addEventListener("click", toggleLights);

// Add event listeners for settings changes
Object.entries(elements).forEach(([key, element]) => {
  if (key !== "toggleButton" && key !== "status") {
    element.addEventListener("change", getSettings);
    if (element.type === "number") {
      element.addEventListener("input", getSettings);
    }
  }
});

// Initialize the UI
init();
