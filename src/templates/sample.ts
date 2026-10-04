import type { Block, Doc } from '../model/schema'
import { blankDoc } from '../model/factories'

type Lang = 'fr' | 'en'

const T = {
  fr: {
    title: 'Ingénieure Data et Machine Learning',
    h: ['Recherche un CDI', 'Disponible en janvier', 'Lyon ou télétravail'],
    profile: 'Profil',
    profileBody: "Je construis des pipelines de données et des modèles de prévision, de l'exploration jusqu'à la mise en production. <strong>Recherche un CDI en data science ou en ingénierie ML.</strong>",
    xp: 'Expériences',
    x1: ['Data Scientist', 'Coopérative Rhône Énergie', 'Lyon, CDD', 'Mars 2024 – Août 2025'],
    x1a: 'Conçu un modèle de prévision de consommation horaire : <strong>erreur réduite de 18&nbsp;%</strong> sur 12 sites.',
    x1b: 'Industrialisé les entraînements avec <strong>Airflow et MLflow</strong>, du notebook au déploiement hebdomadaire.',
    x2: ['Ingénieure données', 'Atelier Numérique', 'Grenoble, alternance', 'Sept. 2022 – Févr. 2024'],
    x2a: 'Migré 40 tables métier vers un entrepôt <strong>PostgreSQL</strong> documenté et testé.',
    proj: 'Projets',
    p1: ['Vélos en libre-service', 'Prévision de la disponibilité des stations, servie par une API publique.'],
    skills: 'Compétences',
    g: [['Langages', 'Python, SQL, Bash'], ['Machine Learning', 'Scikit-Learn, XGBoost, PyTorch'], ['Données', 'Airflow, dbt, PostgreSQL, Spark'], ['MLOps', 'Docker, MLflow, Git, Linux']],
    edu: 'Formation',
    e1: ['Master Informatique', 'Science des données', 'Université Claude Bernard Lyon00a01'],
    langs: 'Langues',
    l: [['Français', 'langue maternelle'], ['Anglais', 'C1']],
  },
  en: {
    title: 'Data and Machine Learning Engineer',
    h: ['Seeking a permanent role', 'Available in January', 'Lyon or remote'],
    profile: 'Profile',
    profileBody: 'I build data pipelines and forecasting models, from exploration to production. <strong>Seeking a permanent role in data science or ML engineering.</strong>',
    xp: 'Experience',
    x1: ['Data Scientist', 'Rhône Energy Cooperative', 'Lyon, fixed-term', 'Mar. 2024 – Aug. 2025'],
    x1a: 'Designed an hourly consumption forecasting model: <strong>error cut by 18%</strong> across 12 sites.',
    x1b: 'Industrialised training with <strong>Airflow and MLflow</strong>, from notebook to weekly deployment.',
    x2: ['Data Engineer', 'Atelier Numérique', 'Grenoble, work-study', 'Sep. 2022 – Feb. 2024'],
    x2a: 'Migrated 40 business tables to a documented and tested <strong>PostgreSQL</strong> warehouse.',
    proj: 'Projects',
    p1: ['Bike sharing', 'Station availability forecasting, served by a public API.'],
    skills: 'Skills',
    g: [['Languages', 'Python, SQL, Bash'], ['Machine Learning', 'Scikit-Learn, XGBoost, PyTorch'], ['Data', 'Airflow, dbt, PostgreSQL, Spark'], ['MLOps', 'Docker, MLflow, Git, Linux']],
    edu: 'Education',
    e1: ['MSc in Computer Science', 'Data science', 'Université Claude Bernard Lyon00a01'],
    langs: 'Languages',
    l: [['French', 'native'], ['English', 'C1']],
  },
}

export function sampleBlocks(lang: Lang = 'fr'): Block[] {
  const t = T[lang]
  return [
    {
      id: 'id', type: 'identity', heading: '', hidden: false,
      name: 'Camille Martin',
      title: t.title,
      highlights: [
        { id: 'h1', icon: 'briefcase', text: t.h[0] },
        { id: 'h2', icon: 'calendar-check', text: t.h[1] },
        { id: 'h3', icon: 'navigation-arrow', text: t.h[2] },
      ],
      contacts: [
        { id: 'c1', kind: 'phone', text: '+33 6 00 00 00 00', href: 'tel:+33600000000' },
        { id: 'c2', kind: 'email', text: 'camille.martin@example.org', href: 'mailto:camille.martin@example.org' },
        { id: 'c3', kind: 'location', text: 'Lyon, France' },
        { id: 'c4', kind: 'github', text: 'github.com/camille-example', href: 'https://github.com/camille-example' },
      ],
    },
    { id: 'profile', type: 'text', heading: t.profile, hidden: false, body: t.profileBody },
    {
      id: 'xp', type: 'entries', heading: t.xp, hidden: false, kind: 'experience',
      items: [
        { id: 'x1', title: t.x1[0], subtitle: '', org: t.x1[1], meta: t.x1[2], dates: t.x1[3], tags: '', body: '', bullets: [{ id: 'x1a', text: t.x1a }, { id: 'x1b', text: t.x1b }] },
        { id: 'x2', title: t.x2[0], subtitle: '', org: t.x2[1], meta: t.x2[2], dates: t.x2[3], tags: '', body: '', bullets: [{ id: 'x2a', text: t.x2a }] },
      ],
    },
    {
      id: 'proj', type: 'entries', heading: t.proj, hidden: false, kind: 'project',
      items: [{ id: 'p1', title: t.p1[0], subtitle: '', org: '', meta: '', dates: '', tags: 'Prophet, FastAPI', body: t.p1[1], bullets: [] }],
    },
    { id: 'skills', type: 'skills', heading: t.skills, hidden: false, groups: t.g.map(([label, items], i) => ({ id: `g${i + 1}`, label, items })) },
    {
      id: 'edu', type: 'entries', heading: t.edu, hidden: false, kind: 'education',
      items: [{ id: 'e1', title: t.e1[0], subtitle: t.e1[1], org: t.e1[2], meta: '', dates: '2022 – 2024', tags: '', body: '', bullets: [] }],
    },
    { id: 'langs', type: 'pairs', heading: t.langs, hidden: false, items: t.l.map(([key, value], i) => ({ id: `l${i + 1}`, key, value })) },
  ]
}

export function sampleDoc(lang: Lang = 'fr', name = 'Camille Martin'): Doc {
  const doc = blankDoc(name, lang)
  doc.blocks = sampleBlocks(lang)
  doc.layout.columns = [
    { id: 'main', width: 1, unit: 'fr', panel: false, blocks: ['id', 'profile', 'xp', 'proj'] },
    { id: 'side', width: 68, unit: 'mm', panel: true, blocks: ['skills', 'edu', 'langs'] },
  ]
  doc.layout.gutter = 10
  return doc
}
