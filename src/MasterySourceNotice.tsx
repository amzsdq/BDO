import { ALCHEMY_MASTERY_SOURCE } from './domain/alchemyMastery'
import { COOKING_MASTERY_SOURCE } from './domain/mastery'

function SourceLine({ label, source }: { label: string; source: typeof COOKING_MASTERY_SOURCE }) {
  return <li>
    <strong>{label}</strong>{' · '}
    <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.provider} KR · {source.sourceTitle}</a>
    <small> · 원문 수정 {source.sourceLastModified} · 프로젝트 검증 {source.verifiedAt}</small>
  </li>
}

/** User-visible provenance required by the release-blocking mastery data policy. */
export function MasterySourceNotice() {
  return <details className="profile-card">
    <summary>숙련도 데이터 출처</summary>
    <p><small>요리와 연금 숙련도는 서로 다른 효과로 계산하며, 아래 공식 KR 표의 공개된 숙련도 지점만 사용합니다.</small></p>
    <ul>
      <SourceLine label="요리" source={COOKING_MASTERY_SOURCE} />
      <SourceLine label="연금" source={ALCHEMY_MASTERY_SOURCE} />
    </ul>
  </details>
}
