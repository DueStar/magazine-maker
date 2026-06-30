'use strict';

// ── 상수 ──────────────────────────────────────────────
const CANVAS_W = 2160;
const CANVAS_H = 2700;
const ASPECT = CANVAS_H / CANVAS_W; // 1.25

// 텍스트 기본값 (2160×2700 기준)
const TEXT_LEFT   = 200;
const TEXT_BOTTOM = 280;
const FONT_SIZE   = 180;
const LINE_HEIGHT = 252; // 180 * 1.4

// 그라디언트 기본값
const defaults = {
  gradAlpha:  0.64,
  gradColor:  '#000000',
  gradStart:  32,
  gradEnd:    100,
};

// ── 상태 ──────────────────────────────────────────────
const state = {
  image: null,       // HTMLImageElement
  text: '',
  gradAlpha:  defaults.gradAlpha,
  gradColor:  defaults.gradColor,
  gradStart:  defaults.gradStart,
  gradEnd:    defaults.gradEnd,
  fontsReady: false,
};

// ── DOM 참조 ──────────────────────────────────────────
const previewCanvas   = document.getElementById('preview');
const ctx             = previewCanvas.getContext('2d');
const placeholder     = document.getElementById('canvas-placeholder');
const fileInput       = document.getElementById('file-input');
const uploadBtn       = document.getElementById('upload-btn');
const textInput       = document.getElementById('text-input');
const alphaSlider     = document.getElementById('grad-alpha');
const alphaVal        = document.getElementById('grad-alpha-val');
const colorPicker     = document.getElementById('grad-color');
const startSlider     = document.getElementById('grad-start');
const startVal        = document.getElementById('grad-start-val');
const endSlider       = document.getElementById('grad-end');
const endVal          = document.getElementById('grad-end-val');
const previewBtn      = document.getElementById('preview-btn');
const previewModal    = document.getElementById('preview-modal');
const modalCanvas     = document.getElementById('modal-canvas');
const modalClose      = document.getElementById('modal-close');
const shareBtn        = document.getElementById('share-btn');
const downloadBtn     = document.getElementById('download-btn');
const toast           = document.getElementById('toast');

// ── 캔버스 크기 초기화 ────────────────────────────────
// 미리보기 캔버스: CSS로 width:100% 지정, 실제 픽셀은 뷰포트에 맞게
function resizePreview() {
  const w = previewCanvas.offsetWidth;
  const h = Math.round(w * ASPECT);
  if (previewCanvas.width !== w || previewCanvas.height !== h) {
    previewCanvas.width  = w;
    previewCanvas.height = h;
  }
}

// ── 핵심 렌더 함수 ────────────────────────────────────
function render(targetCtx, W, H) {
  targetCtx.clearRect(0, 0, W, H);

  // 1. 배경 이미지 (object-fit: cover)
  if (state.image) {
    const img = state.image;
    const imgAspect = img.naturalHeight / img.naturalWidth;
    let sx, sy, sw, sh;
    if (imgAspect > ASPECT) {
      // 이미지가 더 길다 → 가로를 꽉 채우고 세로를 잘라
      sw = img.naturalWidth;
      sh = img.naturalWidth * ASPECT;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    } else {
      // 이미지가 더 넓다 → 세로를 꽉 채우고 가로를 잘라
      sh = img.naturalHeight;
      sw = img.naturalHeight / ASPECT;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    }
    targetCtx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  } else {
    targetCtx.fillStyle = '#1a1a1a';
    targetCtx.fillRect(0, 0, W, H);
  }

  // 2. 그라디언트 오버레이
  const hexColor = state.gradColor;
  const r = parseInt(hexColor.slice(1,3),16);
  const g = parseInt(hexColor.slice(3,5),16);
  const b = parseInt(hexColor.slice(5,7),16);
  const alpha = state.gradAlpha;

  const grad = targetCtx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(state.gradStart / 100, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(state.gradEnd   / 100, `rgba(${r},${g},${b},${alpha})`);
  targetCtx.fillStyle = grad;
  targetCtx.fillRect(0, 0, W, H);

  // 3. 텍스트
  if (!state.text.trim()) return;
  const lines = state.text.split('\n');
  const scale = W / CANVAS_W;

  const fontSize   = FONT_SIZE   * scale;
  const lineHeight = LINE_HEIGHT * scale;
  const left       = TEXT_LEFT   * scale;
  const bottomGap  = TEXT_BOTTOM * scale;

  targetCtx.save();
  targetCtx.font          = `700 ${fontSize}px 'Pretendard Variable', 'Pretendard', sans-serif`;
  targetCtx.fillStyle     = '#FFFFFF';
  targetCtx.textBaseline  = 'bottom';
  targetCtx.textAlign     = 'left';
  targetCtx.letterSpacing = `${-5.4 * scale}px`;
  targetCtx.shadowColor   = 'rgba(0,0,0,0.48)';
  targetCtx.shadowBlur    = 80 * scale;
  targetCtx.shadowOffsetX = 0;
  targetCtx.shadowOffsetY = 0;

  // 마지막 줄 baseline = H - bottomGap, 위로 쌓아 올라감
  const totalLines = lines.length;
  lines.forEach((line, i) => {
    const y = H - bottomGap - (totalLines - 1 - i) * lineHeight;
    targetCtx.fillText(line, left, y);
  });
  targetCtx.restore();
}

// 미리보기 렌더
function renderPreview() {
  resizePreview();
  render(ctx, previewCanvas.width, previewCanvas.height);
  placeholder.classList.toggle('hidden', !!state.image);
}

// ── 폰트 로딩 ────────────────────────────────────────
document.fonts.ready.then(() => {
  state.fontsReady = true;
  renderPreview();
});

// ── 이미지 로드 ──────────────────────────────────────
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    if (state.image) URL.revokeObjectURL(state.image._blobUrl);
    img._blobUrl = url;
    state.image = img;
    renderPreview();
  };
  img.src = url;
  // 같은 파일 재선택 가능하도록
  fileInput.value = '';
});

// ── 텍스트 ────────────────────────────────────────────
textInput.addEventListener('input', () => {
  state.text = textInput.value;
  renderPreview();
});

// ── 그라디언트 컨트롤 ────────────────────────────────
alphaSlider.addEventListener('input', () => {
  state.gradAlpha = parseFloat(alphaSlider.value);
  alphaVal.textContent = state.gradAlpha.toFixed(2);
  renderPreview();
});

colorPicker.addEventListener('input', () => {
  state.gradColor = colorPicker.value;
  renderPreview();
});

startSlider.addEventListener('input', () => {
  state.gradStart = parseInt(startSlider.value, 10);
  startVal.textContent = state.gradStart + '%';
  // 시작 > 끝 방지
  if (state.gradStart >= state.gradEnd) {
    state.gradEnd = Math.min(100, state.gradStart + 1);
    endSlider.value = state.gradEnd;
    endVal.textContent = state.gradEnd + '%';
  }
  renderPreview();
});

endSlider.addEventListener('input', () => {
  state.gradEnd = parseInt(endSlider.value, 10);
  endVal.textContent = state.gradEnd + '%';
  if (state.gradEnd <= state.gradStart) {
    state.gradStart = Math.max(0, state.gradEnd - 1);
    startSlider.value = state.gradStart;
    startVal.textContent = state.gradStart + '%';
  }
  renderPreview();
});

// ── 내보내기: 오프스크린 풀해상도 렌더 ───────────────
function renderFullRes() {
  return new Promise((resolve, reject) => {
    const offscreen = document.createElement('canvas');
    offscreen.width  = CANVAS_W;
    offscreen.height = CANVAS_H;
    const offCtx = offscreen.getContext('2d');

    // 폰트가 준비된 상태여야 하므로 fonts.ready 한 번 더 체크
    document.fonts.ready.then(() => {
      render(offCtx, CANVAS_W, CANVAS_H);
      offscreen.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob 실패'));
      }, 'image/png');
    });
  });
}

function getFilename() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `card_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.png`;
}

// ── 미리보기 버튼 ─────────────────────────────────────
previewBtn.addEventListener('click', () => {
  const vw = window.innerWidth - 32;
  const w  = Math.min(vw, 420);
  const h  = Math.round(w * ASPECT);
  modalCanvas.width  = w;
  modalCanvas.height = h;
  const mCtx = modalCanvas.getContext('2d');
  render(mCtx, w, h);
  previewModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
});

function closeModal() {
  previewModal.style.display = 'none';
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
previewModal.addEventListener('click', e => {
  if (e.target === previewModal) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── 공유 버튼 ─────────────────────────────────────────
shareBtn.addEventListener('click', async () => {
  if (!state.image && !state.text.trim()) {
    showToast('이미지나 텍스트를 먼저 추가해주세요');
    return;
  }

  shareBtn.disabled = true;
  shareBtn.textContent = '렌더링 중…';

  try {
    const blob = await renderFullRes();
    const filename = getFilename();
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: '매거진 카드',
      });
      showToast('공유 완료!');
    } else {
      // 폴백: 다운로드
      downloadBlob(blob, filename);
      showToast('공유 미지원 → 다운로드 완료');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error(err);
      showToast('오류가 발생했습니다');
    }
  } finally {
    shareBtn.disabled = false;
    shareBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>인스타그램에 공유`;
  }
});

// ── 다운로드 버튼 ─────────────────────────────────────
downloadBtn.addEventListener('click', async () => {
  if (!state.image && !state.text.trim()) {
    showToast('이미지나 텍스트를 먼저 추가해주세요');
    return;
  }

  downloadBtn.disabled = true;
  try {
    const blob = await renderFullRes();
    downloadBlob(blob, getFilename());
    showToast('PNG 다운로드 완료');
  } catch (err) {
    console.error(err);
    showToast('다운로드 실패');
  } finally {
    downloadBtn.disabled = false;
  }
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── 토스트 ────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── 리사이즈 대응 ─────────────────────────────────────
let rafPending = false;
window.addEventListener('resize', () => {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    renderPreview();
  });
});

// ── PWA 서비스워커 등록 ──────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}

// ── 초기 렌더 ─────────────────────────────────────────
renderPreview();
