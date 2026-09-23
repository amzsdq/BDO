import { useEffect, useState } from 'react'
import type { PlannerBootstrap } from './data/plannerBootstrap'
import { writePlanSession, type PlanSessionState } from './data/planSession'
import { writeCharacterProfile, writeChecklist, writeInventory, type CharacterProfileState, type ChecklistState, type InventoryState } from './data/storage'

type ReadyBootstrap = Omit<PlannerBootstrap, 'hydration'> & {
  hydration: Extract<PlannerBootstrap['hydration'], { status: 'ready' }>
}

export interface ReadyPlannerState {
  session: PlanSessionState
  setSession: React.Dispatch<React.SetStateAction<PlanSessionState>>
  checklist: ChecklistState
  setChecklist: React.Dispatch<React.SetStateAction<ChecklistState>>
  inventory: InventoryState
  setInventory: React.Dispatch<React.SetStateAction<InventoryState>>
  profile: CharacterProfileState
  setProfile: React.Dispatch<React.SetStateAction<CharacterProfileState>>
}

/**
 * Own the mutable planner bundle only after dataset-first hydration succeeded.
 * Recovery-required never instantiates this hook, so it cannot accidentally
 * write defaults over corrupt/newer persisted state.
 */
export function useReadyPlannerState(bootstrap: ReadyBootstrap): ReadyPlannerState {
  const [session, setSession] = useState(() => bootstrap.hydration.session)
  const [checklist, setChecklist] = useState(() => bootstrap.hydration.checklist)
  const [inventory, setInventory] = useState(() => bootstrap.hydration.inventory)
  const [profile, setProfile] = useState(() => bootstrap.hydration.characterProfile)

  useEffect(() => { if (bootstrap.writesEnabled) writePlanSession(session) }, [bootstrap.writesEnabled, session])
  useEffect(() => { if (bootstrap.writesEnabled) writeChecklist(checklist) }, [bootstrap.writesEnabled, checklist])
  useEffect(() => { if (bootstrap.writesEnabled) writeInventory(inventory) }, [bootstrap.writesEnabled, inventory])
  useEffect(() => { if (bootstrap.writesEnabled) writeCharacterProfile(profile) }, [bootstrap.writesEnabled, profile])

  return { session, setSession, checklist, setChecklist, inventory, setInventory, profile, setProfile }
}
