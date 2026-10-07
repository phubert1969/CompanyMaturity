// Ce script gère la page de connexion / inscription ainsi que l’aperçu du rapport en attente.
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const loginIntro = document.getElementById('login-intro');
const registerSection = document.getElementById('register-section');
const registerForm = document.getElementById('register-form');
const resultPreview = document.getElementById('result-preview');
const query = new URLSearchParams(window.location.search);
const hasPendingReport = Boolean(sessionStorage.getItem('pendingMaturityReport'));

if (hasPendingReport || query.get('reason') === 'save') {
  loginIntro.textContent = 'Votre diagnostic est prêt. Connectez-vous pour l’enregistrer dans votre espace.';
  registerSection.hidden = false;
}

// Limite une note à l’échelle du référentiel (0 à 5).
function previewScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(5, score)) : 0;
}

function formatPreviewScore(value) {
  return previewScore(value).toFixed(1).replace('.', ',');
}

// Construit un aperçu radar du rapport en attente avant la connexion.
function renderPreview(report) {
  const axisNames = ['Potentiel', 'Stratégie', 'Culture', 'Compétences', 'Gouvernance'];
  const stageNames = [
    ['Emergence', 'Émergence'],
    ['Structuration', 'Structuration'],
    ['Industrialisation', 'Industrialisation']
  ];
  if (!report?.axes || !report?.stages) return;

  const centerX = 190;
  const centerY = 165;
  const radius = 100;
  const pointAt = (index, value) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI / axisNames.length);
    const distance = radius * value / 5;
    return [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance];
  };
  const rings = Array.from({ length: 5 }, (_, ringIndex) => {
    const points = axisNames.map((_, axisIndex) => pointAt(axisIndex, ringIndex + 1).join(',')).join(' ');
    return `<polygon points="${points}" class="preview-radar-ring"></polygon>`;
  }).join('');
  const spokes = axisNames.map((name, index) => {
    const [x, y] = pointAt(index, 5);
    const [labelX, labelY] = pointAt(index, 6.3);
    const textAnchor = Math.abs(labelX - centerX) < 8 ? 'middle' : labelX > centerX ? 'start' : 'end';
    return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" class="preview-radar-spoke"></line><text x="${labelX}" y="${labelY}" text-anchor="${textAnchor}" class="preview-radar-label">${name}</text>`;
  }).join('');
  const points = axisNames.map((name, index) => pointAt(index, previewScore(report.axes[name])).join(',')).join(' ');
  const dots = axisNames.map((name, index) => {
    const [x, y] = pointAt(index, previewScore(report.axes[name]));
    return `<circle cx="${x}" cy="${y}" r="4" class="preview-radar-dot"></circle>`;
  }).join('');
  document.getElementById('preview-radar').innerHTML = `
    <svg class="preview-radar-svg" viewBox="0 0 380 330" role="img" aria-label="Diagramme radar des cinq axes">
      ${rings}${spokes}<polygon points="${points}" class="preview-radar-area"></polygon>${dots}
    </svg>
    <ul class="preview-axis-scores">${axisNames.map((name) => `<li><span>${name}</span><strong>${formatPreviewScore(report.axes[name])} / 5</strong></li>`).join('')}</ul>
  `;

  document.getElementById('preview-stages').innerHTML = stageNames.map(([key, label]) => {
    const score = previewScore(report.stages[key]);
    return `
      <div class="preview-stage">
        <div class="preview-stage-heading"><span>${label}</span><strong>${formatPreviewScore(score)} / 5</strong></div>
        <div class="preview-stage-track" role="img" aria-label="${label} : ${formatPreviewScore(score)} sur 5">
          <span style="width: ${score * 20}%"></span>
        </div>
      </div>
    `;
  }).join('');

  resultPreview.hidden = false;
  document.querySelector('.auth-panel').classList.add('has-preview');
}

if (hasPendingReport) {
  try {
    renderPreview(JSON.parse(sessionStorage.getItem('pendingMaturityReport')));
  } catch {
    sessionStorage.removeItem('pendingMaturityReport');
  }
}

// Parse la réponse JSON du serveur et renvoie une erreur lisible si l’API ne répond pas comme prévu.
async function readApiResponse(response) {
  const body = await response.text();
  let result;
  try {
    result = JSON.parse(body);
  } catch {
    throw new Error(`Le serveur ne fournit pas l’API de connexion (HTTP ${response.status}). Lancez start-server.bat puis ouvrez http://127.0.0.1:8765/login.html.`);
  }
  if (!response.ok) throw new Error(result.error || `Connexion impossible (HTTP ${response.status}).`);
  return result;
}

// Enregistre le rapport en attente dans l’espace utilisateur après une connexion réussie.
async function savePendingReport() {
  const pendingReport = sessionStorage.getItem('pendingMaturityReport');
  if (!pendingReport) return false;

  let report;
  try {
    report = JSON.parse(pendingReport);
  } catch {
    throw new Error('Le diagnostic en attente est illisible. Reprenez le questionnaire.');
  }
  const saveResponse = await fetch('/api/save-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report })
  });
  const saved = await readApiResponse(saveResponse);
  sessionStorage.removeItem('pendingMaturityReport');
  window.location.assign(`resultatsIA.html?id=${encodeURIComponent(saved.id)}`);
  return true;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = 'Vérification...';
  const formData = new FormData(loginForm);
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });
    await readApiResponse(response);
    if (await savePendingReport()) return;

    const next = query.get('next');
    const allowedNextPages = new Set(['espace.html', 'maturityIA.html', 'index.html']);
    window.location.assign(allowedNextPages.has(next) ? next : 'espace.html');
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.getElementById('register-message');
  const formData = new FormData(registerForm);
  const password = formData.get('password');
  if (password !== formData.get('passwordConfirmation')) {
    message.textContent = 'Les deux mots de passe ne correspondent pas.';
    return;
  }

  message.textContent = 'Création du compte...';
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: formData.get('username'), password })
    });
    await readApiResponse(response);
    if (await savePendingReport()) return;
    window.location.assign('espace.html');
  } catch (error) {
    message.textContent = error.message;
  }
});