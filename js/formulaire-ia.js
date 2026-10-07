// Ce fichier construit le questionnaire complet de maturité IA :
// - questions d’introduction sur le profil de l’entreprise,
// - 15 questions métier par axe/stade,
// - validation avant envoi,
// - calcul du rapport et sauvegarde en session ou via l’API.
const introQuestions = [
  {
    id: 'intention',
    title: '1- Intention : Pourquoi souhaitez-vous évaluer votre maturité data et IA ?',
    type: 'radio',
    description: 'Suggestions',
    options: [
      'J\'aimerais connaître mon niveau avant de mettre en place de l\'IA.',
      'Je souhaite mesurer les progrès réalisés par rapport à l\'an dernier.',
      'Je veux sensibiliser ma Direction à ces sujets data / IA.'
    ]
  },
  {
    id: 'effectif',
    title: '2- Profil de votre entreprise : Combien de collaborateurs comptez-vous dans votre entreprise ?',
    type: 'radio',
    description: 'Effectif total de votre entreprise',
    options: [
      'Moins de 10',
      '11 à 50',
      '51 à 250',
      '251 à 1000',
      'Plus de 1000',
      'Je ne sais pas'
    ]
  },
  {
    id: 'secteur',
    title: '3- Quel est votre secteur d\'activité ?',
    type: 'radio',
    description: 'Sélectionnez une option',
    options: [
      'Agriculture, pêche, énergie, environnement',
      'Industrie et fabrication',
      'Construction et immobilier',
      'Commerce et distribution',
      'Transport et logistique',
      'Banque, finance et assurance',
      'Santé et social',
      'Éducation et formation',
      'Tourisme, hôtellerie, restauration',
      'Communication, marketing, médias',
      'Informatique et technologies',
      'Conseil et services aux entreprises',
      'Juridique',
      'Culture, sport et divertissement',
      'Recherche, innovation et sciences',
      'Autre'
    ]
  },
  {
    id: 'localisation',
    title: '4- Localisation',
    type: 'group',
    fields: [
      {
        id: 'departement',
        label: 'Dans quel département se situe votre entreprise ?',
        type: 'text',
        placeholder: 'Recherchez un département (numéro ou nom)...',
        required: true
      },
    ]
  },
  {
    id: 'role',
    title: '5- Quel est votre rôle dans votre entreprise ?',
    type: 'radio',
    description: 'Sélectionnez une option',
    options: [
        'Directeur Général / Président / Fondateur',
        'Directeur Administratif et Financier',
        'Directeur Marketing',
        'Directeur Commercial',
        'Directeur des Opérations',
        'Directeur des Systèmes d\'Information (DSI)',
        'Chief Data Officer (ou équivalent)',
        'Directeur de Business Unit',
        'Autres'
    ],
    required: true
  },

  {
    id: 'objectifs',
    title: '6- Enjeux stratégiques de votre entreprise : Quels sont vos objectifs prioritaires pour lesquels vous pensez que les données et l\'IA peuvent vous aider ?',
    type: 'checkbox',
    description: 'Plusieurs réponses possibles',
    options: [
      'Acquérir et fidéliser les clients',
      'Améliorer la connaissance, la satisfaction et l\'expérience client',
      'Transformer notre modèle économique',
      'Réduire les coûts',
      'Proposer de nouveaux produits et services',
      'Mieux anticiper (prédire les ventes, organiser les stocks, maintenance prédictive...)',
      'Faciliter le pilotage de l\'entreprise',
      'Optimiser notre performance opérationnelle (logistique, achats, opérations, administrative...)',
      'Autre'
    ],
    required: true
  }
];

const iaQuestions = [
  {
    id: 'Q01',
    axe: 'POTENTIEL',
    type: 'Emergence',
    question: 'Quelles sont les infrastructures technologiques en place pour soutenir des projets d’IA ?',
    options: [
      { value: 0, label: 'Absente', description: 'Aucune infrastructure ou capacité spécifique permettant de développer ou déployer des solutions IA.' },
      { value: 1, label: 'Expérimentale', description: 'Des ressources IT/cloud existantes sont utilisées ponctuellement pour des expérimentations IA.' },
      { value: 2, label: 'Disponible', description: 'Une infrastructure dédiée permettant de réaliser des projets IA existe, mais elle reste limitée, hétérogène ou peu standardisée.' },
      { value: 3, label: 'Standardisée', description: 'Des environnements dédiés à l\'IA sont standardisés, avec des capacités de calcul adaptées et des processus structurés de développement et de déploiement.' },
      { value: 4, label: 'Optimisée', description: 'L\'infrastructure est scalable, automatisée, sécurisée et optimisée pour les performances et les coûts des workloads IA.' },
      { value: 5, label: 'À l\'échelle de l\'entreprise', description: 'Une plateforme IA gouvernée et industrialisée permet de supporter de nombreux cas d\'usage, différents modèles et des déploiements à grande échelle, avec optimisation continue.' }
    ]
  },
  {
    id: 'Q02',
    axe: 'Potentiel',
    type: 'Structuration',
    question: 'Dans quelle mesure l’entreprise dispose-t-elle de données accessibles, fiables et exploitables pour ses usages d’IA ?',
    options: [
      { value: 0, label: 'Absente', description: 'Aucune donnée pertinente identifiée.' },
      { value: 1, label: 'Fragmentée', description: 'Données dispersées, difficilement accessibles et de qualité incertaine.' },
      { value: 2, label: 'Disponible', description: 'Données pertinentes disponibles pour certains usages, mais encore hétérogènes ou difficiles à exploiter.' },
      { value: 3, label: 'Exploitable', description: 'Données accessibles, structurées ou préparées et suffisamment fiables pour développer des solutions IA.' },
      { value: 4, label: 'Industrialisée', description: 'Données gouvernées, cataloguées, contrôlées et alimentées par des pipelines permettant des usages IA reproductibles.' },
      { value: 5, label: 'Data-ready', description: 'Environnement data industrialisé permettant d\'alimenter, à grande échelle, différents usages IA avec qualité, traçabilité, automatisation et réutilisabilité.' }
    ]
  },
  {
    id: 'Q03',
    axe: 'Potentiel',
    type: 'Industrialisation',
    question: 'Dans quelle mesure les activités de l’entreprise présentent-elles un potentiel d’application de l’IA ?',
    options: [
      { value: 0, label: 'Aucun potentiel identifié', description: 'Aucun cas d\'usage IA pertinent identifié.' },
      { value: 1, label: 'Potentiel limité', description: 'Quelques opportunités ponctuelles, avec un impact potentiel limité.' },
      { value: 2, label: 'Potentiel identifié', description: 'Plusieurs cas d\'usage pertinents ont été identifiés dans certaines activités.' },
      { value: 3, label: 'Potentiel significatif', description: 'L\'IA peut améliorer significativement plusieurs processus, produits ou services.' },
      { value: 4, label: 'Potentiel élevé', description: 'L\'IA peut transformer plusieurs activités clés ou générer de nouvelles sources importantes de valeur.' },
      { value: 5, label: 'Potentiel stratégique', description: 'L\'IA est susceptible de transformer en profondeur le modèle opérationnel, les produits/services ou les sources de valeur de l\'entreprise.' }
    ]
  },
  {
    id: 'Q04',
    axe: 'Stratégie',
    type: 'Emergence',
    question: 'Quel est le niveau d’ambition de l’entreprise concernant l’IA ?',
    options: [
      { value: 0, label: 'Absente', description: 'L\'IA ne fait pas partie des réflexions ou ambitions de l\'entreprise.' },
      { value: 1, label: 'Exploratoire', description: 'L\'entreprise commence à explorer les possibilités offertes par l\'IA.' },
      { value: 2, label: 'Expérimentation', description: 'L\'entreprise affiche une volonté de développer l\'IA à travers quelques initiatives ciblées.' },
      { value: 3, label: 'Ambition définie', description: 'Des objectifs explicites concernant l\'IA sont définis au niveau de l\'entreprise ou de plusieurs activités.' },
      { value: 4, label: 'Transformation', description: 'L\'IA constitue un levier identifié de transformation des activités, produits, services ou opérations.' },
      { value: 5, label: 'Ambition stratégique', description: 'L\'IA est considérée comme un levier majeur d\'évolution du positionnement et/ou du modèle économique de l\'entreprise.' }
    ]
  },
  {
    id: 'Q05',
    axe: 'Stratégie',
    type: 'Structuration',
    question: 'Dans quelle mesure l’entreprise dispose-t-elle d’une feuille de route pour mettre en œuvre son ambition IA ?',
    options: [
      { value: 0, label: 'Aucune feuille de route', description: 'Aucune action ou trajectoire IA définie.' },
      { value: 1, label: 'Initiatives ponctuelles', description: 'Quelques initiatives existent sans trajectoire commune.' },
      { value: 2, label: 'Roadmap émergente', description: 'Des initiatives sont regroupées et une première trajectoire est en cours de définition.' },
      { value: 3, label: 'Roadmap structurée', description: 'Une feuille de route IA définit des initiatives, des échéances et des objectifs.' },
      { value: 4, label: 'Roadmap pilotée', description: 'La feuille de route est intégrée aux plans de l\'entreprise et régulièrement pilotée avec des indicateurs.' },
      { value: 5, label: 'Transformation orchestrée', description: 'Une trajectoire pluriannuelle coordonne les initiatives IA, leur passage à l\'échelle et leur évolution en fonction des résultats et des priorités de l\'entreprise.' }
    ]
  },
  {
    id: 'Q06',
    axe: 'Stratégie',
    type: 'Industrialisation',
    question: 'Dans quelle mesure les initiatives et cas d’usage IA sont-ils priorisés en fonction des enjeux de l’entreprise ?',
    options: [
      { value: 0, label: 'Aucun cas d’usage', description: 'Aucun cas d\'usage IA identifié.' },
      { value: 1, label: 'Exploration', description: 'Quelques cas d\'usage sont identifiés sans véritable priorisation.' },
      { value: 2, label: 'Identification', description: 'Plusieurs cas d\'usage sont recensés et font l\'objet d\'une première analyse.' },
      { value: 3, label: 'Priorisation', description: 'Les cas d\'usage sont priorisés selon des critères explicites tels que valeur, faisabilité, risques ou effort.' },
      { value: 4, label: 'Portefeuille piloté', description: 'Les initiatives sont gérées comme un portefeuille, avec arbitrage des investissements et suivi de leur progression.' },
      { value: 5, label: 'Optimisation continue', description: 'Le portefeuille est régulièrement réévalué en fonction de la valeur créée, des résultats obtenus, des nouvelles opportunités et de l\'évolution des priorités de l\'entreprise.' }
    ]
  },
  {
    id: 'Q07',
    axe: 'Culture',
    type: 'Emergence',
    question: 'Dans quelle mesure les dirigeants et managers favorisent-ils l’adoption de l’IA dans l’entreprise ?',
    options: [
      { value: 0, label: 'Absence d\'implication', description: 'Les dirigeants et managers ne manifestent pas d\'intérêt ou d\'implication vis-à-vis de l\'IA.' },
      { value: 1, label: 'Sensibilisation', description: 'Le sujet est connu des dirigeants et managers, mais sans implication concrète.' },
      { value: 2, label: 'Soutien ponctuel', description: 'Certains dirigeants ou managers soutiennent des initiatives IA, principalement au niveau de projets individuels.' },
      { value: 3, label: 'Soutien managérial', description: 'Les managers encouragent l\'expérimentation et l\'utilisation de l\'IA dans leurs équipes.' },
      { value: 4, label: 'Leadership actif', description: 'Les dirigeants et managers portent activement l\'adoption de l\'IA et accompagnent sa diffusion dans l\'entreprise.' },
      { value: 5, label: 'Leadership exemplaire', description: 'Le leadership IA est visible dans les pratiques managériales et les dirigeants incarnent eux-mêmes l\'utilisation et l\'adoption de l\'IA.' }
    ]
  },
  {
    id: 'Q08',
    axe: 'Culture',
    type: 'Structuration',
    question: 'Dans quelle mesure les collaborateurs sont-ils prêts à adopter et utiliser l’IA dans leur activité ?',
    options: [
      { value: 0, label: 'Résistance', description: 'L\'IA suscite principalement de la crainte, de la méfiance ou une résistance à son utilisation.' },
      { value: 1, label: 'Distance', description: 'Les collaborateurs connaissent le sujet mais restent largement indifférents ou peu concernés.' },
      { value: 2, label: 'Curiosité', description: 'Une partie des collaborateurs manifeste de l\'intérêt et commence à expérimenter l\'IA.' },
      { value: 3, label: 'Acceptation', description: 'L\'utilisation de l\'IA est globalement acceptée et commence à entrer dans les pratiques de travail.' },
      { value: 4, label: 'Appropriation', description: 'Les collaborateurs utilisent spontanément l\'IA pour améliorer leurs activités et partagent leurs expériences.' },
      { value: 5, label: 'Transformation des pratiques', description: 'Les collaborateurs contribuent activement à faire évoluer les usages de l\'IA et intègrent celle-ci dans leurs pratiques professionnelles.' }
    ]
  },
  {
    id: 'Q09',
    axe: 'Culture',
    type: 'Industrialisation',
    question: 'Dans quelle mesure l’entreprise favorise-t-elle l’apprentissage, l’expérimentation et le partage autour de l’IA ?',
    options: [
      { value: 0, label: 'Aucun dispositif', description: 'Aucun dispositif d\'apprentissage, d\'expérimentation ou de partage autour de l\'IA.' },
      { value: 1, label: 'Initiatives informelles', description: 'Des échanges ou expérimentations existent de manière informelle entre quelques collaborateurs.' },
      { value: 2, label: 'Initiatives ponctuelles', description: 'Des ateliers, formations, communautés ou expérimentations sont organisés ponctuellement.' },
      { value: 3, label: 'Dispositifs réguliers', description: 'Des dispositifs réguliers permettent aux collaborateurs d\'apprendre, expérimenter et partager autour de l\'IA.' },
      { value: 4, label: 'Communautés actives', description: 'Des communautés, réseaux ou espaces de collaboration structurés favorisent la diffusion des pratiques et des retours d\'expérience.' },
      { value: 5, label: 'Apprentissage continu', description: 'L\'expérimentation, le partage et l\'apprentissage autour de l\'IA sont intégrés durablement dans les modes de fonctionnement de l\'entreprise.' }
    ]
  },
  {
    id: 'Q10',
    axe: 'Compétences',
    type: 'Emergence',
    question: 'Dans quelle mesure l’entreprise dispose-t-elle des compétences internes nécessaires pour concevoir, développer, déployer et exploiter des solutions d’IA ?',
    options: [
      { value: 0, label: 'Absentes', description: 'L\'entreprise ne dispose pas de compétences internes identifiées en IA.' },
      { value: 1, label: 'Très limitées', description: 'Quelques personnes possèdent des connaissances ou compétences IA, sans capacité collective structurée.' },
      { value: 2, label: 'Partielles', description: 'Une équipe ou plusieurs personnes disposent de compétences permettant de réaliser certains projets IA, mais des compétences importantes manquent.' },
      { value: 3, label: 'Opérationnelles', description: 'L\'entreprise dispose des principales compétences nécessaires pour développer et mettre en œuvre des projets IA.' },
      { value: 4, label: 'Complètes', description: 'Les compétences couvrent les différentes dimensions nécessaires : data, IA/ML, ingénierie, intégration, déploiement et usages métiers.' },
      { value: 5, label: 'Multidisciplinaires', description: 'L\'entreprise dispose d\'une capacité interne multidisciplinaire permettant de concevoir, industrialiser et faire évoluer des solutions IA de manière autonome.' }
    ]
  },
  {
    id: 'Q11',
    axe: 'Compétences',
    type: 'Structuration',
    question: 'Dans quelle mesure l’entreprise développe-t-elle les compétences IA de ses collaborateurs ?',
    options: [
      { value: 0, label: 'Aucun développement', description: 'Aucun dispositif de développement des compétences IA.' },
      { value: 1, label: 'Sensibilisation', description: 'Des actions ponctuelles de sensibilisation ou d\'initiation sont proposées.' },
      { value: 2, label: 'Formation ciblée', description: 'Des formations sont proposées à certaines populations ou pour certains besoins.' },
      { value: 3, label: 'Parcours structurés', description: 'Des parcours de développement des compétences sont définis pour différentes catégories de collaborateurs.' },
      { value: 4, label: 'Gestion des compétences', description: 'Les compétences IA sont identifiées, évaluées et développées en fonction des rôles et des besoins de l\'entreprise.' },
      { value: 5, label: 'Développement continu', description: 'L\'entreprise dispose d\'un dispositif continu permettant d\'anticiper les évolutions des compétences IA, d\'évaluer les acquis et d\'adapter régulièrement les parcours.' }
    ]
  },
  {
    id: 'Q12',
    axe: 'Compétences',
    type: 'Industrialisation',
    question: 'Dans quelle mesure l’entreprise sait-elle identifier et combler ses lacunes en compétences IA ?',
    options: [
      { value: 0, label: 'Aucune capacité', description: 'Les besoins et lacunes en compétences IA ne sont pas identifiés et aucun recours externe n\'est organisé.' },
      { value: 1, label: 'Réponse ponctuelle', description: 'Les compétences manquantes sont traitées au cas par cas, principalement par recours à des prestataires ou experts externes.' },
      { value: 2, label: 'Recours régulier', description: 'L\'entreprise fait régulièrement appel à des compétences externes pour compléter ses capacités internes.' },
      { value: 3, label: 'Approche structurée', description: 'Les lacunes sont identifiées et font l\'objet d\'une stratégie combinant recrutement, formation et recours à des partenaires externes.' },
      { value: 4, label: 'Écosystème de compétences', description: 'L\'entreprise dispose d\'un réseau structuré de partenaires, experts, fournisseurs ou institutions permettant de compléter rapidement ses compétences internes.' },
      { value: 5, label: 'Gestion dynamique des capacités', description: 'L\'entreprise anticipe ses besoins en compétences et ajuste continuellement le mix entre développement interne, recrutement, mobilité et recours à l\'écosystème externe.' }
    ]
  },
  {
    id: 'Q13',
    axe: 'Gouvernance',
    type: 'Emergence',
    question: 'Dans quelle mesure l’entreprise dispose-t-elle d’un cadre de gouvernance pour encadrer l’utilisation de l’IA ?',
    options: [
      { value: 0, label: 'Aucun cadre', description: 'Aucun principe, règle ou responsabilité n\'est défini pour l\'utilisation de l\'IA.' },
      { value: 1, label: 'Principes informels', description: 'Des principes ou consignes existent, mais ils restent informels et peu diffusés.' },
      { value: 2, label: 'Règles partielles', description: 'Des règles existent pour certains usages ou risques, mais leur couverture reste limitée.' },
      { value: 3, label: 'Cadre formalisé', description: 'Un cadre formalisé définit les principales règles, responsabilités et conditions d\'utilisation de l\'IA.' },
      { value: 4, label: 'Gouvernance structurée', description: 'Le cadre couvre notamment les risques, la sécurité, les données, la conformité, l\'éthique et les responsabilités, avec des rôles clairement définis.' },
      { value: 5, label: 'Gouvernance intégrée', description: 'La gouvernance IA est intégrée aux processus de l\'entreprise et évolue régulièrement en fonction des risques, des usages, des réglementations et des pratiques de référence.' }
    ]
  },
  {
    id: 'Q14',
    axe: 'Gouvernance',
    type: 'Structuration',
    question: 'Dans quelle mesure les projets et usages d’IA font-ils l’objet d’une évaluation et d’une validation avant leur mise en production ?',
    options: [
      { value: 0, label: 'Aucune évaluation', description: 'Les solutions IA peuvent être déployées sans processus d\'évaluation ou de validation.' },
      { value: 1, label: 'Évaluation ponctuelle', description: 'Certains projets font l\'objet d\'une évaluation informelle avant leur déploiement.' },
      { value: 2, label: 'Évaluation partielle', description: 'Des critères d\'évaluation existent pour certains projets ou certains types de risques.' },
      { value: 3, label: 'Processus structuré', description: 'Un processus formalisé évalue les projets selon des critères définis avant leur mise en production.' },
      { value: 4, label: 'Évaluation multidimensionnelle', description: 'L\'évaluation couvre systématiquement les dimensions pertinentes : performance, sécurité, données, risques, conformité, impacts et responsabilités.' },
      { value: 5, label: 'Décision fondée sur les risques', description: 'Le niveau d\'évaluation et de validation est adapté au niveau de risque et au contexte de chaque usage IA, avec traçabilité des décisions et réévaluation lorsque nécessaire.' }
    ]
  },
  {
    id: 'Q15',
    axe: 'Gouvernance',
    type: 'Industrialisation',
    question: 'Dans quelle mesure les solutions IA déployées sont-elles surveillées et réévaluées pendant leur cycle de vie ?',
    options: [
      { value: 0, label: 'Aucun suivi', description: 'Les solutions IA ne font pas l\'objet d\'un suivi après leur déploiement.' },
      { value: 1, label: 'Suivi ponctuel', description: 'Le fonctionnement des solutions est vérifié ponctuellement, généralement en cas de problème.' },
      { value: 2, label: 'Suivi partiel', description: 'Certaines métriques ou retours utilisateurs sont suivis, mais de manière inégale.' },
      { value: 3, label: 'Suivi structuré', description: 'Des indicateurs sont définis et suivis régulièrement pour les solutions IA en production.' },
      { value: 4, label: 'Suivi continu', description: 'Le suivi couvre notamment performance, qualité, sécurité, coûts, dérive des modèles et retours utilisateurs, avec des mécanismes d\'alerte et d\'action.' },
      { value: 5, label: 'Gouvernance du cycle de vie', description: 'Les solutions IA sont surveillées et réévaluées sur l\'ensemble de leur cycle de vie, avec des mécanismes permettant d\'adapter, suspendre ou retirer une solution lorsque les conditions ou les risques évoluent.' }
    ]
  }
];

const questionsContainer = document.getElementById('questions-container');
const form = document.getElementById('formulaire-ia');
const resultBox = document.getElementById('form-result');

// Remplit un bloc d’options de réponse à partir d’un tableau de choix.
function renderAnswerOptions(question, optionsList) {
  question.options.forEach((option) => {
    const optionRow = document.createElement('label');
    optionRow.className = 'option-row';

    if (question.type === 'checkbox') {
      optionRow.innerHTML = `
        <input type="checkbox" name="${question.id}" value="${option}">
        <span class="option-text">
          <strong>${option}</strong>
        </span>
      `;
    } else {
      optionRow.innerHTML = `
        <input type="radio" name="${question.id}" value="${option}" required>
        <span class="option-text">
          <strong>${option}</strong>
        </span>
      `;
    }

    optionsList.appendChild(optionRow);
  });
}

// Génère les cartes de questions d’introduction à partir du tableau `introQuestions`.
function renderIntroQuestions() {
  introQuestions.forEach((question) => {
    const card = document.createElement('article');
    card.className = 'question-card intro-card';

    const title = document.createElement('h2');
    title.textContent = question.title;
    card.appendChild(title);

    if (question.description) {
      const description = document.createElement('p');
      description.className = 'question-description';
      description.textContent = question.description;
      card.appendChild(description);
    }

    if (question.type === 'group') {
      const groupContainer = document.createElement('div');
      groupContainer.className = 'group-container';

      question.fields.forEach((field) => {
        if (field.type === 'text') {
          const fieldWrap = document.createElement('div');
          fieldWrap.className = 'field-wrap';

          const label = document.createElement('label');
          label.textContent = field.label;

          const input = document.createElement('input');
          input.type = 'text';
          input.name = field.id;
          input.placeholder = field.placeholder;
          input.required = Boolean(field.required);

          fieldWrap.appendChild(label);
          fieldWrap.appendChild(input);
          groupContainer.appendChild(fieldWrap);
        }

        if (field.type === 'radio') {
          const optionsList = document.createElement('div');
          optionsList.className = 'options-grid compact-grid';
          field.options.forEach((option) => {
            const label = document.createElement('label');
            label.className = 'option-row';
            label.innerHTML = `
              <input type="radio" name="${field.id}" value="${option}" required>
              <span class="option-text"><strong>${option}</strong></span>
            `;
            optionsList.appendChild(label);
          });
          groupContainer.appendChild(optionsList);
        }
      });

      card.appendChild(groupContainer);
    } else {
      const optionsList = document.createElement('div');
      optionsList.className = question.type === 'checkbox' ? 'options-grid compact-grid' : 'options-grid';
      renderAnswerOptions(question, optionsList);
      card.appendChild(optionsList);
    }

    questionsContainer.appendChild(card);
  });
}

// Dynamise les 15 questions métier en fonction du référentiel V3 chargé depuis le backend.
function renderIaQuestions() {
  iaQuestions.forEach((question) => {
    const card = document.createElement('article');
    card.className = 'question-card';

    const meta = document.createElement('div');
    meta.className = 'question-meta';
    meta.innerHTML = `
      <span class="question-id">${question.id}</span>
      <span class="question-axis">${question.axe}</span>
      <span class="question-type">${question.type}</span>
    `;

    const title = document.createElement('h2');
    title.textContent = question.question;

    const optionsList = document.createElement('div');
    optionsList.className = 'options-grid';

    question.options.forEach((option) => {
      const optionRow = document.createElement('label');
      optionRow.className = 'option-row';
      optionRow.innerHTML = `
        <span class="option-choice">
          <input type="radio" name="${question.id}" value="${option.value}" required>
          <span class="score-pill">${option.value}</span>
        </span>
        <span class="option-text">
          <strong>${option.label}</strong>
          <small>${option.description}</small>
        </span>
      `;
      optionsList.appendChild(optionRow);
    });

    card.appendChild(meta);
    card.appendChild(title);
    card.appendChild(optionsList);
    questionsContainer.appendChild(card);
  });
}

// Vérifie que l’utilisateur a bien répondu à chaque champ obligatoire avant soumission.
function validateRequiredFields() {
  const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');

  const checkboxGroups = new Set(
    Array.from(form.querySelectorAll('input[type="checkbox"][name]')).map((field) => field.name)
  );

  for (const groupName of checkboxGroups) {
    if (!form.querySelector(`input[name="${groupName}"]:checked`)) {
      return false;
    }
  }

  for (const field of requiredFields) {
    if (field.type === 'checkbox') {
      if (!field.checked) return false;
    } else if (field.type === 'radio') {
      const groupName = field.name;
      const checked = form.querySelector(`input[name="${groupName}"]:checked`);
      if (!checked) return false;
    } else if (!field.value.trim()) {
      return false;
    }
  }

  return true;
}

// Soumission du formulaire : validation, calcul des moyennes par axe/stade,
// puis sauvegarde du rapport en session ou dans l’espace utilisateur.
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const isComplete = validateRequiredFields();
  if (!isComplete) {
    resultBox.textContent = 'Veuillez répondre à toutes les questions avant d\'envoyer le formulaire.';
    resultBox.classList.add('error');
    return;
  }

  const formData = new FormData(form);
  const submittedIaAnswers = Array.from(formData.entries()).filter(([key]) => /^Q\d+$/.test(key));
  if (submittedIaAnswers.length !== iaQuestions.length) {
    resultBox.textContent = 'Veuillez répondre à toutes les questions IA avant d\'envoyer le formulaire.';
    resultBox.classList.add('error');
    return;
  }

  const answers = iaQuestions.map((question) => {
    const score = Number(formData.get(question.id));
    const option = question.options.find((item) => item.value === score);
    return {
      id: question.id,
      question: question.question,
      axe: question.axe,
      type: question.type,
      score,
      label: option.label,
      description: option.description
    };
  });
  const total = answers.reduce((sum, answer) => sum + answer.score, 0);
  const profile = {};
  for (const [key, value] of formData.entries()) {
    if (/^Q\d+$/.test(key)) continue;
    if (!profile[key]) profile[key] = [];
    profile[key].push(value);
  }

  const axes = {};
  for (const axis of ['Potentiel', 'Stratégie', 'Culture', 'Compétences', 'Gouvernance']) {
    const axisAnswers = answers.filter((answer) => answer.axe.toLowerCase() === axis.toLowerCase());
    axes[axis] = axisAnswers.reduce((sum, answer) => sum + answer.score, 0) / axisAnswers.length;
  }

  const stages = {};
  for (const stage of ['Emergence', 'Structuration', 'Industrialisation']) {
    const stageAnswers = answers.filter((answer) => answer.type === stage);
    stages[stage] = stageAnswers.reduce((sum, answer) => sum + answer.score, 0) / stageAnswers.length;
  }

  const report = {
    overall: total / answers.length,
    profile,
    axes,
    stages,
    answers
  };

  try {
    const sessionResponse = await fetch('/api/session');
    if (sessionResponse.ok) {
      const response = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le serveur a refusé la sauvegarde.');
      window.location.href = `resultatsIA.html?id=${encodeURIComponent(result.id)}`;
      return;
    }

    sessionStorage.setItem('pendingMaturityReport', JSON.stringify(report));
    window.location.href = 'login.html?next=espace.html&reason=save';
  } catch (error) {
    resultBox.textContent = `Impossible de préparer l'enregistrement du diagnostic. Vérifiez que le stockage du navigateur est autorisé puis réessayez. (${error.message})`;
    resultBox.classList.add('error');
  }
});

// Charge le référentiel V3 depuis le serveur pour remplacer les questions statiques par les données du classeur.
async function loadIaQuestionsFromWorkbook() {
  const response = await fetch('/api/analysis-config');
  if (!response.ok) throw new Error('Le référentiel V3 est indisponible.');
  const config = await response.json();
  if (!Array.isArray(config.questions) || config.questions.length !== 15) {
    throw new Error('Le référentiel V3 ne contient pas les 15 questions attendues.');
  }

  iaQuestions.splice(0, iaQuestions.length, ...config.questions.map((question) => ({
    ...question,
    options: question.options.map((option) => ({
      value: option.score,
      label: option.label,
      description: option.description
    }))
  })));
}

renderIntroQuestions();
const submitButton = form.querySelector('button[type="submit"]');
submitButton.disabled = true;
loadIaQuestionsFromWorkbook()
  .then(() => {
    renderIaQuestions();
    submitButton.disabled = false;
  })
  .catch((error) => {
    resultBox.textContent = `${error.message} Redémarrez le serveur après avoir vérifié le classeur.`;
    resultBox.classList.add('error');
  });
