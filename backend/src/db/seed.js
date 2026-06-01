import { flowForType } from '../domain/inspectionTypes.js';
import { computeGrade } from '../lib/grading.js';
import { createInspection, getInspectionById } from '../repositories/inspectionRepo.js';
import { buildSnapshot } from '../repositories/reportRepo.js';

/**
 * 데모 seed 데이터. (백엔드_PRD §4 수량 기준)
 * 사용자 3, 건물 2, 호실 3, 기존 리포트 3, 작성 중 1, 제출 대기 1.
 *
 * 비교 시연을 위해 1203호 정기점검 리포트 2개(B·A 등급)를 만들어 둔다
 * → 같은 호실 + 같은 유형이므로 /api/reports/compare 로 비교 가능.
 */
export function seed(db) {
  const run = db.transaction(() => {
    // --- users ---
    const insUser = db.prepare('INSERT INTO users (name, role, org) VALUES (?, ?, ?)');
    const contractorId = insUser.run('이시공', 'contractor', '믿음시공').lastInsertRowid;
    const ownerId = insUser.run('김임대', 'owner', null).lastInsertRowid;
    const tenantId = insUser.run('박임차', 'tenant', null).lastInsertRowid;

    // --- buildings ---
    const insBuilding = db.prepare('INSERT INTO buildings (name, address) VALUES (?, ?)');
    const b1 = insBuilding.run('노원 그린아파트', '서울 노원구 ...').lastInsertRowid;
    const b2 = insBuilding.run('강남 햇살빌라', '서울 강남구 ...').lastInsertRowid;

    // --- units ---
    const insUnit = db.prepare('INSERT INTO units (building_id, name) VALUES (?, ?)');
    const u1203 = insUnit.run(b1, '1203호').lastInsertRowid;
    const u1204 = insUnit.run(b1, '1204호').lastInsertRowid;
    const u201 = insUnit.run(b2, '201호').lastInsertRowid;

    // --- unit_users (owner는 3호실 전부, tenant는 1203호) ---
    const insUU = db.prepare('INSERT INTO unit_users (unit_id, user_id, role) VALUES (?, ?, ?)');
    for (const uid of [u1203, u1204, u201]) insUU.run(uid, ownerId, 'owner');
    insUU.run(u1203, tenantId, 'tenant');

    // --- 기존 리포트 3개 (항목 포함, 등급은 항목에서 산출) ---
    // R1: 1203 정기점검 — 거실 창호 주의 1건 → B등급
    createReport(db, {
      unitId: u1203,
      createdBy: contractorId,
      type: 'periodic',
      opinion: '전반적으로 양호하나 거실 창호 실리콘 들뜸 1건 확인. 경과 관찰 권장합니다.',
      items: [
        { category: '현관', name: '현관문', state: 'normal' },
        { category: '거실', name: '창호', state: 'caution', location: '베란다측 창', description: '실리콘 들뜸' },
        { category: '주방', name: '수전', state: 'normal' },
        { category: '화장실', name: '변기', state: 'normal' },
      ],
    });
    // R2: 1203 정기점검 — 전부 정상 → A등급 (R1과 비교 시연용)
    createReport(db, {
      unitId: u1203,
      createdBy: contractorId,
      type: 'periodic',
      opinion: '모든 항목 정상. 특이사항 없습니다.',
      items: [
        { category: '현관', name: '현관문', state: 'normal' },
        { category: '거실', name: '창호', state: 'normal' },
        { category: '주방', name: '수전', state: 'normal' },
      ],
    });
    // R3: 1204 입주 전 점검 — 전부 정상 → A등급
    createReport(db, {
      unitId: u1204,
      createdBy: contractorId,
      type: 'move_in',
      opinion: '입주 전 점검 결과 모든 공간 정상입니다.',
      items: [
        { category: '거실', name: '벽지', state: 'normal' },
        { category: '거실', name: '바닥', state: 'normal' },
      ],
    });

    // --- 작성 중(draft) 점검: 201호 입주 전, 일부 입력된 상태 ---
    createInspection(db, {
      unitId: u201,
      createdBy: contractorId,
      type: 'move_in',
      items: [{ category: '거실', name: '창호', state: 'caution', location: '거실', description: '작성 중' }],
    });

    // --- 제출 대기(submitted) 점검: 1204호 긴급, 문제 항목 + 현장 확인 ---
    const submitted = createInspection(db, {
      unitId: u1204,
      createdBy: contractorId,
      type: 'emergency',
      items: [
        { category: '설비·배관', name: '누수', state: 'repair', location: '주방 천장', description: '누수 흔적 발견' },
      ],
      observations: [{ itemIndex: 0, label: '곰팡이 흔적', value: 'present' }],
    });
    db.prepare("UPDATE inspections SET status = 'submitted' WHERE id = ?").run(submitted.id);
  });

  run();
}

/**
 * reported 점검 1건 + report + snapshot 생성.
 * 등급은 항목(items)에서 computeGrade로 산출하고, 스냅샷은 제출 시(B05)와 동일한
 * buildSnapshot으로 만들어 구조를 일치시킨다.
 */
function createReport(db, { unitId, createdBy, type, opinion, items = [] }) {
  const flow = flowForType(type);
  const grade = computeGrade(flow, items);

  const inspectionId = db
    .prepare(
      `INSERT INTO inspections (unit_id, created_by, type, flow, status, final_opinion)
       VALUES (?, ?, ?, ?, 'reported', ?)`
    )
    .run(unitId, createdBy, type, flow, opinion).lastInsertRowid;

  const insItem = db.prepare(
    `INSERT INTO inspection_items (inspection_id, category, name, state, location, description)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const it of items) {
    insItem.run(inspectionId, it.category, it.name, it.state, it.location ?? null, it.description ?? null);
  }

  const reportId = db
    .prepare(
      `INSERT INTO reports (inspection_id, unit_id, type, flow, grade, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(inspectionId, unitId, type, flow, grade, createdBy).lastInsertRowid;

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
  const inspection = getInspectionById(db, inspectionId);
  const snapshot = buildSnapshot(db, inspection, grade, report);

  db.prepare('INSERT INTO report_snapshots (report_id, snapshot_json) VALUES (?, ?)').run(
    reportId,
    JSON.stringify(snapshot)
  );

  return reportId;
}
