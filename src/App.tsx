import { useMemo, useState } from 'react'
import { buildPlan } from './domain/planner'
import { sampleDataset } from './data/sample'

export function App() {
  const [mode, setMode] = useState<'output' | 'attempts'>('attempts')
  const [amount, setAmount] = useState(100)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const plan = useMemo(
    () =>
      buildPlan(
        sampleDataset,
        [{ recipeId: 'sample-cooking', mode, amount }],
        { craftIntermediateItemIds: new Set() },
      ),
    [amount, mode],
  )

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">BLACK DESERT · 생활 준비</p>
          <h1>요리·연금 준비를 한 화면에서</h1>
          <p className="hero-copy">
            목표 수량이나 도구 사용 횟수를 입력하면 필요한 재료를 바로 계산하고,
            준비한 항목을 체크하세요.
          </p>
        </div>
        <span className="status-pill">KR · 데이터 준비 중</span>
      </header>

      <section className="planner-grid">
        <aside className="panel controls">
          <div className="section-heading">
            <span>01</span>
            <div>
              <strong>무엇을 만들까요?</strong>
              <small>현재는 계산 엔진 검증용 샘플 데이터입니다.</small>
            </div>
          </div>

          <label className="field">
            <span>검색</span>
            <input value="샘플 요리" readOnly aria-label="제작물 검색" />
          </label>

          <div className="segmented" aria-label="계산 기준">
            <button
              className={mode === 'output' ? 'active' : ''}
              onClick={() => setMode('output')}
            >
              목표 수량
            </button>
            <button
              className={mode === 'attempts' ? 'active' : ''}
              onClick={() => setMode('attempts')}
            >
              도구 사용 횟수
            </button>
          </div>

          <label className="field">
            <span>{mode === 'output' ? '목표 수량' : '사용 횟수'}</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>

          <div className="summary-card">
            <span>예상 작업</span>
            <strong>{plan.crafts[0]?.attempts.toLocaleString()}회</strong>
            <small>변동 산출량은 보수적으로 계산하도록 설계됩니다.</small>
          </div>
        </aside>

        <section className="panel checklist">
          <div className="section-heading">
            <span>02</span>
            <div>
              <strong>준비 체크리스트</strong>
              <small>필요량 · 보유량 · 부족량을 한 줄에서 확인합니다.</small>
            </div>
          </div>

          <div className="material-list">
            {plan.materials.map((material) => {
              const item = sampleDataset.items[String(material.itemId)]
              const done = checked[String(material.itemId)] ?? false
              return (
                <label className={`material-row ${done ? 'done' : ''}`} key={material.itemId}>
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(event) =>
                      setChecked((current) => ({
                        ...current,
                        [String(material.itemId)]: event.target.checked,
                      }))
                    }
                  />
                  <div className="item-icon" aria-hidden="true">?</div>
                  <div className="material-name">
                    <strong>{item?.nameKo ?? `아이템 #${material.itemId}`}</strong>
                    <small>원재료</small>
                  </div>
                  <div className="quantity">
                    <span>필요</span>
                    <strong>{material.required.toLocaleString()}</strong>
                  </div>
                  <div className="quantity missing">
                    <span>부족</span>
                    <strong>{material.missing.toLocaleString()}</strong>
                  </div>
                </label>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
