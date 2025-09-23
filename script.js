// Elements
const radios = Array.from(document.querySelectorAll('input[name="baseImg"]'));
const colorInput = document.getElementById('color');
const paddingInput = document.getElementById('paddingInput');
const paddingValue = document.getElementById('paddingValue');
const logoInput = document.getElementById('logoInput');
const clearLogoBtn = document.getElementById('clearLogo');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const logoFileNameEl = document.getElementById('logoFileName');
const thumbCards = Array.from(document.querySelectorAll('#thumbs label.card'));
const bgInput = document.getElementById('bgInput');
const bgFileNameEl = document.getElementById('bgFileName');
const bgUploadRadio = document.getElementById('bgUploadRadio');
const bgUploadPreview = document.getElementById('bgUploadPreview');
const logoSizeInput = document.getElementById('logoSize');
const logoSizeValue = document.getElementById('logoSizeValue');


// --- Output ratios (height fixed to 720 for consistent quality) ---
const TARGET_H = 720;
const RATIOS = {
  '1:1': [1, 1],
  '4:3': [4, 3],
  '16:9': [16, 9],
  '21:9': [21, 9],
};
let ratioKey = '16:9';
const ratioRadios = Array.from(document.querySelectorAll('input[name="ratio"]'));

// State
let baseImgSrc = null;
let baseImg = null;
let overlayColor = colorInput.value;
let logoImg = null;
let logoPaddingPx = parseInt(paddingInput.value, 10) || 24;
let uploadedBgImg = null;
let uploadedBgUrl = null;
let logoWidthPct = logoSizeInput ? parseInt(logoSizeInput.value, 10) || 20 : 20;

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
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToImage(fileOrUrl) {
  return new Promise((resolve, reject) => {
    if (typeof fileOrUrl === 'string') {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = fileOrUrl;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrUrl);
  });
}

function updateThumbHighlight() {
  thumbCards.forEach(card => {
    const input = card.querySelector('input[type="radio"]');
    card.classList.toggle('is-active', !!(input && input.checked));
  });
}

function getOutSize() {
  const [rw, rh] = RATIOS[ratioKey] || RATIOS['16:9'];
  const outH = TARGET_H;
  const outW = Math.round(outH * (rw / rh));
  return { outW, outH };
}

async function draw() {
  const { outW, outH } = getOutSize();
  canvas.width = outW;
  canvas.height = outH;

  if (!baseImg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    statusEl.textContent = 'Pick a base image or upload your own.';
    downloadBtn.disabled = true;
    return;
  }

  // cover-fit the base image into (outW x outH)
  const iw = baseImg.naturalWidth;
  const ih = baseImg.naturalHeight;
  const scale = Math.max(outW / iw, outH / ih);
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);
  const dx = Math.round((outW - dw) / 2);
  const dy = Math.round((outH - dh) / 2);

  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(baseImg, dx, dy, dw, dh);

  // overlay
  ctx.fillStyle = hexToRGBA(overlayColor, 0.5);
  ctx.fillRect(0, 0, outW, outH);

  // logo (top-right), width ~20% of outW
  if (logoImg) {
    const padding = logoPaddingPx;
    const maxLogoWidth = Math.round(outW * (logoWidthPct / 100));
    const scaleLogo = Math.min(maxLogoWidth / logoImg.naturalWidth, 1);
    const w = Math.round(logoImg.naturalWidth * scaleLogo);
    const h = Math.round(logoImg.naturalHeight * scaleLogo);
    const x = outW - w - padding;
    const y = padding;
    ctx.drawImage(logoImg, x, y, w, h);
  }

  downloadBtn.disabled = !(baseImg && logoImg);
  statusEl.textContent = downloadBtn.disabled
    ? 'Upload a logo to enable download.'
    : '';
}

// Base image selection (default gallery + uploaded choice)
radios.forEach(r => {
  r.addEventListener('change', async () => {
    baseImgSrc = r.value;
    try {
      if (baseImgSrc === '__uploaded__') {
        baseImg = uploadedBgImg || null;
        statusEl.textContent = uploadedBgImg ? '' : 'Choose an image file to use as background.';
      } else {
        baseImg = await loadImage(baseImgSrc);
        statusEl.textContent = '';
      }
      await draw();
      updateThumbHighlight();
    } catch (e) {
      console.error(e);
      statusEl.textContent = 'Failed to load base image.';
    }
  });
});

// Uploaded background handler (if present)
if (bgInput) {
  bgInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (bgFileNameEl) bgFileNameEl.textContent = file ? file.name : 'No file selected';

    if (!file) {
      if (uploadedBgUrl) { URL.revokeObjectURL(uploadedBgUrl); uploadedBgUrl = null; }
      uploadedBgImg = null;
      if (bgUploadPreview) { bgUploadPreview.removeAttribute('src'); bgUploadPreview.style.display = 'none'; }
      if (bgUploadRadio && bgUploadRadio.checked) { baseImg = null; await draw(); updateThumbHighlight(); }
      return;
    }

    try {
      if (uploadedBgUrl) URL.revokeObjectURL(uploadedBgUrl);
      uploadedBgUrl = URL.createObjectURL(file);
      uploadedBgImg = await fileToImage(uploadedBgUrl);

      if (bgUploadPreview) { bgUploadPreview.src = uploadedBgUrl; bgUploadPreview.style.display = ''; }
      if (bgUploadRadio) bgUploadRadio.checked = true;
      baseImgSrc = '__uploaded__';
      baseImg = uploadedBgImg;

      await draw();
      updateThumbHighlight();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Failed to load uploaded background.';
    }
  });
}

// Ratio change
ratioRadios.forEach(rr => {
  rr.addEventListener('change', async (e) => {
    if (!e.target.checked) return;
    ratioKey = e.target.value;
    await draw();
  });
});

// Color, padding, logo
colorInput.addEventListener('input', async (e) => { overlayColor = e.target.value; await draw(); });

paddingInput.addEventListener('input', async (e) => {
  const v = parseInt(e.target.value, 10);
  logoPaddingPx = Number.isFinite(v) && v >= 0 ? v : 24;
  if(paddingValue) paddingValue.textContent = `${logoPaddingPx}px`;
  await draw();
});

logoInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (logoFileNameEl) logoFileNameEl.textContent = file ? file.name : 'No file selected';
  if (!file) { logoImg = null; await draw(); return; }
  try { logoImg = await fileToImage(file); await draw(); }
  catch (err) { console.error(err); statusEl.textContent = 'Failed to load logo.'; }
});

// Clear logo
clearLogoBtn.addEventListener('click', async () => {
  logoInput.value = '';
  if (logoFileNameEl) logoFileNameEl.textContent = 'No file selected';
  logoImg = null;
  await draw();
});

// Logo sizing
logoSizeInput.addEventListener('input', async (e) => {
  const v = parseInt(e.target.value, 10);
  logoWidthPct = Number.isFinite(v) ? v : 20;
  if (logoSizeValue) logoSizeValue.textContent = `${logoWidthPct}%`;
  await draw();
});

// Download (include size in filename)
downloadBtn.addEventListener('click', () => {
  try {
    const { outW, outH } = getOutSize();
    const a = document.createElement('a');
    a.download = `composed-${outW}x${outH}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Download failed (check CORS / SVG refs).';
  }
});

// Reset (keeps selected ratio)
resetBtn.addEventListener('click', async () => {
  radios.forEach(r => r.checked = false);
  baseImgSrc = null;
  baseImg = null;
  colorInput.value = '#21caab';
  overlayColor = colorInput.value;
  paddingInput.value = '24';
  logoPaddingPx = 24;

  // clear logo
  logoInput.value = '';
  if (logoFileNameEl) logoFileNameEl.textContent = 'No file selected';
  logoImg = null;

  // clear uploaded bg
  if (bgInput) bgInput.value = '';
  if (bgFileNameEl) bgFileNameEl.textContent = 'No file selected';
  if (uploadedBgUrl) { URL.revokeObjectURL(uploadedBgUrl); uploadedBgUrl = null; }
  uploadedBgImg = null;
  if (bgUploadPreview) { bgUploadPreview.removeAttribute('src'); bgUploadPreview.style.display = 'none'; }
  if (logoSizeInput) logoSizeInput.value = '20';
  logoWidthPct = 20;
  if (logoSizeValue) logoSizeValue.textContent = '20%';


  await draw();
  updateThumbHighlight();
});

// Initial
draw();
updateThumbHighlight();
