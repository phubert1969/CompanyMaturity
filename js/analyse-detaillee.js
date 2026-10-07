(() => {
  // Échappe les caractères HTML spéciaux pour éviter les injections XSS
  // lorsque les contenus dynamiques sont insérés dans le DOM via du HTML.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  // Libellés affichés pour chaque type d’analyse dans le rendu HTML.
  // Ils correspondent aux catégories de commentaires associées à un axe.
  const analysisLabels = {
    acquired: 'Déjà acquis',
    blocker: 'Blocage vers le niveau suivant',
    capability: 'Capacités à construire',
    action: 'Actions prioritaires',
    outcome: 'Résultats attendus'
  };

  // Libellés lisibles pour les différents stades de maturité.
  // Ces valeurs servent surtout à l’affichage ou à un éventuel mapping.
  const stageLabels = {
    Emergence: 'Émergence',
    Structuration: 'Structuration',
    Industrialisation: 'Industrialisation'
  };

  // Ordre de progression des stades pour trier les réponses dans l’ordre logique
  // du niveau de maturité : Emergence → Structuration → Industrialisation.
  const stageOrder = ['Emergence', 'Structuration', 'Industrialisation'];

  // Génère le HTML d’analyse détaillée pour chaque axe de maturité.
  // axisAnalysis, lorsqu’il est fourni, contient déjà les réponses regroupées par axe.
  // Le repli sur `answers` permet aussi d’afficher des rapports qui n’ont pas cette structure.
  window.analyseDetailleeMarkup = (axisAnalysis, answers) => {
    const axes = Array.isArray(axisAnalysis) && axisAnalysis.length
      ? axisAnalysis
      : Array.isArray(answers)
        ? [...new Set(answers.map((answer) => answer.axe))].map((axe) => ({
            axe,
            answers: answers.filter((answer) => answer.axe === axe)
          }))
        : [];

    // Si aucun axe n’existe, on affiche un message explicite plutôt qu’un HTML vide.
    if (!axes.length) return '<p class="vide">Aucune analyse détaillée disponible.</p>';

    // Chaque axe est transformé en un bloc <details> qui peut être plié/déplié.
    return axes.map((axis) => {
      // Tri des réponses du même axe selon le stade de maturité.
      // Cela permet d’afficher d’abord les éléments de base puis les plus avancés.
      const axisAnswers = [...(axis.answers || [])].sort((first, second) =>
        stageOrder.indexOf(first.type) - stageOrder.indexOf(second.type)
      );

      return `
        <details class="axe">
          <summary>${escapeHtml(axis.axe)}</summary>
          <dl class="analyse-lignes">${Object.entries(analysisLabels).map(([key, label]) => {
            // Pour chaque catégorie d’analyse (acquis, blocage, capacités, actions, résultats),
            // on collecte les éléments correspondant à cet axe et à cette catégorie.
            // Plusieurs stades peuvent contribuer à une même rubrique : leurs textes sont fusionnés
            // en une liste pour donner une vue transverse de l’axe.
            const stageAnalyses = axisAnswers
              .filter((answer) => answer.analysis?.[key])
              .map((answer) => `
                <li>${escapeHtml(answer.analysis[key])}</li>
              `).join('');

            // Chaque rubrique devient un <div> contenant le libellé et la liste de résultats.
            return `<div><dt>${label}</dt><dd><ul class="analyse-fusionnee">${stageAnalyses}</ul></dd></div>`;
          }).join('')}</dl>
        </details>
      `;
    }).join('');
  };
})();