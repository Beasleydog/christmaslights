const canvas = document.getElementById("lightsCanvas");
const ctx = canvas.getContext("2d");
let lights = [];
const NUM_LIGHTS = 50;
const yOffset = 8;
let isInitialized = false;

// Color presets
const COLOR_PRESETS = {
  RAINBOW: [
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ffff00", // Yellow
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
  ],
  CHRISTMAS: [
    "#ff0000", // Red
    "#00ff00", // Green
    "#ffffff", // White
    "#ffd700", // Gold
  ],
  HANUKKAH: [
    "#ffffff", // White
    "#0066cc", // Blue
    "#4d94ff", // Light Blue
    "#c1d8ff", // Very Light Blue
  ],
};

// Configuration
const CONFIG = {
  // Light appearance
  BULB_RADIUS: 6,
  BASE_WIDTH: 4,
  BASE_HEIGHT: 8,

  // Animation settings
  PULSE_SPEED_MIN: 0.5,
  PULSE_SPEED_MAX: 2.0,
  TWINKLE_SPEED_MIN: 0.8,
  TWINKLE_SPEED_MAX: 2.8,
  INTENSITY_OFFSET_MAX: 0.4,

  // Glow settings
  GLOW_INTENSITY_BASE: 0.6,
  GLOW_INTENSITY_VARIANCE: 0.2,
  TWINKLE_INTENSITY_BASE: 0.7,
  TWINKLE_INTENSITY_VARIANCE: 0.3,

  // Color settings
  COLOR_CHASE_ENABLED: true,
  COLOR_CHASE_SPEED: 0.5, // Lights per second
  OPACITY_MIN: 0.5,
  OPACITY_MAX: 1.0,

  // Current color preset
  CURRENT_PRESET: "HANUKKAH",
};

// Active colors array (will be set based on preset)
let colors = COLOR_PRESETS[CONFIG.CURRENT_PRESET];

// Function to change color preset
function setColorPreset(presetName) {
  if (COLOR_PRESETS[presetName]) {
    CONFIG.CURRENT_PRESET = presetName;
    colors = COLOR_PRESETS[presetName];
    createLights(); // Recreate lights with new colors
  }
}

// Add keyboard shortcuts for changing presets
window.addEventListener("keydown", (event) => {
  switch (event.key.toLowerCase()) {
    case "r":
      setColorPreset("RAINBOW");
      break;
    case "c":
      setColorPreset("CHRISTMAS");
      break;
    case "h":
      setColorPreset("HANUKKAH");
      break;
  }
});

class Light {
  constructor(x, y, color, index) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.index = index;
    this.radius = CONFIG.BULB_RADIUS;
    this.baseWidth = CONFIG.BASE_WIDTH;
    this.baseHeight = CONFIG.BASE_HEIGHT;
    this.pulseSpeed =
      CONFIG.PULSE_SPEED_MIN +
      Math.random() * (CONFIG.PULSE_SPEED_MAX - CONFIG.PULSE_SPEED_MIN);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.intensityOffset = Math.random() * CONFIG.INTENSITY_OFFSET_MAX;
    this.lastUpdate = Date.now();
    this.twinkleSpeed =
      CONFIG.TWINKLE_SPEED_MIN +
      Math.random() * (CONFIG.TWINKLE_SPEED_MAX - CONFIG.TWINKLE_SPEED_MIN);
    this.twinklePhase = Math.random() * Math.PI * 2;
  }

  getCurrentColor(time) {
    if (!CONFIG.COLOR_CHASE_ENABLED) {
      return this.color;
    }

    // Calculate color index based on time and position
    const totalShift = (time * CONFIG.COLOR_CHASE_SPEED) / 1000;
    const colorIndex = Math.floor((this.index + totalShift) % colors.length);
    return colors[colorIndex];
  }

  draw() {
    const time = Date.now();
    const deltaTime = (time - this.lastUpdate) / 1000;
    this.lastUpdate = time;

    this.pulsePhase += deltaTime * this.pulseSpeed;
    this.twinklePhase += deltaTime * this.twinkleSpeed;

    const pulseIntensity =
      CONFIG.GLOW_INTENSITY_BASE +
      Math.sin(this.pulsePhase) * CONFIG.GLOW_INTENSITY_VARIANCE +
      this.intensityOffset;
    const twinkleIntensity =
      CONFIG.TWINKLE_INTENSITY_BASE +
      Math.sin(this.twinklePhase) * CONFIG.TWINKLE_INTENSITY_VARIANCE;
    const finalIntensity = pulseIntensity * twinkleIntensity;

    // Draw base shadows first
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.shadowColor = `rgba(0, 0, 0, ${0.02 - i * 0.004})`;
      ctx.shadowBlur = 8 + i * 6;
      ctx.shadowOffsetY = 1 + i * 0.5;
      ctx.shadowOffsetX = (i - 1.5) * 2;
      ctx.fillStyle = "#696969";
      ctx.fillRect(
        this.x - this.baseWidth / 2,
        this.y - this.baseHeight,
        this.baseWidth,
        this.baseHeight
      );
    }

    // Draw metal connector with shadow
    ctx.beginPath();
    ctx.fillStyle = "#A0A0A0";
    for (let i = 0; i < 3; i++) {
      ctx.shadowColor = `rgba(0, 0, 0, ${0.015 - i * 0.004})`;
      ctx.shadowBlur = 6 + i * 4;
      ctx.shadowOffsetY = 0.5 + i * 0.3;
      ctx.shadowOffsetX = (i - 1) * 1;
      ctx.fillRect(
        this.x - this.baseWidth * 0.8,
        this.y,
        this.baseWidth * 1.6,
        3
      );
    }

    // Reset shadows before drawing the glowing bulb
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw the glowing bulb with shadow blur for the glow effect
    ctx.beginPath();
    ctx.save();
    ctx.translate(this.x, this.y + this.baseHeight / 2);
    ctx.scale(1, 1.5);

    // Update color based on chase animation
    const currentColor = this.getCurrentColor(time);
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 25 * finalIntensity;

    // Adjust the fill color based on intensity
    const rgb = this.hexToRgb(currentColor);
    const opacity =
      CONFIG.OPACITY_MIN +
      finalIntensity * (CONFIG.OPACITY_MAX - CONFIG.OPACITY_MIN);
    const adjustedColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    ctx.fillStyle = adjustedColor;

    // Draw oval with point
    ctx.beginPath();
    // Draw most of the oval
    ctx.ellipse(
      0,
      -this.radius * 0.1,
      this.radius * 0.8,
      this.radius,
      0,
      0,
      Math.PI * 2
    );
    // Add slight point at bottom
    ctx.quadraticCurveTo(
      this.radius * 0.2,
      this.radius * 1,
      0,
      this.radius * 1.1
    );
    ctx.quadraticCurveTo(
      -this.radius * 0.2,
      this.radius * 1,
      -this.radius * 0.8,
      -this.radius * 0.1
    );
    ctx.fill();

    ctx.restore();
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  adjustColorBrightness(hex, factor) {
    const rgb = this.hexToRgb(hex);
    const adjustColor = (value) => Math.min(255, Math.floor(value * factor));
    return `rgb(${adjustColor(rgb.r)}, ${adjustColor(rgb.g)}, ${adjustColor(
      rgb.b
    )})`;
  }
}

function createLights() {
  lights = [];

  const lightWidth = 20;
  const extraSpace = Math.max(0, canvas.width - lightWidth * NUM_LIGHTS);
  const spacing = extraSpace / NUM_LIGHTS;

  for (let i = 0; i < NUM_LIGHTS; i++) {
    const x = spacing / 2 + i * (spacing + lightWidth);
    const color = colors[Math.floor(Math.random() * colors.length)];
    lights.push(new Light(x, yOffset, color, i));
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (isInitialized) {
    createLights();
  }
}

function init() {
  if (!isInitialized) {
    console.log("Initializing...");
    isInitialized = true;
    resizeCanvas();
    animate();
    createLights();
    console.log("Initialization complete!");
  }
}

// Wait for everything to be ready
window.addEventListener("load", () => {
  // Give a small delay to ensure window dimensions are final
  init();
});

window.addEventListener("resize", resizeCanvas);

// Draw wire
function drawWire() {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width, 0);
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Animation loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWire();
  lights.forEach((light) => light.draw());
  requestAnimationFrame(animate);
}
