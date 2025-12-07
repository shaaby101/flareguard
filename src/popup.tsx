import { createRoot } from 'react-dom/client'
import './index.css'
import { PopupHUD } from './components/extension/PopupHUD'

const container = document.getElementById('root')

if (container) {
  createRoot(container).render(<PopupHUD />)
}
