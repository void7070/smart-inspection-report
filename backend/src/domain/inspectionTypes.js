/**
 * 점검 유형 정의. 유형 → 한글 라벨 + 점검 플로우(whole/issue) 매핑.
 * - whole: 입주 전/정기 → 공간별 전체 점검
 * - issue: 퇴거 전/퇴거 후/긴급/수리 전/수리 후 → 문제 항목 점검
 * (백엔드_PRD §6 / §10 비교 정책 기준)
 */
export const INSPECTION_TYPES = {
  move_in: { label: '입주 전 점검', flow: 'whole' },
  periodic: { label: '정기 점검', flow: 'whole' },
  move_out_pre: { label: '퇴거 전 점검', flow: 'issue' },
  move_out_post: { label: '퇴거 후 점검', flow: 'issue' },
  emergency: { label: '긴급 점검', flow: 'issue' },
  repair_pre: { label: '수리 전 점검', flow: 'issue' },
  repair_post: { label: '수리 후 점검', flow: 'issue' },
};

export const INSPECTION_TYPE_CODES = Object.keys(INSPECTION_TYPES);

/** 유형 코드로 플로우(whole/issue)를 구한다. 알 수 없는 유형이면 throw. */
export function flowForType(type) {
  const entry = INSPECTION_TYPES[type];
  if (!entry) throw new Error(`알 수 없는 점검 유형: ${type}`);
  return entry.flow;
}

export function labelForType(type) {
  return INSPECTION_TYPES[type]?.label ?? type;
}
