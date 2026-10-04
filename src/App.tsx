import { useRoute } from './app/router'
import './app/theme'
import { Editor } from './editor/Editor'
import { Home } from './home/Home'
import { PrintView } from './print/PrintView'

export default function App() {
  const route = useRoute()
  if (route.name === 'print') return <PrintView id={route.id} variant={route.variant} auto={route.auto} />
  if (route.name === 'edit') return <Editor id={route.id} />
  return <Home />
}
