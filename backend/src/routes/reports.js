import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireUser } from '../middleware/currentUser.js';
import { errors } from '../lib/errors.js';
import { requireFields } from '../lib/validation.js';
import { canCompare } from '../lib/compare.js';
import { labelForType } from '../domain/inspectionTypes.js';
import {
  listReportsForUser,
  getReportRow,
  getSnapshotByReportId,
  userHasReportAccess,
  confirmReport,
  createShareLink,
} from '../repositories/reportRepo.js';

/** 접근 가능한 리포트를 로드한다. 없으면 404, 권한 없으면 403. */
function loadAccessibleReport(db, id, user) {
  const report = getReportRow(db, Number(id));
  if (!report) throw errors.notFound('리포트를 찾을 수 없습니다.');
  if (!userHasReportAccess(db, report, user)) {
    throw errors.forbidden('해당 리포트에 접근할 권한이 없습니다.');
  }
  return report;
}

export function createReportsRouter(db) {
  const router = Router();
  router.use(requireUser); // 모든 리포트 엔드포인트는 사용자 필요 (공유 링크는 별도/비인증)

  // 사용자 기준 리포트 목록
  router.get('/', (req, res) => {
    res.ok({ reports: listReportsForUser(db, req.user) });
  });

  // 리포트 비교 (반드시 '/:id'보다 먼저 등록해야 :id가 'compare'를 잡지 않음)
  router.get('/compare', (req, res) => {
    requireFields(req.query, ['leftId', 'rightId']);
    const leftId = Number(req.query.leftId);
    const rightId = Number(req.query.rightId);
    if (leftId === rightId) {
      throw errors.badRequest('서로 다른 리포트 2개를 선택하세요.', 'COMPARE_SAME');
    }

    const left = loadAccessibleReport(db, leftId, req.user);
    const right = loadAccessibleReport(db, rightId, req.user);

    const validation = canCompare(left, right);
    if (!validation.ok) throw errors.badRequest(validation.message, validation.code);

    res.ok({
      left: getSnapshotByReportId(db, left.id),
      right: getSnapshotByReportId(db, right.id),
      compareMeta: {
        unitId: left.unit_id,
        leftType: left.type,
        leftTypeLabel: labelForType(left.type),
        rightType: right.type,
        rightTypeLabel: labelForType(right.type),
        sameType: validation.sameType,
        isRepairBeforeAfter: validation.isRepairBeforeAfter,
      },
      validation,
    });
  });

  // 리포트 상세 (고정 스냅샷)
  router.get('/:id', (req, res) => {
    const report = loadAccessibleReport(db, req.params.id, req.user);
    res.ok({ report: getSnapshotByReportId(db, report.id) });
  });

  // 확인 완료 (임대인/임차인만)
  router.post('/:id/confirm', (req, res) => {
    if (req.user.role === 'contractor') {
      throw errors.forbidden('확인 완료는 임대인/임차인만 가능합니다.');
    }
    const report = loadAccessibleReport(db, req.params.id, req.user);
    confirmReport(db, report.id, req.user);
    res.ok({ confirmed: true });
  });

  // 공유 링크 생성 (시공업자/임대인/임차인 모두 가능, 만료 없음)
  router.post('/:id/share', (req, res) => {
    const report = loadAccessibleReport(db, req.params.id, req.user);
    const token = randomUUID();
    createShareLink(db, report.id, req.user.id, token);
    res.ok({ token, path: `/share/${token}` }, 201);
  });

  return router;
}
