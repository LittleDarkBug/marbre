import { useT } from '../i18n'
import { toJsonResume } from '../model/resume'
import type { Doc } from '../model/schema'
import { download, fileName, saveDoc } from '../store/persist'
import { useDoc } from '../store/doc'
import { Btn, Section } from '../ui/kit'

const isChromium = () => /Chrome\/|Edg\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent)

let printing: HTMLIFrameElement | null = null

export async function printDoc(base: Doc, variantId: string | null) {
  await saveDoc(base)
  printing?.remove()
  const query = new URLSearchParams({ auto: '1', ...(variantId ? { variant: variantId } : {}) })
  const frame = document.createElement('iframe')
  frame.className = 'print-frame'
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.src = `${window.location.pathname}#/print/${base.id}?${query}`
  const done = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || e.data !== 'marbre:printed') return
    window.removeEventListener('message', done)
    setTimeout(() => frame.remove(), 500)
    if (printing === frame) printing = null
  }
  window.addEventListener('message', done)
  document.body.appendChild(frame)
  printing = frame
}

export function ExportPanel({ doc }: { doc: Doc }) {
  const t = useT()
  const base = useDoc((s) => s.base)
  const variantId = useDoc((s) => s.variantId)
  const variant = base.variants.find((v) => v.id === variantId)
  return (
    <div className="exp">
      <Section title={t('exp.pdf')}>
        <p className="insp-note">{t(isChromium() ? 'exp.pdfHelp' : 'exp.pdfNotChromium')}</p>
        <Btn icon="printer" tone="solid" showLabel label={variant ? t('exp.printVariant', { name: variant.name }) : t('nav.print')} onClick={() => printDoc(base, variantId)} />
      </Section>
      <Section title={t('exp.files')}>
        <div className="exp-row">
          <Btn icon="download-simple" showLabel label={t('exp.marbre')} onClick={() => download(fileName(base), JSON.stringify(base, null, 2))} />
          <Btn icon="download-simple" showLabel label={t('exp.resume')} onClick={() => download(fileName(doc).replace('.marbre.json', '.resume.json'), JSON.stringify(toJsonResume(doc), null, 2))} />
        </div>
        <p className="insp-note">{t('exp.cli')}</p>
        <code className="exp-code">npx marbre export {fileName(base)} --all --out pdf</code>
      </Section>
    </div>
  )
}
