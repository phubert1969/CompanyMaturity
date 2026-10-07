(() => {
  // La page de rapport met en évidence les points forts et les points de vigilance.
  // Ce script construit la liste HTML correspondante à partir des réponses les mieux et moins bien notées.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  // Génère le rendu d’une liste de résultats à partir d’un tableau d’éléments "answer".
  // Le principe est simple : on reçoit un ensemble de réponses déjà classées par score,
  // puis on affiche uniquement le libellé, l’axe et la phrase de diagnostic associée.
  // analysisKey permet de choisir le type d’analyse à afficher :
  // - "acquired" pour les points forts
  // - "blocker" pour les points de vigilance
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

  // Force : réponse présentant le meilleur score global, donc déjà bien acquise et
  // probablement renforçable au niveau de la mise en œuvre ou du pilotage.
  // Le tri est effectué côté backend avec un décroissement du score, mais cette fonction
  // se contente d’afficher le résultat de manière lisible dans le rapport.
  window.forcesMarkup = (answers) => analysisListMarkup(answers, 'acquired');

  // Vigilance : réponse très faible ou bloquante, identifiée comme prioritaire à corriger.
  // Les scores les plus faibles sont gardés en tête pour souligner les points de rupture
  // dans la maturité de l’entreprise.
  window.vigilancesMarkup = (answers) => analysisListMarkup(answers, 'blocker');
})();