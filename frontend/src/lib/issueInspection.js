/**
 * 문제 항목 점검 폼 모델 ↔ 백엔드 페이로드 변환 (순수 함수).
 * 폼 모델: 각 문제 항목이 현장 확인(observations)을 중첩으로 가진다.
 * 백엔드: items[] 와 observations[](itemIndex로 항목에 연결) 로 평탄화.
 */

export function newIssueItem() {
  return { category: '', name: '', state: 'minor', location: '', description: '', observations: [] };
}

export function newObservation() {
  return { label: '', value: 'present' };
}

/** GET 결과(items+observations)를 폼 모델(중첩)로 복원한다. */
export function fromInspection(items = [], observations = []) {
  return (items ?? []).map((it) => ({
    category: it.category ?? '',
    name: it.name ?? '',
    state: it.state ?? 'minor',
    location: it.location ?? '',
    description: it.description ?? '',
    observations: (observations ?? [])
      .filter((o) => o.item_id === it.id)
      .map((o) => ({ label: o.label, value: o.value })),
  }));
}

/** 폼 모델을 PATCH 페이로드로 평탄화한다. (라벨 없는 관찰 항목은 제외) */
export function buildSavePayload(formItems = []) {
  const items = formItems.map((it) => ({
    category: it.category,
    name: it.name,
    state: it.state,
    location: it.location,
    description: it.description,
  }));
  const observations = formItems.flatMap((it, idx) =>
    (it.observations ?? [])
      .filter((o) => o.label)
      .map((o) => ({ itemIndex: idx, label: o.label, value: o.value }))
  );
  return { items, observations };
}
