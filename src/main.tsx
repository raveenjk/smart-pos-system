import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupBrowserMockApi } from './lib/mockApi'

// Automatically provide demo data if opened in regular web browser
setupBrowserMockApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
