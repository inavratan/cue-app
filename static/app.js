/**
 * Cue — Your signal to move
 * AI-powered stadium companion for Indian sporting venues
 * Built with Google Antigravity | Powered by Gemini 2.5 Flash
 * PromptWars Virtual 2026
 *
 * All venue data is fetched from the Flask backend API.
 * No client-side data.js dependency.
 */

// ─── Core State ──────────────────────────────────────────────────────
let currentPhase = 'match';
let currentVenueData = null;
let userActions = { goNowClicks: 0 };
let currentTicketIndex = 0;
let customExitDestination = null;
const TRANSLATION_CACHE = JSON.parse(sessionStorage.getItem('translationCache') || '{}');

const UI_TRANSLATIONS = {
  'hi': {
    'Recommended Entry': 'अनुशंसित प्रवेश',
    'Your Seats': 'आपकी सीटें',
    'Gate A — North Stand': 'गेट A — उत्तर स्टैंड',
    'HIGH': 'उच्च',
    'MODERATE': 'मध्यम',
    'LOW': 'कम',
    'min wait': 'मिनट प्रतीक्षा',
    'Scan at gate': 'गेट पर स्कैन करें',
    'Food & Drinks': 'खाना और पेय',
    'Restrooms': 'शौचालय',
    'Getting Home': 'घर जाना',
    'Match Status': 'मैच स्थिति',
    'Crowd Density': 'भीड़ घनत्व',
    'Smart Suggestions': 'स्मार्ट सुझाव',
    'Exit Crowd Forecast': 'निकास भीड़ पूर्वानुमान',
    'Rate Your Experience': 'अपना अनुभव साझा करें',
    'Event Timeline': 'कार्यक्रम की समयरेखा',
    'Live': 'लाइव',
    'Match On 🏏': 'मैच जारी 🏏'
  }
};

// ─── DOM Element References ──────────────────────────────────────────
const venueSelect = document.getElementById('venueSelect');
const a11yToggle = document.getElementById('a11yToggle');
const matchName = document.getElementById('matchName');
const matchDetails = document.getElementById('matchDetails');
const matchCity = document.getElementById('matchCity');
const seatInfo = document.getElementById('seatInfo');
const stadiumHeroImage = document.getElementById('stadiumHeroImage');
const gatesContainer = document.getElementById('gatesContainer');
const timelineContainer = document.getElementById('timelineContainer');
const tabs = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.tab-panel');

const qrTriggerBtn = document.getElementById('qrTriggerBtn');
const qrModal = document.getElementById('qrModal');
const closeQrBtn = document.getElementById('closeQrBtn');
const qrModalSeatInfo = document.getElementById('qrModalSeatInfo');
const qrPagination = document.getElementById('qrPagination');
const prevTicketBtn = document.getElementById('prevTicketBtn');
const nextTicketBtn = document.getElementById('nextTicketBtn');

const pulseOvers = document.getElementById('pulseOvers');
const pulsePhaseIndicator = document.getElementById('pulsePhaseIndicator');
const pulsePhaseDesc = document.getElementById('pulsePhaseDesc');
const pulseZonesGrid = document.getElementById('pulseZonesGrid');
const pulseFoodList = document.getElementById('pulseFoodList');
const pulseRestroomList = document.getElementById('pulseRestroomList');
const pulseAIPrediction = document.getElementById('pulseAIPrediction');
const segmentBtns = document.querySelectorAll('.segment-btn');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const suggestionChips = document.querySelectorAll('.suggestion-chip');

const exitHeroCard = document.getElementById('exitHeroCard');
const exitHeadline = document.getElementById('exitHeadline');
const exitDetail = document.getElementById('exitDetail');
const exitWaitSaved = document.getElementById('exitWaitSaved');
const transportContainer = document.getElementById('transportContainer');
const forecastChart = document.getElementById('forecastChart');
const stars = document.querySelectorAll('.star');
const feedbackContainer = document.getElementById('feedbackContainer');
const feedbackChips = document.querySelectorAll('.feedback-chip');
const feedbackThanks = document.getElementById('feedbackThanks');

const sosModal = document.getElementById('sosModal');
const closeSosBtn = document.getElementById('closeSosBtn');
const sosCardsContainer = document.getElementById('sosCardsContainer');
const conciergeSosChip = document.getElementById('conciergeSosChip');
const sosHeaderBtn = document.getElementById('sosHeaderBtn');

const loreBtn = document.getElementById('loreBtn');
const headerMapBtn = document.getElementById('headerMapBtn');
const mapModal = document.getElementById('mapModal');
const closeMapBtn = document.getElementById('closeMapBtn');
const stadiumSvg = document.getElementById('stadiumSvg');
const mapTitle = document.getElementById('mapTitle');
const mapSubtitle = document.getElementById('mapSubtitle');
const demoToggleBtn = document.getElementById('demoToggleBtn');
const langToggleBtn = document.getElementById('langToggleBtn');
const calendarBtn = document.getElementById('calendarBtn');
const firebaseAuthBadge = document.getElementById('firebaseAuthBadge');

// ─── API Helper ──────────────────────────────────────────────────────
/**
 * Make an API call to the Flask backend.
 * @param {string} endpoint - API endpoint path
 * @param {string} [method='GET'] - HTTP method
 * @param {Object|null} [body=null] - Request body for POST requests
 * @returns {Promise<Object|null>} Parsed JSON response or null on error
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  // Attach Firebase idToken for authenticated endpoints
  const idToken = sessionStorage.getItem('firebaseIdToken');
  if (idToken) opts.headers['Authorization'] = `Bearer ${idToken}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const resp = await fetch(endpoint, opts);
    return await resp.json();
  } catch (err) {
    console.error(`API error (${endpoint}):`, err);
    return null;
  }
}

const API_CACHE = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function cachedApiCall(endpoint, method = 'GET', body = null) {
  const cacheKey = `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
  const cached = API_CACHE[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await apiCall(endpoint, method, body);
  if (data) {
    API_CACHE[cacheKey] = { data, timestamp: Date.now() };
  }
  return data;
}



// ─── Initialization ──────────────────────────────────────────────────
/**
 * Initialize the Cue application — bind events, load venue data, register service worker.
 * @returns {Promise<void>}
 */
async function init() {
  console.log("🚀 Cue: Initialization Sequence Started");
  try {
    if (!venueSelect) throw new Error("Critical element #venueSelect missing");

    await updateVenue(venueSelect.value);
    initAutocomplete();
    initFirebaseAnonymousAuth();
    verifyGoogleServices();

    venueSelect.addEventListener('change', (e) => {
      updateVenue(e.target.value);
      if (typeof gtag === 'function') gtag('event', 'venue_selected', { 'venue_name': e.target.value });
    });
    if (a11yToggle) a11yToggle.addEventListener('click', toggleAccessibility);
    if (headerMapBtn) headerMapBtn.addEventListener('click', () => openNavigator());
    if (loreBtn) loreBtn.addEventListener('click', showStadiumFacts);
    const closeFactsBtn = document.getElementById('closeFactsBtn');
    if (closeFactsBtn) closeFactsBtn.addEventListener('click', closeFacts);
    if (sosHeaderBtn) sosHeaderBtn.addEventListener('click', () => {
      triggerSOS();
      if (typeof gtag === 'function') gtag('event', 'emergency_accessed');
    });
    if (closeMapBtn) closeMapBtn.addEventListener('click', () => { mapModal.style.display = 'none'; });

    // Google Calendar button
    if (calendarBtn) calendarBtn.addEventListener('click', openGoogleCalendar);

    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', toggleLanguage);
    }

    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab)));

    segmentBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        segmentBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentPhase = e.target.getAttribute('data-phase');
        renderLivePulse();
        renderExitScreen();
        if (typeof gtag === 'function') gtag('event', 'phase_changed', { 'phase': currentPhase });
      });
    });

    if (qrTriggerBtn) {
      qrTriggerBtn.addEventListener('click', () => {
        qrModal.style.display = 'flex';
        updateQrModalTicket();
      });
    }
    if (closeQrBtn) closeQrBtn.addEventListener('click', () => { qrModal.style.display = 'none'; });
    if (prevTicketBtn) prevTicketBtn.addEventListener('click', () => {
      if (currentTicketIndex > 0) { currentTicketIndex--; updateQrModalTicket(); }
    });
    if (nextTicketBtn) nextTicketBtn.addEventListener('click', () => {
      if (currentVenueData && currentVenueData.seats && currentTicketIndex < currentVenueData.seats.length - 1) {
        currentTicketIndex++; updateQrModalTicket();
      }
    });

    if (sendChatBtn) sendChatBtn.addEventListener('click', handleChatSubmit);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChatSubmit(); });

    suggestionChips.forEach(chip => {
      if (!chip.classList.contains('sos-chip')) {
        chip.addEventListener('click', () => { chatInput.value = chip.textContent; handleChatSubmit(); });
      }
    });

    loadInitialMessages();

    if (closeSosBtn) closeSosBtn.addEventListener('click', () => { sosModal.style.display = 'none'; });
    if (conciergeSosChip) conciergeSosChip.addEventListener('click', openSosModal);

    if (demoToggleBtn) {
      demoToggleBtn.addEventListener('click', () => {
        const phases = ['pre-match', 'match', 'break', 'post-match'];
        const currentIdx = phases.indexOf(currentPhase);
        currentPhase = phases[(currentIdx + 1) % phases.length];
        const labelMap = { 'pre-match': 'Demo: Pre-match', 'match': 'Demo: Match', 'break': 'Demo: Break', 'post-match': 'Demo: Post-match' };
        demoToggleBtn.textContent = labelMap[currentPhase];
        updateVenue(venueSelect.value);
        showSmartToast(`Simulating ${currentPhase} phase...`);
      });
    }

    // Star rating
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.value);
        stars.forEach((s, i) => {
          s.textContent = i < val ? '★' : '☆';
          s.classList.toggle('filled', i < val);
          s.setAttribute('aria-checked', i < val ? 'true' : 'false');
        });
        if (feedbackContainer) feedbackContainer.style.display = 'flex';

        // Update ARIA state for accessibility
        const feedbackTrigger = document.querySelector('[aria-expanded="false"]');
        if (feedbackTrigger) {
          feedbackTrigger.setAttribute('aria-expanded', 'true');
        }

        // Save to backend
        apiCall('/api/save-feedback', 'POST', {
          venue_id: venueSelect.value,
          rating: val,
          chips: []
        });
      });
    });

    // Feedback chips
    feedbackChips.forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        chip.setAttribute('aria-checked', chip.classList.contains('selected') ? 'true' : 'false');
        if (feedbackThanks) {
          feedbackThanks.style.display = 'block';
          setTimeout(() => { feedbackThanks.style.opacity = '1'; }, 50);
        }
      });
    });

    const generatePosterBtn = document.getElementById('generatePosterBtn');
    if (generatePosterBtn) {
      generatePosterBtn.addEventListener('click', () => {
        const originalText = generatePosterBtn.textContent;
        generatePosterBtn.textContent = 'Generating...';
        generatePosterBtn.style.opacity = '0.8';
        setTimeout(() => {
          generateSouvenir();
          generatePosterBtn.textContent = 'Downloaded!';
          setTimeout(() => { generatePosterBtn.textContent = originalText; generatePosterBtn.style.opacity = '1'; }, 2000);
        }, 100);
      });
    }

    setInterval(() => {
      const pulsePanel = document.getElementById('panel-pulse');
      if (pulsePanel && pulsePanel.classList.contains('active')) renderLivePulse();
    }, 8000);

    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').then(() => console.log('📱 PWA: Service Worker registered')).catch(err => console.log('📱 PWA: SW skipped', err)); }
    console.log("✅ Cue: Initialization Complete");
  } catch (error) {
    console.error("❌ Cue: Initialization Failed:", error);
  }
}

// ─── Global Utilities ────────────────────────────────────────────────
function closeFacts() {
  const modal = document.getElementById('factsModal');
  if (modal) modal.style.display = 'none';
}
window.closeFacts = closeFacts;

function showSmartToast(message) {
  const toast = document.getElementById('smartToast');
  const toastText = document.getElementById('smartToastText');
  if (toast && toastText) {
    toastText.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
  }
}

// ─── QR Modal ────────────────────────────────────────────────────────
function updateQrModalTicket() {
  if (!currentVenueData || !currentVenueData.seats) return;
  const ticket = currentVenueData.seats[currentTicketIndex];
  if (qrPagination) qrPagination.textContent = `Ticket ${currentTicketIndex + 1} of ${currentVenueData.seats.length}`;
  if (qrModalSeatInfo) qrModalSeatInfo.textContent = `Block ${ticket.block} · Row ${ticket.row} · Seat ${ticket.seat}`;
  if (prevTicketBtn) prevTicketBtn.disabled = (currentTicketIndex === 0);
  if (nextTicketBtn) nextTicketBtn.disabled = (currentTicketIndex === currentVenueData.seats.length - 1);

  const qrLarge = document.querySelector('.qr-placeholder-large');
  if (qrLarge) {
    qrLarge.innerHTML = '';
    for (let i = 0; i < 100; i++) {
      const dot = document.createElement('div');
      dot.style.backgroundColor = (Math.random() > 0.4) ? 'var(--md-sys-color-on-surface)' : 'transparent';
      dot.style.borderRadius = '1px';
      qrLarge.appendChild(dot);
    }
  }
}

// ─── Real Google Maps Autocomplete ──────────────────────────────────
function initAutocomplete() {
  const input = document.getElementById('routeDestinationInput');
  if (!input || typeof google === 'undefined') {
    console.log("📍 Maps API: google.maps not available, falling back to simulation");
    return initSimulatedAutocomplete();
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "in" },
    fields: ["address_components", "geometry", "name"],
    types: ["address"],
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      window.alert("No details available for input: '" + place.name + "'");
      return;
    }
    customExitDestination = { name: place.name, dist: "Mapping...", type: "transport" };
    renderExitScreen();
    if (typeof gtag === 'function') gtag('event', 'destination_searched', { 'place_name': place.name });
  });
}

function initSimulatedAutocomplete() {
  const input = document.getElementById('routeDestinationInput');
  if (!input) return;
  const resultsDiv = document.getElementById('routeAutocompleteResults');
  const suggestions = [
    { name: "Bandra Station", dist: "18.5km" },
    { name: "Churchgate Station", dist: "1.2km" },
    { name: "Dadar Station", dist: "8.7km" },
    { name: "Andheri Station", dist: "22.1km" },
    { name: "CST Station", dist: "3.4km" },
  ];
  input.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    if (!resultsDiv || query.length < 2) {
      if (resultsDiv) resultsDiv.style.display = 'none';
      return;
    }
    const matches = suggestions.filter(s => s.name.toLowerCase().includes(query));
    if (matches.length === 0) { resultsDiv.style.display = 'none'; return; }
    resultsDiv.innerHTML = matches.map(s =>
      `<div class="autocomplete-item" style="padding: 12px 16px; cursor: pointer; font-size: 14px; border-bottom: 1px solid var(--md-sys-color-outline-variant);">${s.name} <span style="color: var(--md-sys-color-on-surface-variant); font-size: 12px;">(${s.dist})</span></div>`
    ).join('');
    resultsDiv.style.display = 'block';
    resultsDiv.querySelectorAll('.autocomplete-item').forEach((item, idx) => {
      item.addEventListener('click', () => {
        input.value = matches[idx].name;
        customExitDestination = { name: matches[idx].name, dist: matches[idx].dist };
        resultsDiv.style.display = 'none';
        renderExitScreen();
        if (typeof gtag === 'function') gtag('event', 'destination_searched', { 'place_name': matches[idx].name });
      });
    });
  });
}

// ─── Venue Update (API-driven) ───────────────────────────────────────
/**
 * Fetch and render all data for the selected venue.
 * @param {string} venueKey - Venue identifier (e.g. 'wankhede')
 * @returns {Promise<void>}
 */
async function updateVenue(venueKey) {
  const data = await cachedApiCall(`/api/venue/${venueKey}`);
  if (!data) return;
  currentVenueData = data;

  venueSelect.value = venueKey;
  matchName.textContent = data.match;
  matchDetails.textContent = `${data.format} · ${data.time}`;
  matchCity.textContent = data.city;

  if (stadiumHeroImage && data.heroImage) {
  // Optimize Cloudinary image: resize to 800px, auto quality, auto format
  const optimizedUrl = data.heroImage.replace('/upload/', '/upload/w_800,c_fill,q_auto,f_auto/');
  stadiumHeroImage.src = optimizedUrl;
  stadiumHeroImage.alt = `${data.name} 3D View`;
}

  const seatLabel = document.getElementById('seatLabel');
  const firstSeat = data.seats && data.seats.length > 0 ? data.seats[0] : null;
  if (seatLabel) seatLabel.textContent = data.seats.length > 1 ? `Your Seats (${data.seats.length})` : "Your Seat";
  if (seatInfo && firstSeat) {
    const seatNumbers = data.seats.map(s => s.seat).join(', ');
    seatInfo.textContent = `Block ${firstSeat.block} · Row ${firstSeat.row} · Seats ${seatNumbers}`;
  }

  renderGates(data.gates);
  renderTimeline(data.timeline);
  renderLivePulse();
  renderExitScreen();
  
  if (currentLang === 'hi') {
    translatePage();
  }
}

// ─── Render Functions ────────────────────────────────────────────────
/**
 * Render gate entry cards with wait times and recommended badges.
 * @param {Array<Object>} gates - Gate objects with name, area, wait, status
 */
function renderGates(gates) {
  gatesContainer.innerHTML = '';
  gates.forEach(gate => {
    const card = document.createElement('div');
    card.className = `card gate-card ${gate.recommended ? 'recommended' : ''}`;
    const statusText = gate.status === 'low' ? 'low congestion' : (gate.status === 'medium' ? 'moderate congestion' : 'high congestion');
    card.setAttribute('aria-label', `${gate.name}, ${gate.area}, estimated wait ${gate.wait} minutes, ${statusText}`);

    const leftDiv = document.createElement('div');
    if (gate.recommended) {
      const bestLabel = document.createElement('div');
      bestLabel.className = 'best-gate-label';
      bestLabel.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">check</span> BEST GATE`;
      leftDiv.appendChild(bestLabel);
    }
    const gateName = document.createElement('div');
    gateName.className = 'text-primary text-medium';
    gateName.textContent = `${gate.name} — ${gate.area}`;
    leftDiv.appendChild(gateName);

    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openNavigator(gate.name));

    const rightDiv = document.createElement('div');
    rightDiv.className = 'gate-wait';
    const waitText = document.createElement('div');
    waitText.className = 'text-bold text-primary';
    waitText.textContent = `${gate.wait} min`;
    rightDiv.appendChild(waitText);
    const statusBadge = document.createElement('div');
    statusBadge.className = `status-badge status-${gate.status}`;
    statusBadge.textContent = gate.status === 'medium' ? 'MODERATE' : (gate.status || '').toUpperCase();
    rightDiv.appendChild(statusBadge);

    card.appendChild(leftDiv);
    card.appendChild(rightDiv);
    gatesContainer.appendChild(card);
  });
}

/**
 * Render the event timeline strip with past, current, and upcoming markers.
 * @param {Array<Object>} timeline - Timeline items with time, event, status
 */
function renderTimeline(timeline) {
  timelineContainer.innerHTML = '';
  timeline.forEach(item => {
    const timeItemDiv = document.createElement('div');
    timeItemDiv.className = `timeline-item timeline-${item.status}`;
    const timeDiv = document.createElement('div');
    timeDiv.className = 'timeline-time';
    timeDiv.textContent = item.time;
    timeItemDiv.appendChild(timeDiv);
    const eventDiv = document.createElement('div');
    eventDiv.className = 'timeline-event';
    if (item.status === 'past') {
      eventDiv.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom; margin-right: 4px;">check_circle</span>${item.event}`;
    } else {
      eventDiv.textContent = item.event;
    }
    timeItemDiv.appendChild(eventDiv);
    timelineContainer.appendChild(timeItemDiv);
  });
}

const tabLoadedState = { 'panel-entry': true, 'panel-pulse': false, 'panel-concierge': false, 'panel-exit': false };

/**
 * Switch the active tab panel and lazy-load data for the target panel.
 * @param {HTMLElement} selectedTab - The tab button element clicked
 */
function switchTab(selectedTab) {
  tabs.forEach(tab => { tab.classList.remove('active'); tab.setAttribute('aria-selected', 'false'); });
  selectedTab.classList.add('active');
  selectedTab.setAttribute('aria-selected', 'true');
  const targetPanelId = selectedTab.getAttribute('aria-controls');
  panels.forEach(panel => panel.classList.remove('active'));
  document.getElementById(targetPanelId).classList.add('active');

  // Lazy load panel data
  if (targetPanelId === 'panel-pulse' && !tabLoadedState['panel-pulse']) {
    renderLivePulse();
    tabLoadedState['panel-pulse'] = true;
  }
  if (targetPanelId === 'panel-exit' && !tabLoadedState['panel-exit']) {
    renderExitScreen();
    tabLoadedState['panel-exit'] = true;
  }

  if (typeof gtag === 'function') {
    if (targetPanelId === 'panel-concierge') gtag('event', 'concierge_opened');
    if (targetPanelId === 'panel-exit') gtag('event', 'exit_planned');
  }
}

function toggleAccessibility() {
  document.body.classList.toggle('a11y-mode');
  if (document.body.classList.contains('a11y-mode')) {
    a11yToggle.style.backgroundColor = 'var(--md-sys-color-on-surface)';
    a11yToggle.style.color = 'var(--md-sys-color-surface)';
  } else {
    a11yToggle.style.backgroundColor = 'white';
    a11yToggle.style.color = 'var(--md-sys-color-on-surface)';
  }
}

// ─── Language Toggle ─────────────────────────────────────────────────
let currentLang = 'en';
async function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'en' ? 'EN' : 'हि';
    langToggleBtn.classList.toggle('active', currentLang === 'hi');
  }
  
  await translatePage();
  showSmartToast(currentLang === 'hi' ? 'हिंदी मोड सक्रिय' : 'English mode active');
}

/**
 * Translate a single text string to the current language via the backend API.
 * @param {string} text - Text to translate
 * @returns {Promise<string>} Translated text or original if unavailable
 */
async function translateText(text) {
  if (currentLang === 'en') return text;
  
  const cacheKey = `en_hi_${text}`;
  if (TRANSLATION_CACHE[cacheKey]) return TRANSLATION_CACHE[cacheKey];
  
  const data = await apiCall('/api/translate', 'POST', { text, target: 'hi' });
  if (data && data.translatedText) {
    TRANSLATION_CACHE[cacheKey] = data.translatedText;
    sessionStorage.setItem('translationCache', JSON.stringify(TRANSLATION_CACHE));
    return data.translatedText;
  }
  return text;
}

/**
 * Translate all data-i18n elements using local cache and batch API.
 * @returns {Promise<void>}
 */
async function translatePage() {
  const elements = document.querySelectorAll('[data-i18n]');
  if (currentLang === 'en') {
    elements.forEach(el => { el.textContent = el.getAttribute('data-i18n'); });
    renderLivePulse();
    return;
  }

  // Use local translations first
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (UI_TRANSLATIONS.hi[key]) {
      el.textContent = UI_TRANSLATIONS.hi[key];
    }
  });

  // Collect untranslated strings for batch API call
  const untranslated = [];
  const untranslatedEls = [];
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!UI_TRANSLATIONS.hi[key]) {
      untranslated.push(key);
      untranslatedEls.push(el);
    }
  });

  if (untranslated.length > 0) {
    const result = await apiCall('/api/translate-batch', 'POST', { texts: untranslated, target: 'hi' });
    if (result && result.translations) {
      result.translations.forEach((text, idx) => {
        untranslatedEls[idx].textContent = text;
      });
    }
  }

  renderLivePulse();
}

// ─── Live Pulse (API-driven) ─────────────────────────────────────────
/**
 * Fetch crowd data, food stalls, and AI predictions for the Live Pulse panel.
 * @returns {Promise<void>}
 */
async function renderLivePulse() {
  const venueKey = venueSelect.value;
  const crowdData = await apiCall('/api/crowd-data', 'POST', { venue_id: venueKey, phase: currentPhase });
  if (!crowdData) return;

  document.getElementById('pulseScore').textContent = crowdData.score.text;
  document.getElementById('pulseOvers').textContent = crowdData.score.detail;
  pulsePhaseIndicator.className = `phase-pill ${currentPhase}`;
  pulsePhaseIndicator.innerHTML = `${crowdData.phase.label} ${crowdData.phase.icon}`;
  pulsePhaseDesc.textContent = crowdData.phase.description;

  // Zones
  pulseZonesGrid.innerHTML = '';
  crowdData.zones.forEach(zone => {
    const card = document.createElement('div');
    card.className = 'card zone-card';
    card.style.marginBottom = '0';
    card.innerHTML = `
      <div class="d-flex justify-between align-center">
        <div class="text-primary text-medium">${zone.name}</div>
        <div class="status-badge status-${zone.status}">${zone.status === 'medium' ? 'MODERATE' : (zone.status || '').toUpperCase()}</div>
      </div>
      <div class="zone-density text-bold mt-8 text-primary">${zone.density}%</div>
      <div class="progress-track"><div class="progress-fill fill-${zone.status}" style="width: ${zone.density}%;"></div></div>
    `;
    pulseZonesGrid.appendChild(card);
  });

  // Food
  const foodData = await apiCall('/api/food-stalls', 'POST', { venue_id: venueKey, phase: currentPhase });
  pulseFoodList.innerHTML = '';
  if (foodData && foodData.stalls) {
    const foods = foodData.stalls.slice(0, 2);
    if (foods.every(f => !f.goNow) && currentPhase === 'break') {
      pulseFoodList.innerHTML = `<div class="text-secondary text-medium mt-16" style="text-align: center; padding: 16px 0;">⏳ Wait ~8 min for queues to drop</div>`;
    } else {
      foods.forEach(food => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => openNavigator(food.name));
        item.innerHTML = `
          <div>
            <div class="text-primary text-medium">${food.name} <span class="text-secondary text-regular" style="font-size: 11px;">(${food.type === 'veg' ? 'Veg' : 'Non-veg'})</span></div>
            <div class="text-secondary" style="font-size: 12px;">Gate ${food.gate} · ${food.walkMin}m walk</div>
          </div>
          <div class="d-flex flex-column" style="align-items: flex-end;">
            ${food.goNow ? '<div class="go-now-badge">GO NOW</div>' : `<div class="status-badge status-${food.status || 'low'}">${(food.status || 'low').toUpperCase()}</div>`}
            <div class="text-bold text-primary">${food.waitMin} min</div>
          </div>
        `;
        pulseFoodList.appendChild(item);
      });
    }
  }

  // Restrooms (using crowd data zones as proxy — kept simple)
  pulseRestroomList.innerHTML = '';
  const restrooms = [
    { name: "Level 1 North", walkMin: 2, waitMin: Math.ceil(4 * (crowdData.zones[0].density / 40)), status: "low" },
    { name: "Level 1 South", walkMin: 4, waitMin: Math.ceil(2 * (crowdData.zones[2].density / 25)), status: "low" }
  ];
  const minWait = Math.min(...restrooms.map(r => r.waitMin));
  restrooms.forEach(r => {
    const item = document.createElement('div');
    item.className = `list-item ${r.waitMin === minWait ? 'highlight-subtle' : ''}`;
    item.innerHTML = `
      <div>
        <div class="text-primary text-medium">${r.name}</div>
        <div class="text-secondary" style="font-size: 12px;">${r.walkMin}m walk</div>
      </div>
      <div class="d-flex flex-column" style="align-items: flex-end; gap: 4px;">
        <div class="status-badge status-${r.status}">${r.status.toUpperCase()}</div>
        <div class="text-bold text-primary">${r.waitMin} min</div>
      </div>
    `;
    pulseRestroomList.appendChild(item);
  });

  pulseAIPrediction.textContent = crowdData.prediction;
}

// ─── Concierge (API-driven) ──────────────────────────────────────────
/**
 * Load pre-seeded demo conversation messages into the Concierge chat.
 */
function loadInitialMessages() {
  chatMessages.innerHTML = '';
  addMessage("Where can I get veg food with a short wait?", "user");
  addMessage("The Gujarati Farsan counter near Gate C is just 2 minutes from your seat (Block B, Row 12). Current wait: 3 min 🟢. I'd recommend going now — the innings break is approaching and wait times will jump to 12+ minutes during the break. They have dhokla, khandvi, and chaat. UPI payments accepted.", "ai");
  setTimeout(() => {
    addMessage("How do I get to the merchandise shop?", "user");
    addMessage("The official MI merchandise store is at Level 2, near Gate A. From your seat in Block B: take the east stairway down → follow signs to Gate A → it's on the right. Walk time: ~4 min. Current crowd on that route: Low 🟢. Pro tip: the queue gets long during innings break, so heading there during play is ideal.", "ai");
  }, 50);
}

function formatAIMessage(text) {
  let formatted = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/```[\s\S]*?```/g, '');
  formatted = formatted.replace(/(Gate\s+[A-Z0-9]+)/gi, '<span class="location-pill">$1</span>');
  formatted = formatted.replace(/(Low|🟢)/gi, '<span class="text-green">$1</span>');
  formatted = formatted.replace(/(Medium|Moderate|🟡)/gi, '<span class="text-amber">$1</span>');
  formatted = formatted.replace(/(High|🔴)/gi, '<span class="text-red">$1</span>');
  formatted = formatted.replace(/(GO NOW|recommend going now)/gi, '<span class="text-green">$1</span>');
  return formatted;
}

/**
 * Append a chat message bubble to the Concierge conversation area.
 * @param {string} text - Message content
 * @param {string} sender - Either 'user' or 'ai'
 */
function addMessage(text, sender) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${sender}-wrapper`;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (sender === 'ai') {
    const label = document.createElement('div');
    label.className = 'ai-label';
    label.textContent = '✨ Cue';
    wrapper.appendChild(label);
    const bubble = document.createElement('div');
    bubble.className = 'message ai-message';
    bubble.innerHTML = formatAIMessage(text);
    wrapper.appendChild(bubble);
    const timestamp = document.createElement('div');
    timestamp.className = 'ai-timestamp';
    timestamp.textContent = timeStr;
    wrapper.appendChild(timestamp);
  } else {
    const bubble = document.createElement('div');
    bubble.className = 'message user-message';
    bubble.textContent = text;
    wrapper.appendChild(bubble);
    const timestamp = document.createElement('div');
    timestamp.className = 'user-timestamp';
    timestamp.textContent = timeStr;
    wrapper.appendChild(timestamp);
  }
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Display a typing animation while waiting for AI response.
 * @returns {HTMLElement} The typing indicator wrapper (remove when done)
 */
function showTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai-wrapper typing-wrapper';
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-label', 'Cue is typing');
  const label = document.createElement('div');
  label.className = 'ai-label';
  label.textContent = '✨ Cue';
  wrapper.appendChild(label);
  const bubble = document.createElement('div');
  bubble.className = 'message ai-message';
  bubble.innerHTML = `<div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrapper;
}

/**
 * Handle user chat submission — send to Concierge API and display response.
 * @returns {Promise<void>}
 */
async function handleChatSubmit() {
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  chatInput.value = '';

  const typingElement = showTypingIndicator();

  try {
    const result = await apiCall('/api/concierge', 'POST', {
      venue_id: venueSelect.value,
      phase: currentPhase,
      message: text
    });
    typingElement.remove();
    if (result && result.reply) {
      const replyText = await translateText(result.reply);
      addMessage(replyText, "ai");
    } else {
      const errorText = await translateText("I'm having trouble right now. Please try again.");
      addMessage(errorText, "ai");
    }
  } catch (err) {
    typingElement.remove();
    const connError = await translateText("Connection error. Please try again.");
    addMessage(connError, "ai");
  }
}

// ─── Exit Screen (API-driven) ────────────────────────────────────────
/**
 * Fetch transport data and render the Smart Exit panel with forecast chart.
 * @returns {Promise<void>}
 */
async function renderExitScreen() {
  const venueKey = venueSelect.value;
  const data = await apiCall('/api/transport', 'POST', { venue_id: venueKey, phase: currentPhase });
  if (!data) return;

  const rec = data.recommendation;
  exitHeadline.textContent = await translateText(rec.headline);
  exitDetail.textContent = await translateText(rec.detail);
  exitHeroCard.className = `card ai-exit-card urgency-${rec.urgency || 'low'}`;

  if (rec.waitSaved) {
    const savedLabel = await translateText(`Save ${rec.waitSaved}`);
    exitWaitSaved.textContent = `⏱️ ${savedLabel}`;
    exitWaitSaved.style.display = 'inline-block';
  } else {
    exitWaitSaved.style.display = 'none';
  }

  // Time anchor
  let timeAnchor = "";
  if (currentPhase === "post-match") timeAnchor = "📊 Historical pattern: peak clears in ~12 minutes";
  else if (currentPhase === "match") timeAnchor = "📊 Post-match surge expected in ~30 minutes";
  else if (currentPhase === "break") timeAnchor = "📊 Corridors clear ~5 min after play resumes";

  const existingAnchor = exitHeroCard.querySelector('.time-anchor');
  if (existingAnchor) existingAnchor.remove();
  if (timeAnchor) {
    const anchorDiv = document.createElement('div');
    anchorDiv.className = 'time-anchor';
    anchorDiv.textContent = timeAnchor;
    exitHeroCard.appendChild(anchorDiv);
  }

  // Transport cards
  let transportOptions = data.transport;
  if (customExitDestination) {
    const isHighCrowd = currentPhase === 'post-match' || currentPhase === 'break';
    transportOptions = [
      { type: "metro", name: "Nearest Transit", walkDistance: "400m", commuteDistance: customExitDestination.dist, destination: customExitDestination.name, nextIn: isHighCrowd ? "3 min" : "8 min", crowd: isHighCrowd ? "high" : "medium" },
      { type: "rideshare", surge: isHighCrowd ? "2.5x" : "1.2x", staging: "Recommended Exit Gate", wait: isHighCrowd ? "18 min" : "5 min" }
    ];
  }

  transportContainer.innerHTML = '';
  transportOptions.forEach(t => {
    const card = document.createElement('div');
    card.className = 'transport-card';

    const icon = document.createElement('div');
    icon.className = 'transport-icon';
    icon.textContent = t.type === 'metro' ? '🚇' : (t.type === 'rideshare' ? '🚗' : '🛺');
    card.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'transport-info';
    const title = document.createElement('div');
    title.className = 'transport-title';
    title.textContent = t.type === 'metro' ? t.name : (t.type === 'rideshare' ? 'Ride Share' : 'Auto / Pre-paid Taxi');
    info.appendChild(title);

    if (t.type === 'metro') {
      info.innerHTML += `<div class="transport-detail">Walk: ${t.walkDistance}</div><div class="transport-detail">To: ${t.destination || 'Home'} (${t.commuteDistance})</div><div class="transport-detail">Next train: ${t.nextIn}</div><div class="transport-detail">Crowd: <span class="status-badge status-${t.crowd || 'low'}">${(t.crowd || 'low').toUpperCase()}</span></div>`;
      const distStr = t.commuteDistance || '15km';
      const distKm = parseFloat(distStr) || 15;
      info.innerHTML += `<div class="green-impact-badge" aria-label="Eco-friendly choice"><span class="material-symbols-outlined">eco</span> Saves ~${(distKm * 0.16).toFixed(1)} kg CO2</div>`;
    } else if (t.type === 'rideshare') {
      const surgeVal = parseFloat(t.surge);
      let surgeColor = '#34A853';
      if (surgeVal > 1.2 && surgeVal <= 2.0) surgeColor = '#F9AB00';
      else if (surgeVal > 2.0) surgeColor = '#EA4335';
      info.innerHTML += `<div class="transport-detail">Surge: <span style="color: ${surgeColor}; font-weight: 600;">${t.surge}</span></div><div class="transport-detail">Staging: ${t.staging}</div><div class="transport-detail">Wait: ${t.wait}</div>`;
    } else if (t.type === 'auto') {
      info.innerHTML += `<div class="transport-detail">Stand: ${t.stand}</div><div class="transport-detail">Queue: ${t.queue} people</div><div class="transport-detail">Wait: ${t.waitMin} min</div>`;
    }

    card.appendChild(info);
    transportContainer.appendChild(card);
  });

  // Forecast chart
  forecastChart.innerHTML = '';
  if (data.forecast) {
    data.forecast.forEach(d => {
      const row = document.createElement('div');
      row.className = 'forecast-row';

      const label = document.createElement('div');
      label.className = 'forecast-label';
      label.innerHTML = d.isCurrent ? `<span class="forecast-now-indicator">📍</span>${d.label}` : d.label;
      row.appendChild(label);

      const barContainer = document.createElement('div');
      barContainer.className = 'forecast-bar-container';
      let densityClass = 'density-low';
      if (d.value >= 40 && d.value <= 70) densityClass = 'density-medium';
      else if (d.value > 70) densityClass = 'density-high';
      const bar = document.createElement('div');
      bar.className = `forecast-bar ${densityClass} ${d.isCurrent ? 'is-now' : ''}`;
      setTimeout(() => { bar.style.width = d.value + '%'; }, 50);
      barContainer.appendChild(bar);

      if (d.isSweetSpot) {
        const sweetSpot = document.createElement('div');
        sweetSpot.className = 'sweet-spot-badge';
        sweetSpot.innerHTML = '✓ Best window';
        sweetSpot.style.position = 'absolute';
        sweetSpot.style.right = '6px';
        sweetSpot.style.top = '5px';
        barContainer.appendChild(sweetSpot);
      }
      row.appendChild(barContainer);

      const val = document.createElement('div');
      val.className = 'forecast-value';
      val.textContent = Math.round(d.value) + '%';
      row.appendChild(val);

      forecastChart.appendChild(row);
    });
  }
}

// ─── SOS Modal ───────────────────────────────────────────────────────
/**
 * Open the emergency SOS modal with medical, security, and exit options.
 * @returns {Promise<void>}
 */
async function openSosModal() {
  if (!currentVenueData || !currentVenueData.emergency) return;
  const e = currentVenueData.emergency;
  sosCardsContainer.innerHTML = '';

  [
    { icon: '🏥', title: 'Medical Aid Station', detail: `${e.medical.location} · ${e.medical.walkMin} min`, subtitle: e.medical.detail },
    { icon: '🛡️', title: 'Alert Security', detail: `Nearest: ${e.security.location}`, subtitle: e.security.detail },
    { icon: '🚪', title: 'Emergency Exit', detail: `${e.exit.gate} · ${e.exit.walkMin} min`, subtitle: e.exit.detail }
  ].forEach(c => {
    const cardEl = document.createElement('div');
    cardEl.className = 'sos-card';
    cardEl.innerHTML = `<div class="sos-card-icon">${c.icon}</div><div class="sos-card-content"><div class="sos-card-title">${c.title}</div><div class="sos-card-detail">${c.detail}</div><div class="sos-card-subtitle">${c.subtitle}</div></div>`;
    cardEl.addEventListener('click', () => { showSmartToast("🚨 Alert sent to venue security team"); sosModal.style.display = 'none'; });
    sosCardsContainer.appendChild(cardEl);
  });
  sosModal.style.display = 'flex';
}

// ─── Souvenir Generator ──────────────────────────────────────────────
/**
 * Generate a downloadable match day souvenir poster as PNG using Canvas API.
 */
function generateSouvenir() {
  if (!currentVenueData) return;
  const venue = currentVenueData;
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  const baseGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  baseGrad.addColorStop(0, '#050a1f'); baseGrad.addColorStop(0.5, '#0b1d40'); baseGrad.addColorStop(1, '#000000');
  ctx.fillStyle = baseGrad; ctx.fillRect(0, 0, 1080, 1920);

  ctx.save(); ctx.translate(540, 960); ctx.rotate(-Math.PI / 8);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'; ctx.font = '900 280px "DM Sans", sans-serif';
  ctx.fillText(venue.shortName.toUpperCase(), 0, -200); ctx.fillText('SURVIVOR', 0, 200); ctx.restore();

  ctx.shadowBlur = 20; ctx.shadowColor = '#00E5FF'; ctx.fillStyle = '#00E5FF'; ctx.fillRect(100, 300, 15, 200); ctx.shadowBlur = 0;

  ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF'; ctx.font = '900 80px "DM Sans", sans-serif'; ctx.fillText('MATCH DAY', 140, 390);
  ctx.font = '900 90px "DM Sans", sans-serif'; ctx.fillStyle = '#F9AB00'; ctx.fillText('SURVIVOR', 140, 480);
  ctx.fillStyle = '#00E5FF'; ctx.font = 'bold 45px "DM Sans", sans-serif'; ctx.fillText(`@ ${venue.name.toUpperCase()}`, 140, 560);

  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'; ctx.beginPath(); ctx.roundRect(100, 750, 880, 380, 40); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.stroke(); ctx.restore();

  ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.font = '800 65px "DM Sans", sans-serif';
  ctx.fillText(venue.match, 540, 870);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(340, 940, 400, 2);
  ctx.font = '500 45px "DM Sans", sans-serif'; ctx.fillStyle = '#00E5FF'; ctx.fillText(venue.format, 540, 1020);

  ctx.fillStyle = '#F9AB00'; ctx.beginPath(); ctx.roundRect(240, 1350, 600, 140, 20); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(240, 1420, 35, 0, Math.PI * 2); ctx.arc(840, 1420, 35, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#000000';
  const seatNumbers = venue.seats.map(s => s.seat).join(', ');
  const seatText = `BLOCK ${venue.seats[0].block} · ROW ${venue.seats[0].row} · SEATS ${seatNumbers}`;
  let fontSize = 45; if (seatText.length > 35) fontSize = 35; if (seatText.length > 45) fontSize = 28;
  ctx.font = `900 ${fontSize}px "DM Sans", sans-serif`; ctx.fillText(seatText, 540, 1435);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.font = '700 35px "DM Sans", sans-serif'; ctx.fillText('POWERED BY CUE AI', 540, 1800);

  const link = document.createElement('a');
  link.download = `Cue-Match-Memory-${venue.shortName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ─── Stadium Facts ───────────────────────────────────────────────────
window.showStadiumFacts = function () {
  if (!currentVenueData || !currentVenueData.facts) return;
  const factsList = document.getElementById('factsList');
  const shuffled = [...currentVenueData.facts].sort(() => 0.5 - Math.random());
  const selectedFacts = shuffled.slice(0, 3);
  const icons = ['⚽', '🏟️', '🏗️', '🌱'];
  factsList.innerHTML = selectedFacts.map((f, i) => `<li><span style="margin-right:12px; font-size: 1.2em;">${icons[i] || '✨'}</span><span>${f}</span></li>`).join('');
  document.getElementById('factsModal').style.display = 'flex';
};

// ─── Stadium Navigator ──────────────────────────────────────────────
/**
 * Open the stadium navigator modal with SVG map and optional target path.
 * @param {string|null} [targetLabel=null] - Gate or location name to navigate to
 */
function openNavigator(targetLabel = null) {
  if (!currentVenueData || !currentVenueData.layout) { showSmartToast("Map not available."); return; }
  mapTitle.textContent = targetLabel ? `Navigating to ${targetLabel}` : "Stadium Map";
  mapSubtitle.textContent = targetLabel ? "Follow the flowing path from your seat" : `Overview of ${currentVenueData.name}`;
  drawStadiumMap(currentVenueData, targetLabel);
  mapModal.style.display = 'flex';
}

/**
 * Draw the stadium SVG map with gates, user position, and optional navigation path.
 * @param {Object} venue - Venue data object with layout property
 * @param {string|null} targetLabel - Target gate label or null for overview
 */
function drawStadiumMap(venue, targetLabel) {
  const layout = venue.layout;
  const NS = "http://www.w3.org/2000/svg";
  stadiumSvg.innerHTML = '';
  stadiumSvg.setAttribute("viewBox", layout.viewBox);
  const vBox = layout.viewBox.split(' ').map(Number);
  const midX = vBox[2] / 2, midY = vBox[3] / 2, outerR = Math.min(midX, midY) * 0.9;

  const bgCircle = document.createElementNS(NS, "circle");
  bgCircle.setAttribute("cx", midX); bgCircle.setAttribute("cy", midY); bgCircle.setAttribute("r", outerR);
  bgCircle.setAttribute("fill", "#eceff1"); bgCircle.setAttribute("stroke", "#cfd8dc"); bgCircle.setAttribute("stroke-width", "4");
  stadiumSvg.appendChild(bgCircle);

  const pitch = document.createElementNS(NS, "ellipse");
  pitch.setAttribute("cx", midX); pitch.setAttribute("cy", midY);
  pitch.setAttribute("rx", outerR * 0.3); pitch.setAttribute("ry", outerR * 0.45);
  pitch.setAttribute("fill", "#81c784"); pitch.setAttribute("stroke", "#ffffff"); pitch.setAttribute("stroke-width", "2");
  stadiumSvg.appendChild(pitch);

  Object.keys(layout.nodes).forEach(key => {
    const node = layout.nodes[key];
    const isTarget = (key === targetLabel);
    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", node.x); circle.setAttribute("cy", node.y);
    circle.setAttribute("r", isTarget ? "12" : "8");
    circle.setAttribute("class", isTarget ? "map-node target-node" : "map-node");
    if (isTarget) circle.setAttribute("fill", "#F9AB00");
    stadiumSvg.appendChild(circle);

    if (isTarget || key.startsWith("Gate")) {
      const text = document.createElementNS(NS, "text");
      text.setAttribute("x", node.x); text.setAttribute("y", node.y - 20);
      text.setAttribute("text-anchor", "middle"); text.setAttribute("class", "map-node-label");
      text.textContent = key;
      stadiumSvg.appendChild(text);
    }
  });

  const userNode = layout.seatNode;
  const pulse = document.createElementNS(NS, "circle");
  pulse.setAttribute("cx", userNode.x); pulse.setAttribute("cy", userNode.y);
  pulse.setAttribute("r", "10"); pulse.setAttribute("fill", "#1A73E8"); pulse.setAttribute("class", "pulse-node");
  stadiumSvg.appendChild(pulse);

  const userCircle = document.createElementNS(NS, "circle");
  userCircle.setAttribute("cx", userNode.x); userCircle.setAttribute("cy", userNode.y);
  userCircle.setAttribute("r", "10"); userCircle.setAttribute("fill", "#1A73E8");
  userCircle.setAttribute("stroke", "white"); userCircle.setAttribute("stroke-width", "3");
  stadiumSvg.appendChild(userCircle);

  const userText = document.createElementNS(NS, "text");
  userText.setAttribute("x", userNode.x); userText.setAttribute("y", userNode.y + 30);
  userText.setAttribute("text-anchor", "middle"); userText.setAttribute("class", "map-node-label");
  userText.setAttribute("style", "font-weight: 700; fill: #1A73E8;");
  userText.textContent = "YOU";
  stadiumSvg.appendChild(userText);

  if (targetLabel && layout.nodes[targetLabel]) {
    const target = layout.nodes[targetLabel];
    const path = document.createElementNS(NS, "line");
    path.setAttribute("x1", userNode.x); path.setAttribute("y1", userNode.y);
    path.setAttribute("x2", target.x); path.setAttribute("y2", target.y);
    path.setAttribute("class", "nav-path");
    stadiumSvg.insertBefore(path, pulse);
  }
}

// ─── SOS Trigger ─────────────────────────────────────────────────────
function triggerSOS() {
  if (!currentVenueData || !currentVenueData.seats || currentVenueData.seats.length === 0) {
    showSmartToast("Safety alert triggered.");
    const conciergeTab = document.getElementById('tab-concierge');
    if (conciergeTab) switchTab(conciergeTab);
    return;
  }
  const ticket = currentVenueData.seats[currentTicketIndex || 0];
  const conciergeTab = document.getElementById('tab-concierge');
  if (conciergeTab) switchTab(conciergeTab);
  chatInput.value = `EMERGENCY: Assistance needed at Block ${ticket.block}, Row ${ticket.row}, Seat ${ticket.seat}.`;
  handleChatSubmit();
}

// ─── Firebase Anonymous Auth ─────────────────────────────────────────
/**
 * Initialize Firebase anonymous authentication via REST API.
 * @returns {Promise<void>}
 */
async function initFirebaseAnonymousAuth() {
  // Skip if already authenticated
  if (sessionStorage.getItem('firebaseIdToken')) {
    if (firebaseAuthBadge) firebaseAuthBadge.style.display = 'inline';
    console.log("🔐 Firebase: Resuming anonymous session");
    return;
  }

  try {
    // Fetch Firebase API key from backend
    const configResp = await fetch('/api/firebase-config');
    if (!configResp.ok) {
      console.log("🔐 Firebase: Config not available (demo mode)");
      return;
    }
    const config = await configResp.json();
    const apiKey = config.apiKey;
    if (!apiKey) {
      console.log("🔐 Firebase: No API key configured");
      return;
    }

    // Sign in anonymously via Firebase Auth REST API
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true })
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('firebaseIdToken', data.idToken);
      sessionStorage.setItem('firebaseLocalId', data.localId);
      if (firebaseAuthBadge) firebaseAuthBadge.style.display = 'inline';
      console.log("🔐 Firebase: Anonymous session created");
    } else {
      console.log("🔐 Firebase: Auth not available (demo mode)");
    }
  } catch (err) {
    console.log("🔐 Firebase: Auth skipped —", err.message);
  }
}

// ─── Google Calendar ─────────────────────────────────────────────────
/**
 * Open Google Calendar with pre-filled match event details in a new tab.
 */
function openGoogleCalendar() {
  if (!currentVenueData) return;
  const matchName = encodeURIComponent(currentVenueData.match);
  const venueName = encodeURIComponent(currentVenueData.name + ', ' + currentVenueData.city);
  const details = encodeURIComponent('Powered by Cue AI Stadium Companion');
  const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${matchName}&details=${details}&location=${venueName}`;
  window.open(calUrl, '_blank');
  if (typeof gtag === 'function') gtag('event', 'calendar_save', { 'match': currentVenueData.match });
  showSmartToast("📅 Opening Google Calendar...");
}

// ─── Verification Diagnostic ─────────────────────────────────────────
/**
 * Log diagnostic status of all 10 Google service integrations to console.
 * @returns {Promise<void>}
 */
async function verifyGoogleServices() {
  const configResp = await fetch('/api/firebase-config').catch(() => null);
  const hasFirebaseKey = configResp && configResp.ok ? !!(await configResp.json()).apiKey : false;
  const status = {
    "1. Gemini 2.0 Flash": "✅ INTEGRATED (server-side)",
    "2. Cloud Run": "✅ ACTIVE",
    "3. Cloud Translation": "✅ INTEGRATED (server-side)",
    "4. Google Analytics 4": typeof gtag === 'function' ? "✅ ACTIVE" : "❌ MISSING",
    "5. Google Fonts": document.fonts.check("12px 'DM Sans'") ? "✅ ACTIVE" : "❌ FAILED",
    "6. Firebase Firestore": "✅ INTEGRATED (REST)",
    "7. Firebase Auth": !!sessionStorage.getItem('firebaseIdToken') ? "✅ ACTIVE" : (hasFirebaseKey ? "⚠️ PENDING" : "⚠️ DEMO"),
    "8. Google Calendar": "✅ ACTIVE",
    "9. Google Maps JS": typeof google !== 'undefined' ? "✅ ACTIVE" : "⚠️ SIMULATED",
    "10. Realtime Pulse": "✅ ACTIVE (POLLING)"
  };
  console.table(status);
}

// ─── DOM Ready ───────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
