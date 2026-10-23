import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Necessário na TV física: sem isso window.webOS não existe e o launch vira mock.
import 'webostvjs/webOSTV'
import 'webostvjs/webOSTV-dev'
import App from './App'
import './styles/global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento #root não encontrado')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
