import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PlannerBootstrapBoundary } from './PlannerBootstrapBoundary'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlannerBootstrapBoundary>{() => <App />}</PlannerBootstrapBoundary>
  </StrictMode>,
)
