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

  window.planMoyenTermeMarkup = (actions) => {
    if (!Array.isArray(actions) || !actions.length) {
      return '<p class="vide">Aucune action disponible.</p>';
    }

    const axes = [...new Set(actions.map((action) => action.axe))];
    return axes.map((axis) => `
      <div class="plan-axe">
        <h3>${escapeHtml(axis)}</h3>
        <ol class="liste classement">${actions.filter((action) => action.axe === axis).map((action) => `
          <li>
            <p>${escapeHtml(action.action)} <span>(score cible question ${escapeHtml(action.id)} : ${action.targetScore})</span></p>
          </li>
        `).join('')}</ol>
      </div>
    `).join('');
  };
})();