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

  // Libellés lisibles utilisés pour chaque champ du profil du répondant.
  // On garde la compatibilité avec les exports historiques qui utilisent encore `role`.
  const labels = {
    intention: 'Motif de l’évaluation',
    effectif: 'Effectif',
    secteur: 'Secteur d’activité',
    responsabilite: 'Niveau hiérarchique',
    metier: 'Département / métier',
    objectifs: 'Objectifs prioritaires'
  };

  const normalizeProfileKey = (key) => (key === 'role' ? 'metier' : key);

  // Rendu HTML d’un profil à partir d’un objet clé/valeur.
  window.profilEntrepriseMarkup = (profile) => {
    const seen = new Set();
    const entries = Object.entries(profile || {}).filter(([key]) => {
      const canonicalKey = normalizeProfileKey(key);
      if (seen.has(canonicalKey)) return false;
      seen.add(canonicalKey);
      return true;
    });

    if (!entries.length) return '<p class="vide">Aucune information de profil disponible.</p>';

    return `<ol class="liste">${entries.map(([key, value]) => {
      const canonicalKey = normalizeProfileKey(key);
      const values = Array.isArray(value) ? value : [value];
      return `<li class="profil-ligne"><strong>${escapeHtml(labels[canonicalKey] || labels[key] || canonicalKey)} :</strong> ${values.map(escapeHtml).join(', ')}</li>`;
    }).join('')}</ol>`;
  };
})();