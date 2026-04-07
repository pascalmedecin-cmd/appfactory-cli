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

/** Navigate to previous step (auto-saves current form data) */
function goPrev(currentStep, currentData) {
  const idx = STEPS.indexOf(currentStep);
  if (idx > 0) {
    const prev = STEPS[idx - 1];
    const payload = { step: prev };
    if (currentData) Object.assign(payload, currentData);
    postState(payload).then(() => {
      window.location.href = STEP_PAGES[prev];
    });
  }
}

/** Show enterprise name in header if set in state */
function loadEnterpriseLogo() {
  if (!_serverMode) return;
  getState().then(state => {
    if (state.enterprise_name) {
      const sep = document.getElementById('brand-sep');
      const name = document.getElementById('brand-enterprise');
      if (sep && name) {
        name.textContent = state.enterprise_name;
        sep.style.display = 'inline';
      }
    }
  });
}

/** Make done steps clickable for back-navigation */
function setupStepperNavigation() {
  const container = document.getElementById('stepper');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const stepEl = e.target.closest('.step-item.done');
    if (!stepEl) return;
    const idx = Array.from(container.querySelectorAll('.step-item')).indexOf(stepEl);
    if (idx >= 0 && idx < STEPS.length) {
      const target = STEPS[idx];
      postState({ step: target }).then(() => {
        window.location.href = STEP_PAGES[target];
      });
    }
  });
}

/** Submit form on Enter key (if not in a textarea) */
function setupEnterSubmit(btnId) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const btn = document.getElementById(btnId);
      if (btn && !btn.disabled) btn.click();
    }
  });
}

/** Init page: render stepper + load enterprise logo + start polling + stepper nav */
function initPage(step) {
  renderStepper(step);
  loadEnterpriseLogo();
  startPolling();
  setupStepperNavigation();
}
