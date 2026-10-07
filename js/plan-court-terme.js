(() => {
  // Ce composant construit le plan d’action à court terme affiché dans le rapport.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  // Prépare le HTML d’un ensemble d’actions prioritaires pour la première période.
  // Le but est de synthétiser les réponses les plus critiques en une liste courte et lisible.
  // On affiche ici les actions de correction immédiate, c’est-à-dire les interventions
  // recommandées dès la première vague de mise en œuvre.
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