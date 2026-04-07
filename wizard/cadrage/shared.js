/* AppFactory Cadrage Wizard — Shared JS */

const STEPS = ['pitch', 'entities', 'pages', 'rules', 'recap'];
const STEP_PAGES = {
  pitch: '/pitch.html',
  entities: '/entities.html',
  pages: '/pages.html',
  rules: '/rules.html',
  recap: '/recap.html'
};
const STEP_LABELS = {
  pitch: 'Pitch',
  entities: 'Données',
  pages: 'Pages',
  rules: 'Règles',
  recap: 'Récap'
};

let _serverMode = location.protocol === 'http:';
let _currentStep = '';

/** Render the stepper bar */
function renderStepper(currentStep) {
  _currentStep = currentStep;
  const container = document.getElementById('stepper');
  if (!container) return;

  const currentIdx = STEPS.indexOf(currentStep);
  container.innerHTML = STEPS.map((step, i) => {
    const cls = i < currentIdx ? 'done' : (i === currentIdx ? 'active' : '');
    const check = i < currentIdx ? '&#10003;' : (i + 1);
    const connector = i < STEPS.length - 1 ? '<div class="step-connector"></div>' : '';
    return `<div class="step-item ${cls}">
      <span class="num">${check}</span>
      ${STEP_LABELS[step]}
    </div>${connector}`;
  }).join('');
}

/** Poll server for step changes */
function startPolling() {
  if (!_serverMode) return;
  setInterval(() => {
    fetch('/api/state').then(r => r.json()).then(state => {
      if (state.step && state.step !== _currentStep && STEP_PAGES[state.step]) {
        window.location.href = STEP_PAGES[state.step];
      }
    }).catch(() => {});
  }, 1000);
}

/** Post data to server state */
function postState(data) {
  if (!_serverMode) return Promise.resolve();
  return fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {});
}

/** Get server state */
function getState() {
  if (!_serverMode) return Promise.resolve({});
  return fetch('/api/state').then(r => r.json()).catch(() => ({}));
}

/** Show toast message */
function showToast(msg, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/** Navigate to next step */
function goNext(currentStep, data) {
  const idx = STEPS.indexOf(currentStep);
  if (idx < STEPS.length - 1) {
    const next = STEPS[idx + 1];
    postState({ ...data, step: next }).then(() => {
      window.location.href = STEP_PAGES[next];
    });
  }
}

/** Navigate to previous step */
function goPrev(currentStep) {
  const idx = STEPS.indexOf(currentStep);
  if (idx > 0) {
    const prev = STEPS[idx - 1];
    postState({ step: prev }).then(() => {
      window.location.href = STEP_PAGES[prev];
    });
  }
}

/** Show enterprise logo in header if set in state */
function loadEnterpriseLogo() {
  if (!_serverMode) return;
  getState().then(state => {
    if (state.enterprise_name) {
      const el = document.getElementById('enterprise-logo');
      const img = document.getElementById('enterprise-logo-img');
      const name = document.getElementById('enterprise-logo-name');
      if (el && name) {
        name.textContent = state.enterprise_name;
        if (state.enterprise_logo) {
          img.src = state.enterprise_logo;
          img.alt = state.enterprise_name;
        } else {
          img.style.display = 'none';
        }
        el.style.display = 'flex';
      }
    }
  });
}

/** Init page: render stepper + load enterprise logo + start polling */
function initPage(step) {
  renderStepper(step);
  loadEnterpriseLogo();
  startPolling();
}
