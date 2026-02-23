// ============================================================
// PVD Snow — Client Logic (Step Wizard v3)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyClljpzQrR9-LGvD_xtWtOfcTebTAO0P80",
  authDomain: "pvd-snow-report.firebaseapp.com",
  projectId: "pvd-snow-report",
  storageBucket: "pvd-snow-report.firebasestorage.app",
  messagingSenderId: "224841506687",
  appId: "1:224841506687:web:1626643194b097db79844a"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const CATEGORY_LABELS = {
  unshoveled_sidewalk: 'Unshoveled Sidewalk',
  missed_plowing: 'Missed Street Plowing'
};

// --- DOM refs ---
const wizard = document.getElementById('wizard');
const steps = wizard.querySelectorAll('.step');
const progressFill = document.getElementById('progressFill');
const progressSteps = document.querySelectorAll('.progress-step');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const categoryBtns = document.getElementById('categoryBtns');
const photoInput = document.getElementById('photoInput');
const photoCaptureBtn = document.getElementById('photoCaptureBtn');
const previewImg = document.getElementById('previewImg');
const photoRetake = document.getElementById('photoRetake');
const photoExifStatus = document.getElementById('photoExifStatus');
const locationStatus = document.getElementById('locationStatus');
const detectBtn = document.getElementById('detectLocationBtn');
const addressInput = document.getElementById('addressInput');
const latLngEl = document.getElementById('latLng');
const locationSection = document.getElementById('locationSection');
const locationHeading = document.getElementById('locationHeading');
const descriptionInput = document.getElementById('descriptionInput');
const contactToggle = document.getElementById('contactToggle');
const contactFields = document.getElementById('contactFields');
const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const reviewCategory = document.getElementById('reviewCategory');
const reviewAddress = document.getElementById('reviewAddress');
const reviewPhoto = document.getElementById('reviewPhoto');
const overlay = document.getElementById('submittingOverlay');
const confirmation = document.getElementById('confirmationScreen');
const confirmCategory = document.getElementById('confirmCategory');
const confirmAddress = document.getElementById('confirmAddress');
const submitAnother = document.getElementById('submitAnother');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const errorDismiss = document.getElementById('errorDismiss');

const TOTAL_STEPS = 4;
let currentStep = 0;

// --- State ---
let selectedCategory = null;
let photoDataUrl = null;
let currentLat = null;
let currentLng = null;
let hasExifGps = false;

// --- Location state machine ---
function setLocationState(state) {
  locationSection.classList.remove('state-confirmed', 'state-needs-input', 'state-detecting', 'state-detect-failed');
  if (state) {
    locationSection.classList.add('state-' + state);
  }
  if (state === 'confirmed') {
    locationHeading.textContent = 'Confirm location';
  } else {
    locationHeading.textContent = 'Set location';
  }
}

// --- Step navigation ---
function goToStep(n) {
  currentStep = n;
  steps.forEach((s, i) => s.classList.toggle('active', i === n));
  progressSteps.forEach((s, i) => {
    s.classList.toggle('active', i === n);
    s.classList.toggle('done', i < n);
  });
  progressFill.style.width = `${((n + 1) / TOTAL_STEPS) * 100}%`;

  backBtn.classList.toggle('hidden', n === 0);
  errorBanner.classList.remove('visible');

  if (n === TOTAL_STEPS - 1) {
    nextBtn.textContent = 'Submit Report';
    populateReview();
  } else {
    nextBtn.textContent = 'Next';
  }

  validateStep();
  window.scrollTo(0, 0);
}

// #1: Tappable progress steps — only completed steps
document.querySelector('.progress-steps').addEventListener('click', (e) => {
  const btn = e.target.closest('.progress-step');
  if (!btn || !btn.classList.contains('done')) return;
  goToStep(parseInt(btn.dataset.step, 10));
});

// #5: Tappable review rows
document.querySelector('.review-card').addEventListener('click', (e) => {
  const row = e.target.closest('.review-row-btn');
  if (!row) return;
  goToStep(parseInt(row.dataset.goto, 10));
});

function validateStep() {
  let valid = false;
  switch (currentStep) {
    case 0: valid = !!selectedCategory; break;
    case 1: valid = !!photoDataUrl; break;
    case 2: valid = addressInput.value.trim().length > 0; break;
    case 3: valid = true; break;
  }
  nextBtn.disabled = !valid;
}

function populateReview() {
  reviewCategory.textContent = CATEGORY_LABELS[selectedCategory] || selectedCategory;
  reviewAddress.textContent = addressInput.value.trim();
  reviewPhoto.src = photoDataUrl;
}

nextBtn.addEventListener('click', async () => {
  if (nextBtn.disabled) return;
  if (currentStep < TOTAL_STEPS - 1) {
    goToStep(currentStep + 1);
  } else {
    await submitReport();
  }
});

backBtn.addEventListener('click', () => {
  if (currentStep > 0) goToStep(currentStep - 1);
});

// --- Step 0: Category (#3: auto-advance) ---
categoryBtns.addEventListener('click', (e) => {
  const btn = e.target.closest('.category-btn');
  if (!btn) return;
  categoryBtns.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedCategory = btn.dataset.category;
  validateStep();

  // Auto-advance after brief delay
  setTimeout(() => {
    if (currentStep === 0 && selectedCategory) goToStep(1);
  }, 300);
});

// --- Step 1: Photo capture + EXIF GPS ---
photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const [exifGps, dataUrl] = await Promise.all([
    readExifGps(file).catch(() => null),
    compressImage(file, 800, 0.7).catch(() => fileToDataUrl(file))
  ]);

  photoDataUrl = dataUrl;
  previewImg.src = dataUrl;
  photoCaptureBtn.classList.add('has-photo');

  // #4: Show EXIF status on the photo step
  if (exifGps) {
    hasExifGps = true;
    currentLat = exifGps.lat;
    currentLng = exifGps.lng;
    latLngEl.textContent = `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
    locationStatus.textContent = 'Location detected from photo.';
    photoExifStatus.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,7 6,10 11,4"/></svg> Photo + location attached';
    photoExifStatus.classList.remove('no-gps');
    setLocationState('confirmed');
    reverseGeocode(currentLat, currentLng);
  } else {
    hasExifGps = false;
    locationStatus.textContent = 'No location in photo. Use Detect or type an address.';
    photoExifStatus.textContent = 'Photo attached — no location data';
    photoExifStatus.classList.add('no-gps');
    setLocationState('needs-input');
  }

  validateStep();
});

photoRetake.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  photoDataUrl = null;
  hasExifGps = false;
  photoInput.value = '';
  previewImg.src = '';
  photoCaptureBtn.classList.remove('has-photo');
  validateStep();
  photoInput.click();
});

// --- Image compression → base64 ---
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round(h * (maxWidth / w));
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Minimal EXIF GPS parser ---
function readExifGps(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseExifGps(new DataView(e.target.result));
        if (result) resolve(result);
        else reject(new Error('No GPS data'));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

function parseExifGps(view) {
  if (view.getUint16(0) !== 0xFFD8) return null;

  let offset = 2;
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) break;
    if ((marker & 0xFF00) !== 0xFF00) return null;
    offset += 2 + view.getUint16(offset + 2);
  }

  const app1Start = offset + 4;
  if (app1Start + 6 > view.byteLength) return null;
  if (view.getUint32(app1Start) !== 0x45786966 || view.getUint16(app1Start + 4) !== 0x0000) return null;

  const tiffStart = app1Start + 6;
  const bigEndian = view.getUint16(tiffStart) === 0x4D4D;
  const g16 = (o) => view.getUint16(tiffStart + o, !bigEndian);
  const g32 = (o) => view.getUint32(tiffStart + o, !bigEndian);

  let ifdOffset = g32(4);
  const ifdCount = g16(ifdOffset);
  let gpsIfdOffset = null;

  for (let i = 0; i < ifdCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (g16(entryOffset) === 0x8825) {
      gpsIfdOffset = g32(entryOffset + 8);
      break;
    }
  }

  if (gpsIfdOffset === null) return null;

  const gpsCount = g16(gpsIfdOffset);
  const tags = {};
  for (let i = 0; i < gpsCount; i++) {
    const eo = gpsIfdOffset + 2 + i * 12;
    const tag = g16(eo);
    const type = g16(eo + 2);
    const count = g32(eo + 4);
    const valOffset = g32(eo + 8);

    if (type === 2 && count <= 4) {
      tags[tag] = String.fromCharCode(view.getUint8(tiffStart + eo + 8));
    } else if (type === 2) {
      let s = '';
      for (let j = 0; j < count - 1; j++) s += String.fromCharCode(view.getUint8(tiffStart + valOffset + j));
      tags[tag] = s;
    } else if (type === 5 && count === 3) {
      tags[tag] = readRationals(view, tiffStart + valOffset, bigEndian);
    }
  }

  if (!tags[2] || !tags[4]) return null;

  let lat = dmsToDecimal(tags[2]);
  let lng = dmsToDecimal(tags[4]);
  if (tags[1] === 'S') lat = -lat;
  if (tags[3] === 'W') lng = -lng;

  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function readRationals(view, offset, bigEndian) {
  const le = !bigEndian;
  const result = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(offset + i * 8, le);
    const den = view.getUint32(offset + i * 8 + 4, le);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

function dmsToDecimal([d, m, s]) {
  return d + m / 60 + s / 3600;
}

// --- Reverse geocoding (ArcGIS — matches the city's 311 portal geocoder) ---
async function reverseGeocode(lat, lng) {
  try {
    const resp = await fetch(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&featureTypes=StreetAddress,StreetName,StreetInt&f=pjson`
    );
    const data = await resp.json();
    if (data.address) {
      const a = data.address;
      addressInput.value = a.Address || a.ShortLabel || a.Match_addr || '';
      validateStep();
    }
  } catch (err) {
    console.error('Reverse geocode failed:', err);
  }
}

// --- Step 2: Location fallback ---
detectBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Geolocation not supported by this browser.';
    setLocationState('detect-failed');
    addressInput.focus();
    return;
  }

  detectBtn.classList.add('detecting');
  setLocationState('detecting');
  latLngEl.textContent = 'Detecting…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLat = pos.coords.latitude;
      currentLng = pos.coords.longitude;
      latLngEl.textContent = `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
      detectBtn.classList.remove('detecting');
      locationStatus.textContent = 'Location detected from GPS.';
      setLocationState('confirmed');
      reverseGeocode(currentLat, currentLng);
    },
    () => {
      detectBtn.classList.remove('detecting');
      locationStatus.textContent = 'Could not access location. Enter an address instead.';
      setLocationState('detect-failed');
      addressInput.focus();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

addressInput.addEventListener('input', validateStep);

// --- Step 3: Contact toggle ---
contactToggle.addEventListener('click', () => {
  contactToggle.classList.toggle('open');
  contactFields.classList.toggle('visible');
});

// --- #7: Error banner ---
errorDismiss.addEventListener('click', () => {
  errorBanner.classList.remove('visible');
});

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.classList.add('visible');
}

// --- Submit ---
async function submitReport() {
  overlay.classList.add('visible');
  errorBanner.classList.remove('visible');

  try {
    await db.collection('reports').add({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      category: selectedCategory,
      address: addressInput.value.trim(),
      lat: currentLat,
      lng: currentLng,
      description: descriptionInput.value.trim() || null,
      photo: photoDataUrl,
      reporterName: nameInput.value.trim() || null,
      reporterEmail: emailInput.value.trim() || null,
      status: 'pending',
      statusDetail: null,
      portalCaseId: null,
      statusUpdatedAt: null
    });

    overlay.classList.remove('visible');
    wizard.style.display = 'none';
    document.getElementById('wizardNav').style.display = 'none';
    document.getElementById('progressBar').style.display = 'none';

    // #9: Populate confirmation summary
    confirmCategory.textContent = CATEGORY_LABELS[selectedCategory] || selectedCategory;
    confirmAddress.textContent = addressInput.value.trim();
    confirmation.classList.add('visible');

  } catch (err) {
    console.error('Submission failed:', err);
    overlay.classList.remove('visible');
    showError('Submission failed. Please check your connection and try again.');
  }
}

// --- Share buttons ---
const shareNativeBtn = document.getElementById('shareNative');
const shareCopyBtn = document.getElementById('shareCopy');

if (!navigator.share) {
  shareNativeBtn.style.display = 'none';
}

shareNativeBtn.addEventListener('click', () => {
  const issueLabel = selectedCategory === 'unshoveled_sidewalk'
    ? 'an unshoveled sidewalk'
    : 'an unplowed street';
  const shareText = `I just reported ${issueLabel} in Providence using pvdsnow.org \u2014 takes 30 seconds from your phone.`;
  navigator.share({ text: shareText, url: 'https://pvdsnow.org' }).catch(() => {});
});

shareCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('https://pvdsnow.org').then(() => {
    shareCopyBtn.textContent = 'Copied!';
    setTimeout(() => {
      shareCopyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Copy link';
    }, 2000);
  });
});

// --- Submit another ---
submitAnother.addEventListener('click', () => {
  selectedCategory = null;
  photoDataUrl = null;
  currentLat = null;
  currentLng = null;
  hasExifGps = false;

  categoryBtns.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
  photoInput.value = '';
  previewImg.src = '';
  photoCaptureBtn.classList.remove('has-photo');
  addressInput.value = '';
  latLngEl.textContent = '';
  locationStatus.textContent = 'Checking photo for location data...';
  setLocationState(null);
  descriptionInput.value = '';
  nameInput.value = '';
  emailInput.value = '';
  contactToggle.classList.remove('open');
  contactFields.classList.remove('visible');
  errorBanner.classList.remove('visible');

  wizard.style.display = '';
  document.getElementById('wizardNav').style.display = '';
  document.getElementById('progressBar').style.display = '';
  confirmation.classList.remove('visible');
  shareCopyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Copy link';

  goToStep(0);
});

// --- Init ---
goToStep(0);
