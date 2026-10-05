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

  window.planCourtTermeMarkup = (actions) => {
    if (!Array.isArray(actions) || !actions.length) {
      return '<p class="vide">Aucune action disponible.</p>';
    }

    return `<ol class="liste classement">${actions.map((item) => `
      <li>
        <strong>${escapeHtml(item.axe)}</strong>
        <p>${escapeHtml(item.action || item.analysis?.action || '')}</p>
      </li>
    `).join('')}</ol>`;
  };
})();