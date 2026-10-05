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

  function analysisListMarkup(answers, analysisKey) {
    if (!Array.isArray(answers) || !answers.length) {
      return '<p class="vide">Aucune donnée disponible.</p>';
    }

    return `<ol class="liste classement">${answers.map((answer) => `
      <li>
        <strong>${escapeHtml(answer.axe)} · ${escapeHtml(answer.type)}</strong>
        <span>${escapeHtml(answer.label)}</span>
        <p>${escapeHtml(answer.analysis?.[analysisKey] || '')}</p>
      </li>
    `).join('')}</ol>`;
  }

  window.forcesMarkup = (answers) => analysisListMarkup(answers, 'acquired');
  window.vigilancesMarkup = (answers) => analysisListMarkup(answers, 'blocker');
})();