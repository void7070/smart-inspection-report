import { describe, it, expect } from 'vitest';
import { newIssueItem, fromInspection, buildSavePayload } from '../src/lib/issueInspection.js';

describe('newIssueItem', () => {
  it('기본 심각도 minor, 관찰 빈 배열', () => {
    const it = newIssueItem();
    expect(it.state).toBe('minor');
    expect(it.observations).toEqual([]);
  });
});

describe('fromInspection', () => {
  it('observations를 item_id로 묶어 중첩 모델 복원', () => {
    const items = [
      { id: 10, category: '설비·배관', name: '누수', state: 'repair', location: '주방', description: '천장' },
      { id: 11, category: '전기', name: '콘센트 불량', state: 'check' },
    ];
    const observations = [
      { item_id: 10, label: '곰팡이', value: 'present' },
      { item_id: 11, label: '스파크', value: 'uncertain' },
    ];
    const form = fromInspection(items, observations);
    expect(form).toHaveLength(2);
    expect(form[0].observations).toEqual([{ label: '곰팡이', value: 'present' }]);
    expect(form[1].name).toBe('콘센트 불량');
  });
});

describe('buildSavePayload', () => {
  it('items 평탄화 + observations에 itemIndex 부여', () => {
    const form = [
      {
        category: '설비·배관',
        name: '누수',
        state: 'repair',
        location: '주방',
        description: '천장',
        observations: [{ label: '곰팡이', value: 'present' }],
      },
      { category: '전기', name: '콘센트 불량', state: 'check', location: '', description: '', observations: [] },
    ];
    const payload = buildSavePayload(form);
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0]).not.toHaveProperty('observations');
    expect(payload.observations).toEqual([{ itemIndex: 0, label: '곰팡이', value: 'present' }]);
  });

  it('라벨 없는 관찰 항목은 제외', () => {
    const form = [{ category: '전기', name: '조명', state: 'minor', observations: [{ label: '', value: 'present' }] }];
    expect(buildSavePayload(form).observations).toEqual([]);
  });

  it('fromInspection → buildSavePayload 라운드트립', () => {
    const items = [{ id: 1, category: 'A', name: 'a', state: 'repair', location: 'L', description: 'D' }];
    const observations = [{ item_id: 1, label: 'obs', value: 'absent' }];
    const payload = buildSavePayload(fromInspection(items, observations));
    expect(payload.observations).toEqual([{ itemIndex: 0, label: 'obs', value: 'absent' }]);
  });
});
