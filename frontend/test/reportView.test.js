import { describe, it, expect } from 'vitest';
import { gradeClass, stateLabel, observationValueLabel } from '../src/lib/reportView.js';

describe('gradeClass', () => {
  it('등급별 클래스, 미지정은 slate', () => {
    expect(gradeClass('A')).toContain('emerald');
    expect(gradeClass('E')).toContain('red');
    expect(gradeClass('Z')).toContain('slate');
  });
});

describe('stateLabel', () => {
  it('whole/issue 상태 라벨', () => {
    expect(stateLabel('caution')).toBe('주의');
    expect(stateLabel('repair')).toBe('수리 필요');
    expect(stateLabel('check')).toBe('추가 확인');
    expect(stateLabel('urgent')).toBe('긴급/안전');
  });
  it('미지정은 코드 그대로', () => {
    expect(stateLabel('zzz')).toBe('zzz');
  });
});

describe('observationValueLabel', () => {
  it('있음/없음/확인 필요', () => {
    expect(observationValueLabel('present')).toBe('있음');
    expect(observationValueLabel('absent')).toBe('없음');
    expect(observationValueLabel('uncertain')).toBe('확인 필요');
  });
});
