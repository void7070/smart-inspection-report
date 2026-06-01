import { Router } from 'express';
import { makeLoadUser, requireUser } from '../middleware/currentUser.js';
import { listUsers, getUserById } from '../repositories/userRepo.js';
import { getAccessibleUnits } from '../repositories/unitRepo.js';
import { requireFields } from '../lib/validation.js';
import { errors } from '../lib/errors.js';
import { createInspectionsRouter } from './inspections.js';
import { createAiRouter } from './ai.js';
import { createReportsRouter } from './reports.js';
import { getReportByToken } from '../repositories/reportRepo.js';

/**
 * /api 하위 라우터. db와 deps(예: aiComplete)를 주입받아 closure로 사용한다.
 * 이후 세션에서 reports/share 라우터를 여기에 추가한다.
 */
export function createApiRouter(db, deps = {}) {
  const router = Router();

  // 모든 /api 요청에서 현재 사용자를 로드 (있으면 req.user)
  router.use(makeLoadUser(db));

  // 데모 사용자 목록 (선택 화면용 — 인증 불필요)
  router.get('/demo/users', (req, res) => {
    res.ok({ users: listUsers(db) });
  });

  // 선택한 사용자 확인 (localStorage 저장 전 검증용)
  router.post('/session/select-user', (req, res) => {
    requireFields(req.body, ['userId']);
    const user = getUserById(db, Number(req.body.userId));
    if (!user) throw errors.notFound('사용자를 찾을 수 없습니다.');
    res.ok({ user });
  });

  // 현재 사용자가 접근 가능한 호실 (역할별)
  router.get('/units', requireUser, (req, res) => {
    res.ok({ units: getAccessibleUnits(db, req.user.id) });
  });

  // 점검 CRUD (B04)
  router.use('/inspections', createInspectionsRouter(db));

  // AI 점검 도우미 (B06)
  router.use('/ai', createAiRouter(db, { aiComplete: deps.aiComplete }));

  // 리포트 조회/확인/공유 (B07)
  router.use('/reports', createReportsRouter(db));

  // 공유 링크 리포트 조회 (비인증, 만료/마스킹 없음)
  router.get('/share/:token', (req, res) => {
    const report = getReportByToken(db, req.params.token);
    if (!report) throw errors.notFound('공유 링크를 찾을 수 없습니다.');
    res.ok({ report });
  });

  return router;
}
