export const fr = {
  'app.name': 'Marbre',
  'app.tagline': 'Composer un CV libre, lisible par les humains et par les logiciels de recrutement.',
  'nav.open': 'Ouvrir',
  'nav.new': 'Nouveau',
  'nav.import': 'Importer',
  'nav.export': 'Exporter',
  'nav.print': 'Imprimer en PDF',
  'nav.undo': 'Annuler',
  'nav.redo': 'Rétablir',
  'nav.theme.light': 'Clair',
  'nav.theme.dark': 'Sombre',
  'nav.lang': 'English',
  'docs.title': 'Vos CV',
  'docs.empty': 'Aucun CV pour le moment.',
  'docs.delete': 'Supprimer',
  'docs.folder': 'Ouvrir un dossier',
  'docs.updated': 'Modifié le {date}',
  'error.file': 'Ce fichier ne peut pas être lu : {reason}',
} as const

export type Key = keyof typeof fr
