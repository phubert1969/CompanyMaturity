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

function profileMarkup(profile) {
  const labels = {
    intention: 'Motif de l’évaluation',
    effectif: 'Effectif',
    secteur: 'Secteur d’activité',
    departement: 'Département',
    role: 'Rôle',
    objectifs: 'Objectifs prioritaires'
  };
  return Object.entries(profile).map(([key, values]) => `
    <li class="profil-ligne"><strong>${escapeHtml(labels[key] || key)} :</strong> ${values.map(escapeHtml).join(', ')}</li>
  `).join('');
}

function answerDetailsMarkup(axisName) {
  const relevantAnswers = report.answers.filter((answer) => answer.axe.toLowerCase() === axisName.toLowerCase());
  return relevantAnswers.map((answer) => `
    <div class="reponse-detail">
      <strong>${escapeHtml(answer.id)} · ${escapeHtml(answer.question)}</strong>
      <small>${escapeHtml(answer.type)} · ${formatScore(answer.score)} / 5 · ${escapeHtml(answer.label)}</small>
      ${escapeHtml(answer.description)}
    </div>
  `).join('');
}

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
    status.textContent = `Sauvegarde automatique impossible. Lancez start-server.bat puis ouvrez http://127.0.0.1:8765. (${error.message})`;
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

function renderReport() {
  const level = Math.max(0, Math.min(5, Math.round(report.overall)));
  const levelNames = ['À initier', 'En friche', 'Émergent', 'Structuré', 'Industrialisé', 'Optimisé'];
  const levelDescriptions = [
    'Les pratiques et capacités IA restent à définir. Une première évaluation des besoins et des opportunités aidera à lancer la démarche.',
    'Les premières initiatives IA sont ponctuelles. La priorité est de structurer les expérimentations, les responsabilités et les compétences.',
    'Des usages et capacités commencent à se mettre en place. Il est utile de formaliser les priorités et de rendre les initiatives reproductibles.',
    'La démarche IA est structurée sur plusieurs dimensions. Le prochain enjeu est d’améliorer le pilotage et d’étendre les pratiques éprouvées.',
    'Les capacités IA sont largement intégrées et industrialisées. L’entreprise peut renforcer l’optimisation continue et la mesure de valeur.',
    'La maturité IA est élevée et intégrée aux pratiques de l’entreprise. L’enjeu est de maintenir les capacités et d’adapter la démarche aux évolutions.'
  ];
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
      <h1 class="niveau-titre">Niveau ${level} : ${levelNames[level]}</h1>
      <p class="niveau-texte">${levelDescriptions[level]}</p>
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
      <p class="sous-titre">Note de chaque axe sur une échelle de 5.</p>
      ${axes.map(([name, score]) => `
        <div class="score-ligne">
          <span class="score-nom">${escapeHtml(name)}</span>
          <span class="barre-fond"><span class="barre-valeur" style="width:${score * 20}%;background:${scoreColor(score)}"></span></span>
          <span class="score-note">${formatScore(score)} / 5</span>
        </div>
      `).join('')}
    </section>

    <section class="carte">
      <h2>Profil de l’entreprise</h2>
      <p class="sous-titre">Informations déclarées dans le questionnaire.</p>
      <ol class="liste">${profileMarkup(report.profile)}</ol>
    </section>

    <section class="carte">
      <h2>Analyse détaillée par axe</h2>
      <p class="sous-titre">Réponses et scores ayant contribué à chaque moyenne.</p>
      ${axes.map(([name, score]) => `
        <details class="axe">
          <summary>${escapeHtml(name)}<span class="note">${formatScore(score)} / 5</span></summary>
          ${answerDetailsMarkup(name)}
        </details>
      `).join('')}
    </section>

    <footer>Rapport généré à partir de vos réponses au questionnaire de maturité IA.</footer>
  `;

  document.getElementById('print-report').addEventListener('click', () => window.print());
  document.getElementById('download-html').addEventListener('click', downloadStandaloneHtml);
  document.getElementById('download-json').addEventListener('click', downloadJson);
  saveReportToDirectory();
}

async function loadReport() {
  try {
    const listResponse = await fetch('/api/reports');
    if (!listResponse.ok) throw new Error('Session expirée. Reconnectez-vous.');
    const list = await listResponse.json();
    archivedReports = list.reports || [];
    const selectedId = requestedReportId || archivedReports[0]?.id;
    if (selectedId) {
      const response = await fetch(`/api/report?id=${encodeURIComponent(selectedId)}`);
      if (response.ok) report = (await response.json()).report;
    }
    if (report && Array.isArray(report.answers)) renderReport();
    else renderMissingReport();
  } catch (error) {
    reportRoot.innerHTML = `<section class="carte rapport-vide"><h1>Connexion requise</h1><p class="sous-titre">${escapeHtml(error.message)}</p><a href="login.html">Se connecter</a></section>`;
  }
}

loadReport();