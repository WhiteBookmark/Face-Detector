/**
 * Facial Verification Application Logic
 * Vanilla JavaScript (No Frameworks)
 * Handles drag-and-drop, API communication, model selection,
 * sample pair presets, and responsive metric visualization.
 */

(function () {
  'use strict';

  // Global State
  let API_BASE_URL = (window.location.origin || '').trim().replace(/\/+$/, '');
  let file1 = null;
  let file2 = null;
  let samplePairs = [];

  // DOM Elements
  const dropzone1 = document.getElementById('dropzone-1');
  const dropzone2 = document.getElementById('dropzone-2');
  const fileInput1 = document.getElementById('file-input-1');
  const fileInput2 = document.getElementById('file-input-2');
  const previewWrap1 = document.getElementById('preview-wrap-1');
  const previewWrap2 = document.getElementById('preview-wrap-2');
  const previewImg1 = document.getElementById('preview-img-1');
  const previewImg2 = document.getElementById('preview-img-2');
  const emptyPrompt1 = document.getElementById('empty-prompt-1');
  const emptyPrompt2 = document.getElementById('empty-prompt-2');

  const detectorSelect = document.getElementById('detector-select');
  const recognizerSelect = document.getElementById('recognizer-select');
  const thresholdSlider = document.getElementById('threshold-slider');
  const thresholdVal = document.getElementById('threshold-val');
  const verifyBtn = document.getElementById('verify-btn');

  const resultsCard = document.getElementById('results-card');
  const toastContainer = document.getElementById('toast-container');

  // Sticky Navigation Buttons
  const scrollUpBtn = document.getElementById('sticky-scroll-up');
  const scrollDownBtn = document.getElementById('sticky-scroll-down');

  // -------------------------------------------------------------
  // Base URL Sanitation & Configuration (Auto-Probe Backend Port)
  // -------------------------------------------------------------
  function updateBackendBadge(url, isOnline) {
    const label = document.getElementById('header-backend-label');
    const dot = document.getElementById('header-pulse-dot');
    const badge = document.getElementById('header-api-badge');
    if (label) {
      try {
        const u = new URL(url);
        label.textContent = isOnline ? `CPU API: ${u.host}` : `API Offline (${u.host})`;
      } catch (_) {
        label.textContent = isOnline ? `CPU API: ${url}` : `API Offline`;
      }
    }
    if (dot) {
      dot.style.backgroundColor = isOnline ? 'var(--color-green-6)' : 'var(--color-red-6)';
      dot.style.boxShadow = isOnline ? '0 0 8px var(--color-green-6)' : '0 0 8px var(--color-red-6)';
    }
    if (badge && !badge._hasClick) {
      badge._hasClick = true;
      badge.addEventListener('click', () => {
        const custom = prompt('Enter FastAPI Backend URL (e.g. http://100.116.16.63:8000 or http://127.0.0.1:8000):', API_BASE_URL);
        if (custom) {
          const cleaned = custom.trim().replace(/\/+$/, '');
          localStorage.setItem('biometric_api_base_url', cleaned);
          API_BASE_URL = cleaned;
          showToast(`Backend API URL updated to: ${cleaned}`, 'info');
          initConfig();
        }
      });
    }
  }

  async function initConfig() {
    const saved = localStorage.getItem('biometric_api_base_url');
    const port = window.location.port;
    const hostname = window.location.hostname || '127.0.0.1';
    const protocol = window.location.protocol || 'http:';

    // Ordered candidate endpoints to probe
    const candidates = [];
    if (saved) candidates.push(saved.trim().replace(/\/+$/, ''));
    if (port !== '8000') {
      candidates.push(`${protocol}//${hostname}:8000`);
      candidates.push(`http://${hostname}:8000`);
      candidates.push(`http://127.0.0.1:8000`);
    }
    candidates.push(window.location.origin.trim().replace(/\/+$/, ''));

    let connected = false;
    for (const cand of candidates) {
      try {
        const cleanCand = cand.trim().replace(/\/+$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`${cleanCand}/api/config`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          API_BASE_URL = cleanCand;
          connected = true;
          console.log(`[FaceVerify] Connected to FastAPI backend at: ${API_BASE_URL}`);
          updateBackendBadge(API_BASE_URL, true);
          break;
        }
      } catch (e) {
        // Continue probing next candidate
      }
    }

    if (!connected) {
      console.warn(`[FaceVerify] Could not detect backend at candidates:`, candidates);
      // Fallback to :8000 on current hostname
      API_BASE_URL = `${protocol}//${hostname}:8000`;
      updateBackendBadge(API_BASE_URL, false);
      showToast(`FastAPI not found on port ${port}. Trying backend at ${API_BASE_URL}...`, 'info');
    }

    loadSamples();
  }

  // -------------------------------------------------------------
  // Toast Notifications (Darker background, lighter text)
  // -------------------------------------------------------------
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // SVG icon for toast based on type
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<div class="icon-bubble bubble-xs success"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>`;
    } else if (type === 'error') {
      iconSvg = `<div class="icon-bubble bubble-xs danger"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>`;
    } else {
      iconSvg = `<div class="icon-bubble bubble-xs"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // -------------------------------------------------------------
  // Image Upload & Drag-and-Drop Handlers
  // -------------------------------------------------------------
  function setupDropzone(zone, input, previewWrap, previewImg, emptyPrompt, targetIndex) {
    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0], targetIndex);
      }
    });

    input.addEventListener('change', () => {
      if (input.files && input.files[0]) {
        handleFile(input.files[0], targetIndex);
      }
    });
  }

  function handleFile(file, targetIndex) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPEG, PNG, or WebP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image file size exceeds 15MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (targetIndex === 1) {
        file1 = file;
        previewImg1.src = e.target.result;
        emptyPrompt1.style.display = 'none';
        previewWrap1.style.display = 'flex';
      } else {
        file2 = file;
        previewImg2.src = e.target.result;
        emptyPrompt2.style.display = 'none';
        previewWrap2.style.display = 'flex';
      }
      checkReadyState();
      showToast(`Image ${targetIndex} loaded successfully.`, 'info');
    };
    reader.readAsDataURL(file);
  }

  function checkReadyState() {
    if (file1 && file2) {
      verifyBtn.removeAttribute('disabled');
    } else {
      verifyBtn.setAttribute('disabled', 'true');
    }
  }

  // -------------------------------------------------------------
  // Sample Pairs Loader (1-Click Test)
  // -------------------------------------------------------------
  async function loadSamples() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples`);
      if (res.ok) {
        const data = await res.json();
        samplePairs = data.samples || [];
        renderSampleChips();
      }
    } catch (e) {
      console.warn('Failed to load sample pairs:', e);
    }
  }

  function renderSampleChips() {
    const container = document.getElementById('sample-chips-container');
    if (!container || !samplePairs.length) return;

    container.innerHTML = '';
    samplePairs.forEach((pair, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-chip-btn';
      
      const badgeClass = pair.expected === 'MATCH' ? 'success' : 'danger';
      btn.innerHTML = `
        <span class="icon-bubble bubble-xs ${badgeClass}">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </span>
        <span>${pair.title}</span>
      `;

      btn.addEventListener('click', () => applySamplePair(pair));
      container.appendChild(btn);
    });
  }

  function base64ToBlob(base64Data) {
    const parts = base64Data.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  }

  function applySamplePair(pair) {
    if (!pair.img1 || !pair.img2) return;

    const blob1 = base64ToBlob(pair.img1);
    file1 = new File([blob1], 'sample1.jpg', { type: 'image/jpeg' });
    previewImg1.src = pair.img1;
    emptyPrompt1.style.display = 'none';
    previewWrap1.style.display = 'flex';

    const blob2 = base64ToBlob(pair.img2);
    file2 = new File([blob2], 'sample2.jpg', { type: 'image/jpeg' });
    previewImg2.src = pair.img2;
    emptyPrompt2.style.display = 'none';
    previewWrap2.style.display = 'flex';

    checkReadyState();
    showToast(`Loaded sample test pair: ${pair.title}`, 'info');

    // Scroll to action area
    verifyBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // -------------------------------------------------------------
  // Model Selectors & Threshold Synchronization
  // -------------------------------------------------------------
  recognizerSelect.addEventListener('change', () => {
    const val = recognizerSelect.value;
    if (val === 'sface') {
      thresholdSlider.value = 0.363;
      thresholdVal.textContent = '0.363 (SFace Calibrated)';
    } else {
      thresholdSlider.value = 0.60;
      thresholdVal.textContent = '0.600 (FaceNet Standard)';
    }
  });

  thresholdSlider.addEventListener('input', () => {
    thresholdVal.textContent = parseFloat(thresholdSlider.value).toFixed(3);
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      const rec = recognizerSelect.value;
      if (rec === 'sface') {
        if (preset === 'strict') thresholdSlider.value = 0.45;
        else if (preset === 'balanced') thresholdSlider.value = 0.363;
        else if (preset === 'lenient') thresholdSlider.value = 0.30;
      } else {
        if (preset === 'strict') thresholdSlider.value = 0.70;
        else if (preset === 'balanced') thresholdSlider.value = 0.60;
        else if (preset === 'lenient') thresholdSlider.value = 0.50;
      }
      thresholdVal.textContent = parseFloat(thresholdSlider.value).toFixed(3);
      showToast(`Threshold adjusted to ${preset.toUpperCase()} (${thresholdSlider.value})`, 'info');
    });
  });

  // -------------------------------------------------------------
  // Verify Action Execution (API Call)
  // -------------------------------------------------------------
  verifyBtn.addEventListener('click', async () => {
    if (!file1 || !file2) {
      showToast('Please provide both Face 1 and Face 2 images to run verification.', 'error');
      return;
    }

    // Set UI Loading state
    document.body.classList.add('is-loading');
    verifyBtn.classList.add('is-verifying');
    verifyBtn.setAttribute('disabled', 'true');

    const formData = new FormData();
    formData.append('image1', file1);
    formData.append('image2', file2);
    formData.append('detector', detectorSelect.value);
    formData.append('recognizer', recognizerSelect.value);
    formData.append('threshold', thresholdSlider.value);

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify`, {
        method: 'POST',
        body: formData
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        throw new Error(`Server returned HTTP ${response.status} (${response.statusText}): ${rawText.slice(0, 120) || 'Empty response'}. Expected FastAPI JSON at ${API_BASE_URL}/api/verify`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || `Verification failed (Status ${response.status}).`);
      }

      displayResults(data);
      showToast('Face verification finished successfully on CPU!', 'success');
    } catch (err) {
      console.error('Verification error:', err);
      showToast(`Inference Error: ${err.message}`, 'error');
    } finally {
      document.body.classList.remove('is-loading');
      verifyBtn.classList.remove('is-verifying');
      verifyBtn.removeAttribute('disabled');
    }
  });

  // -------------------------------------------------------------
  // Render Verification Results
  // -------------------------------------------------------------
  function displayResults(res) {
    resultsCard.classList.add('active-results');

    // Hero Badge
    const heroBadge = document.getElementById('results-status-badge');
    const heroTitle = document.getElementById('results-status-title');
    const isMatch = res.is_match;

    if (isMatch) {
      heroBadge.className = 'status-badge-hero match';
      heroBadge.innerHTML = `
        <div class="icon-bubble bubble-sm success">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <span>VERIFIED IDENTITY MATCH</span>
      `;
      heroTitle.textContent = `High confidence biometric match: Both images correspond to the same individual.`;
    } else {
      heroBadge.className = 'status-badge-hero mismatch';
      heroBadge.innerHTML = `
        <div class="icon-bubble bubble-sm danger">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </div>
        <span>IDENTITY MISMATCH DETECTED</span>
      `;
      heroTitle.textContent = `Biometric distance exceeds threshold: Differing identities or imposter check flagged.`;
    }

    // Metrics Row
    document.getElementById('metric-confidence').textContent = `${res.confidence_percentage}%`;
    document.getElementById('metric-cosine').textContent = res.cosine_similarity.toFixed(4);
    document.getElementById('metric-euclidean').textContent = res.euclidean_distance.toFixed(4);
    document.getElementById('metric-latency').textContent = `${res.latencies_ms.total_cpu_time} ms`;

    // 4-Image Inspection
    document.getElementById('res-annotated-1').src = res.annotated_image1;
    document.getElementById('res-crop-1').src = res.crop_image1;
    document.getElementById('res-crop-2').src = res.crop_image2;
    document.getElementById('res-annotated-2').src = res.annotated_image2;

    // Latency Table Breakdown
    const tbody = document.getElementById('latency-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td>Face Detector (${res.models_used.detector.toUpperCase()})</td>
          <td>Image 1 Localization & Keypoints</td>
          <td><span class="badge badge-cpu">${res.latencies_ms.detection_image1} ms</span></td>
          <td>CPU Thread Pool (4 vCPU)</td>
        </tr>
        <tr>
          <td>Face Detector (${res.models_used.detector.toUpperCase()})</td>
          <td>Image 2 Localization & Keypoints</td>
          <td><span class="badge badge-cpu">${res.latencies_ms.detection_image2} ms</span></td>
          <td>CPU Thread Pool (4 vCPU)</td>
        </tr>
        <tr>
          <td>Feature Extractor (${res.models_used.recognizer.toUpperCase()})</td>
          <td>Crop 1 &rarr; ${res.models_used.embedding_dimension}-d Vector</td>
          <td><span class="badge badge-cpu">${res.latencies_ms.embedding_image1} ms</span></td>
          <td>ONNX Runtime CPU Engine</td>
        </tr>
        <tr>
          <td>Feature Extractor (${res.models_used.recognizer.toUpperCase()})</td>
          <td>Crop 2 &rarr; ${res.models_used.embedding_dimension}-d Vector</td>
          <td><span class="badge badge-cpu">${res.latencies_ms.embedding_image2} ms</span></td>
          <td>ONNX Runtime CPU Engine</td>
        </tr>
        <tr style="font-weight: 700; background-color: hsla(215, 90%, 55%, 0.1);">
          <td>Total End-to-End CPU Latency</td>
          <td>Complete 1:1 Biometric Verification</td>
          <td><span class="badge ${isMatch ? 'badge-match' : 'badge-mismatch'}">${res.latencies_ms.total_cpu_time} ms</span></td>
          <td>Zero GPU / No Cold Start</td>
        </tr>
      `;
    }

    // Warnings if any
    const warningsContainer = document.getElementById('results-warnings');
    if (warningsContainer) {
      if (res.warnings && res.warnings.length > 0) {
        warningsContainer.style.display = 'block';
        warningsContainer.innerHTML = res.warnings.map(w => `<p style="color: var(--color-yellow-8); margin: 4px 0;">Notice: ${w}</p>`).join('');
      } else {
        warningsContainer.style.display = 'none';
      }
    }

    // Scroll smoothly to results
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // -------------------------------------------------------------
  // View & Tab Switcher
  // -------------------------------------------------------------
  window.switchAppTab = function (tabId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active-view'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetSection = document.getElementById(`view-${tabId}`);
    if (targetSection) {
      targetSection.classList.add('active-view');
    }

    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // -------------------------------------------------------------
  // Sticky Bottom Right Rectangular Navigation
  // (Instant scroll without animation as per user rule)
  // -------------------------------------------------------------
  if (scrollUpBtn) {
    scrollUpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }

  if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'instant' });
    });
  }

  // -------------------------------------------------------------
  // Initialization & Autofocus
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    setupDropzone(dropzone1, fileInput1, previewWrap1, previewImg1, emptyPrompt1, 1);
    setupDropzone(dropzone2, fileInput2, previewWrap2, previewImg2, emptyPrompt2, 2);

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        window.switchAppTab(tab);
      });
    });

    // Autofocus on the first input box upon load as required by rules
    if (detectorSelect) {
      detectorSelect.focus();
    }

    initConfig();
  });

})();
