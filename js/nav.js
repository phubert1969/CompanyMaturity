// Ce script charge le menu partagé depuis navigation.html puis met en évidence la page active.
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('nav-container');

    if (!container) return;

    fetch('navigation.html')
        .then((response) => {
            if (!response.ok) throw new Error('Navigation non chargée');
            return response.text();
        })
        .then((html) => {
            // Injection du HTML du menu dans le conteneur partagé.
            container.innerHTML = html;

            // On compare la page courante avec les liens du menu pour appliquer la classe active.
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const links = container.querySelectorAll('a');

            links.forEach((link) => {
                const href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                }
            });
        })
        .catch((error) => {
            console.error(error);
        });
});
