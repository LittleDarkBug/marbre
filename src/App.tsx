import { useRoute } from './app/router'
import { PrintView } from './print/PrintView'

export default function App() {
  const route = useRoute()
  if (route.name === 'print') return <PrintView id={route.id} variant={route.variant} />
  return <main>Marbre</main>
}
