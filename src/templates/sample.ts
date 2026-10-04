import type { Block, Doc } from '../model/schema'
import { blankDoc } from '../model/factories'

export function sampleBlocks(): Block[] {
  return [
    {
      id: 'id', type: 'identity', heading: '', hidden: false,
      name: 'Camille Martin',
      title: 'Ingénieure Data et Machine Learning',
      highlights: [
        { id: 'h1', icon: 'briefcase', text: 'Recherche un CDI' },
        { id: 'h2', icon: 'calendar-check', text: 'Disponible en janvier' },
        { id: 'h3', icon: 'navigation-arrow', text: 'Lyon ou télétravail' },
      ],
      contacts: [
        { id: 'c1', kind: 'phone', text: '+33 6 00 00 00 00', href: 'tel:+33600000000' },
        { id: 'c2', kind: 'email', text: 'camille.martin@example.org', href: 'mailto:camille.martin@example.org' },
        { id: 'c3', kind: 'location', text: 'Lyon, France' },
        { id: 'c4', kind: 'github', text: 'github.com/camille-example', href: 'https://github.com/camille-example' },
      ],
    },
    {
      id: 'profile', type: 'text', heading: 'Profil', hidden: false,
      body: "Je construis des pipelines de données et des modèles de prévision, de l'exploration jusqu'à la mise en production. <strong>Recherche un CDI en data science ou en ingénierie ML.</strong>",
    },
    {
      id: 'xp', type: 'entries', heading: 'Expériences', hidden: false, kind: 'experience',
      items: [
        {
          id: 'x1', title: 'Data Scientist', subtitle: '', org: 'Coopérative Rhône Énergie', meta: 'Lyon · CDD', dates: 'Mars 2024 – Août 2025', tags: '', body: '',
          bullets: [
            { id: 'x1a', text: 'Conçu un modèle de prévision de consommation horaire : <strong>erreur réduite de 18&nbsp;%</strong> sur 12 sites.' },
            { id: 'x1b', text: 'Industrialisé les entraînements avec <strong>Airflow et MLflow</strong>, du notebook au déploiement hebdomadaire.' },
          ],
        },
        {
          id: 'x2', title: 'Ingénieure données', subtitle: '', org: 'Atelier Numérique', meta: 'Grenoble · Alternance', dates: 'Sept. 2022 – Févr. 2024', tags: '', body: '',
          bullets: [
            { id: 'x2a', text: 'Migré 40 tables métier vers un entrepôt <strong>PostgreSQL</strong> documenté et testé.' },
          ],
        },
      ],
    },
    {
      id: 'proj', type: 'entries', heading: 'Projets', hidden: false, kind: 'project',
      items: [
        { id: 'p1', title: 'Vélos en libre-service', subtitle: '', org: '', meta: '', dates: '', tags: 'Prophet, FastAPI', body: 'Prévision de la disponibilité des stations avec une API publique de suivi.', bullets: [] },
      ],
    },
    {
      id: 'skills', type: 'skills', heading: 'Compétences techniques', hidden: false,
      groups: [
        { id: 'g1', label: 'Langages', items: 'Python, SQL, Bash' },
        { id: 'g2', label: 'Machine Learning', items: 'Scikit-Learn, XGBoost, PyTorch' },
        { id: 'g3', label: 'Données', items: 'Airflow, dbt, PostgreSQL, Spark' },
        { id: 'g4', label: 'MLOps', items: 'Docker, MLflow, Git, Linux' },
      ],
    },
    {
      id: 'edu', type: 'entries', heading: 'Formation', hidden: false, kind: 'education',
      items: [
        { id: 'e1', title: 'Master Informatique', subtitle: 'Science des données', org: 'Université Claude Bernard Lyon 1', meta: '', dates: '2022 – 2024', tags: '', body: '', bullets: [] },
      ],
    },
    {
      id: 'langs', type: 'pairs', heading: 'Langues', hidden: false,
      items: [
        { id: 'l1', key: 'Français', value: 'langue maternelle' },
        { id: 'l2', key: 'Anglais', value: 'C1' },
      ],
    },
  ]
}

export function sampleDoc(): Doc {
  const doc = blankDoc('Camille Martin', 'fr')
  doc.blocks = sampleBlocks()
  doc.layout.columns = [
    { id: 'main', width: 1, unit: 'fr', panel: false, blocks: ['id', 'profile', 'xp', 'proj'] },
    { id: 'side', width: 68, unit: 'mm', panel: true, blocks: ['skills', 'edu', 'langs'] },
  ]
  doc.layout.gutter = 10
  return doc
}
