import { flowForType, labelForType } from '../domain/inspectionTypes.js';
import { validateImageSize } from '../lib/validation.js';

/**
 * 점검 + 자식(items/observations/images)을 다룬다.
 *
 * 자식 저장 규칙(중요): create/update에서 들어온 컬렉션만 "교체"한다(독립 교체).
 * - items가 들어오면 items를 교체한다. items는 observations의 부모이므로, items를
 *   교체할 때는 observations도 함께 다시 넣는다(itemIndex로 새 item에 연결).
 * - images는 items와 독립적으로 교체된다. → 사진만 PATCH해도 점검 항목이 보존된다.
 * observations/images는 itemIndex(=items 배열 내 위치)로 해당 item에 연결한다.
 */

function insertItems(db, inspectionId, items = []) {
  const stmt = db.prepare(
    `INSERT INTO inspection_items (inspection_id, category, name, state, location, description)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  return items.map(
    (it) =>
      stmt.run(
        inspectionId,
        it.category ?? null,
        it.name ?? null,
        it.state ?? null,
        it.location ?? null,
        it.description ?? null
      ).lastInsertRowid
  );
}

function insertObservations(db, inspectionId, observations = [], itemIds = []) {
  const stmt = db.prepare(
    `INSERT INTO inspection_observations (inspection_id, item_id, label, value) VALUES (?, ?, ?, ?)`
  );
  for (const o of observations) {
    const itemId = o.itemIndex != null ? itemIds[o.itemIndex] ?? null : null;
    stmt.run(inspectionId, itemId, o.label, o.value);
  }
}

function insertImages(db, inspectionId, images = [], itemIds = []) {
  const stmt = db.prepare(
    `INSERT INTO inspection_images (inspection_id, item_id, data_base64, kind, caption, byte_size)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const img of images) {
    const itemId = img.itemIndex != null ? itemIds[img.itemIndex] ?? null : null;
    const bytes = validateImageSize(img.dataBase64); // 방어적 재검증
    stmt.run(inspectionId, itemId, img.dataBase64, img.kind ?? null, img.caption ?? null, bytes);
  }
}

function currentItemIds(db, inspectionId) {
  return db
    .prepare('SELECT id FROM inspection_items WHERE inspection_id = ? ORDER BY id')
    .all(inspectionId)
    .map((r) => r.id);
}

export function createInspection(db, input) {
  const { unitId, createdBy, type, items = [], observations = [], images = [], finalOpinion = null } = input;
  const flow = flowForType(type);

  const tx = db.transaction(() => {
    const id = db
      .prepare(
        `INSERT INTO inspections (unit_id, created_by, type, flow, status, final_opinion)
         VALUES (?, ?, ?, ?, 'draft', ?)`
      )
      .run(unitId, createdBy, type, flow, finalOpinion).lastInsertRowid;
    const itemIds = insertItems(db, id, items);
    insertObservations(db, id, observations, itemIds);
    insertImages(db, id, images, itemIds);
    return id;
  });

  return getInspectionById(db, tx());
}

export function getInspectionById(db, id) {
  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id);
  if (!inspection) return null;

  const items = db.prepare('SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY id').all(id);
  const observations = db
    .prepare('SELECT * FROM inspection_observations WHERE inspection_id = ? ORDER BY id')
    .all(id);
  const images = db
    .prepare(
      'SELECT id, item_id, kind, caption, byte_size, data_base64 FROM inspection_images WHERE inspection_id = ? ORDER BY id'
    )
    .all(id);

  return { ...inspection, typeLabel: labelForType(inspection.type), items, observations, images };
}

/**
 * 시공업자 본인이 작성한 점검 목록(메타). 시공업자 홈에서 작성 중/제출 대기 표시용.
 * 자식(items 등)은 제외한 가벼운 목록을 최신순으로 반환한다.
 */
export function listInspectionsForUser(db, userId) {
  return db
    .prepare(
      `SELECT i.id, i.type, i.flow, i.status, i.created_at, i.unit_id,
              u.name AS unit_name, b.name AS building_name
       FROM inspections i
       JOIN units u ON u.id = i.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE i.created_by = ? ORDER BY i.id DESC`
    )
    .all(userId)
    .map((r) => ({ ...r, typeLabel: labelForType(r.type) }));
}

/**
 * 점검 수정. type 변경 시 flow도 재계산.
 * 들어온 컬렉션만 독립적으로 교체한다:
 * - items가 들어오면 items(+observations)를 교체. observations 미동봉 시 비워짐.
 * - images가 들어오면 images만 교체(점검 항목은 보존).
 */
export function updateInspection(db, id, patch) {
  const tx = db.transaction(() => {
    const sets = [];
    const vals = [];
    if (patch.type !== undefined) {
      sets.push('type = ?', 'flow = ?');
      vals.push(patch.type, flowForType(patch.type));
    }
    if (patch.finalOpinion !== undefined) {
      sets.push('final_opinion = ?');
      vals.push(patch.finalOpinion);
    }
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE inspections SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);

    // items 교체 시 observations는 itemIndex로 다시 연결해야 하므로 함께 처리
    let itemIds;
    if (patch.items !== undefined) {
      db.prepare('DELETE FROM inspection_observations WHERE inspection_id = ?').run(id);
      db.prepare('DELETE FROM inspection_items WHERE inspection_id = ?').run(id);
      itemIds = insertItems(db, id, patch.items ?? []);
      insertObservations(db, id, patch.observations ?? [], itemIds);
    } else {
      itemIds = currentItemIds(db, id);
      if (patch.observations !== undefined) {
        db.prepare('DELETE FROM inspection_observations WHERE inspection_id = ?').run(id);
        insertObservations(db, id, patch.observations, itemIds);
      }
    }

    if (patch.images !== undefined) {
      db.prepare('DELETE FROM inspection_images WHERE inspection_id = ?').run(id);
      insertImages(db, id, patch.images ?? [], itemIds);
    }
  });
  tx();
  return getInspectionById(db, id);
}

export function deleteInspection(db, id) {
  // 자식은 FK ON DELETE CASCADE로 함께 삭제됨
  db.prepare('DELETE FROM inspections WHERE id = ?').run(id);
}
