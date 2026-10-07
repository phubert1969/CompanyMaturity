(() => {
  // Ce bloc transforme le profil renseigné dans le questionnaire en liste lisible dans le rapport.
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  // Libellés lisibles utilisés pour chaque champ du profil d’entreprise.
  const labels = {
    intention: 'Motif de l’évaluation',
    effectif: 'Effectif',
    secteur: 'Secteur d’activité',
    departement: 'Département',
    role: 'Rôle',
    objectifs: 'Objectifs prioritaires'
  };

  // Rendu HTML d’un profil à partir d’un objet clé/valeur.
  window.profilEntrepriseMarkup = (profile) => {
    const entries = Object.entries(profile || {});
    if (!entries.length) return '<p class="vide">Aucune information de profil disponible.</p>';

    return `<ol class="liste">${entries.map(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return `<li class="profil-ligne"><strong>${escapeHtml(labels[key] || key)} :</strong> ${values.map(escapeHtml).join(', ')}</li>`;
    }).join('')}</ol>`;
  };
})();