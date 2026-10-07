(() => {
  // Ce script construit le plan d’action à moyen terme, regroupé par axe de maturité.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  // Regroupe les actions par axe puis affiche le score cible associé à chaque question.
  // Ce plan est construit sur un principe de progression :
  // - on identifie les questions les plus faibles dans chaque axe,
  // - on leur associe un score cible immédiatement supérieur,
  // - on affiche ensuite la recommandation correspondant au niveau de maturité précédent.
  // Ce mode de calcul évite d’annoncer un saut trop brutal en matière de maturité.
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