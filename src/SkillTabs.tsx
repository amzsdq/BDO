export type PlannerSkill = 'cooking' | 'alchemy'

export function SkillTabs({ skill, onChange }: { skill: PlannerSkill; onChange: (skill: PlannerSkill) => void }) {
  return <div className="segmented skill-tabs" aria-label="생활 콘텐츠">
    <button type="button" className={skill === 'cooking' ? 'active' : ''} aria-pressed={skill === 'cooking'} onClick={() => onChange('cooking')}>요리</button>
    <button type="button" className={skill === 'alchemy' ? 'active' : ''} aria-pressed={skill === 'alchemy'} onClick={() => onChange('alchemy')}>연금</button>
  </div>
}
