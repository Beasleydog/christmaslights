let isRunning = false;

const elements = {
  colorPreset: document.getElementById("colorPreset"),
  position: document.getElementById("position"),
  numLights: document.getElementById("numLights"),
  speed: document.getElementById("speed"),
  danceSpeed: document.getElementById("danceSpeed"),
  dancePattern: document.getElementById("dancePattern"),
  hangWidth: document.getElementById("hangWidth"),
  hangDepth: document.getElementById("hangDepth"),
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
    danceSpeed: parseFloat(elements.danceSpeed.value),
    dancePattern: elements.dancePattern.value,
    hangWidth: parseInt(elements.hangWidth.value),
    hangDepth: parseInt(elements.hangDepth.value),
  };
  return settings;
}

function applySettings(settings) {
  if (!settings) return;

  Object.entries(settings).forEach(([key, value]) => {
    if (elements[key]) {
      elements[key].value = value;
    }
  });
}

async function saveSettings() {
  const settings = getSettings();
  await window.electronAPI.saveSettings(settings);
}

async function updateLights() {
  if (isRunning) {
    const settings = getSettings();
    await window.electronAPI.startLights(settings);
    await saveSettings();
  }
}

async function toggleLights() {
  if (!isRunning) {
    await window.electronAPI.startLights(getSettings());
    await saveSettings();
  } else {
    await window.electronAPI.stopLights();
  }
  updateButtonState(!isRunning);
}

// Initialize
async function init() {
  const running = await window.electronAPI.getLightsStatus();
  updateButtonState(running);

  // Load saved settings
  const savedSettings = await window.electronAPI.loadSettings();
  applySettings(savedSettings);
}

// Event listeners
elements.toggleButton.addEventListener("click", toggleLights);

// Add event listeners for settings changes
Object.entries(elements).forEach(([key, element]) => {
  if (key !== "toggleButton" && key !== "status") {
    element.addEventListener("change", updateLights);
    if (element.type === "number") {
      element.addEventListener("input", updateLights);
    }
  }
});

// Initialize the UI
init();
