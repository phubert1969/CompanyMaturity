(() => {
  // Ce script affiche le détail des scores par axe ainsi que la note de chaque question associée.
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

  // Labels affichés pour les trois stades de maturité dans le détail des scores.
  const stageLabels = {
    Emergence: 'Émergence',
    Structuration: 'Structuration',
    Industrialisation: 'Industrialisation'
  };

  // Chaque axe affiche sa moyenne et les notes associées à ses trois questions.
  window.scoresAxesMarkup = (axes, answers) => axes.map(([axis, average]) => {
    const axisAnswers = answers.filter((answer) => answer.axe.toLowerCase() === axis.toLowerCase());
    return `
      <div class="axe-score-detail">
        <div class="score-ligne">
          <span class="score-nom">${escapeHtml(axis)}</span>
          <span class="barre-fond"><span class="barre-valeur" style="width:${average * 20}%;background:${scoreColor(average)}"></span></span>
          <span class="score-note">${formatScore(average)} / 5</span>
        </div>
        <div class="scores-questions-axe" aria-label="Notes des trois questions de l’axe ${escapeHtml(axis)}">
          ${axisAnswers.map((answer) => `
            <span><strong>${escapeHtml(stageLabels[answer.type] || answer.type)}</strong> ${formatScore(answer.score)} / 5</span>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
})();