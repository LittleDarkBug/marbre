import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { applyTemplate } from '../templates/apply'
import { buildDoc } from './build'
import { looksLikePhoto } from './photo'
import { importFile } from './index'
import { decodeMime, fromDocx, fromHtml, fromText } from './markup'
import { columnize } from './layout'
import { coverage, parse } from './parse'
import { findDates, fixAccents, sectionOf } from './patterns'
import { ImportError, type Line, type Source } from './types'

let y = 0
const line = (text: string, o: Partial<Line> = {}): Line => {
  y += 14
  return { text, page: 1, x0: 40, x1: 500, y0: y, y1: y + 10, size: 10, bold: false, italic: false, ...o }
}
const source = (lines: Line[]): Source => ({ kind: 'pdf', lines, pages: 1, images: [], columns: 1, raw: lines.map((l) => l.text).join('\n'), warnings: [] })

const classic = () => {
  y = 0
  return source([
    line('Camille Martin', { size: 24, bold: true }),
    line('Ingénieure Data et Machine Learning', { size: 13 }),
    line('+33 6 00 00 00 00 · camille.martin@example.org · Lyon, France'),
    line('github.com/camille-example'),
    line('PROFIL', { size: 12, bold: true }),
    line('Je construis des pipelines de données et des modèles de prévision, de l’exploration jusqu’à la mise en production.'),
    line('EXPÉRIENCES', { size: 12, bold: true }),
    line('Data Scientist', { bold: true, side: ['Mars 2024 – Août 2025'] }),
    line('Coopérative Rhône Énergie · Lyon'),
    line('• Conçu un modèle de prévision horaire : erreur réduite de 18 %'),
    line('• Industrialisé l’entraînement avec Airflow et MLflow, du notebook au'),
    line('déploiement hebdomadaire.'),
    line('Ingénieure données', { bold: true, side: ['Sept. 2022 – Févr. 2024'] }),
    line('Atelier Numérique · Grenoble'),
    line('• Migré 40 tables métier vers un entrepôt PostgreSQL documenté'),
    line('FORMATION', { size: 12, bold: true }),
    line('Master Informatique', { bold: true, side: ['2022 – 2024'] }),
    line('Université Claude Bernard Lyon 1'),
    line('COMPÉTENCES', { size: 12, bold: true }),
    line('Langages : Python, SQL, Bash'),
    line('Data : Airflow, dbt, PostgreSQL, Spark'),
    line('LANGUES', { size: 12, bold: true }),
    line('Français : langue maternelle'),
    line('Anglais : C1'),
  ])
}

describe('patterns', () => {
  it('recognises headings across languages, numbering and letter spacing', () => {
    expect(sectionOf('EXPÉRIENCES PROFESSIONNELLES')).toBe('experience')
    expect(sectionOf('Work Experience')).toBe('experience')
    expect(sectionOf('II – PARCOURS ACADÉMIQUE')).toBe('education')
    expect(sectionOf('3. Compétences')).toBe('skills')
    expect(sectionOf("CENTRES D’INTÉRÊT")).toBe('interests')
    expect(sectionOf('COMPÉTENCESTECHNIQUES')).toBe('skills')
    expect(sectionOf('Languages: Python, SQL')).toBeNull()
    expect(sectionOf('Langages', true)).toBeNull()
  })

  it('finds date ranges in many shapes', () => {
    expect(findDates('Data Scientist Mars 2024 – Août 2025')?.dates).toBe('Mars 2024 – Août 2025')
    expect(findDates('Stage 26 mai au 25 juillet 2025')?.dates).toBe('26 mai au 25 juillet 2025')
    expect(findDates('Developer 03/2021 - present')?.dates).toBe('03/2021 – present')
    expect(findDates('depuis 2023')?.dates).toBe('depuis 2023')
    expect(findDates('Built a model that saved 2024 hours of manual work for the operations team every year')).toBeNull()
  })

  it('repairs LaTeX accents', () => {
    expect(fixAccents('Z´ef´erino Exp´erience')).toBe('Zéférino Expérience')
  })
})

describe('parse', () => {
  it('rebuilds identity, sections, entries, skills and languages', () => {
    const src = classic()
    const cv = parse(src)
    expect(cv.name).toBe('Camille Martin')
    expect(cv.title).toBe('Ingénieure Data et Machine Learning')
    expect(cv.contacts.map((c) => c.kind).sort()).toEqual(['email', 'github', 'location', 'phone'])
    expect(cv.sections.map((s) => s.kind)).toEqual(['profile', 'experience', 'education', 'skills', 'languages'])
    const exp = cv.sections[1].entries
    expect(exp).toHaveLength(2)
    expect(exp[0]).toMatchObject({ title: 'Data Scientist', dates: 'Mars 2024 – Août 2025', org: 'Coopérative Rhône Énergie', meta: 'Lyon' })
    expect(exp[0].bullets).toHaveLength(2)
    expect(exp[0].bullets[1]).toContain('déploiement hebdomadaire.')
    expect(cv.sections[3].groups).toEqual([
      { label: 'Langages', items: 'Python, SQL, Bash' },
      { label: 'Data', items: 'Airflow, dbt, PostgreSQL, Spark' },
    ])
    expect(cv.sections[4].pairs).toEqual([
      { key: 'Français', value: 'langue maternelle' },
      { key: 'Anglais', value: 'C1' },
    ])
    expect(cv.leftovers).toEqual([])
    expect(coverage(src, cv).ratio).toBeGreaterThan(0.97)
  })

  it('joins a name split over two lines and skips contact labels', () => {
    y = 0
    const cv = parse(
      source([
        line('MARINA', { size: 28, bold: true, x0: 66 }),
        line('MARQUES', { size: 28, bold: true, x0: 54 }),
        line('FRONT END DEVELOPER', { size: 12 }),
        line('CONTACT', { size: 11, bold: true }),
        line('E-mail : marina@example.org'),
        line('Tél. : 06 12 34 56 78'),
        line('PROFIL', { size: 11, bold: true }),
        line('Développeuse front end depuis six ans, attachée à la qualité et à l’accessibilité des interfaces.'),
      ]),
    )
    expect(cv.name).toBe('MARINA MARQUES')
    expect(cv.title).toBe('FRONT END DEVELOPER')
    expect(cv.contacts.map((c) => c.text)).toEqual(['marina@example.org', '06 12 34 56 78'])
    expect(cv.sections.map((s) => s.kind)).toEqual(['profile'])
    expect(cv.leftovers).toEqual([])
  })

  it('does not take metadata or job titles for the name', () => {
    y = 0
    const cv = parse(
      source([
        line('CURRICULUM VITAE', { size: 20, bold: true }),
        line('Développeur Web & Étudiant'),
        line('DUPONT Jean-Marie'),
        line('I – ÉTAT CIVIL', { size: 16, bold: true }),
        line('Sexe :'),
        line('Masculin'),
        line('II – PARCOURS ACADÉMIQUE', { size: 16, bold: true }),
        line('Juin 2023'),
        line('Baccalauréat série C'),
      ]),
    )
    expect(cv.name).toBe('DUPONT Jean-Marie')
    expect(cv.sections.some((s) => s.kind === 'education')).toBe(true)
  })

  it('keeps skill sub-labels inside their section when headings share a style', () => {
    y = 0
    const cv = parse(
      source([
        line('Alex Doe', { size: 30, bold: true }),
        line('EXPERIENCE', { size: 12, bold: true }),
        line('Engineer', { bold: true, side: ['2020 – 2024'] }),
        line('ACME · Paris'),
        line('SKILLS', { size: 12, bold: true }),
        line('Languages', { bold: true }),
        line('Python, SQL, Bash'),
        line('Tools', { bold: true }),
        line('Docker, Git'),
        line('EDUCATION', { size: 12, bold: true }),
        line('MSc Computer Science', { bold: true, side: ['2018 – 2020'] }),
      ]),
    )
    expect(cv.sections.map((s) => s.kind)).toEqual(['experience', 'skills', 'education'])
    expect(cv.sections[1].groups.map((g) => g.label)).toEqual(['Languages', 'Tools'])
  })

  it('keeps links and emails that belong to a section inside it', () => {
    y = 0
    const cv = parse(
      source([
        line('Jane Roe', { size: 24, bold: true }),
        line('jane@example.org · github.com/janeroe'),
        line('PROJECTS', { size: 12, bold: true }),
        line('Weather app', { bold: true, side: ['2023'] }),
        line('github.com/janeroe/weather'),
        line('• Forecast dashboard built with React and a public API'),
        line('REFERENCES', { size: 12, bold: true }),
        line('John Smith: john.smith@acme.example'),
        line('CONTACT', { size: 12, bold: true }),
        line('+33 6 12 34 56 78'),
      ]),
    )
    expect(cv.contacts.map((c) => c.text).sort()).toEqual(['+33 6 12 34 56 78', 'github.com/janeroe', 'jane@example.org'])
    const project = cv.sections.find((s) => s.kind === 'projects')!.entries[0]
    expect([project.title, project.org, project.meta, project.body, ...project.bullets].join(' ')).toContain('github.com/janeroe/weather')
    expect(cv.sections.find((s) => s.kind === 'references')!.pairs[0].value).toContain('john.smith@acme.example')
  })

  it('never loses text: unclassified lines become leftovers', () => {
    y = 0
    const src = source([line('Jane Roe', { size: 22, bold: true }), line('zzq xqv wwk'), line('EXPERIENCE', { size: 12, bold: true }), line('Something odd happened here', { bold: true })])
    const cv = parse(src)
    expect(coverage(src, cv).ratio).toBe(1)
  })
})

describe('two column layouts', () => {
  const at = (text: string, x0: number, x1: number, y: number, o: Partial<Line> = {}): Line => ({ text, page: 1, x0, x1, y0: y, y1: y + 9, size: 9, bold: false, italic: false, ...o })
  const sidebarCv = () => {
    const main = [
      at('Alex Martin', 190, 380, 30, { size: 16, bold: true }),
      at('Ingénieur Systèmes Linux et DevOps', 190, 400, 50, { size: 11, bold: true }),
      at('alex@example.org | +33 6 11 22 33 44', 190, 350, 70),
      at('PROFIL', 190, 230, 130, { size: 10.6, bold: true }),
      at('Ingénieur systèmes spécialisé en intégration embarquée et en infrastructure DevOps.', 190, 570, 145),
      at('EXPÉRIENCES', 190, 260, 200, { size: 10.6, bold: true }),
      at('Ingénieur IoT Embarqué, Orange Innovation, Meylan (France)', 190, 480, 215),
      at("Stage de fin d'études (Février 2026 | Juillet 2026)", 190, 370, 227, { italic: true }),
      at('• Portage de Home Assistant en conteneurs.', 196, 470, 239),
      at('Administrateur Systèmes, DAC Technologies, Lomé (Togo)', 190, 450, 320),
      at('Stage (Août 2023 | Février 2024), puis temps partiel (Février | Octobre 2024)', 190, 470, 332, { italic: true }),
      at("• Administration d'un cluster Proxmox en pré-production : provisioning, cycle de vie,", 196, 570, 344),
      at('incidents de saturation stockage, sauvegardes.', 204, 370, 353),
      at('• Tableau de bord de supervision avec Grafana et Prometheus.', 196, 540, 365),
      at('FORMATION', 190, 255, 420, { size: 10.6, bold: true }),
      at('Master Informatique et Systèmes, Université de Lomé', 190, 470, 435, { bold: true }),
      at('(2024 | 2026)', 520, 570, 435),
    ]
    const side = [
      at('COMPÉTENCES TECHNIQUES', 30, 160, 160, { bold: true }),
      at('Virtualisation & conteneurs', 30, 136, 172, { bold: true }),
      at('Proxmox, Docker / Docker Compose,', 30, 165, 183),
      at('Kubernetes (bases)', 30, 100, 193),
      at('CI/CD & observabilité', 30, 116, 206, { bold: true }),
      at('GitLab CI/CD, Grafana, Loki /', 30, 140, 217),
      at('Promtail, Prometheus', 30, 107, 227),
      at('Sécurité', 30, 60, 318, { bold: true }),
      at('SSO Keycloak, Teleport, OpenSSL', 30, 156, 330),
      at('LANGUES', 30, 72, 500, { bold: true }),
      at('Français : natif', 30, 86, 512, { bold: true }),
      at('Anglais : intermédiaire (certification', 30, 162, 523),
      at('Linguaskill en cours)', 30, 105, 533),
      at('INTÉRÊTS', 30, 74, 600, { bold: true }),
      at('Jeux de société - Randonnée - FabLab', 30, 166, 612),
    ]
    const interleaved = [...main.slice(0, 10), ...side, ...main.slice(10)]
    return interleaved
  }

  it('reads the sidebar as its own column even when the PDF interleaves them', () => {
    const laid = columnize(sidebarCv(), 595)
    expect(laid.columns).toBe(2)
    const texts = laid.lines.map((l) => l.text)
    expect(texts.indexOf('incidents de saturation stockage, sauvegardes.')).toBeLessThan(texts.indexOf('COMPÉTENCES TECHNIQUES'))
    expect(texts[0]).toBe('Alex Martin')
  })

  it('keeps experience descriptions in experiences and dates on their entry', () => {
    const laid = columnize(sidebarCv(), 595)
    const cv = parse({ kind: 'pdf', lines: laid.lines, pages: 1, images: [], columns: laid.columns, raw: '', warnings: [] })
    const exp = cv.sections.find((s) => s.kind === 'experience')!.entries
    expect(exp.map((e) => [e.title, e.org, e.meta, e.subtitle, e.dates])).toEqual([
      ['Ingénieur IoT Embarqué', 'Orange Innovation', 'Meylan (France)', "Stage de fin d'études", 'Février 2026 – Juillet 2026'],
      ['Administrateur Systèmes', 'DAC Technologies', 'Lomé (Togo)', 'Stage, puis temps partiel', 'Août 2023 – Octobre 2024'],
    ])
    expect(exp[1].bullets).toEqual([
      "Administration d'un cluster Proxmox en pré-production : provisioning, cycle de vie, incidents de saturation stockage, sauvegardes.",
      'Tableau de bord de supervision avec Grafana et Prometheus.',
    ])
    const skills = cv.sections.find((s) => s.kind === 'skills')!.groups
    expect(skills).toContainEqual({ label: 'CI/CD & observabilité', items: 'GitLab CI/CD, Grafana, Loki / Promtail, Prometheus' })
    expect(skills).toContainEqual({ label: 'Sécurité', items: 'SSO Keycloak, Teleport, OpenSSL' })
    expect(cv.sections.find((s) => s.kind === 'languages')!.pairs).toEqual([
      { key: 'Français', value: 'natif' },
      { key: 'Anglais', value: 'intermédiaire (certification Linguaskill en cours)' },
    ])
    expect(cv.sections.find((s) => s.kind === 'education')!.entries[0]).toMatchObject({ title: 'Master Informatique et Systèmes', org: 'Université de Lomé', dates: '2024 – 2026' })
  })

  it('does not split a single column page with right aligned dates', () => {
    y = 0
    const lines: Line[] = []
    for (let i = 0; i < 10; i++) {
      lines.push(line(`Engineer at Company ${i} working on distributed systems and data pipelines`, { x0: 50, x1: 430 }))
      lines.push({ ...line(`Jan 20${10 + i} – Dec 20${11 + i}`, { x0: 480, x1: 560 }), y0: lines[lines.length - 1].y0, y1: lines[lines.length - 1].y1 })
    }
    expect(columnize(lines, 595).columns).toBe(1)
  })
})

describe('readers', () => {
  it('reads HTML with inline styles and lists', () => {
    const s = fromHtml('<p style="font-size:24pt"><b>Jane Roe</b></p><h2>Experience</h2><ul><li>Shipped things</li></ul><p><span style="font-weight:700">Bold line</span></p>')
    expect(s.lines.map((l) => l.text)).toEqual(['Jane Roe', 'Experience', 'Shipped things', 'Bold line'])
    expect(s.lines[0]).toMatchObject({ size: 24, bold: true })
    expect(s.lines[2].bullet).toBe(true)
    expect(s.lines[3].bold).toBe(true)
  })

  it('reads Markdown', () => {
    const s = fromText('# Jane Roe\n\n## Experience\n- **Built** [site](https://x.dev)\n', true)
    expect(s.lines.map((l) => [l.text, l.heading ?? 0, Boolean(l.bullet)])).toEqual([
      ['Jane Roe', 1, false],
      ['Experience', 2, false],
      ['Built site https://x.dev', 0, true],
    ])
  })

  it('decodes MHT chunks in their declared charset', () => {
    const body = '<html><head><meta charset="windows-1252"></head><body><p>C=E9libataire</p></body></html>'
    const mht = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="b1"\r\n\r\n--b1\r\nContent-Type: text/html\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${body}\r\n--b1--`
    expect(decodeMime(new TextEncoder().encode(mht))).toContain('Célibataire')
  })

  it('reads Word files from text boxes and embedded chunks', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    const p = (t: string, bold = false) => `<w:p><w:r>${bold ? '<w:rPr><w:b/><w:sz w:val="40"/></w:rPr>' : ''}<w:t>${t}</w:t></w:r></w:p>`
    zip.file(
      'word/document.xml',
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:pict><w:txbxContent>${p('Jane Roe', true)}${p('jane@example.org')}</w:txbxContent></w:pict></w:r></w:p>${p('EXPERIENCE')}${p('Engineer at ACME 2020 – 2024')}</w:body></w:document>`,
    )
    const docx = await fromDocx(await zip.generateAsync({ type: 'arraybuffer' }))
    expect(docx.lines.map((l) => l.text)).toEqual(expect.arrayContaining(['Jane Roe', 'jane@example.org', 'EXPERIENCE']))
    expect(docx.lines.find((l) => l.text === 'Jane Roe')).toMatchObject({ bold: true, size: 20 })
  })
})

describe('importFile', () => {
  it('rejects empty, oversized and unknown files with a typed error', async () => {
    await expect(importFile(new File([], 'a.pdf'), { lang: 'fr' })).rejects.toMatchObject({ code: 'empty' })
    await expect(importFile(new File([new Uint8Array([1, 2, 3, 4])], 'a.xyz'), { lang: 'fr' })).rejects.toBeInstanceOf(ImportError)
    const big = new File([new Uint8Array(26 * 1024 * 1024)], 'big.pdf')
    await expect(importFile(big, { lang: 'fr' })).rejects.toMatchObject({ code: 'too-big' })
  })

  it('imports plain text end to end into a valid document', async () => {
    const text = 'Jane Roe\nData Engineer\njane@example.org\n\nEXPERIENCE\nData Engineer, ACME (2020 – 2024)\n- Built pipelines\n\nSKILLS\nPython, SQL, Spark\n'
    const r = await importFile(new File([text], 'cv.txt', { type: 'text/plain' }), { lang: 'en' })
    expect(r.cv?.name).toBe('Jane Roe')
    expect(r.doc.blocks.some((b) => b.type === 'entries')).toBe(true)
    expect(r.coverage?.ratio).toBeGreaterThan(0.95)
  })

  it('imports JSON Resume and Marbre files without parsing', async () => {
    const resume = { basics: { name: 'Jane Roe', label: 'Engineer' }, work: [{ name: 'ACME', position: 'Engineer', startDate: '2020-01' }] }
    const r = await importFile(new File([JSON.stringify(resume)], 'resume.json'), { lang: 'en' })
    expect(r.kind).toBe('json')
    expect(JSON.stringify(r.doc)).toContain('Jane Roe')
    await expect(importFile(new File(['{oops'], 'x.json'), { lang: 'en' })).rejects.toMatchObject({ code: 'unreadable' })
  })

  it('shows an imported photo only in templates that have a photo slot', () => {
    const cv = { ...parse(classic()), photo: { src: 'data:image/png;base64,AA', w: 300, h: 300, page: 1, x: 0, y: 0 } }
    const doc = buildDoc(cv, { columns: 1, name: 'x', template: 'colonne' })
    const photo = doc.blocks.find((b) => b.type === 'photo')!
    expect(photo.hidden).toBe(true)
    const portrait = applyTemplate(doc, 'portrait')
    const shown = portrait.blocks.find((b) => b.type === 'photo')!
    expect(shown.hidden).toBe(false)
    expect(portrait.layout.columns.some((c) => c.blocks.includes(shown.id))).toBe(true)
  })

  it('rejects images that are not portraits', () => {
    const base = { src: '', page: 1, x: 0, y: 0 }
    expect(looksLikePhoto({ ...base, w: 400, h: 400, stats: { dominant: 0.2, colors: 150, detail: 12 } })).toBe(true)
    expect(looksLikePhoto({ ...base, w: 2400, h: 1600, stats: { dominant: 0.05, colors: 218, detail: 2.2 } })).toBe(false)
    expect(looksLikePhoto({ ...base, w: 128, h: 128, stats: { dominant: 1, colors: 1, detail: 0.2 } })).toBe(false)
    expect(looksLikePhoto({ ...base, w: 800, h: 800, stats: { dominant: 0.73, colors: 88, detail: 4.6 } })).toBe(false)
    expect(looksLikePhoto({ ...base, w: 1588, h: 2245 })).toBe(false)
  })

  it('builds a two column document when the source has two columns', () => {
    const cv = parse(classic())
    const doc = buildDoc(cv, { columns: 2, name: 'x' })
    expect(doc.layout.columns).toHaveLength(2)
    expect(doc.layout.columns[1].blocks.length).toBeGreaterThan(0)
  })
})
