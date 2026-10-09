// Ce script charge le rapport complet, calcule les vues synthétiques et permet
// de l’exporter en HTML ou JSON ainsi que de naviguer entre les rapports enregistrés.
const reportRoot = document.getElementById('rapport');
let archivedReports = [];
let report = null;
const requestedReportId = new URLSearchParams(window.location.search).get('id');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatScore(value) {
  return Number(value).toFixed(1).replace('.', ',');
}

function scoreColor(value) {
  if (value < 1) return '#94a3b8';
  if (value < 2) return '#d45b37';
  if (value < 3) return '#e4a853';
  if (value < 4) return '#75a3ff';
  if (value < 5) return '#2f6fed';
  return '#1e4fc7';
}

// Construit le radar synthétique des scores par axe.
// Chaque axe reçoit un angle régulier autour du centre ; son score (sur 5) détermine
// la distance du point au centre. Les polygones concentriques servent d’échelle de lecture.
function radarMarkup(axes) {
  const names = Object.keys(axes);
  const centerX = 190;
  const centerY = 165;
  const radius = 105;
  const angleFor = (index) => (-Math.PI / 2) + (index * 2 * Math.PI / names.length);
  const pointAt = (index, value) => {
    const angle = angleFor(index);
    const distance = radius * value / 5;
    return [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance];
  };
  const rings = Array.from({ length: 5 }, (_, index) => {
    const level = index + 1;
    const points = names.map((_, axisIndex) => pointAt(axisIndex, level).join(',')).join(' ');
    return `<polygon points="${points}" fill="none" stroke="#d1d5db" stroke-width="1"></polygon>`;
  }).join('');
  const spokes = names.map((name, index) => {
    const [x, y] = pointAt(index, 5);
    const [labelX, labelY] = pointAt(index, 6.15);
    return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#d8e2ef"></line><text x="${labelX}" y="${labelY}" text-anchor="middle" class="radar-libelle">${escapeHtml(name)}</text>`;
  }).join('');
  const valuePoints = names.map((name, index) => pointAt(index, axes[name]).join(',')).join(' ');
  const values = names.map((name, index) => {
    const [x, y] = pointAt(index, axes[name]);
    return `<circle cx="${x}" cy="${y}" r="4" fill="#d45b37"></circle><text x="${x + 6}" y="${y - 6}" class="radar-valeur">${formatScore(axes[name])}</text>`;
  }).join('');

  return `<svg class="radar" viewBox="0 0 380 330" role="img" aria-label="Diagramme radar des cinq axes">${rings}${spokes}<polygon points="${valuePoints}" fill="rgba(47,111,237,0.2)" stroke="#2f6fed" stroke-width="2" stroke-linejoin="round"></polygon>${values}</svg>`;
}

// Crée la liste des rapports enregistrés pour permettre la navigation entre plusieurs diagnostics.
function archiveMarkup() {
  if (!archivedReports.length) return '';

  const archiveLinks = [...archivedReports].reverse().map((item) => {
    const date = new Date(item.savedAt).toLocaleString('fr-FR');
    const selected = item.id === report.id ? ' aria-current="page"' : '';
    const owner = item.owner ? ` · ${escapeHtml(item.owner)}` : '';
    return `<li><a href="resultatsIA.html?id=${encodeURIComponent(item.id)}"${selected}>${escapeHtml(date)} · ${formatScore(item.overall)} / 5${owner}</a></li>`;
  }).join('');

  return `
    <nav class="rapport-archives" aria-label="Rapports enregistrés">
      <h2>Rapports enregistrés</h2>
      <ul>${archiveLinks}</ul>
    </nav>
  `;
}

// Téléchargement de fichier local côté navigateur.
function downloadFile(content, mimeType, filename) {
  const fileUrl = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(fileUrl);
}

function filenameTimestamp() {
  return new Date(report.savedAt).toISOString().replace(/[:.]/g, '-');
}

function downloadJson() {
  downloadFile(
    JSON.stringify(report, null, 2),
    'application/json;charset=utf-8',
    `resultats-maturite-IA-${filenameTimestamp()}.json`
  );
}

// Assemble le contenu HTML autonome du rapport, sans dépendre du reste des pages du site.
// On copie les styles accessibles depuis la feuille de rapport et le contenu déjà rendu,
// puis on retire les commandes et l’archive qui n’ont pas de sens dans un export isolé.
function createStandaloneHtml() {
  const reportStylesheet = [...document.styleSheets].find((sheet) => sheet.href?.includes('Rapport_Style1.css'));
  let reportCss = '';
  try {
    reportCss = [...reportStylesheet.cssRules].map((rule) => rule.cssText).join('\n');
  } catch {
    reportCss = '';
  }

  const reportContent = reportRoot.cloneNode(true);
  reportContent.querySelector('.rapport-actions')?.remove();
  reportContent.querySelector('.rapport-archives')?.remove();
  reportContent.querySelector('.directory-save-status')?.remove();
  const pageStyles = document.querySelector('style')?.textContent || '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport de maturité IA</title>
<style>${reportCss}\n${pageStyles}</style>
</head>
<body><main class="rapport">${reportContent.innerHTML}</main></body>
</html>`;
}

function downloadStandaloneHtml() {
  downloadFile(createStandaloneHtml(), 'text/html;charset=utf-8', `rapport-maturite-IA-${filenameTimestamp()}.html`);
}

// Enregistre le rapport dans l’espace utilisateur et affiche les liens de téléchargement associés.
async function saveReportToDirectory() {
  const status = document.getElementById('directory-save-status');
  status.textContent = 'Enregistrement des fichiers du rapport...';
  status.classList.remove('error');

  try {
    const response = await fetch('/api/save-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, html: createStandaloneHtml() })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Le serveur a refusé la sauvegarde.');

    report.directorySavedAt = result.savedAt;
    report.savedFiles = result.files;
    const fileLinks = Object.entries(result.files).map(([format, filename]) =>
      `<a href="/api/report-file?id=${encodeURIComponent(report.id)}&format=${encodeURIComponent(format)}">${format.toUpperCase()}</a>`
    ).join(' · ');
    status.innerHTML = `<strong>Rapport enregistré dans votre espace :</strong> ${fileLinks}`;
  } catch (error) {
    status.textContent = `Sauvegarde automatique impossible. Lancez start-server.command sur Mac ou start-server.bat sur Windows, puis ouvrez http://127.0.0.1:8765. (${error.message})`;
    status.classList.add('error');
  }
}

function renderMissingReport() {
  reportRoot.innerHTML = `
    <section class="carte rapport-vide">
      <h1>Aucun résultat enregistré</h1>
      <p class="sous-titre">Aucun rapport accessible pour ce compte.</p>
      <a href="espace.html">Ouvrir mon espace</a>
    </section>
  `;
}

// Génère la page HTML complète du rapport avec ses sections synthétiques et ses détails.
// Les calculs (moyennes, classement, actions) sont déjà présents dans l’objet `report` ;
// cette fonction orchestre les composants de rendu et relie les boutons d’export/impression.
function renderReport() {
  const level = Math.max(0, Math.min(5, Math.floor(Number(report.overall) + 0.5)));
  const levelNames = ['Inexistant', 'En friche', 'En exploration', 'En chantier', 'En exploitation', 'En pilotage'];
  const levelDescriptions = [
    'L’entreprise n’a entrepris aucune démarche et n’a pas de projet à court terme.',
    'L’entreprise initie des expérimentations autour de l’IA, sans stratégie globale ni gouvernance structurée.',
    'L’entreprise a pris conscience du potentiel des données et commence à tester des solutions.',
    'L’entreprise a entrepris des actions ciblées, mais sa démarche n’est pas encore structurée.',
    'L’entreprise a structuré sa démarche et déployé des outils ou une infrastructure.',
    'L’IA est pilotée au niveau stratégique, avec des usages généralisés et des résultats mesurés.'
  ];
  const maturity = report.maturity?.name === levelNames[level] ? report.maturity : {
    name: levelNames[level],
    description: levelDescriptions[level],
    acquired: ''
  };
  const generatedDate = new Date(report.savedAt).toLocaleString('fr-FR');
  const axes = Object.entries(report.axes);
  const stages = [
    ['Emergence', 'Émergence'],
    ['Structuration', 'Structuration'],
    ['Industrialisation', 'Industrialisation']
  ];

  reportRoot.innerHTML = `
    <div class="rapport-actions">
      <a href="maturityIA.html">Modifier mes réponses</a>
      <button type="button" id="download-html">Téléchargement HTML</button>
      <button type="button" id="download-json">Téléchargement JSON</button>
      <button type="button" id="print-report">Enregistrer en PDF</button>
    </div>
    ${archiveMarkup()}
    <p id="directory-save-status" class="directory-save-status" aria-live="polite"></p>
    <header class="bandeau">
      <div class="surtitre"><span>Rapport de maturité IA</span><span>${escapeHtml(generatedDate)}</span></div>
      <h1 class="niveau-titre">Niveau ${level} : ${escapeHtml(maturity.name)}</h1>
      <p class="niveau-texte">${escapeHtml(maturity.description)}</p>
      ${maturity.acquired ? `<p class="niveau-acquis">${escapeHtml(maturity.acquired)}</p>` : ''}
      <div class="niveau-moyenne">Note moyenne : ${formatScore(report.overall)} / 5</div>
    </header>

    <section class="carte">
      <div class="duo">
        <div>
          <h2>Vue radar des axes</h2>
          <p class="sous-titre">Moyennes des cinq axes.</p>
          <div class="radar-cadre">${radarMarkup(report.axes)}</div>
        </div>
        <div>
          <h2>Moyennes par stade</h2>
          <p class="sous-titre">Moyennes des stades de maturité.</p>
          <div class="barchart">
            ${stages.map(([key, label]) => `
              <div class="barre-col">
                <div class="barre-note">${formatScore(report.stages[key])} / 5</div>
                <div class="barre-v-cadre"><div class="barre-v-valeur" style="height:${report.stages[key] * 20}%;background:${scoreColor(report.stages[key])}"></div></div>
                <div class="barre-lib">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="carte">
      <h2>Scores détaillés par axe</h2>
      <p class="sous-titre">Moyenne de chaque axe et note de ses trois questions.</p>
      ${window.scoresAxesMarkup(axes, report.answers)}
    </section>

    <section class="carte">
      <div class="duo">
        <div>
          <h2>Forces identifiées</h2>
          <p class="sous-titre">Les trois réponses les mieux notées, tous axes et stades confondus.</p>
          ${window.forcesMarkup(report.strengths)}
        </div>
        <div>
          <h2>Points de vigilance</h2>
          <p class="sous-titre">Les trois réponses les moins bien notées, tous axes et stades confondus.</p>
          ${window.vigilancesMarkup(report.watchPoints)}
        </div>
      </div>
    </section>

    <section class="carte">
      <h2>Plan d’action à court terme</h2>
      ${window.planCourtTermeMarkup(report.priorityActions)}
    </section>

    <section class="carte">
      <h2>Plan d’action à moyen terme</h2>
      ${window.planMoyenTermeMarkup(report.mediumTermActions)}
    </section>

    <section class="carte">
      <h2>Profil de l’entreprise</h2>
      <p class="sous-titre">Informations déclarées dans le questionnaire.</p>
      ${window.profilEntrepriseMarkup(report.profile)}
    </section>

    <section class="carte">
      <h2>Analyse détaillée</h2>
      <p class="sous-titre">Acquis, blocages, capacités à développer, actions et résultats attendus par axe.</p>
      ${window.analyseDetailleeMarkup(report.axisAnalysis, report.answers)}
    </section>

    <footer>Rapport généré à partir du référentiel ${escapeHtml(report.analysisVersion || 'historique')} et de vos réponses au questionnaire de maturité IA.</footer>
  `;

  document.getElementById('print-report').addEventListener('click', () => window.print());
  document.getElementById('download-html').addEventListener('click', downloadStandaloneHtml);
  document.getElementById('download-json').addEventListener('click', downloadJson);
  saveReportToDirectory();
}

async function loadReport() {
  try {
    // On charge d’abord l’archive pour sélectionner le rapport demandé dans l’URL,
    // ou le rapport le plus récent si aucun identifiant n’a été fourni.
    const listResponse = await fetch('/api/reports');
    if (!listResponse.ok) throw new Error('Session expirée. Reconnectez-vous.');
    const list = await listResponse.json();
    archivedReports = list.reports || [];
    const selectedId = requestedReportId || archivedReports[0]?.id;
    if (selectedId) {
      const response = await fetch(`/api/report?id=${encodeURIComponent(selectedId)}`);
      if (response.ok) report = (await response.json()).report;
    }
    // Le rapport n’est rendu que s’il contient les réponses attendues ; sinon, on guide
    // l’utilisateur vers l’espace personnel plutôt que d’afficher une page vide.
    if (report && Array.isArray(report.answers)) renderReport();
    else renderMissingReport();
  } catch (error) {
    reportRoot.innerHTML = `<section class="carte rapport-vide"><h1>Connexion requise</h1><p class="sous-titre">${escapeHtml(error.message)}</p><a href="login.html">Se connecter</a></section>`;
  }
}

loadReport();