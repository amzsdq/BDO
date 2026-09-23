import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PlannerBootstrapBoundary } from './PlannerBootstrapBoundary'
import { PlannerStateActions } from './PlannerStateActions'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlannerBootstrapBoundary>{(bootstrap) => <>
      <App bootstrap={bootstrap} />
      <PlannerStateActions onReset={() => window.location.reload()} />
    </>}</PlannerBootstrapBoundary>
  </StrictMode>,
)
