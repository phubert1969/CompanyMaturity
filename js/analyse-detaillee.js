(() => {
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  const analysisLabels = {
    acquired: 'Déjà acquis',
    blocker: 'Blocage vers le niveau suivant',
    capability: 'Capacités à construire',
    action: 'Actions prioritaires',
    outcome: 'Résultats attendus'
  };
  const stageLabels = {
    Emergence: 'Émergence',
    Structuration: 'Structuration',
    Industrialisation: 'Industrialisation'
  };
  const stageOrder = ['Emergence', 'Structuration', 'Industrialisation'];

  window.analyseDetailleeMarkup = (axisAnalysis, answers) => {
    const axes = Array.isArray(axisAnalysis) && axisAnalysis.length
      ? axisAnalysis
      : Array.isArray(answers)
        ? [...new Set(answers.map((answer) => answer.axe))].map((axe) => ({
        axe,
        answers: answers.filter((answer) => answer.axe === axe)
        }))
        : [];
    if (!axes.length) return '<p class="vide">Aucune analyse détaillée disponible.</p>';

    return axes.map((axis) => {
      const axisAnswers = [...(axis.answers || [])].sort((first, second) =>
        stageOrder.indexOf(first.type) - stageOrder.indexOf(second.type)
      );
      return `
        <details class="axe">
          <summary>${escapeHtml(axis.axe)}</summary>
          <dl class="analyse-lignes">${Object.entries(analysisLabels).map(([key, label]) => {
            const stageAnalyses = axisAnswers
              .filter((answer) => answer.analysis?.[key])
              .map((answer) => `
                <li>${escapeHtml(answer.analysis[key])}</li>
              `).join('');
            return `<div><dt>${label}</dt><dd><ul class="analyse-fusionnee">${stageAnalyses}</ul></dd></div>`;
          }).join('')}</dl>
        </details>
      `;
    }).join('');
  };
})();