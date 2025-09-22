// Elements
const radios = Array.from(document.querySelectorAll('input[name="baseImg"]'));
const colorInput = document.getElementById('color');
const paddingInput = document.getElementById('paddingInput');
const logoInput = document.getElementById('logoInput');
const clearLogoBtn = document.getElementById('clearLogo');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const logoFileNameEl = document.getElementById('logoFileName');
const thumbCards = Array.from(document.querySelectorAll('#thumbs label.card'));

// State
let baseImgSrc = null;
let baseImg = null;
let overlayColor = colorInput.value;
let logoImg = null;
let logoPaddingPx = parseInt(paddingInput.value, 10) || 24;

// Helpers
function hexToRGBA(hex, alpha) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Helpful if you ever host images on a CDN with CORS
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateThumbHighlight() {
  thumbCards.forEach(card => {
    const input = card.querySelector('input[type="radio"]');
    card.classList.toggle('is-active', !!(input && input.checked));
  });
}

async function draw() {
  if (!baseImg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    statusEl.textContent = 'Pick a base image to start.';
    downloadBtn.disabled = true;
    return;
  }

  // Match canvas pixels to the base image for crisp output & correct aspect
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;

  // Draw base
  ctx.drawImage(baseImg, 0, 0);

  // Overlay color with alpha 0.5
  ctx.fillStyle = hexToRGBA(overlayColor, 0.5);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw logo at top-right with padding (px), scaling to ~20% of canvas width
  if (logoImg) {
    const padding = logoPaddingPx; // px
    const maxLogoWidth = Math.round(canvas.width * 0.2);
    const scale = Math.min(maxLogoWidth / logoImg.naturalWidth, 1);
    const w = Math.round(logoImg.naturalWidth * scale);
    const h = Math.round(logoImg.naturalHeight * scale);
    const x = canvas.width - w - padding;
    const y = padding;
    ctx.drawImage(logoImg, x, y, w, h);
  }

  // Enable download only when we have both base image and logo
  downloadBtn.disabled = !(baseImg && logoImg);
  statusEl.textContent = downloadBtn.disabled
    ? 'Upload a logo to enable download.'
    : '';
}

// Event: base image selection
radios.forEach(r => {
  r.addEventListener('change', async () => {
    baseImgSrc = r.value;
    try {
      baseImg = await loadImage(baseImgSrc);
      await draw();
      updateThumbHighlight();
    } catch (e) {
      console.error(e);
      statusEl.textContent = 'Failed to load base image.';
    }
  });
});

// Event: color pick
colorInput.addEventListener('input', async (e) => {
  overlayColor = e.target.value;
  await draw();
});

// Event: padding change
paddingInput.addEventListener('input', async (e) => {
  const v = parseInt(e.target.value, 10);
  logoPaddingPx = Number.isFinite(v) && v >= 0 ? v : 24;
  await draw();
});

// Event: logo upload
logoInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (logoFileNameEl) {
    logoFileNameEl.textContent = file ? file.name : 'No file selected';
  }
  if (!file) {
    logoImg = null;
    await draw();
    return;
  }
  try {
    logoImg = await fileToImage(file);
    await draw();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to load logo.';
  }
});

// Clear logo
clearLogoBtn.addEventListener('click', async () => {
  logoInput.value = '';
  if (logoFileNameEl) logoFileNameEl.textContent = 'No file selected';
  logoImg = null;
  await draw();
});

// Download
downloadBtn.addEventListener('click', () => {
  try {
    const a = document.createElement('a');
    a.download = 'composed.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Download failed (check CORS / SVG refs).';
  }
});

// Reset
resetBtn.addEventListener('click', async () => {
  radios.forEach(r => r.checked = false);
  baseImgSrc = null;
  baseImg = null;
  colorInput.value = '#ff0000';
  overlayColor = colorInput.value;
  paddingInput.value = '24';
  logoPaddingPx = 24;
  logoInput.value = '';
  if (logoFileNameEl) logoFileNameEl.textContent = 'No file selected';
  logoImg = null;
  await draw();
  updateThumbHighlight();
});

// Initial
draw();
updateThumbHighlight();
