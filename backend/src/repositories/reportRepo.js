import { computeGrade } from '../lib/grading.js';
import { labelForType } from '../domain/inspectionTypes.js';
import { getInspectionById } from './inspectionRepo.js';

const CAUTION_TEXT =
  '본 리포트는 점검 시점의 상태를 기록한 것으로, 법적 책임이나 보증금 공제 여부를 판단하지 않습니다.';

/**
 * 리포트 스냅샷 JSON을 만든다. 생성 시점의 데이터를 고정 저장하기 위한 것으로,
 * 이후 원본 inspection이 바뀌어도 이 JSON은 변하지 않는다.
 */
export function buildSnapshot(db, inspection, grade, report) {
  const unit = db
    .prepare(
      `SELECT u.id, u.name, b.name AS building_name, b.address
       FROM units u JOIN buildings b ON b.id = u.building_id WHERE u.id = ?`
    )
    .get(inspection.unit_id);

  const contractor = db
    .prepare('SELECT id, name, org FROM users WHERE id = ?')
    .get(inspection.created_by);

  const partyByRole = (role) =>
    db
      .prepare(
        `SELECT us.id, us.name FROM unit_users uu
         JOIN users us ON us.id = uu.user_id
         WHERE uu.unit_id = ? AND uu.role = ? LIMIT 1`
      )
      .get(inspection.unit_id, role) ?? null;

  const aiRow = db
    .prepare('SELECT payload_json FROM ai_guides WHERE inspection_id = ? ORDER BY id DESC LIMIT 1')
    .get(inspection.id);

  return {
    reportId: report.id,
    grade,
    generatedAt: report.created_at,
    inspection: {
      id: inspection.id,
      type: inspection.type,
      typeLabel: inspection.typeLabel,
      flow: inspection.flow,
    },
    unit: {
      id: unit.id,
      name: unit.name,
      building: unit.building_name,
      address: unit.address,
    },
    parties: {
      contractor,
      owner: partyByRole('owner'),
      tenant: partyByRole('tenant'),
    },
    items: inspection.items,
    observations: inspection.observations,
    images: inspection.images, // Base64 포함 (생성 시점 고정)
    aiGuide: aiRow ? JSON.parse(aiRow.payload_json) : null,
    finalOpinion: inspection.final_opinion,
    caution: CAUTION_TEXT,
  };
}

/**
 * 점검 제출 → 리포트 자동 생성. 트랜잭션으로 다음을 한 번에 처리한다.
 *   등급 산출 → inspections.status = 'reported' → reports 생성 → report_snapshots 저장
 * @returns {number} 생성된 reportId
 *
 * 호출 전 라우트에서 존재/권한/상태(reported 아님)를 검증한다.
 */
export function submitInspection(db, inspectionId) {
  const tx = db.transaction(() => {
    const inspection = getInspectionById(db, inspectionId);
    const grade = computeGrade(inspection.flow, inspection.items);

    db.prepare("UPDATE inspections SET status = 'reported', updated_at = datetime('now') WHERE id = ?").run(
      inspectionId
    );

    const reportId = db
      .prepare(
        `INSERT INTO reports (inspection_id, unit_id, type, flow, grade, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(inspectionId, inspection.unit_id, inspection.type, inspection.flow, grade, inspection.created_by)
      .lastInsertRowid;

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    const snapshot = buildSnapshot(db, { ...inspection, status: 'reported' }, grade, report);

    db.prepare('INSERT INTO report_snapshots (report_id, snapshot_json) VALUES (?, ?)').run(
      reportId,
      JSON.stringify(snapshot)
    );

    return reportId;
  });

  return tx();
}

/** reports 한 행 조회 (메타). 없으면 undefined. */
export function getReportRow(db, id) {
  return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
}

/** 리포트의 고정 스냅샷(JSON 파싱). 없으면 null. */
export function getSnapshotByReportId(db, reportId) {
  const row = db.prepare('SELECT snapshot_json FROM report_snapshots WHERE report_id = ?').get(reportId);
  return row ? JSON.parse(row.snapshot_json) : null;
}

/**
 * 사용자가 해당 리포트에 접근 가능한가?
 * - contractor: 본인이 생성한 리포트
 * - owner/tenant: unit_users로 연결된 본인 호실의 리포트
 */
export function userHasReportAccess(db, report, user) {
  if (user.role === 'contractor') return report.created_by === user.id;
  const row = db
    .prepare('SELECT 1 FROM unit_users WHERE unit_id = ? AND user_id = ? AND role = ?')
    .get(report.unit_id, user.id, user.role);
  return !!row;
}

/** 사용자 기준 리포트 목록(메타 + 본인 확인 여부). */
export function listReportsForUser(db, user) {
  const base = `SELECT r.id, r.type, r.grade, r.created_at, r.unit_id,
                       u.name AS unit_name, b.name AS building_name
                FROM reports r
                JOIN units u ON u.id = r.unit_id
                JOIN buildings b ON b.id = u.building_id`;

  const rows =
    user.role === 'contractor'
      ? db.prepare(`${base} WHERE r.created_by = ? ORDER BY r.id DESC`).all(user.id)
      : db
          .prepare(
            `${base} JOIN unit_users uu ON uu.unit_id = r.unit_id
             WHERE uu.user_id = ? AND uu.role = ? ORDER BY r.id DESC`
          )
          .all(user.id, user.role);

  const confirmedStmt = db.prepare(
    'SELECT 1 FROM report_confirmations WHERE report_id = ? AND user_id = ?'
  );

  return rows.map((r) => ({
    id: r.id,
    grade: r.grade,
    type: r.type,
    typeLabel: labelForType(r.type),
    unitName: r.unit_name,
    building: r.building_name,
    createdAt: r.created_at,
    confirmed: !!confirmedStmt.get(r.id, user.id),
  }));
}

/** 확인 완료 기록 (임대인/임차인). 중복 호출은 멱등. */
export function confirmReport(db, reportId, user) {
  db.prepare(
    'INSERT OR IGNORE INTO report_confirmations (report_id, user_id, role) VALUES (?, ?, ?)'
  ).run(reportId, user.id, user.role);
}

/** 공유 링크 생성. token은 호출부에서 생성해 넘긴다. */
export function createShareLink(db, reportId, userId, token) {
  db.prepare('INSERT INTO share_links (report_id, token, created_by) VALUES (?, ?, ?)').run(
    reportId,
    token,
    userId
  );
  return token;
}

/** 공유 토큰으로 리포트 스냅샷 조회. 없으면 null. (비인증 접근용) */
export function getReportByToken(db, token) {
  const link = db.prepare('SELECT report_id FROM share_links WHERE token = ?').get(token);
  return link ? getSnapshotByReportId(db, link.report_id) : null;
}
