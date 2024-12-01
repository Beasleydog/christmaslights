const canvas = document.getElementById("lightsCanvas");
const ctx = canvas.getContext("2d");
let lights = [];
let NUM_LIGHTS = 50;
const yOffset = 8;
const sideXOffset = 8;
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
let CONFIG = {
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
  COLOR_CHASE_SPEED: 0.3,
  OPACITY_MIN: 0.5,
  OPACITY_MAX: 1.0,

  // Current color preset
  CURRENT_PRESET: "RAINBOW",

  // Position
  POSITION: "SIDE", // Default position
};

// Update settings from control window
window.electronAPI.onSettingsUpdate((event, settings) => {
  CONFIG.CURRENT_PRESET = settings.colorPreset;
  colors = COLOR_PRESETS[settings.colorPreset]; // Update the active colors array
  CONFIG.POSITION = settings.position;
  NUM_LIGHTS = settings.numLights;
  CONFIG.COLOR_CHASE_SPEED = settings.speed * 0.3;
  CONFIG.GLOW_INTENSITY_BASE = settings.brightness * 0.6;
  CONFIG.TWINKLE_INTENSITY_BASE = settings.brightness * 0.7;

  // Recreate lights with new settings
  createLights();
});

// Active colors array (will be set based on preset)
let colors = COLOR_PRESETS[CONFIG.CURRENT_PRESET];

// Add color conversion utilities after the CONFIG object
const ColorUtils = {
  hexToHSL(hex) {
    // Convert hex to RGB first
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  },

  HSLToString(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  },

  // Add easing function for sharper transitions
  ease(t) {
    // This creates a sharp transition with less time spent in between colors
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },

  interpolateHSL(hsl1, hsl2, factor) {
    // Apply easing to the factor to make transitions sharper
    const easedFactor = this.ease(factor);

    // Handle hue interpolation across the shortest path
    let h1 = hsl1.h;
    let h2 = hsl2.h;

    // Ensure we take the shortest path around the color wheel
    if (Math.abs(h2 - h1) > 180) {
      if (h1 < h2) {
        h1 += 360;
      } else {
        h2 += 360;
      }
    }

    // Use the eased factor for all interpolations
    const h = (h1 + easedFactor * (h2 - h1)) % 360;
    const s = hsl1.s + easedFactor * (hsl2.s - hsl1.s);
    const l = hsl1.l + easedFactor * (hsl2.l - hsl1.l);

    return { h, s, l };
  },
};

// Convert color presets to HSL
const HSL_PRESETS = {};
for (const [key, colors] of Object.entries(COLOR_PRESETS)) {
  HSL_PRESETS[key] = colors.map((color) => ColorUtils.hexToHSL(color));
}

// Function to change color preset
function setColorPreset(presetName) {
  if (COLOR_PRESETS[presetName]) {
    CONFIG.CURRENT_PRESET = presetName;
    colors = COLOR_PRESETS[presetName];
    createLights(); // Recreate lights with new colors
  }
}

class Light {
  constructor(x, y, color, index, rotation = 0) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.index = index;
    this.rotation = rotation;
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

    // Calculate position in the color sequence
    const totalShift = (time * CONFIG.COLOR_CHASE_SPEED) / 1000;
    const position = (this.index + totalShift) % colors.length;
    const currentIndex = Math.floor(position);
    const nextIndex = (currentIndex + 1) % colors.length;

    // Get the current colors to interpolate between
    const currentColor = colors[currentIndex];
    const nextColor = colors[nextIndex];

    // Convert hex colors to HSL
    const currentHSL = ColorUtils.hexToHSL(currentColor);
    const nextHSL = ColorUtils.hexToHSL(nextColor);

    // Calculate interpolation factor (0 to 1)
    const factor = position - Math.floor(position);

    // Interpolate between colors
    const interpolatedHSL = ColorUtils.interpolateHSL(
      currentHSL,
      nextHSL,
      factor
    );

    return ColorUtils.HSLToString(
      interpolatedHSL.h,
      interpolatedHSL.s,
      interpolatedHSL.l
    );
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

    // Save the current context state
    ctx.save();

    // Translate to the light position and apply rotation
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw base shadows
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.shadowColor = `rgba(0, 0, 0, ${0.02 - i * 0.004})`;
      ctx.shadowBlur = 8 + i * 6;
      ctx.shadowOffsetY = 1 + i * 0.5;
      ctx.shadowOffsetX = (i - 1.5) * 2;
      ctx.fillStyle = "#696969";
      ctx.fillRect(
        -this.baseWidth / 2,
        -this.baseHeight,
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
      ctx.fillRect(-this.baseWidth * 0.8, 0, this.baseWidth * 1.6, 3);
    }

    // Reset shadows before drawing the glowing bulb
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw the glowing bulb
    ctx.save();
    ctx.translate(0, this.baseHeight / 2);
    ctx.scale(1, 1.5);

    const currentColor = this.getCurrentColor(time);
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 25 * finalIntensity;
    ctx.fillStyle = currentColor;

    // Draw oval with point
    ctx.beginPath();
    ctx.ellipse(
      0,
      -this.radius * 0.1,
      this.radius * 0.8,
      this.radius,
      0,
      0,
      Math.PI * 2
    );
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

  if (CONFIG.POSITION === "SIDE") {
    // Calculate spacing for side lights
    const extraSpace = Math.max(
      0,
      canvas.height - lightWidth * (NUM_LIGHTS / 2)
    );
    const spacing = extraSpace / (NUM_LIGHTS / 2);

    // Create lights for left side
    for (let i = 0; i < NUM_LIGHTS / 2; i++) {
      const y = spacing / 2 + i * (spacing + lightWidth);
      const color = colors[Math.floor(Math.random() * colors.length)];
      // Left side lights, rotated 90 degrees clockwise
      lights.push(new Light(sideXOffset, y, color, i, -Math.PI / 2));
    }

    // Create lights for right side
    for (let i = 0; i < NUM_LIGHTS / 2; i++) {
      const y = spacing / 2 + i * (spacing + lightWidth);
      const color = colors[Math.floor(Math.random() * colors.length)];
      // Right side lights, rotated -90 degrees counterclockwise
      lights.push(
        new Light(
          canvas.width - sideXOffset,
          y,
          color,
          i + NUM_LIGHTS / 2,
          Math.PI / 2
        )
      );
    }
  } else {
    // TOP position (original behavior)
    const extraSpace = Math.max(0, canvas.width - lightWidth * NUM_LIGHTS);
    const spacing = extraSpace / NUM_LIGHTS;

    for (let i = 0; i < NUM_LIGHTS; i++) {
      const x = spacing / 2 + i * (spacing + lightWidth);
      const color = colors[Math.floor(Math.random() * colors.length)];
      lights.push(new Light(x, yOffset, color, i, 0));
    }
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

  if (CONFIG.POSITION === "SIDE") {
    // Draw wires on both sides
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height);
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
  } else {
    // Draw wire across top
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, 0);
  }

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
