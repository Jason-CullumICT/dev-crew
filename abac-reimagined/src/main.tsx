import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { DesignSystemProvider } from './contexts/DesignSystemContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignSystemProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DesignSystemProvider>
  </StrictMode>,
)
