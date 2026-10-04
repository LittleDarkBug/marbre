import type { SectionKind } from './types'

export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' &/+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const DICT: [SectionKind, string[]][] = [
  ['profile', ['profil', 'profile', 'summary', 'professional summary', 'resume', 'a propos', 'a propos de moi', 'about', 'about me', 'objectif', 'objectifs', 'objective', 'career objective', 'presentation', 'synthese', 'profil professionnel', 'perfil', 'sobre mi', 'profilo', 'kurzprofil', 'zusammenfassung', 'personal statement', 'introduction', 'qui suis je', 'en bref']],
  ['experience', ['experience', 'experiences', 'experiences pro', 'experience pro', 'exp pro', 'experience professionnelle', 'experiences professionnelles', 'parcours', 'parcours professionnel', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career', 'career history', 'emplois', 'postes occupes', 'experiencia', 'experiencia laboral', 'experiencia profesional', 'esperienza', 'esperienze', 'esperienza professionale', 'berufserfahrung', 'berufliche erfahrung', 'stages', 'stage', 'internships', 'internship', 'missions', 'experiences significatives', 'relevant experience']],
  ['education', ['formation', 'formations', 'education', 'etudes', 'diplomes', 'diplome', 'academic background', 'cursus', 'scolarite', 'parcours academique', 'formacion', 'educacion', 'formacion academica', 'istruzione', 'formazione', 'ausbildung', 'bildung', 'studium', 'qualifications', 'academic', 'education and training', 'formation academique', 'diplomes et formations']],
  ['skills', ['competences', 'competence', 'competences techniques', 'competences cles', 'competences professionnelles', 'skills', 'technical skills', 'hard skills', 'soft skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'savoir faire', 'savoir etre', 'qualites', 'outils', 'technologies', 'stack', 'stack technique', 'expertise', 'expertises', 'aptitudes', 'competencias', 'habilidades', 'competenze', 'kenntnisse', 'fahigkeiten', 'logiciels', 'informatique', 'outils et technologies', 'competences informatiques', 'it skills', 'tools', 'atouts', 'points forts', 'competences personnelles']],
  ['languages', ['langues', 'langue', 'languages', 'language', 'language skills', 'idiomas', 'idioma', 'lingue', 'sprachen', 'sprachkenntnisse', 'competences linguistiques']],
  ['projects', ['projets', 'projet', 'projects', 'project', 'personal projects', 'projets personnels', 'realisations', 'proyectos', 'progetti', 'projekte', 'portfolio', 'side projects', 'projets academiques']],
  ['certifications', ['certifications', 'certification', 'certificats', 'certificates', 'licenses & certifications', 'licences et certifications', 'accreditations', 'mooc', 'certificaciones']],
  ['awards', ['distinctions', 'prix', 'recompenses', 'awards', 'honors', 'honours', 'achievements', 'reussites', 'honors & awards', 'premios', 'auszeichnungen', 'concours']],
  ['interests', ["centres d'interet", "centres d'interets", "centre d'interet", 'interets', 'loisirs', 'hobbies', 'interests', 'passions', 'activites', 'activites extra professionnelles', 'aficiones', 'intereses', 'hobby', 'interessi', 'freizeit', 'sports', 'divers']],
  ['volunteering', ['benevolat', 'volunteering', 'volunteer experience', 'engagements', 'engagement associatif', 'engagements associatifs', 'vie associative', 'associatif', 'voluntariado', 'ehrenamt']],
  ['publications', ['publications', 'articles', 'conferences', 'talks', 'publicaciones', 'veroffentlichungen']],
  ['other', ['autres informations', 'informations complementaires', 'divers', 'autres', 'additional information', 'other information', 'miscellaneous', 'misc', 'otros', 'sonstiges']],
  ['references', ['references', 'referees', 'referencias', 'referenzen', 'recommandations']],
]

const INDEX = new Map<string, SectionKind>()
const SQUEEZED = new Map<string, SectionKind>()
for (const [kind, words] of DICT) {
  for (const w of words) {
    INDEX.set(w, kind)
    SQUEEZED.set(w.replace(/[ ']/g, ''), kind)
  }
}

export function sectionOf(text: string, exact = false): SectionKind | null {
  const f = fold(text).replace(/^(?:[0-9]+|[ivx]+)(?:\s*[.)\u2013\u2014-]\s*|\s+)(?=\p{L})/u, '').replace(/\s*:$/, '').trim()
  if (!f || f.length > 48) return null
  if (INDEX.has(f)) return INDEX.get(f)!
  const squeezed = f.replace(/[ ']/g, '')
  if (SQUEEZED.has(squeezed)) return SQUEEZED.get(squeezed)!
  if (exact || /:\s*\S/.test(text)) return null
  for (const [kind, words] of DICT) for (const w of words) if (w.length > 5 && f.startsWith(`${w} `) && f.split(' ').length <= 5) return kind
  return null
}

export function respace(text: string) {
  if (/\s/.test(text.trim())) return text
  const squeezed = fold(text).replace(/[ ']/g, '')
  for (const [, words] of DICT) {
    for (const w of words) {
      if (!w.includes(' ') || w.replace(/[ ']/g, '') !== squeezed) continue
      const letters = Array.from(text.trim())
      let out = ''
      let k = 0
      for (const ch of w.replace(/'/g, '')) {
        if (ch === ' ') {
          out += ' '
          continue
        }
        out += letters[k++] ?? ''
      }
      return out + letters.slice(k).join('')
    }
  }
  return text
}

const MONTH = String.raw`(?:janv(?:ier)?|jan(?:uary)?|ene(?:ro)?|genn(?:aio)?|j[aä]n(?:ner)?|f[eé]vr?(?:ier)?|feb(?:r(?:uary|ero|uar)?)?|mars|m[aä]rz?|mar(?:ch|zo)?|avr(?:il)?|apr(?:il|ile)?|abr(?:il)?|mai|may(?:o)?|magg(?:io)?|juin|june?|jun(?:io)?|giu(?:gno)?|juil(?:let)?|july?|jul(?:io)?|lug(?:lio)?|ao[uû]t|aug(?:ust)?|ago(?:sto)?|sept?(?:embre|ember|iembre)?|set(?:tembre)?|oct(?:obre|ober|ubre)?|okt(?:ober)?|ott(?:obre)?|nov(?:embre|ember|iembre)?|d[eé]c(?:embre|ember)?|dic(?:iembre|embre)?|dez(?:ember)?)`
const DAY = String.raw`(?:\d{1,2}(?:er|st|nd|rd|th)?\s+)?`
const ONE = String.raw`(?:${DAY}${MONTH}\.?\s*(?:\d{2}\s+)?\d{4}|\d{1,2}\s*[/.\-]\s*\d{4}|\d{4}\s*[/.\-]\s*\d{1,2}(?!\d)|(?:19|20)\d{2})`
const PRESENT = String.raw`(?:present|présent|current|now|today|aujourd['’]?hui|actuel(?:lement)?|en cours|ce jour|presente|actual(?:idad)?|heute|oggi|ongoing|à ce jour)`
const SEP = String.raw`\s*(?:[-–\u2014~]|à|au|to|until|till|a|bis|al|jusqu['’]?(?:à|en|au))\s*`

export const DATE_RANGE = new RegExp(String.raw`${DAY}${MONTH}\.?${SEP}${DAY}${MONTH}\.?\s*\d{4}|(?:(?:de|du|from|since|depuis|desde|seit|dal)\s+)?${ONE}(?:${SEP}(?:${ONE}|${PRESENT}))?|(?:depuis|since|desde|seit)\s+${ONE}`, 'i')

export function findDates(text: string): { dates: string; rest: string } | null {
  const m = DATE_RANGE.exec(text)
  if (!m) return null
  const dates = m[0].trim()
  const before = text.slice(0, m.index)
  const after = text.slice(m.index + m[0].length)
  const bareYear = /^(?:19|20)\d{2}$/.test(dates)
  if (bareYear && text.length > 50 && !/[(|,–—-]\s*$/.test(before) && !/^\s*(?:[)|,–—-]|$)/.test(after)) return null
  const rest = (before + ' ' + after)
    .replace(/[([]\s*[)\]]/g, '')
    .replace(/\s*[|·•,–—-]\s*$/g, '')
    .replace(/^\s*[|·•,–—-]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { dates, rest }
}

export const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
export const URL = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|fr|io|dev|net|org|me|co|app|ai|be|ch|de|es|it|uk|eu|tech|xyz|page|site|info|pro)(?:\/[^\s,;|()]*)?/i
export const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(0\)\s?)?(?:\d[\s.-]?){8,13}\d/
export const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^\s,;|()]+/i
export const GITHUB = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s,;|()]+/i
export const POSTCODE_CITY = /\b\d{5}\s+[A-ZÀ-Ý][\p{L}'-]+(?:[ -][A-ZÀ-Ý][\p{L}'-]+){0,2}|\b[A-ZÀ-Ý][\p{L}'-]+(?:[ -][A-ZÀ-Ý][\p{L}'-]+){0,2}\s?\(\d{2,3}\)(?:,\s*[A-ZÀ-Ý][\p{L}-]+)?|\b[A-ZÀ-Ý][\p{L}-]+(?:[ -][A-ZÀ-Ý][\p{L}-]+)?,\s*(?:France|Belgique|Belgium|Suisse|Switzerland|Canada|Qu[eé]bec|Luxembourg|Maroc|Morocco|Tunisie|S[eé]n[eé]gal|C[oô]te d'Ivoire|Togo|B[eé]nin|Cameroun|Germany|Allemagne|Spain|Espagne|Italy|Italie|UK|United Kingdom|USA|United States|Portugal|Netherlands|Pays-Bas)\b/u

export const BULLET = /^\s*(?:[•●▪■‣⁃∙·◦▸►▶➔➤➢❖◆◇○✓✔→*–—-]|o(?=\s)|\d{1,2}[.)](?=\s))\s*/

export function detectLang(text: string): 'fr' | 'en' {
  const words = fold(text).split(' ')
  const fr = words.filter((w) => ['le', 'la', 'les', 'des', 'et', 'du', 'pour', 'avec', 'dans', 'une', 'sur', 'au', 'aux', 'de'].includes(w)).length
  const en = words.filter((w) => ['the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'an', 'my', 'as'].includes(w)).length
  return fr >= en ? 'fr' : 'en'
}

export const CONTACT_HEADING = /^(?:contacts?|contact me|coordonn[eé]es|infos?\s*(?:&|et)\s*contacts?|informations?(?: personnelles)?|personal (?:details|info(?:rmation)?)|d[eé]tails|personuppgifter|osobn[eé] [uú]daje|datos personales|kontakt|(?:[ivx]+|\d+)?[.)\s\u2013\u2014-]*[eé]tat civil)\s*:?$/i

export const JOB_WORD = /(?:^|[^\p{L}])(?:d[eé]veloppeu(?:r|se)|developer|engineer|ing[eé]nieur(?:e)?|manager|designer|consultant(?:e)?|technicien(?:ne)?|technician|analyste?|architect(?:e)?|stagiaire|intern|student|[eé]tudiant(?:e)?|chef de projet|scientist|specialist|sp[eé]cialiste|assistant(?:e)?|directeur|directrice|director|lead|officer|coordinat(?:or|eur|rice)|gestionnaire|charg[eé]e? de|full[- ]?stack|front[- ]?end|back[- ]?end|devops|data|freelance|alternan(?:ce|t)|senior|junior|software|informaticien(?:ne)?|programmer|programmeur|webmaster|administrat(?:eur|rice|or)|commercial(?:e)?|comptable|accountant|infirmi(?:er|[eè]re)|nurse|teacher|enseignant(?:e)?|professeur|formateur|formatrice|vendeu(?:r|se)|technical|tester|testeu(?:r|se)|qa|ux|ui|product owner|scrum master|r[eé]dact(?:eur|rice)|writer|photographe|photographer|game|jeu|resumes?|r[eé]sum[eé]|curriculum|vitae|cv|samples?|template|[zž]ivotopis|accomplishments?)(?![\p{L}])/iu

export const NOT_NAME = /(?:^|[^\p{L}])(?:brevet|bac|baccalaur[eé]at|licence|master|dipl[oô]me|bachelor|universit[yé]|university|[eé]cole|school|institut[e]?|lyc[eé]e|college|coll[eè]ge|option|google|microsoft|amazon|masculin|f[eé]minin|male|female|c[eé]libataire|mari(?:é|ée|é\(e\))|single|married|nationalit[eé]|nationality|permis|driving|projects?|projets?|significant|personnelles|personal|informations)(?![\p{L}])/iu

export const ADDRESS = /(?:^|[^\p{L}])(?:flat|apt|apartment|street|st\.|road|rd\.|avenue|av\.|rue|chemin|bd|boulevard|ave\.?|st|blvd|dr\.|lane|ln|drive|court|ct|suite|all[ée]e|impasse|place|quartier|lot|bp|cedex|n[°o]\.?\s*\d)(?![\p{L}])|,\s*$/iu

const ACCENTS: Record<string, string> = { '´': '\u0301', '`': '\u0300', '^': '\u0302', '¨': '\u0308', '˜': '\u0303', 'ˆ': '\u0302', '¸': '\u0327' }

export function fixAccents(s: string) {
  if (!/[´`^¨˜ˆ¸]/.test(s)) return s
  return s.replace(/([´`^¨˜ˆ¸])\s?([a-zA-Z])/g, (_, a: string, c: string) => (c + ACCENTS[a]).normalize('NFC')).replace(/([a-zA-Z])¸/g, (_, c: string) => (c + '\u0327').normalize('NFC'))
}
