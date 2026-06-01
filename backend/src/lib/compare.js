/**
 * 리포트 비교 가능 판정 (순수 함수). 명세 §10 기준.
 * - 같은 호실이어야 한다.
 * - 같은 점검 유형이어야 한다.
 * - 예외: 수리 전(repair_pre) ↔ 수리 후(repair_post) 조합은 허용한다.
 * 자동 분석/판단은 하지 않는다(여기서는 비교 가능 여부만 결정).
 */

function isRepairBeforeAfterPair(a, b) {
  const set = new Set([a, b]);
  return set.has('repair_pre') && set.has('repair_post');
}

/**
 * @param {{unit_id:number, type:string}} left
 * @param {{unit_id:number, type:string}} right
 * @returns {{ok:boolean, code:string, message?:string, sameType:boolean, isRepairBeforeAfter:boolean}}
 */
export function canCompare(left, right) {
  if (left.unit_id !== right.unit_id) {
    return {
      ok: false,
      code: 'UNIT_MISMATCH',
      message: '같은 호실의 리포트만 비교할 수 있습니다.',
      sameType: false,
      isRepairBeforeAfter: false,
    };
  }

  const sameType = left.type === right.type;
  const isRepairBeforeAfter = isRepairBeforeAfterPair(left.type, right.type);

  if (!sameType && !isRepairBeforeAfter) {
    return {
      ok: false,
      code: 'TYPE_MISMATCH',
      message: '같은 점검 유형이거나 수리 전/후 조합만 비교할 수 있습니다.',
      sameType,
      isRepairBeforeAfter,
    };
  }

  return { ok: true, code: 'OK', sameType, isRepairBeforeAfter };
}
