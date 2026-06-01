import { Router } from 'express';
import { requireUser } from '../middleware/currentUser.js';
import { requireFields, validateImageBatch } from '../lib/validation.js';
import { errors } from '../lib/errors.js';
import { INSPECTION_TYPE_CODES } from '../domain/inspectionTypes.js';
import {
  createInspection,
  getInspectionById,
  updateInspection,
  deleteInspection,
  listInspectionsForUser,
} from '../repositories/inspectionRepo.js';
import { submitInspection } from '../repositories/reportRepo.js';

function assertValidType(type) {
  if (!INSPECTION_TYPE_CODES.includes(type)) {
    throw errors.badRequest(`알 수 없는 점검 유형: ${type}`, 'INVALID_TYPE');
  }
}

function assertUnitExists(db, unitId) {
  const unit = db.prepare('SELECT id FROM units WHERE id = ?').get(Number(unitId));
  if (!unit) throw errors.notFound('호실을 찾을 수 없습니다.');
}

/** 점검 접근은 작성한 시공업자 본인만 (owner/tenant는 리포트로만 접근 — B07) */
function assertAuthor(inspection, user) {
  if (inspection.created_by !== user.id) {
    throw errors.forbidden('해당 점검에 접근할 권한이 없습니다.');
  }
}

/** reported 상태는 수정/삭제 불가 (생성 완료 리포트의 점검은 불변) */
function assertEditable(inspection) {
  if (inspection.status === 'reported') {
    throw errors.badRequest(
      '리포트가 생성된 점검은 수정하거나 삭제할 수 없습니다.',
      'REPORTED_LOCKED'
    );
  }
}

export function createInspectionsRouter(db) {
  const router = Router();

  // 본인이 작성한 점검 목록 (시공업자 홈)
  router.get('/', requireUser, (req, res) => {
    const inspections = req.user.role === 'contractor' ? listInspectionsForUser(db, req.user.id) : [];
    res.ok({ inspections });
  });

  // 점검 생성 (시공업자만)
  router.post('/', requireUser, (req, res) => {
    requireFields(req.body, ['unitId', 'type']);
    if (req.user.role !== 'contractor') {
      throw errors.forbidden('점검 생성은 시공업자만 가능합니다.');
    }
    assertValidType(req.body.type);
    assertUnitExists(db, req.body.unitId);
    validateImageBatch(req.body.images ?? []);

    const inspection = createInspection(db, {
      unitId: Number(req.body.unitId),
      createdBy: req.user.id,
      type: req.body.type,
      items: req.body.items,
      observations: req.body.observations,
      images: req.body.images,
      finalOpinion: req.body.finalOpinion,
    });
    res.ok({ inspection }, 201);
  });

  // 점검 상세
  router.get('/:id', requireUser, (req, res) => {
    const inspection = getInspectionById(db, Number(req.params.id));
    if (!inspection) throw errors.notFound('점검을 찾을 수 없습니다.');
    assertAuthor(inspection, req.user);
    res.ok({ inspection });
  });

  // 점검 수정 (draft/submitted만)
  router.patch('/:id', requireUser, (req, res) => {
    const inspection = getInspectionById(db, Number(req.params.id));
    if (!inspection) throw errors.notFound('점검을 찾을 수 없습니다.');
    assertAuthor(inspection, req.user);
    assertEditable(inspection);
    if (req.body.type !== undefined) assertValidType(req.body.type);
    if (req.body.images !== undefined) validateImageBatch(req.body.images);

    const updated = updateInspection(db, inspection.id, req.body);
    res.ok({ inspection: updated });
  });

  // 점검 삭제 (draft/submitted만)
  router.delete('/:id', requireUser, (req, res) => {
    const inspection = getInspectionById(db, Number(req.params.id));
    if (!inspection) throw errors.notFound('점검을 찾을 수 없습니다.');
    assertAuthor(inspection, req.user);
    assertEditable(inspection);

    deleteInspection(db, inspection.id);
    res.ok({ deleted: true });
  });

  // 점검 제출 → 리포트 자동 생성 (B05)
  router.post('/:id/submit', requireUser, (req, res) => {
    const inspection = getInspectionById(db, Number(req.params.id));
    if (!inspection) throw errors.notFound('점검을 찾을 수 없습니다.');
    assertAuthor(inspection, req.user);
    if (inspection.status === 'reported') {
      throw errors.badRequest('이미 리포트가 생성된 점검입니다.', 'ALREADY_REPORTED');
    }

    const reportId = submitInspection(db, inspection.id);
    res.ok({ reportId }, 201);
  });

  return router;
}
