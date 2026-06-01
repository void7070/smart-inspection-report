// 리포트 표시용 순수 헬퍼.

const GRADE_CLASS = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-lime-100 text-lime-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-red-100 text-red-700',
};

export function gradeClass(grade) {
  return GRADE_CLASS[grade] ?? 'bg-slate-100 text-slate-700';
}

// whole(normal/caution/repair/urgent) + issue(minor/check/repair/urgent) 상태 라벨
const STATE_LABELS = {
  normal: '정상',
  caution: '주의',
  repair: '수리 필요',
  urgent: '긴급/안전',
  minor: '경미',
  check: '추가 확인',
};

export function stateLabel(code) {
  return STATE_LABELS[code] ?? code ?? '';
}

const OBSERVATION_LABELS = { present: '있음', absent: '없음', uncertain: '확인 필요' };

export function observationValueLabel(value) {
  return OBSERVATION_LABELS[value] ?? value ?? '';
}
