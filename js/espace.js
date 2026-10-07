// Ce script gère la page "espace" : affichage du profil utilisateur,
// liste des rapports enregistrés, gestion de la déconnexion et administration.
const accountName = document.getElementById('account-name');
const accountReports = document.getElementById('account-reports');
const accountMessage = document.getElementById('account-message');
const adminSection = document.getElementById('admin-section');

// Sécurise les valeurs affichées dans le HTML pour éviter les injections via des chaînes saisies par l’utilisateur.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

// Envoie une requête JSON et lève une erreur explicite si le serveur répond en erreur.
async function requestJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'La requête a échoué.');
    error.status = response.status;
    throw error;
  }
  return result;
}

// Charge le compte courant, ses rapports et, si l’utilisateur est admin, la liste des comptes.
async function loadAccount() {
  try {
    const session = await requestJson('/api/session');
    accountName.textContent = session.username;
    const { reports } = await requestJson('/api/reports');
    accountReports.innerHTML = reports.length ? reports.map((report) => `
      <li>
        <a href="resultatsIA.html?id=${encodeURIComponent(report.id)}">
          <strong>${new Date(report.savedAt).toLocaleString('fr-FR')}</strong>
          <span>${Number(report.overall).toFixed(1).replace('.', ',')} / 5${session.admin && report.owner ? ` · ${escapeHtml(report.owner)}` : ''}</span>
        </a>
      </li>
    `).join('') : '<li class="account-empty">Aucun diagnostic enregistré pour le moment.</li>';

    if (session.admin) {
      adminSection.hidden = false;
      const { users } = await requestJson('/api/users');
      document.getElementById('account-users').innerHTML = users.map((user) => `
        <li><span>${escapeHtml(user.username)}</span><strong>${user.admin ? 'Administrateur' : 'Utilisateur'}</strong></li>
      `).join('');
    }
  } catch (error) {
    accountMessage.textContent = error.message;
    if (error.status === 401) window.location.assign('login.html?next=espace.html');
  }
}

// Déconnexion : on demande au serveur de fermer la session puis on renvoie vers la page de login.
document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await requestJson('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  } finally {
    window.location.assign('login.html');
  }
});

// Création d’un utilisateur par l’administrateur.
document.getElementById('create-user-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById('admin-message');
  const values = Object.fromEntries(new FormData(form));
  try {
    await requestJson('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
    });
    form.reset();
    message.textContent = 'Compte créé.';
    await loadAccount();
  } catch (error) {
    message.textContent = error.message;
  }
});

// Mise à jour du mot de passe depuis l’espace utilisateur.
document.getElementById('password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById('password-message');
  const values = Object.fromEntries(new FormData(form));
  try {
    await requestJson('/api/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
    });
    form.reset();
    message.textContent = 'Mot de passe mis à jour.';
  } catch (error) {
    message.textContent = error.message;
  }
});

loadAccount();